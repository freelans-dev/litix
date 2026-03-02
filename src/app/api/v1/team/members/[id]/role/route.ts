import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, checkRole } from '@/lib/auth'
import { createTenantClient } from '@/lib/supabase/tenant'
import { z } from 'zod'

const schema = z.object({ role: z.enum(['admin', 'member', 'viewer']) })

// PATCH /api/v1/team/members/:id/role
// Body: { role: 'admin' | 'member' | 'viewer' }
// Permissões:
//   - owner pode alterar qualquer role (exceto o próprio)
//   - admin NÃO pode alterar role (403)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ctx = await getTenantContext()

  // Apenas owner pode alterar roles
  const denied = checkRole(ctx, 'owner')
  if (denied) return denied

  // Não pode alterar o próprio role
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)
  const { data: target } = await supabase
    .from('tenant_members')
    .select('user_id, role')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.user_id === ctx.userId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { error } = await supabase
    .from('tenant_members')
    .update({ role: parsed.data.role })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
