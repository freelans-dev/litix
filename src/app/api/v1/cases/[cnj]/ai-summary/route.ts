import { NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { summarizeMovements, generateCaseTimeline } from '@/lib/ai-summarizer'

/**
 * POST /api/v1/cases/:cnj/ai-summary
 * Generates AI-powered summary and classification of case movements.
 * Body: { type: 'movements' | 'timeline' }
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ cnj: string }> }
) {
  const { cnj } = await props.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const type = (body as { type?: string }).type ?? 'movements'

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: caseData } = await supabase
    .from('monitored_cases')
    .select('id, cnj, tribunal, area, classe, assunto_principal, valor_causa, data_distribuicao, autor_principal, reu_principal')
    .eq('tenant_id', ctx.tenantId)
    .eq('cnj', cnj)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

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
    return NextResponse.json({ timeline })
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
  return NextResponse.json(result)
}
