import { NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { computeExposureScore, type CaseForScoring } from '@/lib/exposure-score'
import { generateExposureAnalysis } from '@/lib/ai-summarizer'

/**
 * GET /api/v1/clients/:id/exposure-score
 * Computes the legal exposure score for a client based on their linked cases.
 * Query param ?ai=true also generates an AI narrative analysis.
 */
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const withAi = searchParams.get('ai') === 'true'

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: cases } = await supabase
    .from('monitored_cases')
    .select('id, status, area, instancia, fase, risco, probabilidade, contingencia, valor_causa, provisionamento, reserva, dias_sem_mov, movement_count, ultimo_step_date')
    .eq('tenant_id', ctx.tenantId)
    .eq('client_id', id)

  if (!cases || cases.length === 0) {
    return NextResponse.json({
      score: 0,
      level: 'baixo',
      factors: [],
      summary: null,
      narrative: null,
      case_count: 0,
    })
  }

  const scoringCases: CaseForScoring[] = cases.map((c) => ({
    id: c.id,
    status: c.status,
    area: c.area,
    instancia: c.instancia,
    fase: c.fase,
    risco: c.risco,
    probabilidade: c.probabilidade,
    contingencia: c.contingencia,
    valor_causa: c.valor_causa ? Number(c.valor_causa) : null,
    provisionamento: c.provisionamento ? Number(c.provisionamento) : null,
    reserva: c.reserva ? Number(c.reserva) : null,
    dias_sem_mov: c.dias_sem_mov,
    movement_count: c.movement_count ?? 0,
    ultimo_step_date: c.ultimo_step_date,
  }))

  const result = computeExposureScore(scoringCases)

  let narrative: string | null = null
  if (withAi) {
    narrative = await generateExposureAnalysis(result, client.name)
  }

  return NextResponse.json({
    ...result,
    narrative,
    case_count: cases.length,
  })
}
