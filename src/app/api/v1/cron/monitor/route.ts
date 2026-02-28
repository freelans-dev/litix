import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildCaseUpdateFromJudit } from '@/lib/judit-fetch'
import { fetchCase } from '@/lib/case-fetch'
import { generateAlerts } from '@/lib/alert-generator'
import { dispatchWebhooks } from '@/lib/webhook-dispatcher'

interface CaseToMonitor {
  id: string
  cnj: string
  tenant_id: string
  tribunal: string | null
  last_checked_at: string | null
}

const BATCH_SIZE = 10
const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/v1/cron/monitor
 * Called by Vercel Cron every hour.
 * Selects monitored cases that need checking based on plan frequency,
 * fetches updates from Judit, detects new movements, creates alerts.
 */
export async function POST(req: NextRequest) {
  // Verify cron secret (Vercel sends Authorization header)
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const startTime = Date.now()

  // Select cases that need monitoring:
  // monitor_enabled=true AND last_checked_at is older than plan's monitoring_frequency_hours
  const { data: casesToCheck, error: selectError } = await supabase.rpc(
    'get_cases_to_monitor',
    { batch_limit: BATCH_SIZE }
  )

  // Fallback: if RPC doesn't exist, use raw query
  let cases = casesToCheck as CaseToMonitor[] | null
  if (selectError) {
    // Direct query fallback
    const { data: fallbackCases } = await supabase
      .from('monitored_cases')
      .select('id, cnj, tenant_id, tribunal, last_checked_at')
      .eq('monitor_enabled', true)
      .or('last_checked_at.is.null,last_checked_at.lt.' + new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('last_checked_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE)

    cases = fallbackCases
  }

  if (!cases || cases.length === 0) {
    return NextResponse.json({
      processed: 0,
      newMovements: 0,
      alerts: 0,
      errors: 0,
      duration_ms: Date.now() - startTime,
    })
  }

  let totalProcessed = 0
  let totalNewMovements = 0
  let totalAlerts = 0
  let totalErrors = 0

  // Process each case
  for (const caseRow of cases) {
    const jobId = crypto.randomUUID()
    const jobStart = new Date().toISOString()
    const jobStartMs = Date.now()

    // Create monitoring job record
    await supabase.from('monitoring_jobs').insert({
      id: jobId,
      tenant_id: caseRow.tenant_id,
      case_id: caseRow.id,
      status: 'running',
      started_at: jobStart,
    })

    try {
      // Fetch via cascade: DataJud (free) → Judit (paid)
      const result = await fetchCase(caseRow.cnj, {
        tenantId: caseRow.tenant_id,
        sourceFlow: 'cron_monitor',
      })

      if (!result) {
        // No data returned — just update last_checked_at
        await supabase
          .from('monitored_cases')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', caseRow.id)

        await supabase
          .from('monitoring_jobs')
          .update({
            status: 'no_change',
            provider_used: 'datajud,judit',
            duration_ms: Date.now() - jobStartMs,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        totalProcessed++
        continue
      }

      // Update case fields from cascade result
      const updatePayload = buildCaseUpdateFromJudit(result.data)
      await supabase
        .from('monitored_cases')
        .update({
          ...updatePayload,
          merged_from: result.providers,
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', caseRow.id)

      // Insert new movements (upsert ignores duplicates)
      let newMovementCount = 0
      if (result.data.movimentos && result.data.movimentos.length > 0) {
        const movements = result.data.movimentos.map((m) => ({
          tenant_id: caseRow.tenant_id,
          case_id: caseRow.id,
          movement_date: m.data,
          description: m.descricao,
          type: m.tipo ?? null,
          code: m.codigo ?? null,
          provider: result.data.provider,
        }))

        await supabase
          .from('case_movements')
          .upsert(movements, {
            onConflict: 'case_id,movement_date,description',
            ignoreDuplicates: true,
          })
          .select('id, movement_date, description, type')

        // Check for genuinely new movements (detected in last 60s)
        const cutoff = new Date(Date.now() - 60_000).toISOString()
        const { data: newMovements } = await supabase
          .from('case_movements')
          .select('id, movement_date, description, type')
          .eq('case_id', caseRow.id)
          .gte('detected_at', cutoff)
          .order('movement_date', { ascending: false })

        if (newMovements && newMovements.length > 0) {
          newMovementCount = newMovements.length
          totalNewMovements += newMovementCount

          // Generate alerts for all tenant members
          const alertCount = await generateAlerts(
            caseRow.tenant_id,
            caseRow.id,
            caseRow.cnj,
            caseRow.tribunal,
            newMovements
          )
          totalAlerts += alertCount

          // Dispatch webhooks (fire-and-forget)
          const { data: updatedCase } = await supabase
            .from('monitored_cases')
            .select('*')
            .eq('id', caseRow.id)
            .single()

          if (updatedCase) {
            dispatchWebhooks(
              caseRow.tenant_id,
              'process.movement',
              updatedCase,
              newMovements
            )
          }
        }
      }

      // Update monitoring job
      await supabase
        .from('monitoring_jobs')
        .update({
          status: newMovementCount > 0 ? 'completed' : 'no_change',
          provider_used: result.providers.join(','),
          movements_found: newMovementCount,
          duration_ms: Date.now() - jobStartMs,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      totalProcessed++
    } catch (err) {
      totalErrors++
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'

      await supabase
        .from('monitoring_jobs')
        .update({
          status: 'failed',
          error_message: errorMsg,
          duration_ms: Date.now() - jobStartMs,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      // Still update last_checked_at to avoid retrying immediately
      await supabase
        .from('monitored_cases')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', caseRow.id)

      console.error(`[cron/monitor] Error processing case ${caseRow.cnj}:`, errorMsg)
    }
  }

  return NextResponse.json({
    processed: totalProcessed,
    newMovements: totalNewMovements,
    alerts: totalAlerts,
    errors: totalErrors,
    duration_ms: Date.now() - startTime,
  })
}

// Also support GET for Vercel Cron (some versions use GET)
export async function GET(req: NextRequest) {
  return POST(req)
}
