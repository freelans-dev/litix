import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth'
import Stripe from 'stripe'
import { z } from 'zod'

const PRICE_IDS: Record<string, string> = {
  solo: process.env.STRIPE_PRICE_SOLO ?? '',
  escritorio: process.env.STRIPE_PRICE_ESCRITORIO ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
}

const schema = z.object({
  plan: z.enum(['solo', 'escritorio', 'pro']),
})

// POST /api/v1/billing/checkout — create Stripe Checkout session
export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { plan } = parsed.data
  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return NextResponse.json({ error: `Price ID for "${plan}" not configured` }, { status: 503 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' })
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id, name')
    .eq('id', ctx.tenantId)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', ctx.userId)
    .single()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer: tenant?.stripe_customer_id ?? undefined,
    customer_email: !tenant?.stripe_customer_id ? (profile?.email ?? undefined) : undefined,
    success_url: `${baseUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=1`,
    cancel_url: `${baseUrl}/pricing`,
    metadata: {
      tenant_id: ctx.tenantId,
      plan,
    },
    subscription_data: {
      metadata: {
        tenant_id: ctx.tenantId,
        plan,
      },
    },
  })

  return NextResponse.json({ url: session.url })
}
