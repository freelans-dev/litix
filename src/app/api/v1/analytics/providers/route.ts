import { NextResponse } from 'next/server'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'

/**
 * GET /api/v1/analytics/providers — aggregated provider usage data (last 30 days)
 */
export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  // Fetch all queries from last 30 days
  const { data: queries, error } = await supabase
    .from('provider_queries')
    .select('provider, status, duration_ms, completeness_score, cost_estimate_brl, tribunal, source_flow, created_at')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = queries ?? []

  // 1. Usage per provider
  const byProvider: Record<string, { count: number; cost: number; avgCompleteness: number; completenessSum: number; completenessCount: number }> = {}
  for (const q of rows) {
    const p = q.provider
    if (!byProvider[p]) byProvider[p] = { count: 0, cost: 0, avgCompleteness: 0, completenessSum: 0, completenessCount: 0 }
    byProvider[p].count++
    byProvider[p].cost += q.cost_estimate_brl ?? 0
    if (q.completeness_score != null) {
      byProvider[p].completenessSum += q.completeness_score
      byProvider[p].completenessCount++
    }
  }
  const providerUsage = Object.entries(byProvider).map(([provider, v]) => ({
    provider,
    count: v.count,
    cost: Math.round(v.cost * 100) / 100,
    avgCompleteness: v.completenessCount > 0 ? Math.round((v.completenessSum / v.completenessCount) * 100) / 100 : null,
  }))

  // 2. Daily usage (for area chart)
  const byDay: Record<string, Record<string, number>> = {}
  for (const q of rows) {
    const day = q.created_at.substring(0, 10)
    if (!byDay[day]) byDay[day] = {}
    byDay[day][q.provider] = (byDay[day][q.provider] ?? 0) + 1
  }
  const dailyUsage = Object.entries(byDay)
    .map(([date, providers]) => ({ date, ...providers }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 3. Success rate per provider
  const statusByProvider: Record<string, Record<string, number>> = {}
  for (const q of rows) {
    if (!statusByProvider[q.provider]) statusByProvider[q.provider] = {}
    statusByProvider[q.provider][q.status] = (statusByProvider[q.provider][q.status] ?? 0) + 1
  }
  const successRates = Object.entries(statusByProvider).map(([provider, statuses]) => {
    const total = Object.values(statuses).reduce((a, b) => a + b, 0)
    const success = statuses['success'] ?? 0
    return {
      provider,
      total,
      success,
      rate: total > 0 ? Math.round((success / total) * 100) : 0,
      statuses,
    }
  })

  // 4. Top tribunals per provider
  const tribunalMap: Record<string, Record<string, number>> = {}
  for (const q of rows) {
    if (!q.tribunal) continue
    const key = q.tribunal
    if (!tribunalMap[key]) tribunalMap[key] = {}
    tribunalMap[key][q.provider] = (tribunalMap[key][q.provider] ?? 0) + 1
  }
  const topTribunals = Object.entries(tribunalMap)
    .map(([tribunal, providers]) => ({
      tribunal,
      total: Object.values(providers).reduce((a, b) => a + b, 0),
      providers,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  // 5. Summary stats
  const totalQueries = rows.length
  const totalCost = rows.reduce((sum, q) => sum + (q.cost_estimate_brl ?? 0), 0)
  const datajudQueries = rows.filter(q => q.provider === 'datajud' && q.status === 'success').length
  const juditAvgCost = (byProvider['judit']?.cost ?? 0) / Math.max(byProvider['judit']?.count ?? 1, 1)
  const estimatedSavings = datajudQueries * juditAvgCost
  const avgCompleteness = rows.filter(q => q.completeness_score != null).length > 0
    ? rows.filter(q => q.completeness_score != null).reduce((sum, q) => sum + (q.completeness_score ?? 0), 0)
      / rows.filter(q => q.completeness_score != null).length
    : null

  return NextResponse.json({
    summary: {
      totalQueries,
      totalCost: Math.round(totalCost * 100) / 100,
      estimatedSavings: Math.round(estimatedSavings * 100) / 100,
      avgCompleteness: avgCompleteness != null ? Math.round(avgCompleteness * 100) : null,
    },
    providerUsage,
    dailyUsage,
    successRates,
    topTribunals,
  })
}
