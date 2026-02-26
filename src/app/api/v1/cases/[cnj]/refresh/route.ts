import { NextRequest, NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { fetchCaseFromJudit, buildCaseUpdateFromJudit } from '@/lib/judit-fetch'
import { dispatchWebhooks } from '@/lib/webhook-dispatcher'
import { generateAlerts } from '@/lib/alert-generator'

// POST /api/v1/cases/:caseId/refresh — trigger immediate consultation from Judit
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ cnj: string }> }
) {
  const { cnj: caseId } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await checkRateLimit(ctx.tenantId, ctx.plan)
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Verify case belongs to tenant
  const { data: caseData } = await supabase
    .from('monitored_cases')
    .select('id, cnj, tribunal')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', caseId)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch from Judit and update record
  const juditData = await fetchCaseFromJudit(caseData.cnj)

  if (juditData) {
    const updatePayload = buildCaseUpdateFromJudit(juditData)
    await supabase
      .from('monitored_cases')
      .update(updatePayload)
      .eq('id', caseData.id)

    if (juditData.movimentos && juditData.movimentos.length > 0) {
      const movements = juditData.movimentos.map((m) => ({
        tenant_id: ctx.tenantId,
        case_id: caseData.id,
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

    // Dispatch webhooks with full case data (fire-and-forget)
    const cutoff = new Date(Date.now() - 30_000).toISOString()
    const { data: newMovements } = await supabase
      .from('case_movements')
      .select('*')
      .eq('case_id', caseData.id)
      .gte('detected_at', cutoff)

    if (newMovements && newMovements.length > 0) {
      const { data: updatedCase } = await supabase
        .from('monitored_cases')
        .select('*')
        .eq('id', caseData.id)
        .single()

      if (updatedCase) {
        dispatchWebhooks(ctx.tenantId, 'process.movement', updatedCase, newMovements)
      }

      // Generate alerts for all tenant members (fire-and-forget)
      generateAlerts(ctx.tenantId, caseData.id, caseData.cnj, caseData.tribunal, newMovements)
    }
  } else {
    await supabase
      .from('monitored_cases')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('id', caseData.id)
  }

  return NextResponse.json({ queued: true, cnj: caseData.cnj, updated: !!juditData })
}
