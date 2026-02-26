import type { Metadata } from 'next'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { FileText, Bell, Activity, Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'Início' }

async function getStats(tenantId: string, userId: string) {
  const supabase = await createTenantClient(tenantId, userId)

  const [casesResult, alertsResult, unreadResult] = await Promise.all([
    supabase.from('monitored_cases').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('read', false),
    supabase.from('monitored_cases').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('monitor_enabled', true),
  ])

  return {
    totalCases: casesResult.count ?? 0,
    alertsToday: alertsResult.count ?? 0,
    unreadAlerts: unreadResult.count ?? 0,
  }
}

export default async function DashboardPage() {
  const ctx = await getTenantContext()
  const stats = await getStats(ctx.tenantId, ctx.userId)

  const statCards = [
    { label: 'Total de Processos', value: stats.totalCases, icon: FileText, color: 'text-primary' },
    { label: 'Alertas Hoje', value: stats.alertsToday, icon: Bell, color: 'text-alert-warning' },
    { label: 'Não Lidos', value: stats.unreadAlerts, icon: Activity, color: 'text-alert-critical' },
    { label: 'Próximos 7 dias', value: '—', icon: Clock, color: 'text-muted-foreground' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Início</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral dos seus processos e alertas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {card.label}
                </p>
                <Icon size={16} className={card.color} />
              </div>
              <p className="text-3xl font-bold">{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Empty state if no cases */}
      {stats.totalCases === 0 && (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center space-y-3">
          <FileText size={40} className="mx-auto text-muted-foreground/40" />
          <div>
            <p className="font-medium">Nenhum processo ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre seu número de OAB para importar seus processos automaticamente, ou busque um processo pelo número CNJ.
            </p>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <a
              href="/dashboard/settings/profile"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary border border-primary/30 rounded-md px-4 py-2 hover:bg-primary/5 transition-colors"
            >
              Cadastrar OAB
            </a>
            <a
              href="/dashboard/cases/search"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground border rounded-md px-4 py-2 hover:bg-muted transition-colors"
            >
              Buscar por CNJ
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
