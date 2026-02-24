# Story LITIX-12.3: Portal de Gerenciamento de Assinatura

**Epic:** Epic 12 - Billing e Enforcement de Planos
**Status:** Draft
**Prioridade:** Should
**Estimativa:** 3 pontos
**Dependencias:** LITIX-12.1

---

## User Story

Como owner do escritorio, quero gerenciar minha assinatura (trocar plano, cancelar, ver historico de faturas) sem precisar contatar suporte.

## Contexto

O Stripe Customer Portal e uma pagina hospedada pelo Stripe que permite ao cliente gerenciar sua assinatura sem que o Litix precise construir todo esse fluxo. Basta criar uma portal session e redirecionar o usuario. Esta story implementa o acesso ao portal e trata os casos de downgrade (que disparam webhooks ja tratados em LITIX-12.1).

---

## Acceptance Criteria

- [ ] AC1: Botao "Gerenciar Assinatura" no `/dashboard/billing` cria Stripe Customer Portal Session e redireciona
- [ ] AC2: Portal permite: trocar plano, cancelar assinatura, baixar faturas/notas fiscais, atualizar cartao de credito
- [ ] AC3: Apos retorno do portal (redirect de volta para o Litix), pagina de billing recarregada com plano atualizado
- [ ] AC4: Se tenant nao tem `stripe_customer_id`, botao desabilitado (apenas plano free sem historico de pagamento)
- [ ] AC5: Downgrade de plano via portal dispara webhook `customer.subscription.updated` → ja tratado em LITIX-12.1
- [ ] AC6: Cancelamento via portal dispara webhook `customer.subscription.deleted` → rebaixa para free (LITIX-12.1)
- [ ] AC7: Historico de faturas exibido no `/dashboard/billing` (ultimas 5 faturas com status e link para PDF)

---

## Dev Notes

### Criar Portal Session

```typescript
// src/app/api/v1/billing/portal/route.ts
import Stripe from 'stripe'
import { getTenantContext } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const { tenantId } = await getTenantContext()
  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.stripe_customer_id) {
    return Response.json({ error: 'No Stripe customer found' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  })

  return Response.json({ url: session.url })
}
```

### Buscar Historico de Faturas

```typescript
// src/features/billing/services/billing.service.ts (adicao)
export async function getTenantInvoices(stripeCustomerId: string) {
  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit: 5,
    status: 'paid',
  })

  return invoices.data.map(inv => ({
    id: inv.id,
    amount: inv.amount_paid / 100, // centavos para reais
    currency: inv.currency,
    status: inv.status,
    date: new Date(inv.created * 1000),
    pdfUrl: inv.invoice_pdf,
    period: {
      start: new Date(inv.period_start * 1000),
      end: new Date(inv.period_end * 1000),
    },
  }))
}
```

### Componente de Faturas

```typescript
// src/features/billing/components/invoice-history.tsx
interface Invoice {
  id: string
  amount: number
  currency: string
  status: string
  date: Date
  pdfUrl: string | null
  period: { start: Date; end: Date }
}

export function InvoiceHistory({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2">Periodo</th>
          <th className="text-left py-2">Valor</th>
          <th className="text-left py-2">Status</th>
          <th className="text-left py-2">PDF</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map(inv => (
          <tr key={inv.id} className="border-b">
            <td className="py-2">
              {format(inv.period.start, 'dd/MM/yyyy')} – {format(inv.period.end, 'dd/MM/yyyy')}
            </td>
            <td className="py-2">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.amount)}
            </td>
            <td className="py-2">
              <Badge variant={inv.status === 'paid' ? 'success' : 'secondary'}>
                {inv.status === 'paid' ? 'Pago' : inv.status}
              </Badge>
            </td>
            <td className="py-2">
              {inv.pdfUrl && (
                <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Baixar
                </a>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### Botao Gerenciar Assinatura

```typescript
// src/features/billing/components/manage-subscription-button.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ManageSubscriptionButton({ hasCustomer }: { hasCustomer: boolean }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const res = await fetch('/api/v1/billing/portal', { method: 'POST' })
    const { url, error } = await res.json()
    if (error) {
      toast.error('Erro ao abrir portal de assinatura')
      setLoading(false)
      return
    }
    window.location.href = url
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={!hasCustomer || loading}
    >
      {loading ? 'Redirecionando...' : 'Gerenciar Assinatura'}
    </Button>
  )
}
```

### Componentes/Arquivos Esperados

```
src/
  app/
    api/
      v1/
        billing/
          portal/
            route.ts                 -- POST: criar portal session
  features/
    billing/
      components/
        manage-subscription-button.tsx   -- Botao com redirect para portal Stripe
        invoice-history.tsx              -- Tabela de faturas (ultimas 5)
      services/
        billing.service.ts               -- getTenantInvoices() (adicao)
```

---

## Tasks

- [ ] Task 1: Implementar endpoint de portal
  - [ ] Subtask 1.1: `POST /api/v1/billing/portal` — criar Customer Portal Session
  - [ ] Subtask 1.2: Validar que tenant tem `stripe_customer_id` antes de criar session

- [ ] Task 2: Implementar UI
  - [ ] Subtask 2.1: `manage-subscription-button.tsx` com redirect para portal Stripe
  - [ ] Subtask 2.2: `invoice-history.tsx` com tabela de ultimas 5 faturas
  - [ ] Subtask 2.3: Integrar `getTenantInvoices()` no `billing.service.ts`
  - [ ] Subtask 2.4: Atualizar `/dashboard/billing/page.tsx` com botao e historico de faturas

- [ ] Task 3: Testes
  - [ ] Subtask 3.1: Portal session criada e URL retornada corretamente
  - [ ] Subtask 3.2: Tenant sem `stripe_customer_id` retorna 400
  - [ ] Subtask 3.3: Faturas listadas corretamente para tenant com historico

---

## Definition of Done

- [ ] Botao "Gerenciar Assinatura" funcional no `/dashboard/billing`
- [ ] Historico de faturas exibido com link para PDF
- [ ] Downgrade e cancelamento via portal funcionando (via webhooks LITIX-12.1)
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
