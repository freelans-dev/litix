import { NextRequest, NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { runOabImport } from '@/lib/oab-import'
import { z } from 'zod'

const schema = z.object({
  oab_number: z.string().min(3).regex(/^\d+$/),
  oab_state: z.string().length(2),
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

  // Fire-and-forget background import
  runOabImport(importRecord.id).catch((err) => {
    console.error(`[oab] Background import failed for ${importRecord.id}:`, err)
  })

  return NextResponse.json(importRecord, { status: 201 })
}
