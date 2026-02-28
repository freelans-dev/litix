import type { Metadata } from 'next'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { BarChart3, DollarSign, Zap, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AnalyticsCharts } from '@/features/analytics/analytics-charts'

export const metadata: Metadata = { title: 'Analytics — Litix' }
export const dynamic = 'force-dynamic'

interface ProviderStats {
  provider: string
  count: number
  cost: number
  avgCompleteness: number | null
}

interface TribunalStats {
  tribunal: string
  total: number
  providers: Record<string, number>
}

interface SuccessRate {
  provider: string
  total: number
  success: number
  rate: number
  statuses: Record<string, number>
}

async function getAnalyticsData(tenantId: string, userId: string) {
  const supabase = await createTenantClient(tenantId, userId)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const { data: queries } = await supabase
    .from('provider_queries')
    .select('provider, status, duration_ms, completeness_score, cost_estimate_brl, tribunal, created_at')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })

  const rows = queries ?? []

  // Provider usage
  const byProvider: Record<string, { count: number; cost: number; compSum: number; compCount: number }> = {}
  for (const q of rows) {
    const p = q.provider
    if (!byProvider[p]) byProvider[p] = { count: 0, cost: 0, compSum: 0, compCount: 0 }
    byProvider[p].count++
    byProvider[p].cost += q.cost_estimate_brl ?? 0
    if (q.completeness_score != null) {
      byProvider[p].compSum += q.completeness_score
      byProvider[p].compCount++
    }
  }
  const providerUsage: ProviderStats[] = Object.entries(byProvider).map(([provider, v]) => ({
    provider,
    count: v.count,
    cost: Math.round(v.cost * 100) / 100,
    avgCompleteness: v.compCount > 0 ? Math.round((v.compSum / v.compCount) * 100) / 100 : null,
  }))

  // Daily usage
  const byDay: Record<string, Record<string, number>> = {}
  for (const q of rows) {
    const day = q.created_at.substring(0, 10)
    if (!byDay[day]) byDay[day] = {}
    byDay[day][q.provider] = (byDay[day][q.provider] ?? 0) + 1
  }
  const dailyUsage = Object.entries(byDay)
    .map(([date, providers]) => ({ date, ...providers }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Success rates
  const statusByProvider: Record<string, Record<string, number>> = {}
  for (const q of rows) {
    if (!statusByProvider[q.provider]) statusByProvider[q.provider] = {}
    statusByProvider[q.provider][q.status] = (statusByProvider[q.provider][q.status] ?? 0) + 1
  }
  const successRates: SuccessRate[] = Object.entries(statusByProvider).map(([provider, statuses]) => {
    const total = Object.values(statuses).reduce((a, b) => a + b, 0)
    const success = statuses['success'] ?? 0
    return { provider, total, success, rate: total > 0 ? Math.round((success / total) * 100) : 0, statuses }
  })

  // Top tribunals
  const tribunalMap: Record<string, Record<string, number>> = {}
  for (const q of rows) {
    if (!q.tribunal) continue
    if (!tribunalMap[q.tribunal]) tribunalMap[q.tribunal] = {}
    tribunalMap[q.tribunal][q.provider] = (tribunalMap[q.tribunal][q.provider] ?? 0) + 1
  }
  const topTribunals: TribunalStats[] = Object.entries(tribunalMap)
    .map(([tribunal, providers]) => ({
      tribunal,
      total: Object.values(providers).reduce((a, b) => a + b, 0),
      providers,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15)

  // Summary
  const totalQueries = rows.length
  const totalCost = rows.reduce((sum, q) => sum + (q.cost_estimate_brl ?? 0), 0)
  const datajudSuccess = rows.filter(q => q.provider === 'datajud' && q.status === 'success').length
  const juditAvgCost = (byProvider['judit']?.cost ?? 0) / Math.max(byProvider['judit']?.count ?? 1, 1)
  const estimatedSavings = datajudSuccess * juditAvgCost
  const compRows = rows.filter(q => q.completeness_score != null)
  const avgCompleteness = compRows.length > 0
    ? compRows.reduce((sum, q) => sum + (q.completeness_score ?? 0), 0) / compRows.length
    : null

  return {
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
  }
}

const PROVIDER_COLORS: Record<string, string> = {
  datajud: 'text-emerald-600',
  judit: 'text-blue-600',
  codilo: 'text-purple-600',
  escavador: 'text-amber-600',
  predictus: 'text-rose-600',
}

const PROVIDER_BG: Record<string, string> = {
  datajud: 'bg-emerald-500/10 border-emerald-500/30',
  judit: 'bg-blue-500/10 border-blue-500/30',
  codilo: 'bg-purple-500/10 border-purple-500/30',
  escavador: 'bg-amber-500/10 border-amber-500/30',
  predictus: 'bg-rose-500/10 border-rose-500/30',
}

export default async function AnalyticsPage() {
  const ctx = await getTenantContext()
  const data = await getAnalyticsData(ctx.tenantId, ctx.userId)

  const statCards = [
    {
      label: 'Total Consultas',
      value: data.summary.totalQueries.toLocaleString('pt-BR'),
      sub: 'Últimos 30 dias',
      icon: BarChart3,
      color: 'text-primary',
    },
    {
      label: 'Custo Total',
      value: `R$ ${data.summary.totalCost.toFixed(2)}`,
      sub: 'Estimativa',
      icon: DollarSign,
      color: 'text-amber-500',
    },
    {
      label: 'Economia DataJud',
      value: `R$ ${data.summary.estimatedSavings.toFixed(2)}`,
      sub: 'Consultas gratuitas',
      icon: Zap,
      color: 'text-emerald-500',
    },
    {
      label: 'Completeness',
      value: data.summary.avgCompleteness != null ? `${data.summary.avgCompleteness}%` : '—',
      sub: 'Média de preenchimento',
      icon: Target,
      color: 'text-blue-500',
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics de Providers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uso, custo e qualidade dos dados por provider nos últimos 30 dias
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-lg border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {card.label}
                </p>
                <Icon size={16} className={card.color} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </div>
          )
        })}
      </div>

      {data.summary.totalQueries === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center space-y-3">
          <BarChart3 size={40} className="mx-auto text-muted-foreground/40" />
          <div>
            <p className="font-medium">Nenhuma consulta registrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Dados de analytics aparecerão aqui conforme processos forem cadastrados e monitorados.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Provider Usage */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-sm">Uso por Provider</h2>
            <div className="space-y-3">
              {data.providerUsage
                .sort((a, b) => b.count - a.count)
                .map((p) => {
                  const maxCount = Math.max(...data.providerUsage.map(x => x.count))
                  const pct = maxCount > 0 ? (p.count / maxCount) * 100 : 0
                  return (
                    <div key={p.provider} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${PROVIDER_BG[p.provider] ?? ''} ${PROVIDER_COLORS[p.provider] ?? ''}`}>
                            {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
                          </Badge>
                          <span className="font-medium">{p.count}</span>
                          <span className="text-muted-foreground">consultas</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>R$ {p.cost.toFixed(2)}</span>
                          {p.avgCompleteness != null && (
                            <span>{Math.round(p.avgCompleteness * 100)}% completeness</span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            p.provider === 'datajud' ? 'bg-emerald-500' :
                            p.provider === 'judit' ? 'bg-blue-500' :
                            p.provider === 'codilo' ? 'bg-purple-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Charts (client component with recharts) */}
          <AnalyticsCharts
            dailyUsage={data.dailyUsage}
            providers={data.providerUsage.map(p => p.provider)}
          />

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Success Rates */}
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <h2 className="font-semibold text-sm">Taxa de Sucesso</h2>
              <div className="space-y-3">
                {data.successRates
                  .sort((a, b) => b.total - a.total)
                  .map((s) => (
                    <div key={s.provider} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${PROVIDER_BG[s.provider] ?? ''} ${PROVIDER_COLORS[s.provider] ?? ''}`}>
                          {s.provider.charAt(0).toUpperCase() + s.provider.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-medium">{s.rate}%</span>
                        <span className="text-muted-foreground">{s.success}/{s.total}</span>
                        {s.statuses['error'] && (
                          <span className="text-destructive">{s.statuses['error']} erros</span>
                        )}
                        {s.statuses['not_found'] && (
                          <span className="text-amber-500">{s.statuses['not_found']} not found</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top Tribunals */}
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <h2 className="font-semibold text-sm">Top Tribunais</h2>
              {data.topTribunals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum tribunal registrado.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.topTribunals.map((t) => (
                    <div key={t.tribunal} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono font-medium text-xs">{t.tribunal}</span>
                        <span className="text-xs text-muted-foreground">{t.total}</span>
                      </div>
                      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                        {Object.entries(t.providers).map(([provider, count]) => {
                          const pct = t.total > 0 ? (count / t.total) * 100 : 0
                          return (
                            <div
                              key={provider}
                              className={`h-full ${
                                provider === 'datajud' ? 'bg-emerald-500' :
                                provider === 'judit' ? 'bg-blue-500' :
                                provider === 'codilo' ? 'bg-purple-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${pct}%` }}
                              title={`${provider}: ${count} (${Math.round(pct)}%)`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
