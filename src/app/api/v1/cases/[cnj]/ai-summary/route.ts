import { NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { summarizeMovements, generateCaseTimeline } from '@/lib/ai-summarizer'

const STALE_DAYS = 7

type RouteProps = { params: Promise<{ cnj: string }> }

/**
 * GET /api/v1/cases/:cnj/ai-summary?type=timeline
 * Returns cached summary if available, with freshness info.
 */
export async function GET(request: Request, props: RouteProps) {
  const { cnj } = await props.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const type = url.searchParams.get('type') ?? 'timeline'

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: caseData } = await supabase
    .from('monitored_cases')
    .select('id, movement_count')
    .eq('tenant_id', ctx.tenantId)
    .eq('cnj', cnj)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const { data: cached } = await supabase
    .from('case_summaries')
    .select('content, generated_at, movement_count, last_movement_date')
    .eq('case_id', caseData.id)
    .eq('summary_type', type)
    .maybeSingle()

  if (!cached) {
    return NextResponse.json({ cached: false })
  }

  const daysSinceGeneration = (Date.now() - new Date(cached.generated_at).getTime()) / (1000 * 60 * 60 * 24)
  const hasNewMovements = caseData.movement_count > cached.movement_count
  const isStale = hasNewMovements || daysSinceGeneration > STALE_DAYS

  return NextResponse.json({
    cached: true,
    timeline: cached.content,
    generated_at: cached.generated_at,
    is_stale: isStale,
    stale_reason: isStale
      ? hasNewMovements ? 'new_movements' : 'expired'
      : null,
  })
}

/**
 * POST /api/v1/cases/:cnj/ai-summary
 * Generates AI summary. Returns cached if fresh, otherwise generates and saves.
 * Body: { type: 'movements' | 'timeline', force?: boolean }
 */
export async function POST(request: Request, props: RouteProps) {
  const { cnj } = await props.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { type = 'movements', force = false } = body as { type?: string; force?: boolean }

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: caseData } = await supabase
    .from('monitored_cases')
    .select('id, cnj, tribunal, area, classe, assunto_principal, valor_causa, data_distribuicao, autor_principal, reu_principal, movement_count')
    .eq('tenant_id', ctx.tenantId)
    .eq('cnj', cnj)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  // Check cache unless force refresh
  if (!force) {
    const { data: cached } = await supabase
      .from('case_summaries')
      .select('content, generated_at, movement_count')
      .eq('case_id', caseData.id)
      .eq('summary_type', type)
      .maybeSingle()

    if (cached) {
      const daysSinceGeneration = (Date.now() - new Date(cached.generated_at).getTime()) / (1000 * 60 * 60 * 24)
      const hasNewMovements = caseData.movement_count > cached.movement_count
      const isFresh = !hasNewMovements && daysSinceGeneration <= STALE_DAYS

      if (isFresh) {
        return NextResponse.json({
          timeline: cached.content,
          generated_at: cached.generated_at,
          from_cache: true,
        })
      }
    }
  }

  // Fetch movements for AI generation
  const limit = type === 'timeline' ? 30 : 10
  const { data: movements } = await supabase
    .from('case_movements')
    .select('movement_date, description, type')
    .eq('case_id', caseData.id)
    .order('movement_date', { ascending: false })
    .limit(limit)

  if (!movements || movements.length === 0) {
    return NextResponse.json({ error: 'No movements found' }, { status: 404 })
  }

  const lastMovementDate = movements[0].movement_date

  if (type === 'timeline') {
    const timeline = await generateCaseTimeline(movements, {
      cnj: caseData.cnj,
      tribunal: caseData.tribunal ?? undefined,
      area: caseData.area ?? undefined,
      classe: caseData.classe ?? undefined,
      assunto: caseData.assunto_principal ?? undefined,
      partes: [caseData.autor_principal, caseData.reu_principal].filter(Boolean).join(' vs '),
      valor_causa: caseData.valor_causa ? `R$ ${caseData.valor_causa}` : undefined,
      data_distribuicao: caseData.data_distribuicao ?? undefined,
    })

    if (!timeline) return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })

    // Upsert cached summary
    await supabase
      .from('case_summaries')
      .upsert({
        tenant_id: ctx.tenantId,
        case_id: caseData.id,
        summary_type: 'timeline',
        content: timeline,
        movement_count: caseData.movement_count,
        last_movement_date: lastMovementDate,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'case_id,summary_type' })

    return NextResponse.json({
      timeline,
      generated_at: new Date().toISOString(),
      from_cache: false,
    })
  }

  // Default: movement summary + classification
  const result = await summarizeMovements(movements, {
    cnj: caseData.cnj,
    tribunal: caseData.tribunal ?? undefined,
    area: caseData.area ?? undefined,
    classe: caseData.classe ?? undefined,
    assunto: caseData.assunto_principal ?? undefined,
  })

  if (!result) return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })

  // Cache the summary text
  await supabase
    .from('case_summaries')
    .upsert({
      tenant_id: ctx.tenantId,
      case_id: caseData.id,
      summary_type: 'movements',
      content: result.summary,
      movement_count: caseData.movement_count,
      last_movement_date: lastMovementDate,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'case_id,summary_type' })

  return NextResponse.json({ ...result, generated_at: new Date().toISOString(), from_cache: false })
}
