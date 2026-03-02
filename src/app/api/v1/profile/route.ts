import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth'
import { createTenantClient } from '@/lib/supabase/tenant'
import { z } from 'zod'

const schema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().optional(),
})

export async function GET() {
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, oab_number, oab_state')
    .eq('id', ctx.userId)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const ctx = await getTenantContext()
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)
  const { error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', ctx.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
