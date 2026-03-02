/**
 * API Key generation, hashing, and resolution.
 * Keys are stored as SHA-256 hashes — plaintext is shown once at creation.
 * Format: ltx_ + 32 bytes base64url (~43 chars total)
 */

import { createHash, randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import type { TenantContext } from '@/lib/auth'

export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString('base64url')
  const plaintext = `ltx_${raw}`
  const hash = createHash('sha256').update(plaintext).digest('hex')
  const prefix = plaintext.slice(0, 12) + '...'
  return { plaintext, hash, prefix }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Resolve an API key hash to a full TenantContext.
 * Uses service client (bypasses RLS) since lookup is by hash, not tenant-scoped.
 * Returns null if key is invalid, inactive, or expired.
 */
export async function resolveApiKey(keyHash: string): Promise<(TenantContext & { keyId: string }) | null> {
  const service = createServiceClient()

  const { data: key } = await service
    .from('api_keys')
    .select('id, tenant_id, member_id, is_active')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .maybeSingle()

  if (!key) return null

  // Get member details (role, user_id)
  const { data: member } = await service
    .from('tenant_members')
    .select('user_id, role')
    .eq('id', key.member_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!member) return null

  // Get tenant plan
  const { data: tenant } = await service
    .from('tenants')
    .select('plan')
    .eq('id', key.tenant_id)
    .single()

  return {
    tenantId: key.tenant_id,
    userId: member.user_id,
    memberId: key.member_id,
    role: (member.role as TenantContext['role']) ?? 'viewer',
    plan: tenant?.plan ?? 'free',
    keyId: key.id,
  }
}

/**
 * Update last_used_at timestamp. Fire-and-forget.
 */
export async function recordApiKeyUsage(keyId: string): Promise<void> {
  try {
    const service = createServiceClient()
    await service
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId)
  } catch {
    // Never block the request
  }
}
