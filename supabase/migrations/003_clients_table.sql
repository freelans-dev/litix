-- =============================================================================
-- Migration 003: Tabela de clientes (entidade separada)
-- Cria cadastro centralizado de clientes por tenant + FK em monitored_cases
-- =============================================================================

-- ─── TABELA DE CLIENTES ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  tipo_pessoa   TEXT CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  documento     TEXT,  -- CPF (11 digits) ou CNPJ (14 digits)
  email         TEXT,
  phone         TEXT,
  address_line  TEXT,
  city          TEXT,
  state         TEXT CHECK (state IS NULL OR length(state) = 2),
  zip_code      TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CONSTRAINTS ─────────────────────────────────────────────────────────────

-- Documento deve ter 11 (CPF) ou 14 (CNPJ) digitos quando preenchido
ALTER TABLE clients
  ADD CONSTRAINT chk_clients_documento
  CHECK (documento IS NULL OR documento ~ '^\d{11}$' OR documento ~ '^\d{14}$');

-- Documento unico por tenant (permite NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_tenant_documento
  ON clients(tenant_id, documento)
  WHERE documento IS NOT NULL;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_clients_tenant_name
  ON clients(tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_clients_tenant_active
  ON clients(tenant_id, is_active)
  WHERE is_active = true;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Politica para service role (API routes usam createServiceClient que bypassa RLS)
-- RLS e habilitado para seguranca, mas as API routes usam service role key

-- ─── FK EM MONITORED_CASES ───────────────────────────────────────────────────

ALTER TABLE monitored_cases
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cases_client_id
  ON monitored_cases(client_id)
  WHERE client_id IS NOT NULL;

-- ─── TRIGGER: auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- ─── COMMENTS ────────────────────────────────────────────────────────────────

COMMENT ON TABLE clients IS 'Cadastro centralizado de clientes por tenant';
COMMENT ON COLUMN clients.tipo_pessoa IS 'fisica ou juridica';
COMMENT ON COLUMN clients.documento IS 'CPF (11 digitos) ou CNPJ (14 digitos), somente numeros';
COMMENT ON COLUMN clients.is_active IS 'Soft delete: false = desativado';
COMMENT ON COLUMN monitored_cases.client_id IS 'FK para clients.id - vinculo processo<->cliente';
