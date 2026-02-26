import type { Metadata } from 'next'
import Link from 'next/link'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { FileText, Bell, Activity, Clock, ArrowRight, AlertCircle } from 'lucide-react'
import { formatCNJ } from '@/lib/crypto'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Início' }

async function getDashboardData(tenantId: string, userId: string) {
  const supabase = await createTenantClient(tenantId, userId)
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString()
  const yesterday = new Date(Date.now() - 86400000).toISOString()

  const [casesResult, alertsResult, unreadResult, deadlinesResult, recentCases, recentAlerts] =
    await Promise.all([
      supabase
        .from('monitored_cases')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', yesterday),
      supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('read', false),
      supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('type', 'deadline_approaching')
        .eq('read', false)
        .lte('created_at', in7days),
      supabase
        .from('monitored_cases')
        .select('id, cnj, tribunal, nome_caso, status, ultimo_step_date, classe')
        .eq('tenant_id', tenantId)
        .order('ultimo_step_date', { ascending: false, nullsFirst: false })
        .limit(5),
      supabase
        .from('alerts')
        .select('id, type, title, body, created_at, read, case_id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  return {
    totalCases: casesResult.count ?? 0,
    alertsToday: alertsResult.count ?? 0,
    unreadAlerts: unreadResult.count ?? 0,
    upcomingDeadlines: deadlinesResult.count ?? 0,
    recentCases: recentCases.data ?? [],
    recentAlerts: (recentAlerts.data ?? []) as Array<{
      id: string; type: string; title: string; body: string
      created_at: string; read: boolean; case_id: string
    }>,
  }
}

const ALERT_TYPE_COLORS: Record<string, string> = {
  new_movement: 'text-primary',
  deadline_approaching: 'text-amber-500',
  status_change: 'text-blue-500',
}

export default async function DashboardPage() {
  const ctx = await getTenantContext()
  const data = await getDashboardData(ctx.tenantId, ctx.userId)

  const statCards = [
    { label: 'Total de Processos', value: data.totalCases, icon: FileText, color: 'text-primary' },
    { label: 'Alertas Hoje', value: data.alertsToday, icon: Bell, color: 'text-alert-warning' },
    { label: 'Não Lidos', value: data.unreadAlerts, icon: Activity, color: 'text-alert-critical' },
    { label: 'Prazos (7 dias)', value: data.upcomingDeadlines, icon: Clock, color: 'text-muted-foreground' },
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

      {/* Empty state */}
      {data.totalCases === 0 ? (
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
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent cases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Processos com movimentação recente</h2>
              <Link
                href="/dashboard/cases"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {data.recentCases.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum processo com movimentação.</p>
              ) : (
                data.recentCases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/cases/${c.cnj}`}
                    className="block rounded-lg border bg-card p-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-muted-foreground">{formatCNJ(c.cnj)}</p>
                        {c.nome_caso && (
                          <p className="text-sm font-medium truncate mt-0.5">{c.nome_caso}</p>
                        )}
                        {c.classe && !c.nome_caso && (
                          <p className="text-sm font-medium truncate mt-0.5">{c.classe}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {c.tribunal && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">{c.tribunal}</Badge>
                          )}
                        </div>
                      </div>
                      {c.ultimo_step_date && (
                        <p className="text-xs text-muted-foreground shrink-0 mt-0.5">
                          {formatDistanceToNow(new Date(c.ultimo_step_date), { addSuffix: true, locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent alerts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Alertas recentes</h2>
              <Link
                href="/dashboard/alerts"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {data.recentAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum alerta ainda.</p>
              ) : (
                data.recentAlerts.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-lg border p-3 flex gap-3 ${a.read ? 'bg-card' : 'bg-card border-primary/20'}`}
                  >
                    <AlertCircle
                      size={15}
                      className={`shrink-0 mt-0.5 ${ALERT_TYPE_COLORS[a.type] ?? 'text-muted-foreground'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title ?? 'Alerta'}</p>
                      {a.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0 mt-0.5">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
