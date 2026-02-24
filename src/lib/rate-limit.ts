import { kv } from '@vercel/kv'

const RATE_LIMITS: Record<string, number> = {
  free: 60,
  solo: 120,
  escritorio: 300,
  pro: 1000,
  enterprise: -1,
}

export async function checkRateLimit(
  tenantId: string,
  plan: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limit = RATE_LIMITS[plan] ?? 60
  if (limit === -1) return { allowed: true, remaining: -1, resetAt: 0 }

  const windowKey = Math.floor(Date.now() / 60000) // 1-minute sliding window
  const key = `rate:${tenantId}:${windowKey}`

  const count = await kv.incr(key)
  if (count === 1) await kv.expire(key, 60)

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: (windowKey + 1) * 60000,
  }
}
