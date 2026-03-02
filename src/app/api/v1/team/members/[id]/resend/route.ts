import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, checkRole } from '@/lib/auth'
import { createTenantClient } from '@/lib/supabase/tenant'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/v1/team/members/:id/resend
// Reenvia convite para membro com accepted_at IS NULL
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ctx = await getTenantContext()

  const denied = checkRole(ctx, 'admin')
  if (denied) return denied

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)
  const { data: member } = await supabase
    .from('tenant_members')
    .select('user_id, role, accepted_at')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (member.accepted_at) {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 400 })
  }

  // Get user email
  const service = createServiceClient()
  const {
    data: { user },
  } = await service.auth.admin.getUserById(member.user_id)
  if (!user?.email) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { error } = await service.auth.admin.inviteUserByEmail(user.email, {
    data: { invited_role: member.role, tenant_id: ctx.tenantId },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
