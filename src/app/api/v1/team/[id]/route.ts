import { NextRequest, NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext, checkRole } from '@/lib/auth'

// DELETE /api/v1/team/:memberId — remove member
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const denied = checkRole(ctx, 'admin')
  if (denied) return denied

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Prevent removing owner
  const { data: member } = await supabase
    .from('tenant_members')
    .select('role, user_id')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .single()

  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove owner' }, { status: 403 })
  }
  if (member.user_id === ctx.userId) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 403 })
  }

  const { error } = await supabase
    .from('tenant_members')
    .update({ is_active: false })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
