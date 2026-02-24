-- =============================================================================
-- LITIX DATABASE SCHEMA — Migration 001
-- Supabase PostgreSQL 15+
-- Versão: 1.0.0
--
-- INSTRUÇÕES:
-- 1. Abra o Supabase Dashboard → SQL Editor
-- 2. Cole este arquivo inteiro e clique em "Run"
-- 3. Verifique se todas as tabelas aparecem em Database → Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM ('new_movement', 'deadline_approaching', 'status_change');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('pending', 'success', 'failed', 'dead_letter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 1. TENANTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   TEXT UNIQUE NOT NULL,
  name                   TEXT NOT NULL,
  plan                   TEXT NOT NULL DEFAULT 'free'
                         CHECK (plan IN ('free', 'solo', 'escritorio', 'pro', 'enterprise')),
  stripe_customer_id     TEXT UNIQUE,
  settings               JSONB NOT NULL DEFAULT '{}',
  trial_ends_at          TIMESTAMPTZ,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug   ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_plan   ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe ON tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- =============================================================================
-- 2. TENANT MEMBERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        member_role NOT NULL DEFAULT 'member',
  invited_by  UUID REFERENCES auth.users(id),
  invited_at  TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_tenant_member UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user   ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_role   ON tenant_members(tenant_id, role);

-- =============================================================================
-- 3. PROFILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  email        TEXT,
  avatar_url   TEXT,
  oab_number   TEXT,
  oab_state    TEXT CHECK (oab_state IS NULL OR length(oab_state) = 2),
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_oab ON profiles(oab_number) WHERE oab_number IS NOT NULL;

-- =============================================================================
-- 4. MONITORED CASES
-- =============================================================================
CREATE TABLE IF NOT EXISTS monitored_cases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cnj                 TEXT NOT NULL,                       -- 20 dígitos normalizados
  tribunal            TEXT,                                -- Ex: "TJSP", "TRT2"
  provider            TEXT,                                -- Provider principal que encontrou o processo
  monitor_enabled     BOOLEAN NOT NULL DEFAULT true,
  last_checked_at     TIMESTAMPTZ,
  last_movement_hash  TEXT,                                -- SHA-256 das movimentações para detectar mudanças
  movement_count      INTEGER NOT NULL DEFAULT 0,
  status              TEXT DEFAULT 'ativo'
                      CHECK (status IN ('ativo', 'finalizado', 'arquivado', 'suspenso', 'cancelado')),
  area                TEXT,                                -- civel, trabalhista, criminal, etc
  classe              TEXT,
  assunto_principal   TEXT,
  juiz                TEXT,
  valor_causa         DECIMAL(15,2),
  data_distribuicao   DATE,
  partes_json         JSONB,                               -- Array de partes [{nome, lado, documento}]
  provider_data       JSONB,                               -- Dados de cada provider {datajud: {...}, codilo: {...}}
  tags                TEXT[] DEFAULT '{}',
  notes               TEXT,
  import_source       TEXT DEFAULT 'manual',               -- 'manual', 'oab_import', 'api'
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_case_tenant_cnj UNIQUE (tenant_id, cnj)
);

CREATE INDEX IF NOT EXISTS idx_cases_tenant         ON monitored_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cases_cnj            ON monitored_cases(cnj);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_status  ON monitored_cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_monitoring     ON monitored_cases(monitor_enabled, last_checked_at) WHERE monitor_enabled = true;
CREATE INDEX IF NOT EXISTS idx_cases_tribunal       ON monitored_cases(tenant_id, tribunal);
CREATE INDEX IF NOT EXISTS idx_cases_cnj_trgm       ON monitored_cases USING GIN (cnj gin_trgm_ops);

-- =============================================================================
-- 5. CASE MOVEMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS case_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  movement_date   TIMESTAMPTZ NOT NULL,
  type            TEXT,
  description     TEXT NOT NULL,
  content         TEXT,
  code            TEXT,
  provider        TEXT,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_movement UNIQUE (case_id, movement_date, description)
);

