# Story LITIX-5.1: CRUD de Webhook Endpoints no Dashboard

**Epic:** Epic 5 - Webhook para Integracao
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** LITIX-1.3, LITIX-4.3

---

## User Story

Como admin do escritorio, quero configurar endpoints de webhook para receber eventos processuais automaticamente no meu sistema de gestao.

## Contexto

Webhooks sao o mecanismo de integracao mais poderoso do Litix — permitem que escritorios recebam movimentacoes diretamente no Astrea, Projuris, planilhas ou qualquer sistema via HTTP POST. Esta story cobre o CRUD de endpoints e a geracao do secret para validacao HMAC.

---

## Acceptance Criteria

- [ ] AC1: Tabelas `webhook_endpoints` e `webhook_deliveries` criadas com RLS
- [ ] AC2: Pagina `/dashboard/settings/webhooks` com lista de endpoints configurados
- [ ] AC3: Formulario de criacao: URL (HTTPS obrigatorio), nome, eventos a subscrever (`new_movement`, `deadline_approaching`), secret auto-gerado
- [ ] AC4: Secret exibido apenas uma vez na criacao — nao pode ser recuperado depois (apenas regenerado)
- [ ] AC5: Botao "Testar webhook" envia payload de teste para o endpoint e exibe response
- [ ] AC6: Limite de endpoints por plano enforced: Free=0, Solo=1, Escritorio=5, Pro=20
- [ ] AC7: Endpoint pode ser ativado/desativado sem excluir
- [ ] AC8: CRUD completo: criar, listar, editar URL/eventos/nome, excluir (com confirmacao)
- [ ] AC9: Validacao de URL: deve ser HTTPS, acessivel publicamente (HEAD request de validacao)

---

## Dev Notes

### Schema Relevante

```sql
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- HMAC secret (hashed no banco, exibido apenas na criacao)
  events TEXT[] NOT NULL DEFAULT '{new_movement}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES tenant_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_endpoints_tenant_id ON webhook_endpoints(tenant_id);
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON webhook_endpoints USING (tenant_id = auth.tenant_id());

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES alerts(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, dead_letter
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_response_status INTEGER,
  last_response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);
CREATE INDEX idx_webhook_deliveries_endpoint_id ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status, next_attempt_at) WHERE status IN ('pending', 'failed');
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON webhook_deliveries USING (tenant_id = auth.tenant_id());
```

### Geracao de Secret

```typescript
// src/lib/crypto.ts
import { randomBytes, createHmac } from 'crypto'

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString('hex')}`
}

export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}
```

Secret armazenado no banco como hash (bcrypt) — valor plain exibido apenas uma vez no frontend.

### Componentes/Arquivos Esperados

```
src/
  app/
    dashboard/
      settings/
        webhooks/
          page.tsx
  features/
    webhooks/
      components/
        webhooks-list.tsx
        webhook-form.tsx             -- Criacao/edicao
        webhook-secret-reveal.tsx    -- Exibe secret uma vez com botao copiar
        webhook-test-button.tsx      -- Botao de teste com resultado
      hooks/
        use-webhooks.ts
      services/
        webhooks.service.ts
```

### API Contracts

```
GET    /api/v1/webhooks
POST   /api/v1/webhooks
GET    /api/v1/webhooks/:id
PATCH  /api/v1/webhooks/:id
DELETE /api/v1/webhooks/:id
POST   /api/v1/webhooks/:id/test
POST   /api/v1/webhooks/:id/rotate-secret
```

---

## Tasks

- [ ] Task 1: Criar migrations de `webhook_endpoints` e `webhook_deliveries`

- [ ] Task 2: Implementar API CRUD
  - [ ] Subtask 2.1: `POST /api/v1/webhooks` com geracao de secret e validacao de URL
  - [ ] Subtask 2.2: `GET, PATCH, DELETE /api/v1/webhooks/:id`
  - [ ] Subtask 2.3: `POST /api/v1/webhooks/:id/test` com payload de exemplo
  - [ ] Subtask 2.4: `POST /api/v1/webhooks/:id/rotate-secret`

- [ ] Task 3: Implementar UI
  - [ ] Subtask 3.1: `webhooks-list.tsx` com status ativo/inativo
  - [ ] Subtask 3.2: `webhook-form.tsx` com select de eventos
  - [ ] Subtask 3.3: `webhook-secret-reveal.tsx` — exibe secret apenas na criacao
  - [ ] Subtask 3.4: `webhook-test-button.tsx` com resultado em tempo real

- [ ] Task 4: Testes
  - [ ] Subtask 4.1: Criacao com URL HTTP rejeitada (apenas HTTPS)
  - [ ] Subtask 4.2: Limite de endpoints por plano enforced
  - [ ] Subtask 4.3: Secret nao recuperavel — apenas via rotate

---

## Definition of Done

- [ ] Tabelas `webhook_endpoints` e `webhook_deliveries` criadas
- [ ] CRUD completo de endpoints com validacao
- [ ] Secret gerado, exibido uma vez, nao recuperavel
- [ ] Botao de teste funcionando
- [ ] Limite de plano enforced
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
