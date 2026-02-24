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
 * Gets the current tenant context from JWT claims injected by the Supabase Auth Hook.
 * Redirects to /auth/login if not authenticated.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  const metadata = user.app_metadata as Record<string, string>

  return {
    tenantId: metadata.tenant_id,
    userId: user.id,
    memberId: metadata.member_id,
    role: (metadata.role ?? 'viewer') as TenantContext['role'],
    plan: metadata.plan ?? 'free',
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
