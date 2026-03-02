import { NextResponse } from 'next/server'
import { getTenantContext, checkRole } from '@/lib/auth'
import { createTenantClient } from '@/lib/supabase/tenant'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
})

/**
 * PATCH /api/v1/api-keys/:id — Update API key name or status (admin+)
 */
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const ctx = await getTenantContext()
  const denied = checkRole(ctx, 'admin')
  if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 422 })
  }

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: key, error } = await supabase
    .from('api_keys')
    .update(parsed.data)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select('id, name, key_prefix, is_active, last_used_at, created_at')
    .single()

  if (error || !key) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 })
  }

  return NextResponse.json(key)
}

/**
 * DELETE /api/v1/api-keys/:id — Revoke API key (admin+)
 */
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const ctx = await getTenantContext()
  const denied = checkRole(ctx, 'admin')
  if (denied) return denied

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
