# Story LITIX-12.1: Pagina de Planos e Checkout Stripe

**Epic:** Epic 12 - Billing e Enforcement de Planos
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 8 pontos
**Dependencias:** LITIX-1.1, LITIX-1.3

---

## User Story

Como owner do escritorio, quero ver os planos disponiveis e assinar um plano pago para desbloquear funcionalidades premium e aumentar meus limites.

## Contexto

O billing e critico para a sustentabilidade do produto. Usamos Stripe Checkout (hosted page) para simplificar a implementacao — sem PCI compliance proprio, sem form de cartao customizado. O fluxo: usuario clica "Assinar" → redireciona para Stripe Checkout → paga → Stripe envia webhook → plano atualizado no banco.

---

## Acceptance Criteria

- [ ] AC1: Pagina `/pricing` (publica, sem login) com comparativo dos 5 planos em cards
- [ ] AC2: Pagina `/dashboard/billing` para usuarios logados com plano atual, uso (processos/usuarios usados vs limite), proximo vencimento
- [ ] AC3: Botao "Assinar" cria Stripe Checkout Session e redireciona para Stripe Checkout
- [ ] AC4: Apos pagamento bem-sucedido (redirect de sucesso do Stripe), plano do tenant atualizado via webhook Stripe
- [ ] AC5: Webhook Stripe `checkout.session.completed` atualiza `subscriptions.plan` e `tenants.plan`
- [ ] AC6: Webhook Stripe `customer.subscription.updated` sincroniza mudancas de plano
- [ ] AC7: Webhook Stripe `customer.subscription.deleted` rebaixa para plano free
- [ ] AC8: Stripe Customer criado no primeiro checkout e associado ao tenant (`tenants.stripe_customer_id`)
- [ ] AC9: Chave de assinatura do webhook Stripe validada (`STRIPE_WEBHOOK_SECRET`) — rejeita requests invalidas

---

## Dev Notes

### Variaveis de Ambiente

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_SOLO=price_...
STRIPE_PRICE_ID_ESCRITORIO=price_...
STRIPE_PRICE_ID_PRO=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

### Fluxo de Checkout

```typescript
// src/app/api/v1/billing/checkout/route.ts
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const { planId } = await req.json()
  const { tenantId } = await getTenantContext()
  const tenant = await getTenant(tenantId)

  // Criar ou recuperar Stripe Customer
  let customerId = tenant.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { tenant_id: tenantId } })
    customerId = customer.id
    await updateTenantStripeCustomer(tenantId, customerId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRICE_IDS[planId], quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    metadata: { tenant_id: tenantId },
  })

  return Response.json({ url: session.url })
}
```

### Webhook Handler

```typescript
// src/app/api/v1/billing/webhook/route.ts
export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object)
      break
  }

  return Response.json({ received: true })
}
```

### Componentes/Arquivos Esperados

```
src/
  app/
    pricing/
      page.tsx                       -- Pagina publica de planos
    dashboard/
      billing/
        page.tsx                     -- Dashboard de billing
    api/
      v1/
        billing/
          checkout/
            route.ts                 -- POST: criar checkout session
          webhook/
            route.ts                 -- POST: receber webhooks Stripe
          portal/
            route.ts                 -- POST: criar portal session (LITIX-12.3)
  features/
    billing/
      components/
        pricing-cards.tsx            -- Cards de planos com comparativo
        billing-overview.tsx         -- Uso atual vs limites
        upgrade-button.tsx           -- Botao de upgrade com redirect
      hooks/
        use-billing.ts
      services/
        billing.service.ts
```

---

## Tasks

- [ ] Task 1: Configurar Stripe
  - [ ] Subtask 1.1: Instalar `stripe` npm package
  - [ ] Subtask 1.2: Criar produtos e precos no Stripe Dashboard
  - [ ] Subtask 1.3: Configurar variaveis de ambiente
  - [ ] Subtask 1.4: Configurar webhook endpoint no Stripe (URL: `/api/v1/billing/webhook`)

- [ ] Task 2: Implementar checkout
  - [ ] Subtask 2.1: `POST /api/v1/billing/checkout` — criar Checkout Session
  - [ ] Subtask 2.2: `upgrade-button.tsx` que chama API e redireciona

- [ ] Task 3: Implementar webhook handler
  - [ ] Subtask 3.1: `POST /api/v1/billing/webhook` com validacao de signature
  - [ ] Subtask 3.2: Handlers para os 3 eventos Stripe

- [ ] Task 4: Implementar paginas
  - [ ] Subtask 4.1: `/pricing` com `pricing-cards.tsx`
  - [ ] Subtask 4.2: `/dashboard/billing` com `billing-overview.tsx` (uso vs limites)

- [ ] Task 5: Testes
  - [ ] Subtask 5.1: Checkout cria sessao e redireciona para Stripe
  - [ ] Subtask 5.2: Webhook `checkout.session.completed` atualiza plano do tenant
  - [ ] Subtask 5.3: Webhook com signature invalida retorna 400
  - [ ] Subtask 5.4: Cancelamento rebaixa para free

---

## Definition of Done

- [ ] Stripe configurado com produtos e precos
- [ ] Fluxo de checkout funcionando end-to-end
- [ ] Webhooks atualizando plano corretamente
- [ ] Pagina de billing com uso atual
- [ ] Testes passando (com Stripe CLI para webhooks locais)
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
