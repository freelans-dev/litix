/**
 * OAB Import Job — searches Judit by OAB number and imports all found processes.
 *
 * Flow:
 * 1. Create Judit request with search_type: 'oab'
 * 2. Poll until completed (up to ~120s)
 * 3. Paginate through responses, dedup against existing cases, import new ones
 * 4. Update oab_imports progress as it goes
 */

import { createServiceClient } from '@/lib/supabase/service'
import { mapResponseData, buildCaseUpdateFromJudit } from '@/lib/judit-fetch'

const JUDIT_API_KEY = process.env.JUDIT_API_KEY!
const REQUESTS_URL = 'https://requests.prod.judit.io'

interface JuditResponsePage {
  page_data: Array<{ response_data: Record<string, unknown> }>
  all_pages_count: number
  all_count: number
}

export async function runOabImport(importId: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: importRec } = await supabase
    .from('oab_imports')
    .select('*')
    .eq('id', importId)
    .single()

  if (!importRec) {
    console.error(`[oab-import] Import ${importId} not found`)
    return
  }

  await supabase
    .from('oab_imports')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', importId)

  try {
    const searchKey = `${importRec.oab_number}/${importRec.oab_uf}`

    // 1. Create Judit request for OAB search
    const createRes = await fetch(`${REQUESTS_URL}/requests`, {
      method: 'POST',
      headers: { 'api-key': JUDIT_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search: {
          search_type: 'oab',
          search_key: searchKey,
          response_type: 'lawsuit',
          cache_ttl_in_days: 1,
        },
      }),
    })

    if (!createRes.ok) {
      await failImport(supabase, importId, `Judit request failed: ${createRes.status}`)
      return
    }

    const { request_id: requestId } = await createRes.json() as { request_id: string }
    if (!requestId) {
      await failImport(supabase, importId, 'No request_id returned from Judit')
      return
    }

    await supabase
      .from('oab_imports')
      .update({ trigger_id: requestId })
      .eq('id', importId)

    // 2. Poll until completed — OAB searches take longer (up to 120s)
    let completed = false
    for (let i = 0; i < 12; i++) {
      await sleep(10_000)

      const statusRes = await fetch(`${REQUESTS_URL}/requests/${requestId}`, {
        headers: { 'api-key': JUDIT_API_KEY },
      })
      if (!statusRes.ok) continue

      const { status } = await statusRes.json() as { status: string }
      if (status === 'failed' || status === 'cancelled') {
        await failImport(supabase, importId, `Judit request ${status}`)
        return
      }
      if (status === 'completed') {
        completed = true
        break
      }
    }

    if (!completed) {
      await failImport(supabase, importId, 'Judit request timed out after 120s')
      return
    }

    // 3. Get existing CNJs for this tenant (batch dedup)
    const { data: existingCases } = await supabase
      .from('monitored_cases')
      .select('cnj')
      .eq('tenant_id', importRec.tenant_id)

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
            tenant_id: importRec.tenant_id,
            cnj,
            import_source: 'oab_import',
            monitor_enabled: true,
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
            tenant_id: importRec.tenant_id,
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
        .from('oab_imports')
        .update({
          cases_found: casesFound,
          cases_imported: casesImported,
          cases_deduplicated: casesDeduplicated,
        })
        .eq('id', importId)

      page++
    } while (page <= totalPages)

    // 5. Mark completed
    await supabase
      .from('oab_imports')
      .update({
        status: 'completed',
        cases_found: casesFound,
        cases_imported: casesImported,
        cases_deduplicated: casesDeduplicated,
        providers_used: ['judit'],
        completed_at: new Date().toISOString(),
      })
      .eq('id', importId)

    console.log(
      `[oab-import] ${importId} completed: found=${casesFound} imported=${casesImported} dedup=${casesDeduplicated}`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await failImport(supabase, importId, msg)
    console.error(`[oab-import] ${importId} failed: ${msg}`)
  }
}

async function failImport(
  supabase: ReturnType<typeof createServiceClient>,
  importId: string,
  error: string,
) {
  await supabase
    .from('oab_imports')
    .update({
      status: 'failed',
      error,
      completed_at: new Date().toISOString(),
    })
    .eq('id', importId)
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
