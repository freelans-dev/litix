import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantContext } from '@/lib/auth'
import { dispatchWebhooks } from '@/lib/webhook-dispatcher'
import { z } from 'zod'

const patchSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  cliente: z.string().max(200).optional(),
  responsavel: z.string().max(200).optional(),
  setor: z.string().max(100).optional(),
  contingencia: z.enum(['ativa', 'passiva']).optional(),
  probabilidade: z.enum(['provavel', 'possivel', 'remota']).optional(),
  risco: z.enum(['baixo', 'medio', 'alto', 'critico']).optional(),
  faixa: z.string().max(100).optional(),
  resultado: z.string().max(500).optional(),
  desfecho: z.string().max(500).optional(),
  provisionamento: z.number().min(0).optional(),
  reserva: z.number().min(0).optional(),
  relacionamento: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

// GET /api/v1/cases/:cnj
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ cnj: string }> }
) {
  const { cnj } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('monitored_cases')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('cnj', cnj)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

// PATCH /api/v1/cases/:cnj — update manual office fields
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ cnj: string }> }
) {
  const { cnj } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only owner, admin, member can edit (viewer cannot)
  const allowedRoles = ['owner', 'admin', 'member']
  if (!allowedRoles.includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden: viewers cannot edit cases' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Filter out undefined fields so we only update what was sent
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 422 })
  }

  updates.updated_at = new Date().toISOString()

  const supabase = createServiceClient()

  // Auto-sync: when client_id is set, populate cliente TEXT with client name
  if (updates.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', updates.client_id as string)
      .single()
    if (client) updates.cliente = client.name
  } else if (updates.client_id === null) {
    // Client unlinked — clear cliente TEXT too
    updates.cliente = null
  }

  const { data, error } = await supabase
    .from('monitored_cases')
    .update(updates)
    .eq('tenant_id', ctx.tenantId)
    .eq('cnj', cnj)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Dispatch process.updated webhook (fire-and-forget)
  dispatchWebhooks(ctx.tenantId, 'process.updated', data, [])

  return NextResponse.json(data)
}

// DELETE /api/v1/cases/:cnj
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ cnj: string }> }
) {
  const { cnj } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('monitored_cases')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('cnj', cnj)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
