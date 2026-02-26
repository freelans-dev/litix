import { NextRequest, NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2).max(200),
  tipo_pessoa: z.enum(['fisica', 'juridica']).optional(),
  documento: z.string().regex(/^\d{11}$|^\d{14}$/, 'Documento deve ser CPF (11 digitos) ou CNPJ (14 digitos)').optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(20).optional(),
  address_line: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2, 'UF deve ter 2 caracteres').optional(),
  zip_code: z.string().max(10).optional(),
  notes: z.string().max(2000).optional(),
})

// GET /api/v1/clients — list clients for tenant
export async function GET(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')
  const active = searchParams.get('active') !== 'false' // default true
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = (page - 1) * limit

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (active) query = query.eq('is_active', true)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}

// POST /api/v1/clients — create a client
export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only owner, admin, member can create
  const allowedRoles = ['owner', 'admin', 'member']
  if (!allowedRoles.includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden: viewers cannot create clients' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Check for duplicate documento in same tenant
  if (parsed.data.documento) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id, name')
      .eq('tenant_id', ctx.tenantId)
      .eq('documento', parsed.data.documento)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `Cliente com este documento ja existe: ${existing.name}`, existing_id: existing.id },
        { status: 409 }
      )
    }
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      tenant_id: ctx.tenantId,
      ...parsed.data,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
