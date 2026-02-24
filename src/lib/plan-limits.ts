import { kv } from '@vercel/kv'
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

export async function checkPlanLimit(
  tenantId: string,
  limitType: LimitType
): Promise<{ allowed: boolean; current: number; max: number; percentage: number }> {
  const cacheKey = `plan_limits:${tenantId}`
  let limits = await kv.get<PlanLimitsCache>(cacheKey)

  if (!limits) {
    const supabase = createServiceClient()
    const { data } = await supabase.rpc('get_tenant_usage', { p_tenant_id: tenantId } as unknown as undefined)
    limits = data as unknown as PlanLimitsCache
    await kv.set(cacheKey, limits, { ex: 3600 }) // 1 hour cache
  }

  const max = limits[limitType] as number
  const current = limits[`current_${limitType}` as keyof PlanLimitsCache] as number
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
  await kv.del(`plan_limits:${tenantId}`)
}
