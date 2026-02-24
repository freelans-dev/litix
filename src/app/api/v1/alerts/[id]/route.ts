import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth'

// PATCH /api/v1/alerts/:id — mark single alert read/unread
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const isRead: boolean = body.read
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('alerts')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ read: isRead } as any)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
