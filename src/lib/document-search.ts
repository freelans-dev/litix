/**
 * Document Search Job — searches Judit by CPF or CNPJ and imports all found processes.
 *
 * Flow:
 * 1. Create Judit request with search_type: 'cpf' or 'cnpj'
 * 2. Poll until completed (up to ~120s)
 * 3. Paginate through responses, dedup against existing cases, import new ones
 * 4. Update document_searches progress as it goes
 * 5. If client_id provided, link imported cases to the client
 */

import { createServiceClient } from '@/lib/supabase/service'
import { mapResponseData, buildCaseUpdateFromJudit } from '@/lib/judit-fetch'
import { trackProviderQuery } from '@/lib/provider-tracking'

const JUDIT_API_KEY = process.env.JUDIT_API_KEY!
const REQUESTS_URL = 'https://requests.prod.judit.io'

interface JuditResponsePage {
  page_data: Array<{ response_data: Record<string, unknown> }>
  all_pages_count: number
  all_count: number
}

export async function runDocumentSearch(searchId: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: searchRec } = await supabase
    .from('document_searches')
    .select('*')
    .eq('id', searchId)
    .single()

  if (!searchRec) {
    console.error(`[document-search] Search ${searchId} not found`)
    return
  }

  await supabase
    .from('document_searches')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', searchId)

  try {
    // 1. Create Judit request for CPF/CNPJ search
    const juditStartMs = Date.now()
    const createRes = await fetch(`${REQUESTS_URL}/requests`, {
      method: 'POST',
      headers: { 'api-key': JUDIT_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search: {
          search_type: searchRec.document_type,
          search_key: searchRec.document_value,
          response_type: 'lawsuit',
          cache_ttl_in_days: 1,
        },
      }),
    })

    if (!createRes.ok) {
      await failSearch(supabase, searchId, `Judit request failed: ${createRes.status}`)
      return
    }

    const { request_id: requestId } = await createRes.json() as { request_id: string }
    if (!requestId) {
      await failSearch(supabase, searchId, 'No request_id returned from Judit')
      return
    }

    await supabase
      .from('document_searches')
      .update({ trigger_id: requestId })
      .eq('id', searchId)

    // 2. Poll until completed — CPF/CNPJ searches take longer (up to 120s)
    let completed = false
    for (let i = 0; i < 12; i++) {
      await sleep(10_000)

      const statusRes = await fetch(`${REQUESTS_URL}/requests/${requestId}`, {
        headers: { 'api-key': JUDIT_API_KEY },
      })
      if (!statusRes.ok) continue

      const { status } = await statusRes.json() as { status: string }
      if (status === 'failed' || status === 'cancelled') {
        await failSearch(supabase, searchId, `Judit request ${status}`)
        return
      }
      if (status === 'completed') {
        completed = true
        break
      }
    }

    if (!completed) {
      await failSearch(supabase, searchId, 'Judit request timed out after 120s')
      return
    }

    // 3. Get existing CNJs for this tenant (batch dedup)
    const { data: existingCases } = await supabase
      .from('monitored_cases')
      .select('cnj')
      .eq('tenant_id', searchRec.tenant_id)

    const existingCnjs = new Set(existingCases?.map(c => c.cnj) ?? [])

    // 4. Paginate through all responses
    let page = 1
    let totalPages = 1
    let casesFound = 0
    let casesImported = 0
    let casesDeduplicated = 0

    do {
      const params = new URLSearchParams({
        request_id: requestId,
        response_type: 'lawsuit',
        page: String(page),
        page_size: '50',
      })

      const respRes = await fetch(`${REQUESTS_URL}/responses?${params}`, {
        headers: { 'api-key': JUDIT_API_KEY },
      })
      if (!respRes.ok) break

      const respData = await respRes.json() as JuditResponsePage
      totalPages = respData.all_pages_count ?? 1
      casesFound = respData.all_count ?? 0

      for (const item of respData.page_data ?? []) {
        if (!item.response_data) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const juditData = mapResponseData(item.response_data as Record<string, any>, requestId)
        const cnj = juditData.cnj?.replace(/\D/g, '')
        if (!cnj) continue

        if (existingCnjs.has(cnj)) {
          casesDeduplicated++
          continue
        }

        // Insert new case
        const caseUpdate = buildCaseUpdateFromJudit(juditData)
        const { data: inserted, error: insertErr } = await supabase
          .from('monitored_cases')
          .insert({
            tenant_id: searchRec.tenant_id,
            cnj,
            import_source: 'document_search',
            monitor_enabled: true,
            client_id: searchRec.client_id ?? null,
            ...caseUpdate,
          })
          .select('id')
          .single()

        if (insertErr) {
          // Unique constraint violation = already exists (concurrent insert)
          if (insertErr.code === '23505') {
            casesDeduplicated++
          }
          continue
        }

        casesImported++
        existingCnjs.add(cnj)

        // Save movements
        if (inserted && juditData.movimentos && juditData.movimentos.length > 0) {
          const movements = juditData.movimentos.map(m => ({
            tenant_id: searchRec.tenant_id,
            case_id: inserted.id,
            movement_date: m.data,
            description: m.descricao,
            type: m.tipo ?? null,
            code: m.codigo ?? null,
            provider: 'judit',
          }))
          await supabase.from('case_movements').upsert(movements, {
            onConflict: 'case_id,movement_date,description',
            ignoreDuplicates: true,
          })
        }
      }

      // Update progress after each page
      await supabase
        .from('document_searches')
        .update({
          cases_found: casesFound,
          cases_imported: casesImported,
          cases_deduplicated: casesDeduplicated,
        })
        .eq('id', searchId)

      page++
    } while (page <= totalPages)

    // Track Judit query for analytics
    trackProviderQuery({
      tenant_id: searchRec.tenant_id,
      provider: 'judit',
      search_type: searchRec.document_type as 'cpf' | 'cnpj',
      search_key: searchRec.document_value,
      status: 'success',
      duration_ms: Date.now() - juditStartMs,
      fields_returned: casesFound,
      source_flow: 'document_search',
    })

    // 5. Mark completed
    await supabase
      .from('document_searches')
      .update({
        status: 'completed',
        cases_found: casesFound,
        cases_imported: casesImported,
        cases_deduplicated: casesDeduplicated,
        providers_used: ['judit'],
        completed_at: new Date().toISOString(),
      })
      .eq('id', searchId)

    console.log(
      `[document-search] ${searchId} completed: found=${casesFound} imported=${casesImported} dedup=${casesDeduplicated}`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await failSearch(supabase, searchId, msg)
    console.error(`[document-search] ${searchId} failed: ${msg}`)
  }
}

async function failSearch(
  supabase: ReturnType<typeof createServiceClient>,
  searchId: string,
  error: string,
) {
  await supabase
    .from('document_searches')
    .update({
      status: 'failed',
      error,
      completed_at: new Date().toISOString(),
    })
    .eq('id', searchId)
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
