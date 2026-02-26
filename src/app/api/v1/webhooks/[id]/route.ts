import { NextRequest, NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  url: z.string().url().optional(),
  events: z.array(z.enum(['process.movement', 'process.deadline', 'process.status', 'process.updated'])).optional(),
  is_active: z.boolean().optional(),
})

// PATCH /api/v1/webhooks/:id
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/v1/webhooks/:id
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)
  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
