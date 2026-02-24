-- ═══════════════════════════════════════════════════════════════════
-- LITIX — Migration 001: Multi-Tenant Schema + RLS
-- Story: LITIX-1.1
-- ═══════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── RLS Helper Functions ─────────────────────────────────────────────
-- These functions read custom JWT claims injected by the Auth Hook.

CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::UUID
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '')
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.member_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'member_id', '')::UUID
$$ LANGUAGE SQL STABLE;

-- ── Enums ────────────────────────────────────────────────────────────
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE alert_type  AS ENUM ('new_movement', 'deadline_approaching', 'status_change');
CREATE TYPE delivery_status AS ENUM ('pending', 'success', 'failed', 'dead_letter');
CREATE TYPE oab_import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ── tenants ──────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  plan                TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id  TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenants_slug ON tenants(slug);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_own_data" ON tenants
  USING (id = auth.tenant_id());

-- ── tenant_members ───────────────────────────────────────────────────
CREATE TABLE tenant_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        member_role NOT NULL DEFAULT 'member',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  invited_by  UUID REFERENCES tenant_members(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user_id  ON tenant_members(user_id);
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON tenant_members
  USING (tenant_id = auth.tenant_id());

-- ── profiles ─────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  oab_number  TEXT,
  oab_uf      CHAR(2),
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON profiles
  USING (id = auth.uid());

-- ── subscriptions ────────────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  plan                        TEXT NOT NULL DEFAULT 'free',
  stripe_subscription_id      TEXT UNIQUE,
  stripe_current_period_end   TIMESTAMPTZ,
  status                      TEXT NOT NULL DEFAULT 'active',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON subscriptions
  USING (tenant_id = auth.tenant_id());

-- ── plan_limits ──────────────────────────────────────────────────────
CREATE TABLE plan_limits (
  plan                TEXT PRIMARY KEY,
  max_cases           INTEGER NOT NULL DEFAULT 10,   -- -1 = unlimited
  max_users           INTEGER NOT NULL DEFAULT 1,
  webhook_endpoints   INTEGER NOT NULL DEFAULT 0,
  api_rate_limit      INTEGER NOT NULL DEFAULT 60,   -- req/min
  monitor_interval_h  INTEGER NOT NULL DEFAULT 24
);

INSERT INTO plan_limits (plan, max_cases, max_users, webhook_endpoints, api_rate_limit, monitor_interval_h) VALUES
  ('free',       10,    1,  0,  60,  24),
  ('solo',      200,    3,  1, 120,   6),
  ('escritorio',1000,  15,  5, 300,   1),
  ('pro',       5000, 100, 20,1000,   1),
  ('enterprise',  -1,  -1, -1,  -1,   1);

-- ── monitored_cases ──────────────────────────────────────────────────
CREATE TABLE monitored_cases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cnj                   TEXT NOT NULL,
  tribunal              TEXT,
  provider              TEXT,
  monitor_enabled       BOOLEAN NOT NULL DEFAULT false,
  last_checked_at       TIMESTAMPTZ,
  last_movement_hash    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, cnj)
);
CREATE INDEX idx_monitored_cases_tenant_id     ON monitored_cases(tenant_id);
CREATE INDEX idx_monitored_cases_monitor       ON monitored_cases(monitor_enabled, last_checked_at)
  WHERE monitor_enabled = true;
ALTER TABLE monitored_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON monitored_cases
  USING (tenant_id = auth.tenant_id());

-- ── case_members ─────────────────────────────────────────────────────
-- Which members are responsible for which cases (M:M)
CREATE TABLE case_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, member_id)
);
ALTER TABLE case_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON case_members
  USING (tenant_id = auth.tenant_id());

-- ── oab_imports ──────────────────────────────────────────────────────
CREATE TABLE oab_imports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  oab_number      TEXT NOT NULL,
  oab_uf          CHAR(2) NOT NULL,
  status          oab_import_status NOT NULL DEFAULT 'pending',
  total_found     INTEGER,
  total_imported  INTEGER,
  error_message   TEXT,
  trigger_job_id  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);
