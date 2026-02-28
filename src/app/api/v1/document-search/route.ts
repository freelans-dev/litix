import { NextRequest, NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { runDocumentSearch } from '@/lib/document-search'
import { z } from 'zod'

const schema = z.object({
  document_type: z.enum(['cpf', 'cnpj']),
  document_value: z.string().regex(/^\d{11}$|^\d{14}$/, 'CPF (11 dígitos) ou CNPJ (14 dígitos)'),
  client_id: z.string().uuid().optional(),
}).refine(
  (data) =>
    (data.document_type === 'cpf' && data.document_value.length === 11) ||
    (data.document_type === 'cnpj' && data.document_value.length === 14),
  { message: 'CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos' }
)

// GET /api/v1/document-search — list document search jobs for tenant
export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data, error } = await supabase
    .from('document_searches')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// POST /api/v1/document-search — trigger document search job
export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only Solo+ plans can use document search
  if (ctx.plan === 'free') {
    return NextResponse.json(
      { error: 'Busca por CPF/CNPJ requer plano Solo ou superior', upgrade_url: '/pricing' },
      { status: 402 }
    )
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { document_type, document_value, client_id } = parsed.data

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Prevent duplicate running searches for same document
  const { data: running } = await supabase
    .from('document_searches')
    .select('id, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('document_value', document_value)
    .in('status', ['pending', 'running'])
    .maybeSingle()

  if (running) {
    return NextResponse.json(
      { error: 'Busca já em andamento para este documento', search_id: running.id },
      { status: 409 }
    )
  }

  // Create search record
  const { data: searchRecord, error } = await supabase
    .from('document_searches')
    .insert({
      tenant_id: ctx.tenantId,
      member_id: ctx.memberId,
      document_type,
      document_value,
      client_id: client_id ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget background search
  runDocumentSearch(searchRecord.id).catch((err) => {
    console.error(`[document-search] Background search failed for ${searchRecord.id}:`, err)
  })

  return NextResponse.json(searchRecord, { status: 201 })
}
