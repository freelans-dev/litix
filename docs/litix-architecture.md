# Litix -- Arquitetura Tecnica

**Produto:** Litix -- Plataforma SaaS de Monitoramento e Consulta Processual Multi-Provider
**Versao:** 1.0.0
**Data:** 2026-02-24
**Autor:** Aria (Architect Agent / AIOS)
**Status:** Draft
**PRD de Referencia:** `docs/litix-prd.md` v1.0.0

---

## Indice

1. [Visao Arquitetural](#1-visao-arquitetural)
2. [Decisoes de Arquitetura (ADRs)](#2-decisoes-de-arquitetura-adrs)
3. [Schema do Banco de Dados](#3-schema-do-banco-de-dados)
4. [Security Model](#4-security-model)
5. [API Contracts](#5-api-contracts)
6. [Diagrama de Componentes](#6-diagrama-de-componentes)
7. [Fluxos Criticos](#7-fluxos-criticos)
8. [Estrategia de Migracao](#8-estrategia-de-migracao)
9. [Observabilidade e Operacoes](#9-observabilidade-e-operacoes)
10. [Apendice: Mapeamento Epic-para-Schema](#apendice-mapeamento-epic-para-schema)

---

## 1. Visao Arquitetural

### 1.1 Principios Guia

| # | Principio | Descricao |
|---|-----------|-----------|
| P1 | Multi-Tenant by Default | Toda tabela carrega `tenant_id`; RLS garante isolamento sem logica de aplicacao |
| P2 | Repository Pattern | Interfaces desacoplam business logic da implementacao de storage; migracao Supabase -> AWS sem mudar servicos |
| P3 | Background-First para Operacoes Longas | Import OAB, monitoramento, webhook delivery sao jobs assincronos (Trigger.dev) |
| P4 | Event-Driven Alerts | Movimentacao detectada -> evento -> fan-out para email, in-app, webhook |
| P5 | Progressive Complexity | MVP deploy em Vercel + Supabase Free; escala para Pro/AWS sem re-arquitetura |
| P6 | Security at Every Layer | Auth no edge, RLS no DB, HMAC nos webhooks, rate limiting por plano |
| P7 | Provider Agnosticism | Orchestrator trata providers como plugins; adicionar/remover provider nao altera fluxos |

### 1.2 Stack de Referencia

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4 | SSR/ISR, DX, ecossistema Vercel |
| UI Components | shadcn/ui + Radix | Acessivel, composivel, sem lock-in |
| Auth | Supabase Auth + Auth Hook (Edge Function) | JWT com claims customizados (`tenant_id`, `role`, `member_id`) |
| Database | Supabase PostgreSQL 15+ | RLS nativo, pg_cron, pgmq, Extensions |
| Background Jobs | Trigger.dev v3 | Jobs longos, retry nativo, observabilidade built-in |
| Scheduler | Supabase pg_cron + pg_net | Cron nativo PostgreSQL, dispara HTTP para Trigger.dev |
| Billing | Stripe (Checkout + Customer Portal + Webhooks) | Padrao de mercado, PIX support via Stripe |
| Caching | Vercel KV (Upstash Redis) | Cache de sessao, consultas, rate limits, limites de plano |
| Email | Resend (ou Supabase built-in para transacional) | DX superior, templates React |
| Observability | Pino (logs estruturados) + Vercel Analytics + Sentry | Custo zero ate escala, error tracking |
| Deploy | Vercel (frontend + API routes) | Deploy automatico, edge network, ISR |

### 1.3 Diagrama de Alto Nivel

```
                                 +------------------+
                                 |   Vercel Edge     |
                                 |   (Next.js 15)    |
                                 |                   |
                                 | - SSR/ISR Pages   |
                                 | - API Routes /api |
                                 | - Middleware Auth  |
                                 +--------+---------+
                                          |
                    +---------------------+---------------------+
                    |                     |                     |
           +--------v--------+  +--------v--------+  +--------v--------+
           |  Supabase Auth  |  |  Supabase PG    |  |  Vercel KV      |
           |  + Auth Hook    |  |  (RLS enabled)  |  |  (Upstash Redis)|
           |  (Edge Fn)      |  |  + pg_cron      |  |  - Cache        |
           +-----------------+  |  + pgmq         |  |  - Rate limits  |
                                +--------+--------+  +-----------------+
                                         |
                               +---------+---------+
                               |                   |
                      +--------v--------+  +-------v--------+
                      |  Trigger.dev    |  |  Stripe        |
                      |  Workers        |  |  Billing       |
                      |                 |  |                |
                      | - OAB Import    |  | - Checkout     |
                      | - Monitor Cycle |  | - Portal       |
                      | - Webhook Dlvry |  | - Webhooks     |
                      +--------+--------+  +----------------+
                               |
              +----------------+----------------+
              |        |        |       |       |
         +----v--+ +---v---+ +-v----+ +v----+ +v------+
         |DataJud| |Codilo | |Escav.| |Judit| |Predict|
         +-------+ +-------+ +------+ +-----+ +-------+
```

---

## 2. Decisoes de Arquitetura (ADRs)

### ADR-001: Multi-Tenancy via Shared Schema + RLS

**Status:** Aceito
**Contexto:** O Litix precisa isolar dados de escritorios (tenants) com custo operacional minimo.
**Decisao:** Single database, single schema, `tenant_id` em toda tabela, RLS policies para isolamento.
**Alternativas Consideradas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Schema-per-tenant | Isolamento total, backup granular | Custo de conexao, migracao complexa, nao escala em Supabase Free/Pro |
| DB-per-tenant | Maximo isolamento | Custo proibitivo, operacional inviavel |
| **Shared + RLS** | Simples, performante, nativo Supabase | Requer disciplina em toda query; erro de RLS = vazamento |

**Mitigacao de Risco:** Testes automatizados de isolamento (usuario A nunca ve dados do tenant B); RLS obrigatorio via migration hook.

---

### ADR-002: Auth Hook para Claims Customizados no JWT

**Status:** Aceito
**Contexto:** Supabase Auth gera JWTs, mas nao inclui `tenant_id` nem `role` nativamente.
**Decisao:** Supabase Auth Hook (Edge Function) intercepta o login e injeta `tenant_id`, `role`, e `member_id` no JWT claims.
**Alternativas Consideradas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Lookup em toda request | Sem customizacao do JWT | Latencia adicional em toda request; N+1 no DB |
| **Auth Hook** | JWT auto-contido; RLS usa `auth.jwt()` direto | Latencia no login (aceitavel); vendor lock-in Supabase |
| Custom auth (NextAuth) | Flexivel | Perde RLS nativo; duplica logica de sessao |

**Consequencia:** RLS policies acessam `(auth.jwt() ->> 'tenant_id')::uuid` sem lookup adicional.

---

### ADR-003: Trigger.dev para Background Jobs (nao Supabase Edge Functions)

**Status:** Aceito
**Contexto:** Import OAB varre 92 tribunais (~60s+); monitoramento processa milhares de CNJs; webhook delivery precisa de retry. Edge Functions tem timeout de 150s (Pro).
**Decisao:** Trigger.dev v3 para todos os jobs longos. pg_cron agenda e dispara via HTTP; Trigger.dev executa.
**Alternativas Consideradas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Supabase Edge Functions | Integrado, sem infra extra | Timeout 150s; sem retry nativo; cold start |
| AWS Lambda + SQS | Escalavel, mature | Complexidade operacional; custo de aprendizado |
| **Trigger.dev** | Node.js nativo, retry built-in, dashboard, DX excelente | Vendor (mitigado: jobs sao funcoes puras migraveis) |
| BullMQ + Redis | Open-source, robusto | Precisa de Redis separado; sem dashboard |

---

### ADR-004: Repository Pattern para Migration-Readiness

**Status:** Aceito
**Contexto:** PRD define path Supabase Free -> Pro -> AWS RDS quando custo > $500/mes.
**Decisao:** Toda interacao com banco via interface de Repository. Implementacao Supabase hoje; trocar para Prisma/Drizzle + RDS sem mudar business logic.
**Trade-off:** Leve overhead de abstracao vs. flexibilidade total de migracao.

```typescript
// Interface (nao muda)
interface CaseRepository {
  findById(id: string, tenantId: string): Promise<Case | null>;
  findByTenant(tenantId: string, filters?: CaseFilters): Promise<PaginatedResult<Case>>;
  create(data: CreateCaseInput): Promise<Case>;
  update(id: string, tenantId: string, data: UpdateCaseInput): Promise<Case>;
}

// Implementacao atual
class SupabaseCaseRepository implements CaseRepository { ... }

// Futura
class PrismaCaseRepository implements CaseRepository { ... }
```

---

### ADR-005: API Key Authentication para API Publica (nao JWT)

**Status:** Aceito
**Contexto:** Integradores (Lucas, CTO de Legaltech) precisam de acesso programatico sem sessao de browser.
**Decisao:** API keys (UUID v4 prefixado `ltx_`) hasheadas com SHA-256, armazenadas em `api_keys`. JWT para dashboard; API key para `/api/v1/*`.
**Alternativas:** OAuth2 (complexo demais para V1); JWT de longa duracao (sem revogacao granular).

---

### ADR-006: Webhook Delivery com Dead-Letter Queue

**Status:** Aceito
**Contexto:** NFR9 exige 5 tentativas com exponential backoff; entregas esgotadas nao podem ser perdidas.
**Decisao:** Trigger.dev job com retry schedule (0s, 5s, 25s, 2min, 10min). Payload assinado com HMAC-SHA256. Entregas esgotadas vao para `webhook_deliveries` com status `dead_letter`.
**Consequencia:** Admin pode reenviar dead-letters manualmente via dashboard.

---

### ADR-007: Vercel KV para Caching (nao Supabase Realtime)

**Status:** Aceito
**Contexto:** Cache de consultas, rate limiting, e limites de plano precisam de leitura sub-milissegundo.
**Decisao:** Vercel KV (Upstash Redis) para cache e rate limiting. Supabase Realtime apenas para notificacoes in-app.
**TTLs:**

| Dado | TTL | Justificativa |
|------|-----|---------------|
| Resultado de consulta por CNJ | 5min | Dados processuais mudam devagar |
| Limites de plano do tenant | 1h | Muda apenas em upgrade/downgrade |
| Sessao/tenant context | 15min | Seguranca vs performance |
| Rate limit counters | Sliding window 1min | Por plano |

---

### ADR-008: Estrutura de Frontend com Feature Modules

**Status:** Aceito
**Contexto:** 13 epics com features independentes precisam de organizacao escalavel.
**Decisao:** Feature module pattern com colocation: cada feature em `src/features/{name}/` com `components/`, `hooks/`, `services/`, `schemas/`, `types/`.
**Alternativa:** Flat structure (nao escala); Domain-driven directories (over-engineering para V1).

---

## 3. Schema do Banco de Dados

### 3.1 Diagrama ER Simplificado

```
tenants 1--N tenant_members N--1 auth.users
tenants 1--N profiles
tenants 1--N monitored_cases 1--N case_movements
tenants 1--N monitoring_jobs
tenants 1--N alerts
tenants 1--N webhook_endpoints 1--N webhook_deliveries
tenants 1--N api_keys
tenants 1--1 subscriptions N--1 plan_limits
tenants 1--N audit_log
tenants 1--N oab_imports
tenants 1--N deadline_rules
monitored_cases 1--N deadlines
tenants 1--N client_portal_links
tenants 1--N analytics_snapshots
```

### 3.2 Schema SQL Completo

```sql
-- =============================================================================
-- LITIX DATABASE SCHEMA
-- Supabase PostgreSQL 15+ com RLS
-- Versao: 1.0.0
-- =============================================================================

-- Extensions necessarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Full-text search em nomes
CREATE EXTENSION IF NOT EXISTS "pg_cron";        -- Scheduler nativo
CREATE EXTENSION IF NOT EXISTS "pgmq";           -- Message queue nativa

-- =============================================================================
-- 1. TENANTS (Epic 1)
-- =============================================================================

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,                -- URL-safe identifier (ex: "escritorio-silva")
  name          TEXT NOT NULL,                       -- Nome do escritorio
  plan          TEXT NOT NULL DEFAULT 'free'
                CHECK (plan IN ('free', 'solo', 'escritorio', 'pro', 'enterprise')),
  stripe_customer_id  TEXT UNIQUE,                   -- Stripe Customer ID
  stripe_subscription_id TEXT UNIQUE,                -- Stripe Subscription ID
  settings      JSONB NOT NULL DEFAULT '{}',         -- Configuracoes do tenant (timezone, notifications, etc)
  trial_ends_at TIMESTAMPTZ,                         -- Data de fim do trial (nullable = sem trial)
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_plan ON tenants(plan);
CREATE INDEX idx_tenants_stripe_customer ON tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- =============================================================================
-- 2. TENANT MEMBERS (Epic 1)
-- =============================================================================

CREATE TABLE tenant_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
              CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by  UUID REFERENCES auth.users(id),
  invited_at  TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_tenant_member UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_role ON tenant_members(tenant_id, role);

-- =============================================================================
-- 3. PROFILES (Epic 1, 2)
-- =============================================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  email         TEXT NOT NULL,
  avatar_url    TEXT,
  oab_number    TEXT,                               -- Formato: UF + numero (ex: "SP123456")
  oab_uf        TEXT CHECK (oab_uf IS NULL OR length(oab_uf) = 2),
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_profile_tenant_user UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE INDEX idx_profiles_oab ON profiles(oab_number) WHERE oab_number IS NOT NULL;
CREATE INDEX idx_profiles_name_trgm ON profiles USING GIN (display_name gin_trgm_ops);

-- =============================================================================
-- 4. MONITORED CASES (Epic 2, 3, 4)
-- =============================================================================

CREATE TABLE monitored_cases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cnj                 TEXT NOT NULL,                 -- CNJ normalizado (NNNNNNN-DD.AAAA.J.TR.OOOO)
  tribunal_sigla      TEXT,                          -- Ex: "TJSP", "TRT2"
  tribunal_nome       TEXT,
  comarca             TEXT,
  vara                TEXT,
  area                TEXT,                          -- civel, trabalhista, criminal, etc
  classe              TEXT,                          -- Classe processual (Acao Civil Publica, etc)
  assunto_principal   TEXT,
  juiz                TEXT,
  valor_causa         DECIMAL(15,2),
  data_distribuicao   DATE,
  status              TEXT DEFAULT 'ativo'
                      CHECK (status IN ('ativo', 'finalizado', 'arquivado', 'suspenso', 'sobrestado', 'cancelado')),
  fase                TEXT DEFAULT 'inicial'
                      CHECK (fase IN ('inicial', 'sentenca', 'execucao', 'recurso', 'arquivado', 'outro')),
  nivel_sigilo        SMALLINT DEFAULT 0,
  monitoring_enabled  BOOLEAN NOT NULL DEFAULT true,
  monitoring_frequency_hours INTEGER NOT NULL DEFAULT 12,
  last_checked_at     TIMESTAMPTZ,
  last_movement_hash  TEXT,                          -- SHA-256 hash de movimentacoes para detectar mudancas
  movement_count      INTEGER NOT NULL DEFAULT 0,
  completeness_score  REAL,                          -- 0.0 a 1.0
  imported_by         UUID REFERENCES tenant_members(id),
  import_source       TEXT,                          -- 'oab_import', 'manual', 'api', 'cnj_search'
  tags                TEXT[] DEFAULT '{}',
  notes               TEXT,
  partes_json         JSONB,                         -- Array de partes (nome, documento, lado, advogados)
  provider_data       JSONB,                         -- Provider attribution (origem, mergedFrom, fetchedAt)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_case_tenant_cnj UNIQUE (tenant_id, cnj)
);

CREATE INDEX idx_cases_tenant ON monitored_cases(tenant_id);
CREATE INDEX idx_cases_cnj ON monitored_cases(cnj);
CREATE INDEX idx_cases_tenant_status ON monitored_cases(tenant_id, status);
CREATE INDEX idx_cases_monitoring ON monitored_cases(monitoring_enabled, last_checked_at)
  WHERE monitoring_enabled = true;
CREATE INDEX idx_cases_tribunal ON monitored_cases(tenant_id, tribunal_sigla);
CREATE INDEX idx_cases_imported_by ON monitored_cases(imported_by);
CREATE INDEX idx_cases_cnj_trgm ON monitored_cases USING GIN (cnj gin_trgm_ops);
CREATE INDEX idx_cases_partes ON monitored_cases USING GIN (partes_json jsonb_path_ops);

-- =============================================================================
-- 5. CASE MOVEMENTS (Epic 3, 4)
-- =============================================================================

CREATE TABLE case_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  movement_date   TIMESTAMPTZ NOT NULL,
  type            TEXT,                              -- Tipo da movimentacao (despacho, sentenca, etc)
  description     TEXT NOT NULL,
  content         TEXT,                              -- Conteudo completo (texto da decisao, etc)
  code            TEXT,                              -- Codigo TPU (tabela processual unificada)
  provider        TEXT,                              -- Provider que detectou esta movimentacao
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_movement UNIQUE (case_id, movement_date, description)
);

CREATE INDEX idx_movements_tenant ON case_movements(tenant_id);
CREATE INDEX idx_movements_case ON case_movements(case_id);
CREATE INDEX idx_movements_case_date ON case_movements(case_id, movement_date DESC);
CREATE INDEX idx_movements_tenant_date ON case_movements(tenant_id, movement_date DESC);
CREATE INDEX idx_movements_unread ON case_movements(tenant_id, is_read) WHERE is_read = false;
CREATE INDEX idx_movements_desc_trgm ON case_movements USING GIN (description gin_trgm_ops);

-- =============================================================================
-- 6. MONITORING JOBS (Epic 4)
-- =============================================================================

CREATE TABLE monitoring_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id         UUID REFERENCES monitored_cases(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL CHECK (job_type IN ('cnj_check', 'oab_import', 'cpf_scan', 'webhook_delivery')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  trigger_id      TEXT,                              -- Trigger.dev run ID
  payload         JSONB,                             -- Input do job
  result          JSONB,                             -- Output do job
  error           TEXT,
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_tenant ON monitoring_jobs(tenant_id);
CREATE INDEX idx_jobs_case ON monitoring_jobs(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_jobs_status ON monitoring_jobs(status) WHERE status IN ('pending', 'running');
CREATE INDEX idx_jobs_type_status ON monitoring_jobs(job_type, status);

-- =============================================================================
-- 7. ALERTS (Epic 4)
-- =============================================================================

CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  movement_id     UUID REFERENCES case_movements(id),
  alert_type      TEXT NOT NULL
                  CHECK (alert_type IN (
                    'new_movement', 'deadline_approaching', 'deadline_expired',
                    'status_change', 'judge_change', 'stale_process', 'dje_publication'
                  )),
  severity        TEXT NOT NULL DEFAULT 'info'
                  CHECK (severity IN ('info', 'attention', 'urgent')),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',                -- Dados extras (dias ate prazo, etc)
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  read_by         UUID REFERENCES auth.users(id),
  email_sent      BOOLEAN NOT NULL DEFAULT false,
  email_sent_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX idx_alerts_case ON alerts(case_id);
CREATE INDEX idx_alerts_tenant_unread ON alerts(tenant_id, is_read) WHERE is_read = false;
CREATE INDEX idx_alerts_tenant_type ON alerts(tenant_id, alert_type);
CREATE INDEX idx_alerts_tenant_date ON alerts(tenant_id, created_at DESC);
CREATE INDEX idx_alerts_severity ON alerts(tenant_id, severity) WHERE severity IN ('attention', 'urgent');

-- =============================================================================
-- 8. WEBHOOK ENDPOINTS (Epic 5)
-- =============================================================================

CREATE TABLE webhook_endpoints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,                      -- HTTPS URL do endpoint
  description     TEXT,
  secret          TEXT NOT NULL,                      -- Secret para HMAC-SHA256 signature
  events          TEXT[] NOT NULL DEFAULT '{new_movement}',
                                                     -- Eventos assinados: new_movement, deadline, status_change
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status TEXT,                          -- success, failed, dead_letter
  failure_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_endpoints_tenant ON webhook_endpoints(tenant_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(tenant_id, is_active) WHERE is_active = true;

-- =============================================================================
-- 9. WEBHOOK DELIVERIES (Epic 5)
-- =============================================================================

CREATE TABLE webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint_id     UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  alert_id        UUID REFERENCES alerts(id),
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  signature       TEXT NOT NULL,                      -- HMAC-SHA256 hex digest
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'success', 'failed', 'dead_letter')),
  http_status     INTEGER,                           -- Response status code
  response_body   TEXT,                              -- Primeiros 1KB do response
  response_time_ms INTEGER,
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 5,
  next_retry_at   TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_tenant ON webhook_deliveries(tenant_id);
CREATE INDEX idx_deliveries_endpoint ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_deliveries_status ON webhook_deliveries(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'failed';
CREATE INDEX idx_deliveries_tenant_date ON webhook_deliveries(tenant_id, created_at DESC);

-- =============================================================================
-- 10. API KEYS (Epic 11)
-- =============================================================================

CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                      -- Nome descritivo (ex: "Producao", "Staging")
  key_prefix      TEXT NOT NULL,                      -- Primeiros 8 chars para identificacao (ex: "ltx_ab12")
  key_hash        TEXT NOT NULL,                      -- SHA-256 da key completa
  permissions     TEXT[] NOT NULL DEFAULT '{read}',
                                                     -- read, write, admin
  rate_limit_override INTEGER,                        -- Override do rate limit do plano (nullable = usa plano)
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,                       -- Nullable = nao expira
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- =============================================================================
-- 11. SUBSCRIPTIONS & PLAN LIMITS (Epic 12)
-- =============================================================================

CREATE TABLE plan_limits (
  plan                TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  max_cases           INTEGER NOT NULL,               -- -1 = ilimitado
  max_users           INTEGER NOT NULL,
  max_oab_per_member  INTEGER NOT NULL DEFAULT 1,
  api_rate_limit      INTEGER NOT NULL,               -- req/min
  webhook_endpoints   INTEGER NOT NULL,
  monitoring_frequency_hours INTEGER NOT NULL DEFAULT 12,
  features            JSONB NOT NULL DEFAULT '{}',
  price_monthly_brl   DECIMAL(10,2),
  stripe_price_id     TEXT,                           -- Stripe Price ID
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO plan_limits (plan, display_name, max_cases, max_users, max_oab_per_member, api_rate_limit, webhook_endpoints, monitoring_frequency_hours, features, price_monthly_brl, sort_order) VALUES
  ('free',        'Free',        10,    1,  1,  60,   0,  24, '{"import_oab": false, "alerts_email": false, "export": false}', 0, 1),
  ('solo',        'Solo',        200,   1,  1,  120,  1,  12, '{"import_oab": true, "alerts_email": true, "export": true, "deadlines": true}', 59.00, 2),
  ('escritorio',  'Escritorio',  1000,  10, 3,  300,  5,  6,  '{"import_oab": true, "alerts_email": true, "export": true, "deadlines": true, "multi_member": true, "reports": true, "webhook": true}', 249.00, 3),
  ('pro',         'Pro',         5000,  30, 5,  1000, 20, 2,  '{"import_oab": true, "alerts_email": true, "export": true, "deadlines": true, "multi_member": true, "reports": true, "webhook": true, "analytics": true, "client_portal": true, "api_full": true}', 599.00, 4),
  ('enterprise',  'Enterprise',  -1,    -1, -1, -1,   -1, 1,  '{"all": true}', NULL, 5);

CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan                    TEXT NOT NULL REFERENCES plan_limits(plan),
  status                  TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')),
  stripe_subscription_id  TEXT UNIQUE,
  stripe_price_id         TEXT,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
  canceled_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_subscription_tenant UNIQUE (tenant_id)
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- =============================================================================
-- 12. AUDIT LOG (NFR15)
-- =============================================================================

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,                      -- login, logout, case_view, case_export, case_create, etc
  resource_type   TEXT,                               -- case, member, webhook, api_key, subscription
  resource_id     UUID,
  metadata        JSONB DEFAULT '{}',                 -- Detalhes extras (IP, user agent, campos alterados)
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_tenant_date ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);

-- Particao por mes para performance em escala (aplicar quando > 10M rows)
-- CREATE TABLE audit_log (...) PARTITION BY RANGE (created_at);

-- =============================================================================
-- 13. OAB IMPORTS (Epic 2)
-- =============================================================================

CREATE TABLE oab_imports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id         UUID NOT NULL REFERENCES tenant_members(id),
  oab_number        TEXT NOT NULL,                    -- Ex: "SP123456"
  oab_uf            TEXT NOT NULL CHECK (length(oab_uf) = 2),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partial')),
  trigger_id        TEXT,                             -- Trigger.dev run ID
  tribunals_total   INTEGER NOT NULL DEFAULT 0,       -- Total de tribunais a varrer
  tribunals_done    INTEGER NOT NULL DEFAULT 0,       -- Tribunais ja varridos
  cases_found       INTEGER NOT NULL DEFAULT 0,
  cases_imported    INTEGER NOT NULL DEFAULT 0,
  cases_deduplicated INTEGER NOT NULL DEFAULT 0,      -- Processos ignorados por dedup
  providers_used    TEXT[],                            -- Providers que participaram
  error             TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oab_imports_tenant ON oab_imports(tenant_id);
CREATE INDEX idx_oab_imports_member ON oab_imports(member_id);
CREATE INDEX idx_oab_imports_oab ON oab_imports(oab_number);
CREATE INDEX idx_oab_imports_status ON oab_imports(status) WHERE status IN ('pending', 'running');

-- =============================================================================
-- 14. DEADLINE RULES (Epic 7)
-- =============================================================================

CREATE TABLE deadline_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = regra global
  movement_type_code  TEXT NOT NULL,                  -- Codigo TPU ou pattern de movimentacao
  movement_pattern    TEXT,                           -- Regex opcional para match em descricao
  area                TEXT,                           -- civel, trabalhista, etc (nullable = todas)
  deadline_days       INTEGER NOT NULL,               -- Dias para o prazo
  is_business_days    BOOLEAN NOT NULL DEFAULT true,  -- Dias uteis vs corridos
  is_fatal            BOOLEAN NOT NULL DEFAULT false, -- Prazo fatal vs ordenatorio
  description         TEXT NOT NULL,                  -- "Contestacao - 15 dias uteis"
  source              TEXT DEFAULT 'cpc',             -- cpc, clt, custom
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deadline_rules_tenant ON deadline_rules(tenant_id);
CREATE INDEX idx_deadline_rules_code ON deadline_rules(movement_type_code);
CREATE INDEX idx_deadline_rules_area ON deadline_rules(area);

-- =============================================================================
-- 15. DEADLINES (Epic 7)
-- =============================================================================

CREATE TABLE deadlines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  movement_id     UUID REFERENCES case_movements(id),
  rule_id         UUID REFERENCES deadline_rules(id),
  deadline_date   DATE NOT NULL,
  is_business_days BOOLEAN NOT NULL DEFAULT true,
  is_fatal        BOOLEAN NOT NULL DEFAULT false,
  description     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES auth.users(id),
  alert_days      INTEGER[] NOT NULL DEFAULT '{5, 3, 1}',  -- Dias de antecedencia para alerta
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deadlines_tenant ON deadlines(tenant_id);
CREATE INDEX idx_deadlines_case ON deadlines(case_id);
CREATE INDEX idx_deadlines_date ON deadlines(tenant_id, deadline_date) WHERE status = 'pending';
CREATE INDEX idx_deadlines_upcoming ON deadlines(deadline_date)
  WHERE status = 'pending' AND deadline_date >= CURRENT_DATE;

-- =============================================================================
-- 16. CLIENT PORTAL LINKS (Epic 9)
-- =============================================================================

CREATE TABLE client_portal_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  token           TEXT UNIQUE NOT NULL,               -- Token de acesso publico (UUID v4 ou nanoid)
  visible_fields  JSONB NOT NULL DEFAULT '{"movements": true, "parties": true, "status": true, "value": false}',
  label           TEXT,                               -- Label customizado (ex: "Portal do Sr. Silva")
  expires_at      TIMESTAMPTZ NOT NULL,               -- Default: 90 dias
  is_active       BOOLEAN NOT NULL DEFAULT true,
  view_count      INTEGER NOT NULL DEFAULT 0,
  last_viewed_at  TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_links_token ON client_portal_links(token) WHERE is_active = true;
CREATE INDEX idx_portal_links_tenant ON client_portal_links(tenant_id);
CREATE INDEX idx_portal_links_case ON client_portal_links(case_id);

-- =============================================================================
-- 17. ANALYTICS SNAPSHOTS (Epic 10)
-- =============================================================================

CREATE TABLE analytics_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  snapshot_type   TEXT NOT NULL CHECK (snapshot_type IN ('daily', 'weekly', 'monthly')),
  metrics         JSONB NOT NULL,
  -- Metricas JSONB exemplo:
  -- {
  --   "total_cases": 1234,
  --   "active_cases": 980,
  --   "movements_count": 56,
  --   "new_cases": 12,
  --   "closed_cases": 3,
  --   "avg_duration_days": 340,
  --   "by_tribunal": {"TJSP": 500, "TRT2": 200},
  --   "by_area": {"civel": 600, "trabalhista": 300},
  --   "by_member": {"uuid1": 120, "uuid2": 80},
  --   "deadlines_met": 45,
  --   "deadlines_missed": 2
  -- }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_snapshot UNIQUE (tenant_id, snapshot_date, snapshot_type)
);

CREATE INDEX idx_snapshots_tenant ON analytics_snapshots(tenant_id);
CREATE INDEX idx_snapshots_tenant_date ON analytics_snapshots(tenant_id, snapshot_date DESC);

-- =============================================================================
-- 18. RLS POLICIES
-- =============================================================================

-- Helper function: extract tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: extract role from JWT
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: extract member_id from JWT
CREATE OR REPLACE FUNCTION auth.member_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'member_id')::uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE oab_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadline_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- TENANT ISOLATION: Base policy applied to all tables
-- Pattern: user only accesses rows where tenant_id matches their JWT claim

-- tenants: user can see their own tenant
CREATE POLICY "tenant_select" ON tenants FOR SELECT
  USING (id = auth.tenant_id());

CREATE POLICY "tenant_update" ON tenants FOR UPDATE
  USING (id = auth.tenant_id() AND auth.user_role() IN ('owner'));

-- tenant_members: see members of own tenant
CREATE POLICY "members_select" ON tenant_members FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "members_insert" ON tenant_members FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id() AND auth.user_role() IN ('owner', 'admin'));

CREATE POLICY "members_update" ON tenant_members FOR UPDATE
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('owner', 'admin'));

CREATE POLICY "members_delete" ON tenant_members FOR DELETE
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('owner', 'admin'));

-- Generic tenant isolation for data tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'monitored_cases', 'case_movements', 'monitoring_jobs',
      'alerts', 'webhook_endpoints', 'webhook_deliveries', 'api_keys',
      'subscriptions', 'audit_log', 'oab_imports', 'deadlines',
      'client_portal_links', 'analytics_snapshots'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "tenant_isolation_select" ON %I FOR SELECT USING (tenant_id = auth.tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "tenant_isolation_insert" ON %I FOR INSERT WITH CHECK (tenant_id = auth.tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "tenant_isolation_update" ON %I FOR UPDATE USING (tenant_id = auth.tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "tenant_isolation_delete" ON %I FOR DELETE USING (tenant_id = auth.tenant_id())',
      tbl
    );
  END LOOP;
END $$;

-- deadline_rules: global rules (tenant_id IS NULL) visible to all; tenant rules scoped
CREATE POLICY "deadline_rules_select" ON deadline_rules FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = auth.tenant_id());

-- Viewer role restriction: read-only on cases and movements
-- (enforced in app layer for simplicity; RLS handles tenant isolation)

-- Service role bypass for Trigger.dev workers (uses service_role key)
-- Supabase service_role key bypasses RLS by default. No extra policy needed.

-- =============================================================================
-- 19. TRIGGERS & FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'tenants', 'tenant_members', 'profiles', 'monitored_cases',
      'webhook_endpoints', 'subscriptions', 'deadline_rules', 'deadlines'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      tbl
    );
  END LOOP;
END $$;

-- =============================================================================
-- 20. pg_cron JOBS (Scheduler)
-- =============================================================================

-- These will be configured after Trigger.dev endpoints are deployed:
-- SELECT cron.schedule('monitoring-cycle', '*/30 * * * *',
--   $$ SELECT net.http_post('https://litix-trigger.dev/api/v1/monitoring/cycle', ...) $$
-- );
-- SELECT cron.schedule('deadline-check', '0 8 * * *',
--   $$ SELECT net.http_post('https://litix-trigger.dev/api/v1/deadlines/check', ...) $$
-- );
-- SELECT cron.schedule('analytics-snapshot', '0 2 * * *',
--   $$ SELECT net.http_post('https://litix-trigger.dev/api/v1/analytics/snapshot', ...) $$
-- );
```

### 3.3 Convencoes de Schema

| Convencao | Aplicacao |
|-----------|-----------|
| Primary keys | UUID v4 via `gen_random_uuid()` |
| Tenant isolation | `tenant_id UUID NOT NULL REFERENCES tenants(id)` em toda tabela |
| Timestamps | `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at` com trigger |
| Soft delete | `is_active BOOLEAN DEFAULT true` (nao `deleted_at`) |
| Naming | snake_case para tabelas e colunas |
| Indexes | Sempre `idx_{table}_{column(s)}` com partial indexes onde possivel |
| JSONB | Usado para dados semi-estruturados (partes, metricas, features, settings) |
| Constraints | CHECK constraints para enums; UNIQUE constraints para business rules |

---

## 4. Security Model

### 4.1 RBAC (Role-Based Access Control)

| Role | Dashboard | Cases (proprio) | Cases (equipe) | Members | Webhooks | Billing | API Keys | Admin |
|------|-----------|-----------------|----------------|---------|----------|---------|----------|-------|
| **owner** | Full | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | Full |
| **admin** | Full | CRUD | CRUD | CRU (nao D owner) | CRUD | Read | CRUD | Read |
| **member** | Read | CRUD | Read | Read | Read | - | - | - |
| **viewer** | Read | Read (compartilhados) | Read (compartilhados) | Read | - | - | - | - |

**Enforcement:**
1. **RLS (Database):** Isolamento por tenant -- usuario NUNCA acessa dados de outro tenant
2. **Middleware (Application):** Verifica `role` do JWT para permissoes dentro do tenant
3. **API Key (Programatic):** Permissions array (`read`, `write`, `admin`) valida operacoes

### 4.2 Fluxo de Autenticacao

```
Browser                  Next.js Middleware         Supabase Auth          Auth Hook (Edge Fn)
  |                           |                         |                       |
  |-- Login (email/pwd) ----->|                         |                       |
  |                           |-- signInWithPassword -->|                       |
  |                           |                         |-- Trigger Hook ------>|
  |                           |                         |                       |
  |                           |                         |  SELECT tenant_id,    |
  |                           |                         |  role, member_id      |
  |                           |                         |  FROM tenant_members  |
  |                           |                         |  WHERE user_id = $1   |
  |                           |                         |                       |
  |                           |                         |<-- JWT claims --------|
  |                           |                         |  {tenant_id, role,    |
  |                           |                         |   member_id}          |
  |                           |<-- JWT + refresh -------|                       |
  |<-- Set cookie ------------|                         |                       |
```

### 4.3 Auth Hook (Edge Function)

```typescript
// supabase/functions/auth-hook/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const payload = await req.json();
  const { user_id } = payload;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id, role, id')
    .eq('user_id', user_id)
    .eq('is_active', true)
    .single();

  if (!membership) {
    return new Response(JSON.stringify({ error: 'No active membership' }), { status: 403 });
  }

  return new Response(JSON.stringify({
    app_metadata: {
      tenant_id: membership.tenant_id,
      role: membership.role,
      member_id: membership.id,
    },
  }));
});
```

### 4.4 API Key Management

```
Geracao:
  1. UUID v4 gerado: ltx_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
  2. Hash SHA-256 armazenado em api_keys.key_hash
  3. Prefix (ltx_a1b2c3d4) armazenado em api_keys.key_prefix
  4. Key completa retornada ao usuario UMA UNICA VEZ

Autenticacao:
  1. Request chega com header: Authorization: Bearer ltx_a1b2c3d4...
  2. Middleware computa SHA-256 da key
  3. Lookup em api_keys WHERE key_hash = $hash AND is_active = true
  4. Se encontrado: injeta tenant_id e permissions no request context
  5. Se nao: 401 Unauthorized
```

### 4.5 Webhook Signature (HMAC-SHA256)

```typescript
// Geracao da assinatura (server-side)
const timestamp = Math.floor(Date.now() / 1000);
const payload = JSON.stringify(body);
const signatureInput = `${timestamp}.${payload}`;
const signature = crypto
  .createHmac('sha256', endpointSecret)
  .update(signatureInput)
  .digest('hex');

// Headers enviados
// X-Litix-Signature: t=1708786800,v1=5257a869...
// X-Litix-Timestamp: 1708786800
```

### 4.6 LGPD Compliance

| Requisito LGPD | Implementacao |
|----------------|---------------|
| Base legal (Art. 7, VI) | Tratamento para exercicio de direitos em processos judiciais |
| Minimizacao de dados | Armazena apenas dados processuais publicos; CPF/CNPJ de partes com acesso controlado |
| Direito de acesso | API `GET /api/v1/me/data` retorna todos os dados do usuario |
| Direito de exclusao | API `DELETE /api/v1/me` soft-delete + anonimizacao em 30 dias |
| Retencao | Dados de tenant cancelado retidos por 30 dias (grace period), depois purgados |
| Criptografia em transito | TLS 1.3 (Vercel + Supabase enforced) |
| Criptografia em repouso | AES-256 para api_keys.secret, webhook_endpoints.secret (via Supabase Vault) |
| Audit trail | Tabela `audit_log` registra login, consulta, exportacao, alteracao |
| DPA | Data Processing Agreement template disponivel para Enterprise |
| Encarregado (DPO) | Configuravel por tenant em `tenants.settings` para compliance Enterprise |

### 4.7 Rate Limiting

```
Rate Limiting Stack:
  1. Vercel Edge Middleware: IP-based (proteção DDoS básica)
  2. Application Layer: Token bucket por tenant (Vercel KV / Upstash Redis)
  3. Database Layer: pg_cron verifica limites de plano (soft/hard)

Limites por Plano:
  Free:        60 req/min
  Solo:       120 req/min
  Escritorio: 300 req/min
  Pro:       1000 req/min
  Enterprise: Custom

Enforcement:
  - 80% do limite: Header X-RateLimit-Warning: approaching
  - 100% do limite: 429 Too Many Requests com Retry-After header
  - API key com rate_limit_override usa override em vez do plano
```

---

## 5. API Contracts

### 5.1 Convencoes Gerais

| Aspecto | Convencao |
|---------|-----------|
| Base URL | `https://api.litix.com.br/api/v1` |
| Formato | JSON (Content-Type: application/json) |
| Auth (Dashboard) | Cookie-based JWT (Supabase Auth) |
| Auth (API) | `Authorization: Bearer ltx_...` (API key) |
| Paginacao | Cursor-based: `?cursor=xxx&limit=50` |
| Erros | `{ "error": { "code": "RATE_LIMITED", "message": "...", "details": {} } }` |
| Timestamps | ISO 8601 com timezone (ex: `2026-02-24T14:30:00Z`) |
| Versionamento | URL path (`/api/v1/...`) |

### 5.2 Auth Endpoints

```
POST   /auth/signup           -- Criar conta + tenant
POST   /auth/login            -- Login (retorna JWT)
POST   /auth/logout           -- Invalidar sessao
POST   /auth/refresh          -- Refresh token
POST   /auth/invite           -- Convidar membro para tenant
POST   /auth/accept-invite    -- Aceitar convite
POST   /auth/forgot-password  -- Solicitar reset
POST   /auth/reset-password   -- Resetar senha
```

**POST /auth/signup**

```json
// Request
{
  "email": "rafael@escritoriosilva.com.br",
  "password": "...",
  "firm_name": "Escritorio Silva & Associados",
  "display_name": "Dr. Rafael Silva",
  "oab_number": "SP123456",
  "oab_uf": "SP"
}

// Response 201
{
  "user": {
    "id": "uuid",
    "email": "rafael@escritoriosilva.com.br"
  },
  "tenant": {
    "id": "uuid",
    "slug": "escritorio-silva",
    "name": "Escritorio Silva & Associados",
    "plan": "free"
  },
  "member": {
    "id": "uuid",
    "role": "owner"
  },
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_at": 1708790400
  }
}
```

### 5.3 Processes Endpoints

```
GET    /processes                  -- Listar processos do tenant (paginado)
GET    /processes/:cnj             -- Consultar processo por CNJ
POST   /processes/search           -- Busca avancada (OAB, CPF, CNPJ, nome)
POST   /processes/:cnj/monitor     -- Adicionar ao monitoramento
DELETE /processes/:cnj/monitor     -- Remover do monitoramento
POST   /processes/:cnj/refresh     -- Forcar nova consulta multi-provider
GET    /processes/:cnj/movements   -- Listar movimentacoes
GET    /processes/:cnj/deadlines   -- Listar prazos calculados
POST   /processes/:cnj/export      -- Exportar (CSV/PDF)
```

**GET /processes**

```json
// Request: GET /api/v1/processes?status=ativo&tribunal=TJSP&limit=50&cursor=xxx

// Response 200
{
  "data": [
    {
      "id": "uuid",
      "cnj": "1234567-89.2024.8.26.0100",
      "tribunal": {
        "sigla": "TJSP",
        "nome": "Tribunal de Justica do Estado de Sao Paulo",
        "comarca": "Sao Paulo",
        "vara": "1a Vara Civel"
      },
      "area": "civel",
      "classe": "Acao Civil Publica",
      "juiz": "Dr. Fulano de Tal",
      "valor_causa": 150000.00,
      "status": "ativo",
      "fase": "inicial",
      "completeness_score": 0.85,
      "movement_count": 23,
      "last_checked_at": "2026-02-24T10:00:00Z",
      "monitoring_enabled": true,
      "provider_data": {
        "origem": {"provider": "datajud", "fetched_at": "2026-02-24T10:00:00Z"},
        "merged_from": ["datajud", "codilo"]
      },
      "created_at": "2026-01-15T08:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "eyJ...",
    "has_more": true,
    "total": 1234
  }
}
```

**GET /processes/:cnj**

```json
// Request: GET /api/v1/processes/1234567-89.2024.8.26.0100?strategy=race&providers=datajud,codilo

// Response 200
{
  "data": {
    "cnj": "1234567-89.2024.8.26.0100",
    "tribunal": { "sigla": "TJSP", "nome": "...", "comarca": "...", "vara": "..." },
    "area": "civel",
    "classe": "Procedimento Comum Civel",
    "assunto_principal": "Indenizacao por Dano Moral",
    "assuntos": [
      {"codigo": "10432", "descricao": "Indenizacao por Dano Moral", "principal": true}
    ],
    "juiz": "Dr. Fulano de Tal",
    "valor_causa": 150000.00,
    "data_distribuicao": "2024-03-15",
    "status": "ativo",
    "fase": "inicial",
    "nivel_sigilo": 0,
    "completeness_score": 0.92,
    "partes": [
      {
        "nome": "MARIA DA SILVA",
        "documento": "***456789**",
        "tipo_documento": "cpf",
        "lado": "autor",
        "advogados": [{"nome": "Dr. Rafael Silva", "oab": "SP123456", "uf": "SP"}]
      },
      {
        "nome": "EMPRESA XYZ LTDA",
        "documento": "12345678000190",
        "tipo_documento": "cnpj",
        "lado": "reu",
        "advogados": []
      }
    ],
    "movimentacoes": [
      {
        "id": "uuid",
        "data": "2026-02-20T00:00:00Z",
        "tipo": "despacho",
        "descricao": "Designada audiencia de conciliacao para 15/03/2026",
        "codigo": "11010"
      }
    ],
    "provider_data": {
      "sources": ["datajud", "codilo"],
      "merged": true,
      "total_duration_ms": 2340,
      "origem": {"provider": "datajud", "fetched_at": "2026-02-24T10:00:00Z"},
      "merged_from": [
        {"provider": "datajud", "fetched_at": "2026-02-24T10:00:00Z"},
        {"provider": "codilo", "fetched_at": "2026-02-24T10:00:01Z"}
      ]
    }
  }
}
```

### 5.4 Monitoring Endpoints

```
GET    /monitoring/status          -- Status do monitoramento do tenant
GET    /monitoring/alerts          -- Listar alertas (paginado, filtrado)
PATCH  /monitoring/alerts/:id/read -- Marcar alerta como lido
PATCH  /monitoring/alerts/read-all -- Marcar todos como lidos
GET    /monitoring/alerts/count    -- Contagem de alertas nao lidos
```

**GET /monitoring/alerts**

```json
// Request: GET /api/v1/monitoring/alerts?is_read=false&severity=urgent&limit=20

// Response 200
{
  "data": [
    {
      "id": "uuid",
      "case_id": "uuid",
      "cnj": "1234567-89.2024.8.26.0100",
      "alert_type": "new_movement",
      "severity": "attention",
      "title": "Nova movimentacao detectada",
      "description": "Despacho - Designada audiencia de conciliacao para 15/03/2026",
      "metadata": {
        "movement_type": "despacho",
        "movement_date": "2026-02-20"
      },
      "is_read": false,
      "created_at": "2026-02-20T10:05:00Z"
    }
  ],
  "pagination": { "cursor": "...", "has_more": false, "total": 3 },
  "summary": { "unread": 3, "urgent": 0, "attention": 2, "info": 1 }
}
```

### 5.5 Webhooks Endpoints

```
GET    /webhooks                   -- Listar endpoints do tenant
POST   /webhooks                   -- Criar endpoint
PATCH  /webhooks/:id               -- Atualizar endpoint
DELETE /webhooks/:id               -- Remover endpoint
POST   /webhooks/:id/test          -- Enviar test payload
GET    /webhooks/:id/deliveries    -- Listar entregas do endpoint
POST   /webhooks/deliveries/:id/retry -- Reenviar entrega falha
```

**POST /webhooks**

```json
// Request
{
  "url": "https://meu-sistema.com.br/litix-webhook",
  "description": "Integracao com sistema interno",
  "events": ["new_movement", "deadline_approaching", "status_change"]
}

// Response 201
{
  "data": {
    "id": "uuid",
    "url": "https://meu-sistema.com.br/litix-webhook",
    "description": "Integracao com sistema interno",
    "secret": "whsec_a1b2c3d4e5f6...",  // Retornado APENAS na criacao
    "events": ["new_movement", "deadline_approaching", "status_change"],
    "is_active": true,
    "created_at": "2026-02-24T14:00:00Z"
  }
}
```

**Webhook Payload Enviado:**

```json
// POST para o URL do endpoint do cliente
// Headers:
//   Content-Type: application/json
//   X-Litix-Signature: t=1708786800,v1=5257a869e4a2...
//   X-Litix-Timestamp: 1708786800
//   X-Litix-Event: new_movement
//   X-Litix-Delivery-Id: uuid

{
  "event": "new_movement",
  "delivery_id": "uuid",
  "timestamp": "2026-02-24T14:05:00Z",
  "data": {
    "case": {
      "cnj": "1234567-89.2024.8.26.0100",
      "tribunal": "TJSP",
      "status": "ativo"
    },
    "movement": {
      "date": "2026-02-24",
      "type": "despacho",
      "description": "Designada audiencia de conciliacao"
    },
    "alert": {
      "id": "uuid",
      "severity": "attention"
    }
  }
}
```

### 5.6 Billing Endpoints

```
GET    /billing/plans              -- Listar planos disponiveis
GET    /billing/subscription       -- Subscription atual do tenant
POST   /billing/checkout           -- Criar sessao Stripe Checkout
POST   /billing/portal             -- Criar sessao Stripe Customer Portal
GET    /billing/usage              -- Uso atual vs limites do plano
```

**GET /billing/usage**

```json
// Response 200
{
  "data": {
    "plan": "escritorio",
    "limits": {
      "max_cases": 1000,
      "max_users": 10,
      "api_rate_limit": 300,
      "webhook_endpoints": 5
    },
    "current_usage": {
      "cases": 456,
      "users": 7,
      "webhook_endpoints": 3,
      "api_calls_this_minute": 45
    },
    "utilization": {
      "cases_percent": 45.6,
      "users_percent": 70.0,
      "warning": false
    }
  }
}
```

### 5.7 Admin Endpoints (Litix Internal)

```
GET    /admin/tenants              -- Listar todos os tenants
GET    /admin/tenants/:id          -- Detalhe de um tenant
PATCH  /admin/tenants/:id          -- Atualizar tenant (plano, status)
GET    /admin/providers/health     -- Health de todos os providers
GET    /admin/providers/:name/history -- Historico de circuit breaker
GET    /admin/metrics              -- Metricas agregadas (MRR, churn, etc)
POST   /admin/plans                -- CRUD de planos
```

### 5.8 Error Response Format

```json
// 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "CNJ invalido: formato incorreto",
    "details": {
      "field": "cnj",
      "expected": "NNNNNNN-DD.AAAA.J.TR.OOOO"
    }
  }
}

// 401 Unauthorized
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "API key invalida ou expirada"
  }
}

// 403 Forbidden
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Seu perfil (viewer) nao tem permissao para esta operacao"
  }
}

// 429 Rate Limited
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Voce atingiu o limite de 300 req/min do plano Escritorio",
    "details": {
      "limit": 300,
      "remaining": 0,
      "reset_at": "2026-02-24T14:01:00Z"
    }
  }
}

// 402 Payment Required (Plan Limit)
{
  "error": {
    "code": "PLAN_LIMIT_REACHED",
    "message": "Voce atingiu o limite de 1000 processos do plano Escritorio. Atualize para Pro para continuar.",
    "details": {
      "resource": "cases",
      "limit": 1000,
      "current": 1000,
      "upgrade_url": "/billing/plans"
    }
  }
}
```

---

## 6. Diagrama de Componentes

### 6.1 Frontend (Next.js App Router)

```
src/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Grupo: paginas de auth (sem sidebar)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── invite/[token]/page.tsx
│   ├── (dashboard)/               # Grupo: dashboard (com sidebar + header)
│   │   ├── layout.tsx             # Sidebar + Header + Auth guard
│   │   ├── page.tsx               # Dashboard home (resumo)
│   │   ├── cases/                 # Epic 3, 6: listagem + ficha
│   │   │   ├── page.tsx           # Lista paginada com filtros
│   │   │   └── [cnj]/page.tsx     # Ficha unica do processo
│   │   ├── monitoring/            # Epic 4: alertas + monitoramento
│   │   │   ├── page.tsx           # Status de monitoramento
│   │   │   └── alerts/page.tsx    # Lista de alertas
│   │   ├── import/                # Epic 2: OAB import
│   │   │   └── page.tsx           # Tela de importacao
│   │   ├── webhooks/              # Epic 5: configuracao
│   │   │   └── page.tsx
│   │   ├── deadlines/             # Epic 7: prazos
│   │   │   └── page.tsx
│   │   ├── analytics/             # Epic 10: dashboards analiticos
│   │   │   └── page.tsx
│   │   ├── settings/              # Configuracoes do tenant
│   │   │   ├── page.tsx           # Geral
│   │   │   ├── members/page.tsx   # Epic 1: gerenciar membros
│   │   │   ├── billing/page.tsx   # Epic 12: billing
│   │   │   └── api-keys/page.tsx  # Epic 11: API keys
│   │   └── admin/                 # Epic 13: admin panel (Litix only)
│   │       └── page.tsx
│   ├── portal/                    # Epic 9: portal do cliente (publico)
│   │   └── [token]/page.tsx
│   └── api/                       # API Routes
│       └── v1/
│           ├── auth/
│           ├── processes/
│           ├── monitoring/
│           ├── webhooks/
│           ├── billing/
│           └── admin/
├── features/                      # Feature modules
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── schemas/
│   ├── cases/
│   ├── monitoring/
│   ├── webhooks/
│   ├── billing/
│   ├── import/
│   ├── deadlines/
│   ├── analytics/
│   ├── portal/
│   └── admin/
├── components/                    # Shared UI components
│   ├── ui/                        # shadcn/ui components
│   ├── layout/                    # Sidebar, Header, Footer
│   └── common/                    # CNJ input, Provider badge, etc
├── lib/                           # Shared libraries
│   ├── supabase/                  # Supabase clients (server, browser, middleware)
│   ├── providers/                 # Provider adapters (migrado do backend)
│   ├── services/                  # Business logic (orchestrator, merge, etc)
│   └── utils/                     # Helpers, validators, formatters
├── stores/                        # Zustand stores
│   ├── auth-store.ts
│   ├── cases-store.ts
│   └── alerts-store.ts
└── types/                         # TypeScript types
    ├── database.ts                # Generated from Supabase (supabase gen types)
    ├── api.ts
    └── process.ts
```

### 6.2 Backend Services (Migrado do Express)

```
lib/
├── providers/                     # 5 providers (migrados de src/providers/)
│   ├── datajud/
│   │   ├── datajud.client.ts
│   │   ├── datajud.mapper.ts
│   │   ├── datajud.provider.ts
│   │   └── datajud.types.ts
│   ├── codilo/
│   ├── escavador/
│   ├── judit/
│   ├── predictus/
│   ├── provider.interface.ts      # ILegalDataProvider (inalterado)
│   └── index.ts
├── services/
│   ├── orchestrator.service.ts    # OrchestratorService (migrado, inalterado)
│   ├── merge.service.ts           # mergeProcessos (migrado, inalterado)
│   ├── plan-enforcement.ts        # Verificacao de limites por plano
│   └── webhook-signer.ts          # HMAC-SHA256 signature
├── repositories/                  # Repository Pattern (ADR-004)
│   ├── interfaces/
│   │   ├── case.repository.ts
│   │   ├── alert.repository.ts
│   │   ├── webhook.repository.ts
│   │   └── ...
│   └── supabase/
│       ├── case.repository.ts     # SupabaseCaseRepository
│       ├── alert.repository.ts
│       └── ...
└── utils/
    ├── circuit-breaker.ts         # CircuitBreaker (migrado, inalterado)
    ├── cnj-validator.ts           # normalizeCnj (migrado, inalterado)
    ├── logger.ts                  # Pino logger (migrado)
    └── retry.ts                   # Retry with backoff
```

### 6.3 Trigger.dev Jobs

```
trigger/
├── oab-import.ts                  # Job: importacao por OAB (Epic 2)
│   - Recebe: { tenant_id, member_id, oab_number, oab_uf }
│   - Varre providers (race strategy) por OAB
│   - Dedup por CNJ dentro do tenant
│   - Persiste em monitored_cases
│   - Atualiza oab_imports com progresso
│
├── monitoring-cycle.ts            # Job: ciclo de monitoramento (Epic 4)
│   - Trigado por pg_cron a cada 30min
│   - Seleciona processos com monitoring_enabled=true ordenados por last_checked_at
│   - Compara hash de movimentacoes
│   - Se mudanca: insere case_movements + alert + fan-out
│
├── webhook-delivery.ts            # Job: entrega de webhook (Epic 5)
│   - Recebe: { delivery_id }
│   - Assina payload com HMAC-SHA256
│   - POST para endpoint com timeout 10s
│   - Retry: 0s, 5s, 25s, 2min, 10min
│   - Se esgotado: status = dead_letter
│
├── alert-email.ts                 # Job: envio de email de alerta (Epic 4)
│   - Recebe: { alert_id, tenant_id }
│   - Render template React (Resend)
│   - Envia para email do membro
│
├── analytics-snapshot.ts          # Job: snapshot diario (Epic 10)
│   - Trigado por pg_cron diariamente as 02:00
│   - Agrega metricas por tenant
│   - Persiste em analytics_snapshots
│
└── deadline-checker.ts            # Job: verificacao de prazos (Epic 7)
    - Trigado por pg_cron diariamente as 08:00
    - Verifica deadlines proximos (5, 3, 1 dia)
    - Gera alerts com severity baseada na proximidade
```

---

## 7. Fluxos Criticos

### 7.1 Signup + Tenant Creation + OAB Import

```
Advogado          Next.js             Supabase Auth      DB (RLS)         Trigger.dev
  |                  |                     |                |                  |
  |-- Signup form -->|                     |                |                  |
  |  (email, pwd,    |                     |                |                  |
  |   firm, OAB)     |                     |                |                  |
  |                  |-- signUp() -------->|                |                  |
  |                  |                     |-- INSERT       |                  |
  |                  |                     |   auth.users -->|                 |
  |                  |                     |                |                  |
  |                  |<-- user created ----|                |                  |
  |                  |                     |                |                  |
  |                  |-- [Server Action] --|--------------->|                  |
  |                  |   INSERT tenants    |                |                  |
  |                  |   INSERT tenant_members (role=owner) |                  |
  |                  |   INSERT profiles (with OAB)        |                  |
  |                  |   INSERT subscriptions (plan=free)   |                  |
  |                  |                     |                |                  |
  |                  |-- Auth Hook fires ->|                |                  |
  |                  |   (JWT now has tenant_id + role)     |                  |
  |                  |                     |                |                  |
  |                  |-- IF OAB provided: -|----------------|----------------->|
  |                  |   Trigger OAB       |                |   oab-import job |
  |                  |   Import Job        |                |                  |
  |                  |                     |                |   Varre 92       |
  |                  |                     |                |   tribunais      |
  |                  |                     |                |   DataJud +      |
  |                  |                     |                |   Judit +        |
  |                  |                     |                |   Escavador      |
  |                  |                     |                |   (race)         |
  |                  |                     |                |                  |
  |<-- Redirect to --|                     |                |                  |
  |   dashboard      |                     |                |<-- INSERT cases  |
  |   + import       |                     |                |    Dedup by CNJ  |
  |   progress bar   |                     |                |                  |
  |                  |                     |                |                  |
  |<-- Realtime -----|---------------------|-- NOTIFY ------|                  |
  |   progress       |  (Supabase Realtime on oab_imports)  |                  |
  |   updates        |                     |                |                  |
```

### 7.2 Monitoring Cycle (Deteccao + Alerta + Webhook)

```
pg_cron             Trigger.dev          Providers          DB              Webhook Endpoint
  |                     |                   |                |                    |
  |-- HTTP trigger ---->|                   |                |                    |
  |   (every 30min)     |                   |                |                    |
  |                     |                   |                |                    |
  |                     |-- SELECT cases ---|--------------->|                    |
  |                     |   WHERE monitoring_enabled         |                    |
  |                     |   AND last_checked < threshold     |                    |
  |                     |                   |                |                    |
  |                     |   FOR EACH case:  |                |                    |
  |                     |                   |                |                    |
  |                     |-- searchByCnj() ->|                |                    |
  |                     |   (fallback       |                |                    |
  |                     |    strategy)      |                |                    |
  |                     |                   |                |                    |
  |                     |<-- ProcessoUnif --|                |                    |
  |                     |                   |                |                    |
  |                     |-- Hash movs ------|                |                    |
  |                     |   Compare with    |                |                    |
  |                     |   last_movement_hash               |                    |
  |                     |                   |                |                    |
  |                     |   IF hash changed:|                |                    |
  |                     |                   |                |                    |
  |                     |-- INSERT new -----|-----------  -->|                    |
  |                     |   case_movements  |                |                    |
  |                     |-- INSERT alert ---|--------------->|                    |
  |                     |-- UPDATE case ----|--------------->|                    |
  |                     |   (hash, count,   |                |                    |
  |                     |    last_checked)  |                |                    |
  |                     |                   |                |                    |
  |                     |   Fan-out:        |                |                    |
  |                     |                   |                |                    |
  |                     |-- Trigger email --|                |                    |
  |                     |   alert job       |                |                    |
  |                     |                   |                |                    |
  |                     |-- SELECT webhooks-|--------------->|                    |
  |                     |   WHERE events    |                |                    |
  |                     |   CONTAINS        |                |                    |
  |                     |   'new_movement'  |                |                    |
  |                     |                   |                |                    |
  |                     |   FOR EACH endpoint:               |                    |
  |                     |                   |                |                    |
  |                     |-- Sign payload ---|                |                    |
  |                     |   HMAC-SHA256     |                |                    |
  |                     |                   |                |                    |
  |                     |-- INSERT delivery-|--------------->|                    |
  |                     |                   |                |                    |
  |                     |-- POST payload ---|----------------|-- HTTP POST ------>|
  |                     |                   |                |   + signature      |
  |                     |                   |                |   + headers        |
  |                     |                   |                |                    |
  |                     |   IF success:     |                |                    |
  |                     |-- UPDATE delivery-|-- status=ok -->|                    |
  |                     |                   |                |                    |
  |                     |   IF failure:     |                |                    |
  |                     |-- Schedule retry -|                |                    |
  |                     |   (exponential    |                |                    |
  |                     |    backoff)       |                |                    |
```

### 7.3 Consulta por CNJ (Orchestration + Merge + Cache)

```
Client           Next.js API Route    Vercel KV          Orchestrator       Provider A    Provider B
  |                    |                  |                   |                 |              |
  |-- GET /processes/  |                  |                   |                 |              |
  |   {cnj}?strategy=  |                  |                   |                 |              |
  |   race             |                  |                   |                 |              |
  |                    |                  |                   |                 |              |
  |                    |-- Auth check --->|                   |                 |              |
  |                    |   (JWT or API key)                   |                 |              |
  |                    |                  |                   |                 |              |
  |                    |-- Plan limit --->|                   |                 |              |
  |                    |   check          |                   |                 |              |
  |                    |   (rate limit +  |                   |                 |              |
  |                    |    query quota)  |                   |                 |              |
  |                    |                  |                   |                 |              |
  |                    |-- Cache lookup ->|                   |                 |              |
  |                    |   key: cnj:tenant|                   |                 |              |
  |                    |                  |                   |                 |              |
  |                    |   IF cache hit:  |                   |                 |              |
  |<-- 200 + cached --|<-- return -------|                   |                 |              |
  |                    |                  |                   |                 |              |
  |                    |   IF cache miss: |                   |                 |              |
  |                    |                  |                   |                 |              |
  |                    |-- consultByCnj() |------------------>|                 |              |
  |                    |   strategy=race  |                   |                 |              |
  |                    |                  |                   |-- searchByCnj ->|              |
  |                    |                  |                   |-- searchByCnj --|------------->|
  |                    |                  |                   |                 |              |
  |                    |                  |                   |   Circuit       |              |
  |                    |                  |                   |   breakers      |              |
  |                    |                  |                   |   per provider  |              |
  |                    |                  |                   |                 |              |
  |                    |                  |                   |<-- result A ----|              |
  |                    |                  |                   |<-- result B ----|--------------|
  |                    |                  |                   |                 |              |
  |                    |                  |                   |-- mergeProcessos               |
  |                    |                  |                   |   (if 2+ results               |
  |                    |                  |                   |    + merge enabled)             |
  |                    |                  |                   |                                |
  |                    |<-- OrchestrationResult --------------|                                |
  |                    |                  |                   |                                |
  |                    |-- Cache set ---->|                   |                                |
  |                    |   TTL: 5min      |                   |                                |
  |                    |                  |                   |                                |
  |                    |-- Audit log ---->|   (async)         |                                |
  |                    |                  |                   |                                |
  |<-- 200 + result --|                  |                   |                                |
```

### 7.4 Billing Lifecycle (Subscribe + Enforce + Upgrade/Downgrade)

```
Owner            Next.js             Stripe                DB              Vercel KV
  |                 |                   |                    |                 |
  |-- Click        |                   |                    |                 |
  |   "Upgrade     |                   |                    |                 |
  |    to Pro"     |                   |                    |                 |
  |                |                   |                    |                 |
  |                |-- Create Checkout |                    |                 |
  |                |   Session ------->|                    |                 |
  |                |   (price_id,      |                    |                 |
  |                |    tenant_id in   |                    |                 |
  |                |    metadata)      |                    |                 |
  |                |                   |                    |                 |
  |<-- Redirect --|<-- checkout_url --|                    |                 |
  |   to Stripe    |                   |                    |                 |
  |                |                   |                    |                 |
  |-- Pay on       |                   |                    |                 |
  |   Stripe form  |                   |                    |                 |
  |                |                   |                    |                 |
  |                |   Stripe Webhook: |                    |                 |
  |                |   checkout.session.|completed           |                 |
  |                |                   |                    |                 |
  |                |<-- POST /api/v1/ -|                    |                 |
  |                |   billing/webhook |                    |                 |
  |                |                   |                    |                 |
  |                |-- Verify Stripe --|                    |                 |
  |                |   signature       |                    |                 |
  |                |                   |                    |                 |
  |                |-- UPDATE tenants -|                 -->|                 |
  |                |   plan = 'pro'    |                    |                 |
  |                |   stripe_*        |                    |                 |
  |                |                   |                    |                 |
  |                |-- UPSERT          |                 -->|                 |
  |                |   subscriptions   |                    |                 |
  |                |                   |                    |                 |
  |                |-- Invalidate -----|--------------------|---------------->|
  |                |   plan cache      |                    |                 |
  |                |   key: plan:{tid} |                    |                 |
  |                |                   |                    |                 |
  |<-- Redirect --|   (success_url)   |                    |                 |
  |   to dashboard |                   |                    |                 |
  |                |                   |                    |                 |
  |                |                   |                    |                 |
  |   [Later: Enforcement]             |                    |                 |
  |                |                   |                    |                 |
  |-- Add 1001st  |                   |                    |                 |
  |   process      |                   |                    |                 |
  |                |-- Check limit --->|                    |                 |
  |                |   1000 (Pro plan)  |<--- cache hit -----|                 |
  |                |                   |                    |                 |
  |                |   current = 1000  |                    |                 |
  |                |   limit = 5000    |                    |                 |
  |                |   -> ALLOWED      |                    |                 |
  |                |                   |                    |                 |
  |                |                   |                    |                 |
  |   [Downgrade: customer.subscription.updated]            |                 |
  |                |                   |                    |                 |
  |                |<-- Webhook -------|                    |                 |
  |                |   plan changed    |                    |                 |
  |                |                   |                    |                 |
  |                |-- UPDATE tenant --|                 -->|                 |
  |                |   plan = new_plan |                    |                 |
  |                |                   |                    |                 |
  |                |-- Invalidate cache|                    |                 |
  |                |                   |                    |                 |
  |                |   IF current_usage|> new_limits:       |                 |
  |                |   -> Soft warning |   (email + banner) |                 |
  |                |   -> NO hard block|   until period end |                 |
```

---

## 8. Estrategia de Migracao

### 8.1 Inventario do Backend Existente

| Componente Atual (`src/`) | LOC Est. | Destino no Next.js | Acao |
|---------------------------|----------|---------------------|------|
| `providers/datajud/` | ~300 | `lib/providers/datajud/` | Copiar; ajustar imports para absolute |
| `providers/codilo/` | ~350 | `lib/providers/codilo/` | Copiar; ajustar imports |
| `providers/escavador/` | ~250 | `lib/providers/escavador/` | Copiar; ajustar imports |
| `providers/judit/` | ~250 | `lib/providers/judit/` | Copiar; ajustar imports |
| `providers/predictus/` | ~300 | `lib/providers/predictus/` | Copiar; ajustar imports |
| `providers/provider.interface.ts` | ~50 | `lib/providers/provider.interface.ts` | Copiar |
| `services/orchestrator.service.ts` | ~290 | `lib/services/orchestrator.service.ts` | Copiar; funcao pura, sem dependencia de Express |
| `services/merge.service.ts` | ~210 | `lib/services/merge.service.ts` | Copiar sem alteracao |
| `services/monitor.service.ts` | ~260 | `trigger/monitoring-cycle.ts` | Reescrever como Trigger.dev job; trocar file I/O por Supabase |
| `services/cpf-monitor.service.ts` | ~200 | `trigger/monitoring-cycle.ts` (merged) | Incorporar no job de monitoramento |
| `services/scheduler.service.ts` | ~200 | pg_cron | Substituir por cron nativo do PostgreSQL |
| `services/webhook-dispatcher.service.ts` | ~60 | `trigger/webhook-delivery.ts` | Reescrever com retry + HMAC |
| `services/appsheet-dispatcher.service.ts` | ~30 | Descontinuar | AppSheet sera substituido pelo webhook generico |
| `models/*` | ~100 | `types/` | Copiar; adicionar Zod schemas |
| `utils/circuit-breaker.ts` | ~130 | `lib/utils/circuit-breaker.ts` | Copiar sem alteracao |
| `utils/cnj-validator.ts` | ~50 | `lib/utils/cnj-validator.ts` | Copiar |
| `middleware/*` | ~200 | Next.js middleware + API route middleware | Reescrever para Next.js conventions |
| `controllers/*` | ~400 | `app/api/v1/` (Route Handlers) | Reescrever como Next.js Route Handlers |
| `config/env.ts` | ~100 | `.env.local` + `lib/config/env.ts` (Zod) | Reescrever com Zod env validation |

### 8.2 Fases de Migracao

**Fase 0.1: Setup Projeto Next.js (1 semana)**

```
1. npx create-next-app@latest litix --typescript --tailwind --app --src-dir
2. Setup Supabase project + CLI local (supabase init)
3. Setup shadcn/ui
4. Configurar Vercel project + env vars
5. Configurar Trigger.dev project
6. Setup absolute imports (@/)
7. Copiar types de src/models/ para types/
8. Copiar utils (circuit-breaker, cnj-validator, logger) para lib/utils/
```

**Fase 0.2: Migrar Providers + Orchestrator (1 semana)**

```
1. Copiar providers para lib/providers/
2. Ajustar imports (relativo -> absoluto)
3. Trocar .js extensions por .ts (ESM -> Next.js bundling)
4. Copiar orchestrator + merge service para lib/services/
5. Testes: verificar que orchestrator funciona identico
6. Adaptar env config para usar process.env (Next.js native)
```

**Fase 0.3: Setup Schema + Auth + RLS (1 semana)**

```
1. Criar migrations Supabase (schema da secao 3)
2. Implementar Auth Hook (Edge Function)
3. Configurar RLS policies
4. Implementar middleware Next.js (auth + tenant extraction)
5. Testes de isolamento multi-tenant
```

**Fase 0.4: Repository Pattern + API Routes (1 semana)**

```
1. Implementar repository interfaces
2. Implementar SupabaseCaseRepository, SupabaseAlertRepository, etc
3. Criar API routes basicas (processes, monitoring)
4. Implementar plan enforcement middleware
5. Smoke test end-to-end: signup -> consulta -> monitoramento
```

### 8.3 Mapeamento de Funcionalidades

| Funcionalidade Express | Equivalente Next.js |
|------------------------|---------------------|
| `app.get('/api/v1/...')` | `app/api/v1/.../route.ts` (GET) |
| `app.post('/api/v1/...')` | `app/api/v1/.../route.ts` (POST) |
| `authMiddleware` | Next.js `middleware.ts` + `createServerClient` |
| `rateLimiter` (express-rate-limit) | Upstash `@upstash/ratelimit` |
| `errorHandler` | Route Handler try/catch + shared error formatter |
| `requestLogger` | Pino + Vercel request logging |
| `helmet` | Next.js `next.config.ts` security headers |
| `cors` | Next.js `next.config.ts` CORS config |
| `setInterval` scheduler | pg_cron + Trigger.dev |
| File-based data (`data/*.json`) | Supabase PostgreSQL |

### 8.4 Riscos da Migracao

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Provider quebra durante migracao | Baixa | Alto | Manter Express rodando em paralelo; feature flag para alternar |
| RLS policy incorreta vaza dados | Media | Critico | Testes automatizados de isolamento antes de qualquer deploy |
| Auth Hook adiciona latencia no login | Media | Baixo | Cache do hook + monitoramento de latencia; aceitavel ate 500ms |
| Trigger.dev cold start em jobs | Baixa | Medio | Pre-warming; jobs nao sao time-critical (monitoramento e batch) |
| Supabase Free atinge limite | Media | Medio | Monitorar metricas; upgrade para Pro ($25/mes) quando necessario |

---

## 9. Observabilidade e Operacoes

### 9.1 Logging

| Camada | Ferramenta | Nivel |
|--------|-----------|-------|
| Next.js API Routes | Pino (structured JSON) | info+ em prod; debug em dev |
| Trigger.dev Jobs | Trigger.dev built-in logs | Auto |
| Supabase | Supabase Dashboard Logs | Auto |
| Vercel | Vercel Log Drains | Configuravel |

**Estrutura de Log:**

```json
{
  "level": "info",
  "time": 1708786800000,
  "msg": "Consulta por CNJ concluida",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "cnj": "1234567-89.2024.8.26.0100",
  "strategy": "race",
  "sources": ["datajud", "codilo"],
  "merged": true,
  "duration_ms": 2340,
  "completeness_score": 0.92
}
```

### 9.2 Monitoramento de Providers

| Metrica | Como | Alerta |
|---------|------|--------|
| Provider uptime | Circuit breaker state | Alerta quando provider entra em `open` |
| Latencia P95 | Timer em cada chamada | Alerta se P95 > 10s por 5min consecutivos |
| Fallback rate | Contador de fallbacks / total | Alerta se > 30% fallback em 1h |
| Merge rate | Contador de merges / total | Informativo |
| Completeness score medio | Agregacao de scores | Alerta se media < 0.5 por 1h |

### 9.3 Health Endpoint

```
GET /api/v1/health

{
  "status": "healthy",
  "version": "1.0.0",
  "providers": {
    "datajud": {"status": "healthy", "circuit": "closed", "latency_p95_ms": 1200},
    "codilo": {"status": "healthy", "circuit": "closed", "latency_p95_ms": 800},
    "escavador": {"status": "degraded", "circuit": "half-open", "latency_p95_ms": 5000},
    "judit": {"status": "healthy", "circuit": "closed", "latency_p95_ms": 600},
    "predictus": {"status": "healthy", "circuit": "closed", "latency_p95_ms": 900}
  },
  "database": {"status": "healthy", "latency_ms": 5},
  "cache": {"status": "healthy", "latency_ms": 2},
  "uptime_seconds": 86400
}
```

### 9.4 Status Page (Publica)

Recomendacao: Usar [Openstatus](https://www.openstatus.dev/) (open-source, gratuito) ou [BetterUptime](https://betteruptime.com/) para status page publica mostrando uptime por provider. Diferencial competitivo conforme identificado na analise competitiva (Gap 5 -- nenhum concorrente tem status page publica).

### 9.5 Scaling Path

| Metrica de Trigger | Acao |
|--------------------|------|
| Supabase bandwidth > 80% Free | Upgrade para Pro ($25/mes) |
| DB connections > 150 | Configurar connection pooling (PgBouncer built-in) |
| DB size > 5GB | Supabase Pro (100GB included) |
| Edge Function invocations > 400K/mes | Supabase Pro (2M included) |
| Vercel KV storage > 256MB | Vercel KV Pro |
| Custo total Supabase > $500/mes | Iniciar migracao para AWS RDS (ADR-004 repository pattern) |
| Trigger.dev runs > 25K/mes | Trigger.dev Pro |

---

## Apendice: Mapeamento Epic-para-Schema

| Epic | Tabelas Primarias | Tabelas Auxiliares |
|------|-------------------|-------------------|
| Epic 1: Multi-Tenant + Auth | tenants, tenant_members, profiles | subscriptions |
| Epic 2: Import OAB | oab_imports, monitored_cases | monitoring_jobs |
| Epic 3: Ficha Unica | monitored_cases, case_movements | -- |
| Epic 4: Monitoramento + Alertas | monitoring_jobs, alerts, case_movements | monitored_cases |
| Epic 5: Webhook | webhook_endpoints, webhook_deliveries | alerts |
| Epic 6: Dashboard Multi-Advogado | monitored_cases, profiles | tenant_members |
| Epic 7: Prazos | deadline_rules, deadlines | case_movements, alerts |
| Epic 8: Exportacao | monitored_cases, case_movements | analytics_snapshots |
| Epic 9: Portal Cliente | client_portal_links | monitored_cases, case_movements |
| Epic 10: Analytics | analytics_snapshots | monitored_cases, case_movements |
| Epic 11: API Publica | api_keys | todas (via API) |
| Epic 12: Billing | subscriptions, plan_limits | tenants |
| Epic 13: Admin Panel | tenants, subscriptions | monitoring_jobs, audit_log |

---

*Documento gerado por Aria (Architect Agent / AIOS) com base no PRD v1.0.0, pesquisa de mercado, analise competitiva, e recomendacoes de arquitetura do projeto Litix.*

*Proximos passos recomendados:*
1. *Revisao e aprovacao da arquitetura pelo stakeholder*
2. *@data-engineer para refinamento do schema (indexes adicionais, query optimization, views materializadas)*
3. *@po para criar stories detalhadas da Fase 0 (migracao) a partir deste documento*
4. *@dev para iniciar setup do projeto Next.js (Fase 0.1)*
5. *@devops para configurar Supabase project, Vercel project, e Trigger.dev project*

---

*-- Aria, arquitetando o futuro*
