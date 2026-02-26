import type { Metadata } from 'next'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { WebhookList } from '@/features/webhooks/components/webhook-list'
import { CreateWebhookForm } from '@/features/webhooks/components/create-webhook-form'
import { Badge } from '@/components/ui/badge'
import { Webhook, Lock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Webhooks — Litix' }
export const dynamic = 'force-dynamic'

const PLAN_WEBHOOK_LIMIT: Record<string, number> = {
  free: 0,
  solo: 1,
  escritorio: 5,
  pro: 20,
  enterprise: -1,
}

export default async function WebhooksPage() {
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })

  const plan = ctx.plan ?? 'free'
  const limit = PLAN_WEBHOOK_LIMIT[plan] ?? 0
  const count = endpoints?.length ?? 0
  const canCreate = limit === -1 || count < limit

  if (plan === 'free') {
    return (
      <div className="p-6 max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Webhook size={20} />
          Webhooks
        </h1>

        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Lock size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Webhooks disponíveis no plano Solo ou superior
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
                Receba notificações em tempo real no seu sistema, Astrea, Projuris, planilhas
                ou qualquer URL via HTTP POST com payload HMAC assinado.
              </p>
            </div>
          </div>
          <Button size="sm" asChild>
            <Link href="/pricing">Ver planos</Link>
          </Button>
        </div>

        <WebhookExplainer />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Webhook size={20} />
            Webhooks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Receba notificações em tempo real quando houver movimentações nos seus processos.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {count} / {limit === -1 ? '∞' : limit}
        </Badge>
      </div>

      {canCreate && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Novo endpoint</h2>
          <CreateWebhookForm tenantId={ctx.tenantId} />
        </div>
      )}

      {!canCreate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-4 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Limite de webhooks atingido ({limit} no plano {plan})
          </p>
          <p className="text-amber-700 dark:text-amber-300/80 mt-0.5">
            Faça upgrade ou remova um endpoint existente.
          </p>
        </div>
      )}

      {endpoints && endpoints.length > 0 ? (
        <WebhookList endpoints={endpoints} />
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center space-y-2">
          <Webhook size={28} className="text-muted-foreground/30 mx-auto" />
          <p className="font-medium">Nenhum webhook configurado</p>
          <p className="text-sm text-muted-foreground">
            Crie um endpoint acima para começar a receber notificações automáticas.
          </p>
        </div>
      )}

      <WebhookExplainer />
    </div>
  )
}

function WebhookExplainer() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h3 className="text-sm font-semibold">Como os webhooks funcionam</h3>
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Quando o Litix detecta uma movimentação em um processo monitorado, envia uma
          requisição <code className="bg-muted px-1 rounded text-xs">POST</code> para todos
          os seus endpoints ativos com o payload em JSON.
        </p>
        <div className="rounded-md bg-muted p-3 font-mono text-xs overflow-x-auto">
          {`{
  "event": "process.movement",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "cnj": "0000001-12.2023.8.26.0001",
    "tribunal": "TJSP",
    "movement": "Julgado procedente...",
    "provider": "datajud"
  }
}`}
        </div>
        <p>
          Cada requisição inclui o header{' '}
          <code className="bg-muted px-1 rounded text-xs">X-Litix-Signature</code> com
          assinatura HMAC-SHA256 para verificação de autenticidade.
        </p>
        <p>
          Em caso de falha na entrega, o Litix tenta novamente com backoff exponencial (até
          72 horas).
        </p>
      </div>
    </div>
  )
}
