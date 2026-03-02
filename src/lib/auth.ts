import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export type TenantContext = {
  tenantId: string
  userId: string
  memberId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  plan: string
}

/**
 * Gets the current tenant context.
 * Supports two auth methods:
 * 1. API key: Bearer ltx_... header → resolved via api_keys table
 * 2. Session: Supabase Auth JWT → resolved via auth hook or DB fallback
 */
export async function getTenantContext(): Promise<TenantContext> {
  // API key auth path
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  if (authHeader?.startsWith('Bearer ltx_')) {
    const { hashApiKey, resolveApiKey, recordApiKeyUsage } = await import('@/lib/api-keys')
    const keyHash = hashApiKey(authHeader.slice(7))
    const ctx = await resolveApiKey(keyHash)
    if (!ctx) {
      throw new ApiKeyError('Invalid or inactive API key')
    }
    recordApiKeyUsage(ctx.keyId).catch(() => {})
    return ctx
  }

  // Session auth path
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

/**
 * Check if the user has the required role level.
 * Returns a NextResponse with 403 if insufficient, or null if OK.
 * Usage: const denied = checkRole(ctx, 'admin'); if (denied) return denied;
 */
export function checkRole(
  context: TenantContext,
  minRole: TenantContext['role']
): NextResponse | null {
  if (ROLE_LEVELS[context.role] < ROLE_LEVELS[minRole]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/**
 * @deprecated Use checkRole() instead. This throws which doesn't work properly in Route Handlers.
 */
export function requireRole(
  context: TenantContext,
  minRole: TenantContext['role']
): void {
  if (ROLE_LEVELS[context.role] < ROLE_LEVELS[minRole]) {
    throw new Error('Forbidden: insufficient role')
  }
}

/**
 * Error thrown when API key authentication fails.
 * Route handlers should catch this and return 401 JSON.
 */
export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiKeyError'
  }
}
