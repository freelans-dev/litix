import { NextRequest, NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantContext, checkRole } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
})

const PLAN_LIMITS: Record<string, number> = {
  free: 1, solo: 1, escritorio: 10, pro: 30, enterprise: -1,
}

// POST /api/v1/team/invite
export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const denied = checkRole(ctx, 'admin')
  if (denied) return denied

  const plan = ctx.plan ?? 'free'
  const limit = PLAN_LIMITS[plan] ?? 1

  if (limit === 1) {
    return NextResponse.json(
      { error: 'Multi-user not available on this plan', upgrade_url: '/pricing' },
      { status: 402 }
    )
  }

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Check user limit (tenant-scoped client for data query)
  if (limit !== -1) {
    const { count } = await supabase
      .from('tenant_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: `User limit reached (${limit} on ${plan} plan)` },
        { status: 402 }
      )
    }
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Invite via Supabase Auth admin API (requires service_role)
  const serviceClient = createServiceClient()
  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { invited_role: parsed.data.role, tenant_id: ctx.tenantId },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite`,
    }
  )

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email: parsed.data.email })
}
