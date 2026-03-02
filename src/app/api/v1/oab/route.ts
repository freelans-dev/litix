import { NextRequest, NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { tasks } from '@trigger.dev/sdk/v3'
import { z } from 'zod'

const ESTADOS_VALIDOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

const schema = z.object({
  oab_number: z
    .string()
    .regex(/^\d+$/, 'Apenas números')
    .refine((v) => parseInt(v) >= 1 && parseInt(v) <= 999999, 'Número OAB deve ser entre 1 e 999999'),
  oab_state: z.string().refine((v) => ESTADOS_VALIDOS.includes(v.toUpperCase()), 'UF inválida'),
})

// GET /api/v1/oab — list OAB import jobs for tenant
export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data, error } = await supabase
    .from('oab_imports')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// POST /api/v1/oab — trigger OAB import job
export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only Solo+ plans can use OAB import
  if (ctx.plan === 'free') {
    return NextResponse.json(
      { error: 'OAB import requires Solo plan or higher', upgrade_url: '/pricing' },
      { status: 402 }
    )
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { oab_number, oab_state } = parsed.data
  const oabUf = oab_state.toUpperCase()

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Check plan limit: max_oab_per_member
  const { createServiceClient } = await import('@/lib/supabase/service')
  const service = createServiceClient()
  const { data: planLimit } = await service
    .from('plan_limits')
    .select('max_oab_per_member')
    .eq('plan', ctx.plan)
    .single()

  const maxOab = planLimit?.max_oab_per_member ?? 1

  if (maxOab !== -1) {
    // Count distinct OAB combinations (by oab_number + oab_uf) for this member
    const { data: existingImports } = await supabase
      .from('oab_imports')
      .select('oab_number, oab_uf')
      .eq('tenant_id', ctx.tenantId)
      .eq('member_id', ctx.memberId)

    if (existingImports) {
      const distinct = new Set(
        existingImports.map((r) => `${r.oab_number}|${r.oab_uf}`)
      )
      // Check if this OAB combo is already registered
      const isNew = !distinct.has(`${oab_number}|${oabUf}`)
      if (isNew && distinct.size >= maxOab) {
        return NextResponse.json(
          {
            error: `Limite de ${maxOab} OAB${maxOab !== 1 ? 's' : ''} por membro atingido. Faça upgrade do plano.`,
            upgrade_url: '/pricing',
          },
          { status: 402 }
        )
      }
    }
  }

  // Prevent duplicate running imports for same OAB
  const { data: running } = await supabase
    .from('oab_imports')
    .select('id, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('oab_number', oab_number)
    .eq('oab_uf', oabUf)
    .in('status', ['pending', 'running'])
    .maybeSingle()

  if (running) {
    return NextResponse.json(
      { error: 'Import already in progress for this OAB', import_id: running.id },
      { status: 409 }
    )
  }

  // Create import record
  const { data: importRecord, error } = await supabase
    .from('oab_imports')
    .insert({
      tenant_id: ctx.tenantId,
      member_id: ctx.memberId,
      oab_number,
      oab_uf: oabUf,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Dispatch background import via Trigger.dev
  try {
    await tasks.trigger('oab-import', {
      importId: importRecord.id,
      tenantId: ctx.tenantId,
      memberId: ctx.memberId,
      oabNumber: oab_number,
      oabUf: oabUf,
    })
  } catch (err) {
    // TRIGGER_SECRET_KEY not set (local dev) — log and continue
    console.warn('[oab] Trigger.dev dispatch skipped (TRIGGER_SECRET_KEY not configured):', err)
  }

  return NextResponse.json(importRecord, { status: 201 })
}

// DELETE /api/v1/oab?oab_number=123456&oab_uf=SP
// Remove an import record (only if not pending/running)
// Imported cases are NOT removed
export async function DELETE(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const oab_number = searchParams.get('oab_number')
  const oab_uf = searchParams.get('oab_uf')

  if (!oab_number || !oab_uf) {
    return NextResponse.json({ error: 'oab_number and oab_uf required' }, { status: 400 })
  }

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Only delete imports from the current member, and only if not in progress
  const { error } = await supabase
    .from('oab_imports')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('member_id', ctx.memberId)
    .eq('oab_number', oab_number)
    .eq('oab_uf', oab_uf.toUpperCase())
    .not('status', 'in', '("pending","running")')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
