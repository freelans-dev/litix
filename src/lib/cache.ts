import { kv } from '@vercel/kv'

// TTL: 5 minutos
const CACHE_TTL = 300

export async function getCachedProcess(
  tenantId: string,
  cnj: string
): Promise<Record<string, unknown> | null> {
  try {
    return await kv.get<Record<string, unknown>>(`process:${tenantId}:${cnj}`)
  } catch {
    return null
  }
}

export async function setCachedProcess(
  tenantId: string,
  cnj: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await kv.set(`process:${tenantId}:${cnj}`, data, { ex: CACHE_TTL })
  } catch {
    // KV not configured in dev — ignore silently
  }
}

export async function invalidateProcessCache(
  tenantId: string,
  cnj: string
): Promise<void> {
  try {
    await kv.del(`process:${tenantId}:${cnj}`)
  } catch {
    // ignore
  }
}
