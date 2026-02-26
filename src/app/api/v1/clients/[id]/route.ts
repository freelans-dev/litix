import { NextRequest, NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  tipo_pessoa: z.enum(['fisica', 'juridica']).optional(),
  documento: z.string().regex(/^\d{11}$|^\d{14}$/).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address_line: z.string().max(300).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().length(2).nullable().optional(),
  zip_code: z.string().max(10).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

// GET /api/v1/clients/:id — get client detail with case count
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Count linked cases
  const { count } = await supabase
    .from('monitored_cases')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id)

  return NextResponse.json({ ...client, case_count: count ?? 0 })
}

// PATCH /api/v1/clients/:id — update client
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowedRoles = ['owner', 'admin', 'member']
  if (!allowedRoles.includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 422 })
  }

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Check duplicate documento if changed
  if (updates.documento) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('documento', updates.documento as string)
      .neq('id', id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Documento ja cadastrado para outro cliente' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/v1/clients/:id — soft delete (set is_active=false)
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowedRoles = ['owner', 'admin', 'member']
  if (!allowedRoles.includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { error } = await supabase
    .from('clients')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
