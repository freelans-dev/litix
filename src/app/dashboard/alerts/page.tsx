import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth'
import { formatCNJ } from '@/lib/crypto'
import { Bell, BellOff, FileText, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Alertas' }

const ALERT_ICONS = {
  new_movement: FileText,
  deadline_approaching: Clock,
  status_change: Bell,
}

const ALERT_COLORS = {
  new_movement: 'alert-movement',
  deadline_approaching: 'alert-deadline',
  status_change: 'alert-movement',
}

export default async function AlertsPage(props: {
  searchParams: Promise<{ filter?: string }>
}) {
  const searchParams = await props.searchParams
  const ctx = await getTenantContext()
  const supabase = await createClient()

  let query = supabase
    .from('alerts')
    .select('*')
    .eq('member_id', ctx.memberId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (searchParams.filter === 'unread') query = query.eq('read', false)
  if (searchParams.filter === 'deadline') query = query.eq('type', 'deadline_approaching')

  const { data: alerts } = await query

  const { count: unreadCount } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', ctx.memberId)
    .eq('read', false)

  // Load case data for all unique case_ids
  const caseIds = [...new Set((alerts ?? []).map((a) => a.case_id))]
  const { data: cases } = caseIds.length
    ? await supabase
        .from('monitored_cases')
        .select('id, cnj, tribunal')
        .in('id', caseIds)
    : { data: [] }

  const caseMap = new Map((cases ?? []).map((c) => [c.id, c]))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
          {unreadCount ? (
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="text-alert-critical font-medium">
                {unreadCount} não lido{unreadCount !== 1 ? 's' : ''}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">Tudo em dia</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Todos', value: undefined },
          { label: 'Não lidos', value: 'unread' },
          { label: 'Prazos', value: 'deadline' },
        ].map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/dashboard/alerts?filter=${f.value}` : '/dashboard/alerts'}
            className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
              searchParams.filter === f.value || (!searchParams.filter && !f.value)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Alert list */}
      {alerts && alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const Icon = ALERT_ICONS[alert.type as keyof typeof ALERT_ICONS] ?? Bell
            const colorClass = ALERT_COLORS[alert.type as keyof typeof ALERT_COLORS] ?? ''
            const caseData = caseMap.get(alert.case_id)

            return (
              <div
                key={alert.id}
                className={`rounded-lg border bg-card p-4 ${colorClass} ${
                  !alert.read ? 'bg-primary/[0.02]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 p-1.5 rounded-md ${
                      !alert.read ? 'bg-primary/10' : 'bg-muted'
                    }`}
                  >
                    <Icon
                      size={14}
                      className={!alert.read ? 'text-primary' : 'text-muted-foreground'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium ${
                          !alert.read ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {alert.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!alert.read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(alert.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {alert.body}
                    </p>
                    {caseData && (
                      <Link
                        href={`/dashboard/cases/${caseData.cnj}`}
                        className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                      >
                        <FileText size={11} />
                        <span className="cnj">{formatCNJ(caseData.cnj)}</span>
                        {caseData.tribunal && (
                          <span className="text-muted-foreground">
                            · {caseData.tribunal}
                          </span>
                        )}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center space-y-3">
          <BellOff size={40} className="mx-auto text-muted-foreground/40" />
          <div>
            <p className="font-medium">Sem alertas</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchParams.filter === 'unread'
                ? 'Você leu todos os alertas.'
                : 'Ative o monitoramento em um processo para receber alertas de movimentação.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
