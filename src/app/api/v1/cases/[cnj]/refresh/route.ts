import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

// POST /api/v1/cases/:caseId/refresh — trigger immediate consultation
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ cnj: string }> }
) {
  const { cnj: caseId } = await context.params
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = await checkRateLimit(ctx.tenantId, ctx.plan as 'free' | 'solo' | 'escritorio' | 'pro' | 'enterprise')
  if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const supabase = await createClient()

  // Verify case belongs to tenant
  const { data: caseData } = await supabase
    .from('monitored_cases')
    .select('id, cnj')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', caseId)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update last_checked_at to trigger re-check on next monitoring cycle
  // In production, this would enqueue a Trigger.dev task for immediate refresh
  await supabase
    .from('monitored_cases')
    .update({ last_checked_at: new Date().toISOString() })
    .eq('id', caseData.id)

  return NextResponse.json({ queued: true, cnj: caseData.cnj })
}
