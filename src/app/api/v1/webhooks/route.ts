import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantContext } from '@/lib/auth'
import { generateWebhookSecret } from '@/lib/crypto'
import { z } from 'zod'

const PLAN_LIMITS: Record<string, number> = {
  free: 0, solo: 1, escritorio: 5, pro: 20, enterprise: -1,
}

const schema = z.object({
  name: z.string().min(2).max(80),
  url: z.string().url(),
  events: z.array(z.enum(['process.movement', 'process.deadline', 'process.status', 'process.updated'])).min(1),
})

// GET /api/v1/webhooks
export async function GET(_req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('id, name, url, events, is_active, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/v1/webhooks
export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = ctx.plan ?? 'free'
  const limit = PLAN_LIMITS[plan] ?? 0

  if (limit === 0) {
    return NextResponse.json({ error: 'Webhooks not available on free plan', upgrade_url: '/pricing' }, { status: 402 })
  }

  const supabase = createServiceClient()

  if (limit !== -1) {
    const { count } = await supabase
      .from('webhook_endpoints')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)

    if ((count ?? 0) >= limit) {
      return NextResponse.json({ error: `Webhook limit reached (${limit} on ${plan} plan)` }, { status: 402 })
    }
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const secret = generateWebhookSecret()
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      tenant_id: ctx.tenantId,
      name: parsed.data.name,
      url: parsed.data.url,
      events: parsed.data.events,
      secret,
      created_by: ctx.userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
