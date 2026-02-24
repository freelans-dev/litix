# Arquitetura SaaS Legaltech: Litix na Vercel + Supabase

## 1. Multi-Tenancy: Row-Based com RLS

**Decisao: Shared Schema + `tenant_id` + RLS**

Razao: Sem requisito regulatorio de isolamento fisico, custo operacional menor, Supabase nativo, reversivel para schema-based depois.

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Toda tabela leva tenant_id + index obrigatorio
CREATE TABLE monitored_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  cnj_number TEXT NOT NULL,
  status TEXT,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_monitored_cases_tenant_id ON monitored_cases(tenant_id);

-- RLS Pattern
ALTER TABLE monitored_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON monitored_cases
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

## 2. Auth: Supabase Auth + RBAC Manual

```sql
CREATE TABLE tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  UNIQUE(tenant_id, user_id)
);
```

Auth Hook (Edge Function) injeta `tenant_id` e `role` no JWT no login.

## 3. Distribuicao de Responsabilidades

| Funcao | Onde Executar | Razao |
|---|---|---|
| SSR/Dashboard | Vercel (Next.js) | Nativo, ISR, cache |
| Auth Hook | Supabase Edge Function | Acesso direto ao DB |
| Stripe Webhooks | Vercel API Route | Validacao Stripe |
| Processamento de processos | Trigger.dev Workers | Jobs longos, Node.js |
| Entrega de webhooks | Trigger.dev | Retry automatico |
| API publica v1 | Vercel API Route | Rate limiting integrado |
| Scheduler | Supabase pg_cron | Cron nativo PostgreSQL |

## 4. Background Jobs: Trigger.dev + pg_cron

```
pg_cron (a cada 5 min)
  -> Seleciona processos para verificar
  -> Publica mensagem na Supabase Queue (pgmq)
  -> Trigger.dev consumer processa a fila
  -> Chama DataJud/Codilo/Escavador conforme provider
  -> Se houver atualizacao: persiste + dispara webhook
```

## 5. Billing: Stripe + Supabase Sync Engine

```sql
CREATE TABLE plan_limits (
  plan TEXT PRIMARY KEY,
  max_cases INTEGER,
  max_users INTEGER,
  api_rate_limit INTEGER,
  webhook_endpoints INTEGER
);

INSERT INTO plan_limits VALUES
  ('starter', 25, 3, 60, 1),
  ('pro', 200, 10, 300, 5),
  ('enterprise', -1, -1, 1000, 20);
```

## 6. API Publica + Webhook Delivery

API key auth (nao JWT). Retry com exponential backoff + jitter:
- Tentativa 1: agora
- Tentativa 2: 5s
- Tentativa 3: 25s
- Tentativa 4: 2min
- Tentativa 5: 10min
- Esgotado: dead-letter queue

## 7. Caching: Vercel KV (Upstash)

| Dado | Cache | TTL |
|---|---|---|
| Sessao/tenant_id | Vercel KV | 15min |
| Resultado de consulta | Vercel KV | 5min |
| Limites de plano | Vercel KV | 1h |
| Rate limit counters | Upstash Redis | Sliding window |
| Updates de monitoramento | Supabase Realtime | Push |

## 8. Repository Pattern (Migration-Ready)

```typescript
export interface CaseRepository {
  findById(id: string, tenantId: string): Promise<Case | null>
  findByTenant(tenantId: string, filters?: CaseFilters): Promise<Case[]>
  create(data: CreateCaseInput): Promise<Case>
  update(id: string, data: UpdateCaseInput): Promise<Case>
}

// Para migrar: crie AwsCaseRepository implementando a mesma interface
// Troque o factory. Nenhum outro arquivo muda.
```

## 9. Limites do Supabase

| Recurso | Free | Pro ($25/mes) |
|---|---|---|
| Bandwidth | 5+5 GB | 250 GB |
| Storage | 0.5 GB | 100 GB |
| DB connections | 200 | 200 (+ upgrade) |
| Realtime connections | 200 | 500 |
| Edge Functions | 500k/mes | 2M/mes |

**Quando migrar:** Custo >$500/mes, conexoes >80%, necessidade de read replicas BR.

**Rota:** Supabase -> Supabase Pro + compute -> Supabase + AWS RDS -> AWS completo

## 10. Sequencia de Construcao

**Fase 1 - Fundacao:**
1. Schema com tenants + RLS + indexes
2. Auth Hook para tenant_id no JWT
3. Repository Pattern base
4. Middleware Next.js (sessao + tenant)

**Fase 2 - Core:**
5. Dashboard de consulta de processos
6. Schema de monitoramento + pg_cron + Trigger.dev
7. Supabase Realtime no dashboard

**Fase 3 - Comercializacao:**
8. Billing Stripe
9. Enforcement de quotas por plano
10. API publica v1 + API keys
11. Webhook delivery

**Fase 4 - Crescimento:**
12. Rate limiting granular
13. Analytics de uso
14. Admin panel

---

Sources:
- [Supabase RLS Multi-Tenant](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)
- [Supabase & Next.js Starter](https://vercel.com/templates/next.js/supabase)
- [Trigger.dev](https://trigger.dev)
- [Stripe & Supabase SaaS Kit](https://vercel.com/templates/next.js/stripe-supabase-saas-starter-kit)
- [Rate Limiting with Upstash](https://upstash.com/blog/edge-rate-limiting)
- [Supabase Multi-tenancy Guide](https://arda.beyazoglu.com/supabase-multi-tenancy)
