import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type TenantContext = {
  tenantId: string
  userId: string
  memberId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  plan: string
}

/**
 * Gets the current tenant context.
 * JWT claims (tenant_id, role, member_id) come from the Supabase Auth Hook when configured.
 * Plan is always read from the DB to ensure it reflects the latest value.
 * Falls back to DB lookup for tenant_id/role/member_id when Auth Hook is not yet configured.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  const metadata = user.app_metadata as Record<string, string>

  // Fast path: Auth Hook already injected tenant_id into JWT
  let tenantId = metadata.tenant_id
  let memberId = metadata.member_id
  let role = metadata.role as TenantContext['role']

  // Fallback: Auth Hook not configured — look up from DB
  if (!tenantId) {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const service = createServiceClient()
    const { data: m } = await service
      .from('tenant_members')
      .select('tenant_id, role, id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!m) redirect('/auth/login')
    tenantId = m.tenant_id
    memberId = m.id
    role = m.role as TenantContext['role']
  }

  // Always fetch plan from DB — never trust JWT for billing-sensitive data
  const { createServiceClient } = await import('@/lib/supabase/service')
  const service = createServiceClient()
  const { data: tenant } = await service
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .single()

  return {
    tenantId,
    userId: user.id,
    memberId,
    role: role ?? 'viewer',
    plan: tenant?.plan ?? 'free',
  }
}

/**
 * Require a specific role or above.
 * Role hierarchy: owner > admin > member > viewer
 */
const ROLE_LEVELS: Record<TenantContext['role'], number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
}

export function requireRole(
  context: TenantContext,
  minRole: TenantContext['role']
): void {
  if (ROLE_LEVELS[context.role] < ROLE_LEVELS[minRole]) {
    throw new Response('Forbidden', { status: 403 })
  }
}
