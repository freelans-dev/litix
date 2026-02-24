import { createServiceClient } from '@/lib/supabase/service'

export type LimitType = 'max_cases' | 'max_users' | 'webhook_endpoints'

interface PlanLimitsCache {
  max_cases: number
  current_max_cases: number
  max_users: number
  current_max_users: number
  webhook_endpoints: number
  current_webhook_endpoints: number
  api_rate_limit: number
  plan: string
}

// KV is optional — only used in production when env vars are set
async function kvGet<T>(key: string): Promise<T | null> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  const { kv } = await import('@vercel/kv')
  return kv.get<T>(key)
}

async function kvSet(key: string, value: unknown, ex: number): Promise<void> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return
  const { kv } = await import('@vercel/kv')
  await kv.set(key, value, { ex })
}

async function kvDel(key: string): Promise<void> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return
  const { kv } = await import('@vercel/kv')
  await kv.del(key)
}

export async function checkPlanLimit(
  tenantId: string,
  limitType: LimitType
): Promise<{ allowed: boolean; current: number; max: number; percentage: number }> {
  const cacheKey = `plan_limits:${tenantId}`
  let limits = await kvGet<PlanLimitsCache>(cacheKey)

  if (!limits) {
    const supabase = createServiceClient()
    const { data } = await supabase.rpc('get_tenant_usage', { p_tenant_id: tenantId } as unknown as undefined)
    limits = data as unknown as PlanLimitsCache
    if (limits) {
      await kvSet(cacheKey, limits, 3600) // 1 hour cache
    }
  }

  if (!limits) {
    // RPC not available or returned null — allow the operation
    return { allowed: true, current: 0, max: -1, percentage: 0 }
  }

  const max = limits[limitType] as number
  const current = limits[`current_${limitType}` as keyof PlanLimitsCache] as number ?? 0
  const percentage = max === -1 ? 0 : Math.round((current / max) * 100)

  return {
    allowed: max === -1 || current < max,
    current,
    max,
    percentage,
  }
}

/**
 * Invalidates the plan limits cache for a tenant.
 * Call this after any operation that changes usage counts.
 */
export async function invalidatePlanCache(tenantId: string): Promise<void> {
  await kvDel(`plan_limits:${tenantId}`)
}