ALTER TABLE oab_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON oab_imports
  USING (tenant_id = auth.tenant_id());

-- ── alerts ───────────────────────────────────────────────────────────
CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  case_id     UUID REFERENCES monitored_cases(id) ON DELETE SET NULL,
  type        alert_type NOT NULL DEFAULT 'new_movement',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_member_id   ON alerts(member_id, created_at DESC);
CREATE INDEX idx_alerts_unread      ON alerts(tenant_id, read, created_at DESC)
  WHERE read = false;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
-- Each member sees only their own alerts
CREATE POLICY "member_own_alerts" ON alerts
  USING (member_id = auth.member_id());

-- ── webhook_endpoints ────────────────────────────────────────────────
CREATE TABLE webhook_endpoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  secret      TEXT NOT NULL,
  events      TEXT[] NOT NULL DEFAULT '{new_movement}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES tenant_members(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_endpoints_tenant_id ON webhook_endpoints(tenant_id);
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON webhook_endpoints
  USING (tenant_id = auth.tenant_id());

-- ── webhook_deliveries ───────────────────────────────────────────────
CREATE TABLE webhook_deliveries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint_id           UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  alert_id              UUID REFERENCES alerts(id),
  event_type            TEXT NOT NULL,
  payload               JSONB NOT NULL,
  status                delivery_status NOT NULL DEFAULT 'pending',
  attempt_count         INTEGER NOT NULL DEFAULT 0,
  next_attempt_at       TIMESTAMPTZ,
  last_response_status  INTEGER,
  last_response_body    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at          TIMESTAMPTZ
);
CREATE INDEX idx_webhook_deliveries_endpoint_id ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_deliveries_pending     ON webhook_deliveries(status, next_attempt_at)
  WHERE status IN ('pending', 'failed');
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON webhook_deliveries
  USING (tenant_id = auth.tenant_id());

-- ── audit_log ────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  member_id   UUID REFERENCES tenant_members(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_tenant_id ON audit_log(tenant_id, created_at DESC);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Only owners and admins can read audit log
CREATE POLICY "owner_admin_only" ON audit_log
  USING (
    tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('owner', 'admin')
  );

-- ── get_tenant_usage SQL function ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_tenant_usage(p_tenant_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'max_cases',                pl.max_cases,
    'current_max_cases',        COUNT(DISTINCT mc.id),
    'max_users',                pl.max_users,
    'current_max_users',        COUNT(DISTINCT tm.id),
    'webhook_endpoints',        pl.webhook_endpoints,
    'current_webhook_endpoints',COUNT(DISTINCT we.id),
    'api_rate_limit',           pl.api_rate_limit,
    'plan',                     s.plan
  )
  FROM tenants t
  JOIN subscriptions s   ON s.tenant_id = t.id
  JOIN plan_limits pl    ON pl.plan = s.plan
  LEFT JOIN monitored_cases mc ON mc.tenant_id = t.id AND mc.monitor_enabled = true
  LEFT JOIN tenant_members  tm ON tm.tenant_id = t.id AND tm.is_active = true
  LEFT JOIN webhook_endpoints we ON we.tenant_id = t.id AND we.is_active = true
  WHERE t.id = p_tenant_id
  GROUP BY pl.max_cases, pl.max_users, pl.webhook_endpoints, pl.api_rate_limit, s.plan;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ── updated_at trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Cleanup crons (pg_cron — run after enabling extension) ───────────
-- SELECT cron.schedule('cleanup-alerts', '0 2 * * *',
--   $$DELETE FROM alerts WHERE created_at < now() - interval '90 days'$$
-- );
-- SELECT cron.schedule('cleanup-deliveries', '0 3 * * *',
--   $$DELETE FROM webhook_deliveries WHERE created_at < now() - interval '30 days'$$
-- );
