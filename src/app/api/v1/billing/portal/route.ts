import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantContext } from '@/lib/auth'
import Stripe from 'stripe'

// POST /api/v1/billing/portal — create Stripe Customer Portal session
export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' })
  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id, name')
    .eq('id', ctx.tenantId)
    .single()

  if (!tenant?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No Stripe customer. Please subscribe to a plan first.' },
      { status: 400 }
    )
  }

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: returnUrl,
  })

  return NextResponse.json({ url: session.url })
}
