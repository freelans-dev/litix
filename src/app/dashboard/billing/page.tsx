import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth'
import { ManageSubscriptionButton } from '@/features/billing/components/manage-subscription-button'
import { UpgradeButton } from '@/features/billing/components/upgrade-button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, CreditCard, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Assinatura — Litix' }
export const dynamic = 'force-dynamic'

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  solo: 'Solo',
  escritorio: 'Escritório',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const PLAN_LIMITS: Record<string, { cases: number; users: number; webhooks: number }> = {
  free:       { cases: 10,    users: 1,  webhooks: 0 },
  solo:       { cases: 200,   users: 1,  webhooks: 1 },
  escritorio: { cases: 1000,  users: 10, webhooks: 5 },
  pro:        { cases: 5000,  users: 30, webhooks: 20 },
  enterprise: { cases: -1,    users: -1, webhooks: -1 },
}

const NEXT_PLAN: Record<string, string | null> = {
  free: 'solo',
  solo: 'escritorio',
  escritorio: 'pro',
  pro: 'enterprise',
  enterprise: null,
}

const NEXT_PLAN_PRICE: Record<string, string> = {
  solo: 'R$ 59/mês',
  escritorio: 'R$ 249/mês',
  pro: 'R$ 599/mês',
  enterprise: 'Personalizado',
}

export default async function BillingPage() {
  const ctx = await getTenantContext()
  const supabase = await createClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .then(({ data }) => ({ data: data?.[0] ?? null }))

  const { data: usage } = await supabase
    .rpc('get_tenant_usage', { p_tenant_id: ctx.tenantId })
    .then(({ data }) => ({ data: data as { cases: { current: number; max: number }; users: { current: number; max: number } } | null }))

  const plan = ctx.plan ?? 'free'
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const nextPlan = NEXT_PLAN[plan]

  const isActive = subscription?.status === 'active'
  const periodEnd = subscription?.stripe_current_period_end
    ? format(new Date(subscription.stripe_current_period_end), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null

  const caseUsage = usage?.cases?.current ?? 0
  const caseUsagePct = limits.cases === -1 ? 0 : Math.round((caseUsage / limits.cases) * 100)

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assinatura</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu plano e forma de pagamento.
        </p>
      </div>

      {/* Current plan card */}
      <div className="rounded-xl border bg-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Plano {PLAN_LABELS[plan] ?? plan}</h2>
              <Badge variant={isActive || plan === 'free' ? 'default' : 'destructive'}>
                {plan === 'free' ? 'Ativo' : isActive ? 'Ativo' : subscription?.status ?? 'Inativo'}
              </Badge>
            </div>
            {periodEnd && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {subscription?.status === 'active'
                  ? `Renova em ${periodEnd}`
                  : `Encerra em ${periodEnd}`}
              </p>
            )}
            {plan === 'free' && (
              <p className="text-sm text-muted-foreground mt-0.5">Gratuito para sempre</p>
            )}
          </div>

          {plan !== 'free' && subscription?.stripe_subscription_id && (
            <ManageSubscriptionButton />
          )}
        </div>

        {/* Usage */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Uso do plano</h3>
          <UsageBar
            label="Processos monitorados"
            current={caseUsage}
            max={limits.cases}
            pct={caseUsagePct}
          />
          <div className="grid grid-cols-2 gap-3">
            <InfoLine
              label="Usuários"
              value={`${usage?.users?.current ?? 1} de ${limits.users === -1 ? '∞' : limits.users}`}
            />
            <InfoLine
              label="Webhooks"
              value={limits.webhooks === 0 ? 'Não disponível' : limits.webhooks === -1 ? 'Ilimitado' : `Até ${limits.webhooks}`}
            />
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      {nextPlan && nextPlan !== 'enterprise' && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <Zap size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Fazer upgrade para {PLAN_LABELS[nextPlan]}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {nextPlan === 'solo' && 'Importe todos os seus processos pela OAB e receba alertas por email.'}
                {nextPlan === 'escritorio' && 'Gerencie sua equipe, acesse webhooks e relatórios exportáveis.'}
                {nextPlan === 'pro' && 'API pública completa, analytics e portal do cliente.'}
              </p>
              <p className="text-sm font-semibold text-primary mt-1.5">
                {NEXT_PLAN_PRICE[nextPlan]}
              </p>
            </div>
          </div>
          <UpgradeButton plan={nextPlan as 'solo' | 'escritorio' | 'pro'} />
        </div>
      )}

      {nextPlan === 'enterprise' && (
        <div className="rounded-xl border p-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">Precisa de mais?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Processos ilimitados, SLA contratual e suporte dedicado.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="mailto:contato@litix.com.br">Falar com vendas</Link>
          </Button>
        </div>
      )}

      {/* Features of current plan */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CreditCard size={15} />
          Incluído no seu plano
        </h3>
        <ul className="space-y-2">
          {getPlanFeatures(plan).map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <CheckCircle size={14} className="text-success mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <Link
          href="/pricing"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 inline-block"
        >
          Comparar todos os planos →
        </Link>
      </div>
    </div>
  )
}

function UsageBar({
  label,
  current,
  max,
  pct,
}: {
  label: string
  current: number
  max: number
  pct: number
}) {
  const isUnlimited = max === -1
  const isWarning = !isUnlimited && pct >= 80
  const isCritical = !isUnlimited && pct >= 95

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={`font-medium ${
            isCritical ? 'text-destructive' : isWarning ? 'text-amber-500' : ''
          }`}
        >
          {isUnlimited ? `${current} (ilimitado)` : `${current} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isCritical ? 'bg-destructive' : isWarning ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
      {isCritical && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle size={11} />
          Limite quase atingido. Considere fazer upgrade.
        </p>
      )}
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  )
}

function getPlanFeatures(plan: string): string[] {
  const base = ['Monitoramento 24/7 em 5 providers', 'Dashboard de processos', 'Consulta manual por CNJ']
  const byPlan: Record<string, string[]> = {
    free: [...base],
    solo: [...base, 'Importação por OAB', 'Alertas por email', 'Cálculo de prazos', '1 webhook'],
    escritorio: [...base, 'Importação por OAB', 'Alertas por email', 'Equipe de até 10 usuários', '5 webhooks', 'Relatórios exportáveis'],
    pro: [...base, 'Importação por OAB', 'Alertas por email', 'Até 30 usuários', '20 webhooks', 'API pública completa', 'Dashboard analytics', 'Portal do cliente'],
    enterprise: [...base, 'Tudo do Pro', 'Usuários ilimitados', 'Webhooks ilimitados', 'SLA contratual', 'Suporte dedicado'],
  }
  return byPlan[plan] ?? base
}