CREATE INDEX IF NOT EXISTS idx_movements_tenant      ON case_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_movements_case        ON case_movements(case_id);
CREATE INDEX IF NOT EXISTS idx_movements_case_date   ON case_movements(case_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_movements_tenant_date ON case_movements(tenant_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_movements_unread      ON case_movements(tenant_id, is_read) WHERE is_read = false;

-- =============================================================================
-- 6. ALERTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  case_id     UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  movement_id UUID REFERENCES case_movements(id),
  type        alert_type NOT NULL DEFAULT 'new_movement',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  email_sent  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant       ON alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_member       ON alerts(member_id);
CREATE INDEX IF NOT EXISTS idx_alerts_case         ON alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_unread ON alerts(tenant_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_member_unread ON alerts(member_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_date   ON alerts(tenant_id, created_at DESC);

-- =============================================================================
-- 7. WEBHOOK ENDPOINTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  url                  TEXT NOT NULL,
  secret               TEXT NOT NULL,
  events               TEXT[] NOT NULL DEFAULT '{new_movement}',
  is_active            BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at     TIMESTAMPTZ,
  last_delivery_status TEXT,
  failure_count        INTEGER NOT NULL DEFAULT 0,
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhook_endpoints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhook_endpoints(tenant_id, is_active) WHERE is_active = true;

-- =============================================================================
-- 8. WEBHOOK DELIVERIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint_id          UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  alert_id             UUID REFERENCES alerts(id),
  event_type           TEXT NOT NULL,
  payload              JSONB NOT NULL,
  status               delivery_status NOT NULL DEFAULT 'pending',
  attempt_count        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at      TIMESTAMPTZ,
  last_response_status INTEGER,
  last_response_body   TEXT,
  delivered_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_tenant   ON webhook_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_endpoint ON webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status   ON webhook_deliveries(status) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_deliveries_retry    ON webhook_deliveries(next_attempt_at) WHERE status = 'failed';

-- =============================================================================
-- 9. PLAN LIMITS (dados de configuração)
-- =============================================================================
CREATE TABLE IF NOT EXISTS plan_limits (
  plan                        TEXT PRIMARY KEY,
  display_name                TEXT NOT NULL,
  max_cases                   INTEGER NOT NULL,   -- -1 = ilimitado
  max_users                   INTEGER NOT NULL,
  max_oab_per_member          INTEGER NOT NULL DEFAULT 1,
  api_rate_limit              INTEGER NOT NULL,   -- req/min
  webhook_endpoints           INTEGER NOT NULL,
  monitoring_frequency_hours  INTEGER NOT NULL DEFAULT 12,
  features                    JSONB NOT NULL DEFAULT '{}',
  price_monthly_brl           DECIMAL(10,2),
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  is_active                   BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO plan_limits
  (plan, display_name, max_cases, max_users, max_oab_per_member, api_rate_limit, webhook_endpoints, monitoring_frequency_hours, features, price_monthly_brl, sort_order)
VALUES
  ('free',       'Free',       10,   1,  1,  60,   0,  24, '{"import_oab": false, "alerts_email": false, "export": false, "deadlines": false}',                                                                                  0.00,   1),
  ('solo',       'Solo',       200,  1,  1,  120,  1,  12, '{"import_oab": true, "alerts_email": true, "export": true, "deadlines": true}',                                                                                       59.00,  2),
  ('escritorio', 'Escritório', 1000, 10, 3,  300,  5,  6,  '{"import_oab": true, "alerts_email": true, "export": true, "deadlines": true, "multi_member": true, "reports": true, "webhook": true}',                              249.00, 3),
  ('pro',        'Pro',        5000, 30, 5,  1000, 20, 2,  '{"import_oab": true, "alerts_email": true, "export": true, "deadlines": true, "multi_member": true, "reports": true, "webhook": true, "analytics": true, "api": true}', 599.00, 4),
  ('enterprise', 'Enterprise', -1,  -1, -1, -1,   -1, 1,  '{"all": true}',                                                                                                                                                        NULL,   5)
ON CONFLICT (plan) DO NOTHING;

-- =============================================================================
-- 10. SUBSCRIPTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan                      TEXT NOT NULL DEFAULT 'free',
  status                    TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')),
  stripe_subscription_id    TEXT UNIQUE,
  stripe_price_id           TEXT,
  stripe_current_period_end TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT false,
  canceled_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_subscription_tenant UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- =============================================================================
-- 11. OAB IMPORTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS oab_imports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id           UUID NOT NULL REFERENCES tenant_members(id),
  oab_number          TEXT NOT NULL,
  oab_uf              TEXT NOT NULL CHECK (length(oab_uf) = 2),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partial')),
  trigger_id          TEXT,
  tribunals_total     INTEGER NOT NULL DEFAULT 0,
  tribunals_done      INTEGER NOT NULL DEFAULT 0,
  cases_found         INTEGER NOT NULL DEFAULT 0,
  cases_imported      INTEGER NOT NULL DEFAULT 0,
  cases_deduplicated  INTEGER NOT NULL DEFAULT 0,
  providers_used      TEXT[],
  error               TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oab_imports_tenant ON oab_imports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_oab_imports_member ON oab_imports(member_id);
CREATE INDEX IF NOT EXISTS idx_oab_imports_status ON oab_imports(status) WHERE status IN ('pending', 'running');

-- =============================================================================
-- 12. FUNÇÕES AUXILIARES DO JWT (RLS)
-- =============================================================================

CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.member_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'member_id')::uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- 13. FUNÇÃO get_tenant_usage (usada por plan-limits.ts)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_tenant_usage(p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan            TEXT;
  v_max_cases       INTEGER;
  v_max_users       INTEGER;
  v_max_webhooks    INTEGER;
  v_api_rate_limit  INTEGER;
  v_current_cases   INTEGER;
  v_current_users   INTEGER;
  v_current_webhooks INTEGER;
BEGIN
  -- Pega o plano atual do tenant
  SELECT t.plan INTO v_plan
  FROM tenants t
  WHERE t.id = p_tenant_id;

  -- Pega os limites do plano
  SELECT
    pl.max_cases,
    pl.max_users,
    pl.webhook_endpoints,
    pl.api_rate_limit
  INTO v_max_cases, v_max_users, v_max_webhooks, v_api_rate_limit
  FROM plan_limits pl
  WHERE pl.plan = v_plan;

  -- Conta uso atual
  SELECT COUNT(*) INTO v_current_cases
  FROM monitored_cases
  WHERE tenant_id = p_tenant_id;

  SELECT COUNT(*) INTO v_current_users
  FROM tenant_members
  WHERE tenant_id = p_tenant_id AND is_active = true;

  SELECT COUNT(*) INTO v_current_webhooks
  FROM webhook_endpoints
  WHERE tenant_id = p_tenant_id AND is_active = true;

  RETURN json_build_object(
    'plan',                    v_plan,
    'max_cases',               v_max_cases,
    'current_max_cases',       v_current_cases,
    'max_users',               v_max_users,
    'current_max_users',       v_current_users,
    'webhook_endpoints',       v_max_webhooks,
    'current_webhook_endpoints', v_current_webhooks,
    'api_rate_limit',          v_api_rate_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 14. TRIGGER updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'tenants', 'tenant_members', 'profiles', 'monitored_cases',
    'webhook_endpoints', 'subscriptions'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I;
       CREATE TRIGGER set_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;

-- =============================================================================
-- 15. RLS — Habilitar em todas as tabelas
-- =============================================================================

ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_cases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_movements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints    ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE oab_imports          ENABLE ROW LEVEL SECURITY;

-- plan_limits é read-only e público (sem dados sensíveis)
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_limits_public_read" ON plan_limits FOR SELECT USING (true);

-- =============================================================================
-- 16. RLS POLICIES — Isolamento por tenant
-- =============================================================================

-- TENANTS: cada user vê apenas o seu tenant
CREATE POLICY "tenant_select" ON tenants FOR SELECT
  USING (id = auth.tenant_id());

CREATE POLICY "tenant_update" ON tenants FOR UPDATE
  USING (id = auth.tenant_id() AND auth.user_role() IN ('owner'));

-- TENANT_MEMBERS
CREATE POLICY "members_select" ON tenant_members FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "members_insert" ON tenant_members FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id() AND auth.user_role() IN ('owner', 'admin'));

CREATE POLICY "members_update" ON tenant_members FOR UPDATE
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('owner', 'admin'));

CREATE POLICY "members_delete" ON tenant_members FOR DELETE
  USING (tenant_id = auth.tenant_id() AND auth.user_role() IN ('owner', 'admin'));

-- PROFILES: user vê apenas o próprio perfil
CREATE POLICY "profile_select" ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profile_insert" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profile_update" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Isolamento genérico para tabelas de dados do tenant
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'monitored_cases', 'case_movements', 'alerts',
    'webhook_endpoints', 'webhook_deliveries',
    'subscriptions', 'oab_imports'
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

-- =============================================================================
-- 17. TRIGGER — Criar profile + tenant automaticamente no signup
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id  UUID;
  v_tenant_slug TEXT;
  v_name       TEXT;
BEGIN
  -- Nome do usuário
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Slug único para o tenant
  v_tenant_slug := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'tenant_name', split_part(NEW.email, '@', 1)),
    '[^a-z0-9]', '-', 'g'
  )) || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Cria o tenant
  INSERT INTO tenants (name, slug, plan)
  VALUES (v_name, v_tenant_slug, 'free')
  RETURNING id INTO v_tenant_id;

  -- Cria o membro como owner
  INSERT INTO tenant_members (tenant_id, user_id, role, accepted_at)
  VALUES (v_tenant_id, NEW.id, 'owner', now());

  -- Cria o perfil
  INSERT INTO profiles (id, full_name, email)
  VALUES (NEW.id, v_name, NEW.email);

  -- Cria a subscription free
  INSERT INTO subscriptions (tenant_id, plan, status)
  VALUES (v_tenant_id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Associa o trigger ao auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- FIM DA MIGRATION 001
-- =============================================================================
