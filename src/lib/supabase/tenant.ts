import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client with a custom JWT containing tenant_id.
 * This client respects RLS policies — defense-in-depth for multi-tenant isolation.
 *
 * Use in user-facing API routes AFTER authenticating via getTenantContext().
 * Even if a developer forgets `.eq('tenant_id', ...)`, RLS will block cross-tenant access.
 *
 * Requires SUPABASE_JWT_SECRET env var (from Supabase Dashboard > Settings > API).
 */
export async function createTenantClient(tenantId: string, userId: string) {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET
  if (!jwtSecret) {
    throw new Error(
      'SUPABASE_JWT_SECRET is required for tenant-scoped client. ' +
      'Get it from Supabase Dashboard > Settings > API > JWT Secret.'
    )
  }

  const secret = new TextEncoder().encode(jwtSecret)

  const token = await new SignJWT({
    sub: userId,
    role: 'authenticated',
    tenant_id: tenantId,
    aud: 'authenticated',
    iss: 'supabase',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
