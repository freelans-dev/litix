import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantContext } from '@/lib/auth'

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
