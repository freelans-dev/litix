import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Webhook, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Logs de Delivery — Litix' }
export const dynamic = 'force-dynamic'

const STATUS_CONFIG = {
  success: { label: 'Sucesso', icon: CheckCircle, color: 'text-success', badge: 'default' as const },
  failed: { label: 'Falhou', icon: XCircle, color: 'text-destructive', badge: 'destructive' as const },
  pending: { label: 'Pendente', icon: Clock, color: 'text-amber-500', badge: 'secondary' as const },
  dead_letter: { label: 'Dead Letter', icon: AlertTriangle, color: 'text-destructive', badge: 'destructive' as const },
}

export default async function WebhookDeliveryLogPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Get endpoint details
  const { data: endpoint } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (!endpoint) notFound()

  // Get delivery logs
  const { data: deliveries } = await supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('endpoint_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  const successCount = deliveries?.filter((d) => d.status === 'success').length ?? 0
  const failedCount = deliveries?.filter((d) => d.status === 'failed' || d.status === 'dead_letter').length ?? 0
  const totalCount = deliveries?.length ?? 0

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings/webhooks"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft size={14} />
          Webhooks
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Webhook size={18} />
              {endpoint.name}
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{endpoint.url}</p>
          </div>
          <Badge variant={endpoint.is_active ? 'default' : 'secondary'}>
            {endpoint.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={totalCount} />
        <StatCard label="Sucesso" value={successCount} className="text-success" />
        <StatCard label="Falhas" value={failedCount} className="text-destructive" />
      </div>

      {/* Delivery list */}
      {deliveries && deliveries.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Ultimas entregas
          </h2>
          {deliveries.map((d) => {
            const config = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.pending
            const Icon = config.icon

            return (
              <div key={d.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon size={16} className={`${config.color} mt-0.5 shrink-0`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={config.badge} className="text-xs">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {d.event_type}
                        </span>
                        {d.attempt_count > 1 && (
                          <span className="text-xs text-muted-foreground">
                            ({d.attempt_count} tentativa{d.attempt_count > 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                      {d.last_response_status && (
                        <p className="text-xs text-muted-foreground mt-1">
                          HTTP {d.last_response_status}
                          {d.last_response_body && (
                            <span className="ml-2 font-mono">
                              {d.last_response_body.length > 80
                                ? d.last_response_body.substring(0, 80) + '...'
                                : d.last_response_body}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(d.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {format(new Date(d.created_at), "dd/MM HH:mm:ss")}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center space-y-2">
          <Webhook size={28} className="text-muted-foreground/30 mx-auto" />
          <p className="font-medium">Nenhuma entrega registrada</p>
          <p className="text-sm text-muted-foreground">
            As entregas aparecerao aqui quando houver movimentacoes em processos monitorados.
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${className ?? ''}`}>{value}</p>
    </div>
  )
}
