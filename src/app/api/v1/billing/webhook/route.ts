import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { invalidatePlanCache } from '@/lib/plan-limits'

// Stripe needs raw body for signature verification — force Node.js runtime
export const runtime = 'nodejs'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key, { apiVersion: '2026-01-28.clover' })
}

/**
 * Map Stripe subscription status to our internal status.
 * Stripe statuses: active, past_due, canceled, unpaid, trialing, paused, incomplete, incomplete_expired
 * Our statuses: active, past_due, canceled, trialing, paused
 */
function mapStripeStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    trialing: 'trialing',
    paused: 'paused',
    incomplete: 'past_due',
    incomplete_expired: 'canceled',
  }
  return map[stripeStatus] ?? 'active'
}

/**
 * Get current_period_end from a subscription.
 * In Stripe SDK v20 (API 2026-01-28.clover) this moved from Subscription to SubscriptionItem.
 */
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0]
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000).toISOString()
  }
  return null
}

/**
 * Map Stripe plan price ID to our plan name.
 * Falls back to metadata.plan or 'free'.
 */
function resolvePlan(subscription: Stripe.Subscription): string {
  const metaPlan = subscription.metadata?.plan
  if (metaPlan && ['solo', 'escritorio', 'pro', 'enterprise'].includes(metaPlan)) {
    return metaPlan
  }

  // Try to resolve from price ID
  const priceId = subscription.items.data[0]?.price?.id
  if (priceId) {
    const envMap: Record<string, string> = {
      [process.env.STRIPE_PRICE_SOLO ?? '']: 'solo',
      [process.env.STRIPE_PRICE_ESCRITORIO ?? '']: 'escritorio',
      [process.env.STRIPE_PRICE_PRO ?? '']: 'pro',
      // Also check the _ID_ variants from .env.local
      [process.env.STRIPE_PRICE_ID_SOLO ?? '']: 'solo',
      [process.env.STRIPE_PRICE_ID_ESCRITORIO ?? '']: 'escritorio',
      [process.env.STRIPE_PRICE_ID_PRO ?? '']: 'pro',
    }
    delete envMap[''] // remove empty key
    if (envMap[priceId]) return envMap[priceId]
  }

  return 'free'
}

// ─── checkout.session.completed ──────────────────────────────────────────────
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenant_id
  if (!tenantId) {
    console.error('[webhook] checkout.session.completed missing tenant_id in metadata')
    return
  }

  const supabase = createServiceClient()
  const stripe = getStripe()

  // Set stripe_customer_id on tenant
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id

  if (customerId) {
    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenantId)
  }

  // Retrieve full subscription to get all fields
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id

  if (!subscriptionId) {
    console.error('[webhook] checkout.session.completed missing subscription')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const plan = resolvePlan(subscription)
  const priceId = subscription.items.data[0]?.price?.id ?? null

  // Upsert subscription row (one per tenant)
  await supabase
    .from('subscriptions')
    .upsert({
      tenant_id: tenantId,
      plan,
      status: mapStripeStatus(subscription.status),
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      stripe_current_period_end: getSubscriptionPeriodEnd(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    }, {
      onConflict: 'tenant_id',
    })

  // Update tenant plan
  await supabase
    .from('tenants')
    .update({ plan })
    .eq('id', tenantId)

  await invalidatePlanCache(tenantId)
  console.log(`[webhook] checkout completed: tenant=${tenantId} plan=${plan}`)
}

// ─── customer.subscription.updated ───────────────────────────────────────────
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenant_id
  if (!tenantId) {
    console.error('[webhook] subscription.updated missing tenant_id in metadata')
    return
  }

  const supabase = createServiceClient()
  const plan = resolvePlan(subscription)
  const priceId = subscription.items.data[0]?.price?.id ?? null

  // Update subscription
  await supabase
    .from('subscriptions')
    .update({
      plan,
      status: mapStripeStatus(subscription.status),
      stripe_price_id: priceId,
      stripe_current_period_end: getSubscriptionPeriodEnd(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('stripe_subscription_id', subscription.id)

  // Sync tenant plan
  await supabase
    .from('tenants')
    .update({ plan })
    .eq('id', tenantId)

  await invalidatePlanCache(tenantId)
  console.log(`[webhook] subscription updated: tenant=${tenantId} plan=${plan} status=${subscription.status}`)
}

// ─── customer.subscription.deleted ───────────────────────────────────────────
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenant_id
  const supabase = createServiceClient()

  // If no tenant_id in metadata, try to find by stripe_subscription_id
  let resolvedTenantId: string | undefined = tenantId
  if (!resolvedTenantId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('tenant_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()
    resolvedTenantId = (data as { tenant_id: string } | null)?.tenant_id
  }

  if (!resolvedTenantId) {
    console.error('[webhook] subscription.deleted: could not resolve tenant_id')
    return
  }

  // Mark subscription as canceled
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  // Downgrade tenant to free
  await supabase
    .from('tenants')
    .update({ plan: 'free' })
    .eq('id', resolvedTenantId)

  await invalidatePlanCache(resolvedTenantId)
  console.log(`[webhook] subscription deleted: tenant=${resolvedTenantId} downgraded to free`)
}

// ─── invoice.payment_failed ──────────────────────────────────────────────────
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // In Stripe SDK v20, subscription moved to invoice.parent.subscription_details
  const subDetails = invoice.parent?.subscription_details
  const subscriptionId = subDetails
    ? (typeof subDetails.subscription === 'string'
        ? subDetails.subscription
        : subDetails.subscription?.id)
    : undefined

  if (!subscriptionId) return

  const supabase = createServiceClient()

  // Update subscription status to past_due
  const { data: sub } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId)
    .select('tenant_id')
    .single()

  if (sub?.tenant_id) {
    await invalidatePlanCache(sub.tenant_id)
    console.log(`[webhook] payment failed: tenant=${sub.tenant_id} status=past_due`)
  }
}

// ─── POST /api/v1/billing/webhook ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
  }

  // Read raw body for signature verification
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    console.error(`[webhook] Signature verification failed: ${msg}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`[webhook] Unhandled event: ${event.type}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    console.error(`[webhook] Error handling ${event.type}: ${msg}`)
    // Return 200 anyway to prevent Stripe from retrying
    // (we log the error; business logic errors shouldn't block webhook delivery)
  }

  return NextResponse.json({ received: true })
}
