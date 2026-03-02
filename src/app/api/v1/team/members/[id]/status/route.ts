import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, checkRole } from '@/lib/auth'
import { createTenantClient } from '@/lib/supabase/tenant'
import { z } from 'zod'

const schema = z.object({ is_active: z.boolean() })

// PATCH /api/v1/team/members/:id/status
// Body: { is_active: boolean }
// Admin não pode desativar owners ou outros admins
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ctx = await getTenantContext()

  const denied = checkRole(ctx, 'admin')
  if (denied) return denied

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)
  const { data: target } = await supabase
    .from('tenant_members')
    .select('user_id, role')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.user_id === ctx.userId) {
    return NextResponse.json({ error: 'Cannot change your own status' }, { status: 403 })
  }
  // Admin não pode desativar owners ou outros admins
  if (ctx.role === 'admin' && (target.role === 'owner' || target.role === 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { error } = await supabase
    .from('tenant_members')
    .update({ is_active: parsed.data.is_active })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
