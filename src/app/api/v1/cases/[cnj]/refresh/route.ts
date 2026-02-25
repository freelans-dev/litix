import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantContext } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { fetchCaseFromJudit } from '@/lib/judit-fetch'

// POST /api/v1/cases/:caseId/refresh — trigger immediate consultation from Judit
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ cnj: string }> }
) {
  const { cnj: caseId } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = await checkRateLimit(ctx.tenantId, ctx.plan as 'free' | 'solo' | 'escritorio' | 'pro' | 'enterprise')
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const supabase = createServiceClient()

  // Verify case belongs to tenant
  const { data: caseData } = await supabase
    .from('monitored_cases')
    .select('id, cnj')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', caseId)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch from Judit and update record
  const juditData = await fetchCaseFromJudit(caseData.cnj)

  if (juditData) {
    await supabase
      .from('monitored_cases')
      .update({
        tribunal: juditData.tribunal ?? null,
        area: juditData.area,
        classe: juditData.classe,
        assunto_principal: juditData.assunto_principal,
        juiz: juditData.juiz,
        valor_causa: juditData.valor_causa,
        data_distribuicao: juditData.data_distribuicao,
        status: juditData.status,
        partes_json: juditData.partes_json,
        provider: juditData.provider,
        last_checked_at: new Date().toISOString(),
        movement_count: juditData.movimentos?.length ?? 0,
      })
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
  }

  await supabase
    .from('monitored_cases')
    .update({ last_checked_at: new Date().toISOString() })
    .eq('id', caseData.id)

  return NextResponse.json({ queued: true, cnj: caseData.cnj, updated: !!juditData })
}
