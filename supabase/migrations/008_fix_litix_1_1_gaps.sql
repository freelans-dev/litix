-- =============================================================================
-- LITIX DATABASE — Migration 008
-- Fundação RLS + Gaps LITIX-1.1
-- Versão: 2.0.0
-- Data: 2026-03-01
--
-- CONTEXTO: Migration 001 foi aplicada manualmente via Dashboard, mas falhou
-- ao criar funções no schema auth (permission denied). Este arquivo:
-- 1. Cria helper functions no schema PUBLIC (sem restrição de permissão)
-- 2. Habilita RLS em todas as tabelas
-- 3. Cria todas as policies de isolamento
-- 4. Cria tabelas faltando (audit_log, case_members)
-- 5. Adiciona colunas faltando (gaps LITIX-1.1)
--
-- IDEMPOTENTE: IF NOT EXISTS / DO NOTHING em todos os statements.
-- =============================================================================


-- =============================================================================
-- SEÇÃO 1: Extensões (AC12)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgmq";


-- =============================================================================
-- SEÇÃO 2: Helper functions no schema PUBLIC
-- Substitui auth.tenant_id() / auth.user_role() / auth.member_id() que não
-- podem ser criadas via CLI (permission denied no schema auth).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.jwt_user_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.jwt_member_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'member_id')::uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- =============================================================================
-- SEÇÃO 3: Tabelas faltando (criadas em 001 mas não aplicadas)
-- =============================================================================

-- 3.1: case_members (M:M — membros responsáveis por processo)
CREATE TABLE IF NOT EXISTS case_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_case_members_case   ON case_members(case_id);
CREATE INDEX IF NOT EXISTS idx_case_members_member ON case_members(member_id);
CREATE INDEX IF NOT EXISTS idx_case_members_tenant ON case_members(tenant_id);

