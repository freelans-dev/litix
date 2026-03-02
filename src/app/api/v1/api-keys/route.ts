import { NextResponse } from 'next/server'
import { getTenantContext, checkRole } from '@/lib/auth'
import { createTenantClient } from '@/lib/supabase/tenant'
import { generateApiKey } from '@/lib/api-keys'
import { z } from 'zod'

/**
 * GET /api/v1/api-keys — List API keys for current tenant
 */
export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, is_active, last_used_at, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ data: keys ?? [] })
}

const createSchema = z.object({
  name: z.string().min(1).max(100).default('Default'),
})

/**
 * POST /api/v1/api-keys — Create a new API key (admin+)
 * Returns the plaintext key exactly once.
 */
export async function POST(request: Request) {
  const ctx = await getTenantContext()
  const denied = checkRole(ctx, 'admin')
  if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 422 })
  }

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Check limit (max 5 active keys per tenant)
  const { count } = await supabase
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 active API keys per tenant' }, { status: 402 })
  }

  const { plaintext, hash, prefix } = generateApiKey()

  const { data: key, error } = await supabase
    .from('api_keys')
    .insert({
      tenant_id: ctx.tenantId,
      member_id: ctx.memberId,
      name: parsed.data.name,
      key_hash: hash,
      key_prefix: prefix,
    })
    .select('id, name, key_prefix, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }

  return NextResponse.json({
    ...key,
    api_key: plaintext,
    warning: 'Store this key securely. It will not be shown again.',
  }, { status: 201 })
}
