import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantContext } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  monitor_enabled: z.boolean(),
})

// PATCH /api/v1/cases/:cnj/monitor
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ cnj: string }> }
) {
  const { cnj: caseId } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('monitored_cases')
    .update({ monitor_enabled: parsed.data.monitor_enabled })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', caseId) // params.cnj here is the case id passed from monitor-toggle.tsx
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
