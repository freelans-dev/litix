import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth'
import { formatCNJ } from '@/lib/crypto'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MonitorToggle } from '@/features/cases/components/monitor-toggle'
import { RefreshButton } from '@/features/cases/components/refresh-button'
import {
  ArrowLeft,
  Bell,
  BellOff,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Scale,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ cnj: string }>
}): Promise<Metadata> {
  const { cnj } = await props.params
  return { title: `Processo ${formatCNJ(cnj)} — Litix` }
}

export default async function CaseDetailPage(props: {
  params: Promise<{ cnj: string }>
}) {
  const { cnj } = await props.params
  const ctx = await getTenantContext()
  const supabase = await createClient()

  // Load case
  const { data: caseData } = await supabase
    .from('monitored_cases')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('cnj', cnj)
    .maybeSingle()

  if (!caseData) notFound()

  // Load recent alerts for this case
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('case_id', caseData.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const alertTypeLabel: Record<string, string> = {
    new_movement: 'Nova movimentação',
    deadline_approaching: 'Prazo se aproximando',
    status_change: 'Mudança de status',
  }

  const alertTypeBorder: Record<string, string> = {
    new_movement: 'border-l-primary',
    deadline_approaching: 'border-l-[var(--alert-warning)]',
    status_change: 'border-l-destructive',
  }

  const alertTypeBg: Record<string, string> = {
    new_movement: 'bg-primary/5',
    deadline_approaching: 'bg-amber-500/5',
    status_change: 'bg-destructive/5',
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb + actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/cases"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            Processos
          </Link>
          <h1 className="text-xl font-bold font-mono tracking-wide cnj">
            {formatCNJ(caseData.cnj)}
          </h1>
          {caseData.tribunal && (
            <p className="text-sm text-muted-foreground mt-0.5">{caseData.tribunal}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <RefreshButton caseId={caseData.id} cnj={caseData.cnj} />
          <MonitorToggle
            caseId={caseData.id}
            enabled={caseData.monitor_enabled}
          />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard
          icon={<Scale size={16} />}
          label="Tribunal"
          value={caseData.tribunal ?? 'Não identificado'}
        />
        <InfoCard
          icon={<FileText size={16} />}
          label="Provider principal"
          value={caseData.provider ?? 'Automático'}
          badge
        />
        <InfoCard
          icon={<Clock size={16} />}
          label="Última consulta"
          value={
            caseData.last_checked_at
              ? formatDistanceToNow(new Date(caseData.last_checked_at), {
                  addSuffix: true,
                  locale: ptBR,
                })
              : 'Nunca consultado'
          }
        />
        <InfoCard
          icon={<Calendar size={16} />}
          label="Cadastrado em"
          value={format(new Date(caseData.created_at), "d 'de' MMMM 'de' yyyy", {
            locale: ptBR,
          })}
        />
      </div>

      {/* Monitoring status banner */}
      <div
        className={`rounded-lg border p-4 flex items-center gap-3 ${
          caseData.monitor_enabled
            ? 'border-success/30 bg-success/5'
            : 'border-border bg-muted/30'
        }`}
      >
        {caseData.monitor_enabled ? (
          <>
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
            <p className="text-sm">
              <span className="font-medium text-success">Monitoramento ativo.</span>{' '}
              <span className="text-muted-foreground">
                O Litix verifica este processo em todos os providers automaticamente. Você será
                alertado em até 1 hora após qualquer movimentação.
              </span>
            </p>
          </>
        ) : (
          <>
            <BellOff size={16} className="text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Monitoramento pausado. Ative para receber alertas automáticos de movimentações.
            </p>
          </>
        )}
      </div>

      {/* Providers consulted */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ExternalLink size={14} />
          Providers de dados
        </h2>
        <div className="flex flex-wrap gap-2">
          {['DataJud', 'Codilo', 'Escavador', 'Judit', 'Predictus'].map((p) => (
            <span
              key={p}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                caseData.provider === p.toLowerCase()
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {p}
              {caseData.provider === p.toLowerCase() && (
                <span className="ml-1 text-[10px]">(principal)</span>
              )}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          O Litix consulta todos os providers em paralelo e unifica os resultados. Em caso de
          falha de um provider, os demais garantem cobertura.
        </p>
      </div>

      {/* Alerts / Movement history */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Bell size={16} />
            Histórico de movimentações
            {alerts && alerts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {alerts.length}
              </Badge>
            )}
          </h2>
        </div>

        {alerts && alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`relative rounded-lg border-l-4 border border-border pl-4 pr-4 py-3.5 ${
                  alertTypeBorder[alert.type] ?? 'border-l-border'
                } ${alertTypeBg[alert.type] ?? ''} ${!alert.read ? 'bg-primary/3' : ''}`}
              >
                {!alert.read && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-primary" />
                )}
                <div className="flex items-start justify-between gap-4 pr-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {alertTypeLabel[alert.type] ?? alert.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-0.5">{alert.title}</p>
                    {alert.body && (
                      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                        {alert.body}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(alert.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                  {' · '}
                  {format(new Date(alert.created_at), "d MMM yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-card p-10 text-center">
            <Bell size={28} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium">Nenhuma movimentação registrada ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              {caseData.monitor_enabled
                ? 'O Litix está monitorando e vai alertar quando houver novidades.'
                : 'Ative o monitoramento para receber alertas automáticos.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
  badge,
}: {
  icon: React.ReactNode
  label: string
  value: string
  badge?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      {badge ? (
        <Badge variant="outline" className="text-xs font-normal">
          {value}
        </Badge>
      ) : (
        <p className="text-sm font-medium">{value}</p>
      )}
    </div>
  )
}