-- 3.2: audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  member_id     UUID REFERENCES tenant_members(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   UUID,
  metadata      JSONB,
  table_name    TEXT,
  record_id     UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant      ON audit_log(tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id     ON audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_action      ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource    ON audit_log(resource_type, resource_id) WHERE resource_type IS NOT NULL;


-- =============================================================================
-- SEÇÃO 4: Colunas faltando (gaps LITIX-1.1)
-- =============================================================================

-- 4.1: tenants — stripe_subscription_id (AC1)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_sub_id
  ON tenants(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- 4.2: profiles — tenant_id, user_id, display_name, oab_uf (AC3)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id     UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS oab_uf      TEXT CHECK (oab_uf IS NULL OR length(oab_uf) = 2);

-- Migrar: full_name → display_name
UPDATE profiles SET display_name = full_name
WHERE display_name IS NULL AND full_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_gin
  ON profiles USING GIN (display_name gin_trgm_ops)
  WHERE display_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id) WHERE tenant_id IS NOT NULL;

-- 4.3: plan_limits — stripe_price_id (AC4)
ALTER TABLE plan_limits
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- 4.4: subscriptions — current_period_start, current_period_end (AC5)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end   TIMESTAMPTZ;

UPDATE subscriptions
SET current_period_end = stripe_current_period_end
WHERE current_period_end IS NULL
  AND stripe_current_period_end IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON subscriptions(current_period_end)
  WHERE current_period_end IS NOT NULL;


-- =============================================================================
-- SEÇÃO 5: Habilitar RLS em todas as tabelas
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
ALTER TABLE case_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits          ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SEÇÃO 6: RLS Policies
-- Usa public.jwt_tenant_id() em vez de auth.tenant_id()
-- =============================================================================

-- plan_limits: leitura pública (sem dados sensíveis)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plan_limits' AND policyname = 'plan_limits_public_read') THEN
    CREATE POLICY "plan_limits_public_read" ON plan_limits FOR SELECT USING (true);
  END IF;
END $$;

-- tenants
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'tenant_select') THEN
    CREATE POLICY "tenant_select" ON tenants FOR SELECT
      USING (id = public.jwt_tenant_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'tenant_update') THEN
    CREATE POLICY "tenant_update" ON tenants FOR UPDATE
      USING (id = public.jwt_tenant_id() AND public.jwt_user_role() = 'owner');
  END IF;
END $$;

-- tenant_members
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_members' AND policyname = 'members_select') THEN
    CREATE POLICY "members_select" ON tenant_members FOR SELECT
      USING (tenant_id = public.jwt_tenant_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_members' AND policyname = 'members_insert') THEN
    CREATE POLICY "members_insert" ON tenant_members FOR INSERT
      WITH CHECK (tenant_id = public.jwt_tenant_id() AND public.jwt_user_role() IN ('owner', 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_members' AND policyname = 'members_update') THEN
    CREATE POLICY "members_update" ON tenant_members FOR UPDATE
      USING (tenant_id = public.jwt_tenant_id() AND public.jwt_user_role() IN ('owner', 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_members' AND policyname = 'members_delete') THEN
    CREATE POLICY "members_delete" ON tenant_members FOR DELETE
      USING (tenant_id = public.jwt_tenant_id() AND public.jwt_user_role() IN ('owner', 'admin'));
  END IF;
END $$;

-- profiles: próprio perfil + colegas do mesmo tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profile_select') THEN
    CREATE POLICY "profile_select" ON profiles FOR SELECT
      USING (id = auth.uid() OR tenant_id = public.jwt_tenant_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profile_insert') THEN
    CREATE POLICY "profile_insert" ON profiles FOR INSERT
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profile_update') THEN
    CREATE POLICY "profile_update" ON profiles FOR UPDATE
      USING (id = auth.uid());
  END IF;
END $$;

-- audit_log: apenas owner e admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'audit_log_owner_admin') THEN
    CREATE POLICY "audit_log_owner_admin" ON audit_log
      USING (tenant_id = public.jwt_tenant_id() AND public.jwt_user_role() IN ('owner', 'admin'));
  END IF;
END $$;

-- Isolamento genérico para tabelas de dados do tenant
DO $$
DECLARE
  tbl TEXT;
  tbl_list TEXT[] := ARRAY[
    'monitored_cases', 'case_movements', 'alerts',
    'webhook_endpoints', 'webhook_deliveries',
    'subscriptions', 'oab_imports', 'case_members'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbl_list LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = 'tenant_isolation_select') THEN
      EXECUTE format(
        'CREATE POLICY "tenant_isolation_select" ON %I FOR SELECT USING (tenant_id = public.jwt_tenant_id())',
        tbl
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = 'tenant_isolation_insert') THEN
      EXECUTE format(
        'CREATE POLICY "tenant_isolation_insert" ON %I FOR INSERT WITH CHECK (tenant_id = public.jwt_tenant_id())',
        tbl
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = 'tenant_isolation_update') THEN
      EXECUTE format(
        'CREATE POLICY "tenant_isolation_update" ON %I FOR UPDATE USING (tenant_id = public.jwt_tenant_id())',
        tbl
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = 'tenant_isolation_delete') THEN
      EXECUTE format(
        'CREATE POLICY "tenant_isolation_delete" ON %I FOR DELETE USING (tenant_id = public.jwt_tenant_id())',
        tbl
      );
    END IF;
  END LOOP;
END $$;


-- =============================================================================
-- SEÇÃO 7: Trigger updated_at para tabelas novas / colunas adicionadas
-- =============================================================================

-- Garantir que trigger_set_updated_at existe (pode não ter sido criado se 001 falhou)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
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
-- SEÇÃO 8: handle_new_user trigger (criado em 001, mas pode não ter aplicado)
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id   UUID;
  v_tenant_slug TEXT;
  v_name        TEXT;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_tenant_slug := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'tenant_name', split_part(NEW.email, '@', 1)),
    '[^a-z0-9]', '-', 'g'
  )) || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO tenants (name, slug, plan)
  VALUES (v_name, v_tenant_slug, 'free')
  RETURNING id INTO v_tenant_id;

  INSERT INTO tenant_members (tenant_id, user_id, role, accepted_at)
  VALUES (v_tenant_id, NEW.id, 'owner', now());

  INSERT INTO profiles (id, full_name, display_name, email, tenant_id, user_id)
  VALUES (NEW.id, v_name, v_name, NEW.email, v_tenant_id, NEW.id);

  INSERT INTO subscriptions (tenant_id, plan, status)
  VALUES (v_tenant_id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- SEÇÃO 9: Comentários de documentação
-- =============================================================================

COMMENT ON FUNCTION public.jwt_tenant_id() IS
  'Extrai tenant_id do JWT claim. Substitui auth.tenant_id() (inacessível via CLI migrations).';
COMMENT ON FUNCTION public.jwt_user_role() IS
  'Extrai role do JWT claim. Substitui auth.user_role().';
COMMENT ON FUNCTION public.jwt_member_id() IS
  'Extrai member_id do JWT claim. Substitui auth.member_id().';

COMMENT ON TABLE audit_log IS
  'Log de auditoria de operações sensíveis. Imutável (sem updated_at). Owner/admin only.';
COMMENT ON TABLE case_members IS
  'M:M — membros responsáveis por cada processo.';

-- =============================================================================
-- FIM DA MIGRATION 008
-- =============================================================================
