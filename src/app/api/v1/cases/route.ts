import { NextRequest, NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantContext } from '@/lib/auth'
import { checkPlanLimit } from '@/lib/plan-limits'
import { checkRateLimit } from '@/lib/rate-limit'
import { isValidCNJ } from '@/lib/crypto'
import { buildCaseUpdateFromJudit } from '@/lib/judit-fetch'
import { fetchCase } from '@/lib/case-fetch'
import { dispatchWebhooks } from '@/lib/webhook-dispatcher'
import { z } from 'zod'

// GET /api/v1/cases — list monitored cases for tenant
export async function GET(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await checkRateLimit(ctx.tenantId, ctx.plan)
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')
  const monitor = searchParams.get('monitor')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = (page - 1) * limit

  let query = supabase
    .from('monitored_cases')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) query = query.ilike('cnj', `%${q.replace(/\D/g, '')}%`)
  if (monitor === 'true') query = query.eq('monitor_enabled', true)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}

// POST /api/v1/cases — add a case
const addSchema = z.object({
  cnj: z.string().min(20, 'CNJ must be at least 20 digits').max(25),
  tribunal: z.string().optional(),
  monitor_enabled: z.boolean().optional().default(true),
  provider: z.enum(['datajud', 'codilo', 'escavador', 'judit', 'predictus']).optional(),
})

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await checkRateLimit(ctx.tenantId, ctx.plan)
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  // Check plan limit
  const limitCheck = await checkPlanLimit(ctx.tenantId, 'max_cases')
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Case limit reached for your plan',
        limit: limitCheck.max,
        current: limitCheck.current,
        upgrade_url: '/pricing',
      },
      { status: 402 }
    )
  }

  const body = await req.json()
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { cnj, tribunal, monitor_enabled, provider } = parsed.data
  const digits = cnj.replace(/\D/g, '')

  if (!isValidCNJ(digits)) {
    return NextResponse.json({ error: 'Invalid CNJ format' }, { status: 422 })
  }

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Check for duplicates
  const { data: existing } = await supabase
    .from('monitored_cases')
    .select('id, cnj')
    .eq('tenant_id', ctx.tenantId)
    .eq('cnj', digits)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Case already monitored', cnj: existing.cnj },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('monitored_cases')
    .insert({
      tenant_id: ctx.tenantId,
      cnj: digits,
      tribunal: tribunal ?? null,
      provider: provider ?? null,
      monitor_enabled: monitor_enabled ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch process data via cascade (DataJud free → Judit paid) in background
  fetchCase(digits, { tenantId: ctx.tenantId, sourceFlow: 'case_register' }).then(async (result) => {
    if (!result) return
    const svc = createServiceClient()

    const updatePayload = buildCaseUpdateFromJudit(result.data, tribunal)
    await svc
      .from('monitored_cases')
      .update({ ...updatePayload, merged_from: result.providers })
      .eq('id', data.id)

    // Save movements to case_movements
    if (result.data.movimentos && result.data.movimentos.length > 0) {
      const movements = result.data.movimentos.map((m) => ({
        tenant_id: ctx.tenantId,
        case_id: data.id,
        movement_date: m.data,
        description: m.descricao,
        type: m.tipo ?? null,
        code: m.codigo ?? null,
        provider: result.data.provider,
      }))
      await svc.from('case_movements').upsert(movements, {
        onConflict: 'case_id,movement_date,description',
        ignoreDuplicates: true,
      })
    }

    // Dispatch webhooks with full case data
    const cutoff = new Date(Date.now() - 30_000).toISOString()
    const { data: newMovements } = await svc
      .from('case_movements')
      .select('*')
      .eq('case_id', data.id)
      .gte('detected_at', cutoff)

    if (newMovements && newMovements.length > 0) {
      const { data: updatedCase } = await svc
        .from('monitored_cases')
        .select('*')
        .eq('id', data.id)
        .single()

      if (updatedCase) {
        dispatchWebhooks(ctx.tenantId, 'process.movement', updatedCase, newMovements)
      }
    }
  }).catch(() => { /* background fetch failure is non-fatal */ })

  return NextResponse.json(data, { status: 201 })
}
