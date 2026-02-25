/**
 * Webhook dispatcher — finds active endpoints, signs payloads, delivers with retry,
 * and tracks delivery records in webhook_deliveries.
 *
 * Designed as fire-and-forget (no await needed from caller).
 * Retry: 3 attempts with exponential backoff (0s, 2s, 8s).
 * Timeout: 10s per attempt.
 * After max retries: marks delivery as dead_letter.
 */

import { createServiceClient } from '@/lib/supabase/service'
import { signWebhookPayload } from '@/lib/crypto'
import { buildWebhookPayload } from '@/lib/webhook-payload'

const MAX_ATTEMPTS = 3
const BACKOFF_MS = [0, 2000, 8000]
const TIMEOUT_MS = 10_000
const RESPONSE_BODY_MAX = 1000

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

interface Endpoint {
  id: string
  url: string
  secret: string
  events: string[]
}

/**
 * Dispatch webhooks to all active endpoints for a tenant that subscribe to the event type.
 * Call without await — runs in the background.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function dispatchWebhooks(
  tenantId: string,
  eventType: string,
  caseRow: Record<string, any>,
  movements: Array<Record<string, any>>
): Promise<void> {
  try {
    const supabase = createServiceClient()

    // Find active endpoints for this tenant
    const { data: endpoints, error } = await supabase
      .from('webhook_endpoints')
      .select('id, url, secret, events')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (error || !endpoints || endpoints.length === 0) return

    // Filter to endpoints that subscribe to this event type
    const matching = (endpoints as Endpoint[]).filter((ep) =>
      ep.events.includes(eventType)
    )
    if (matching.length === 0) return

    // Build payload once
    const payload = buildWebhookPayload(eventType, caseRow, movements)
    const payloadStr = JSON.stringify(payload)

    // Deliver to all matching endpoints in parallel
    await Promise.allSettled(
      matching.map((ep) =>
        deliverToEndpoint(supabase, ep, tenantId, eventType, payloadStr)
      )
    )
  } catch (err) {
    // Webhook dispatch must never crash the caller
    console.error('[webhook-dispatcher] Unhandled error:', err)
  }
}

async function deliverToEndpoint(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  endpoint: Endpoint,
  tenantId: string,
  eventType: string,
  payloadStr: string
): Promise<void> {
  // Create delivery record
  const { data: delivery, error: insertErr } = await supabase
    .from('webhook_deliveries')
    .insert({
      tenant_id: tenantId,
      endpoint_id: endpoint.id,
      event_type: eventType,
      payload: JSON.parse(payloadStr),
      status: 'pending',
      attempt_count: 0,
    })
    .select('id')
    .single()

  if (insertErr || !delivery) {
    console.error('[webhook-dispatcher] Failed to create delivery record:', insertErr)
    return
  }

  const deliveryId = delivery.id as string
  const signature = signWebhookPayload(payloadStr, endpoint.secret)

  let lastStatus: number | null = null
  let lastBody = ''
  let success = false
  let actualAttempts = 0

  // Retry loop
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(BACKOFF_MS[attempt])
    actualAttempts = attempt + 1

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Litix-Signature': `sha256=${signature}`,
          'X-Litix-Event': eventType,
          'X-Litix-Delivery': deliveryId,
        },
        body: payloadStr,
        signal: controller.signal,
      })

      clearTimeout(timeout)
      lastStatus = response.status
      lastBody = await response.text().catch(() => '')
      if (lastBody.length > RESPONSE_BODY_MAX) lastBody = lastBody.slice(0, RESPONSE_BODY_MAX)

      if (response.status >= 200 && response.status < 300) {
        success = true
        break
      }
    } catch (err) {
      lastBody = err instanceof Error ? err.message : 'Unknown error'
      lastStatus = null
    }
  }

  const now = new Date().toISOString()

  if (success) {
    // Update delivery as success
    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'success',
        attempt_count: actualAttempts,
        last_response_status: lastStatus,
        last_response_body: lastBody,
        delivered_at: now,
      })
      .eq('id', deliveryId)

    // Update endpoint: reset failure count
    await supabase
      .from('webhook_endpoints')
      .update({
        last_delivery_at: now,
        last_delivery_status: 'success',
        failure_count: 0,
      })
      .eq('id', endpoint.id)
  } else {
    // All retries exhausted — dead letter
    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'dead_letter',
        attempt_count: actualAttempts,
        last_response_status: lastStatus,
        last_response_body: lastBody,
      })
      .eq('id', deliveryId)

    // Increment endpoint failure count
    const { data: ep } = await supabase
      .from('webhook_endpoints')
      .select('failure_count')
      .eq('id', endpoint.id)
      .single()

    await supabase
      .from('webhook_endpoints')
      .update({
        last_delivery_at: now,
        last_delivery_status: 'failed',
        failure_count: ((ep?.failure_count as number) ?? 0) + 1,
      })
      .eq('id', endpoint.id)
  }
}
