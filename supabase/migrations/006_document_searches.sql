-- =============================================================================
-- Migration 006: Tabela de buscas por documento (CPF/CNPJ)
-- Permite buscar e importar processos a partir de CPF ou CNPJ
-- =============================================================================

CREATE TABLE IF NOT EXISTS document_searches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id           UUID NOT NULL REFERENCES tenant_members(id),
  document_type       TEXT NOT NULL CHECK (document_type IN ('cpf', 'cnpj')),
  document_value      TEXT NOT NULL,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  trigger_id          TEXT,
  cases_found         INTEGER NOT NULL DEFAULT 0,
  cases_imported      INTEGER NOT NULL DEFAULT 0,
  cases_deduplicated  INTEGER NOT NULL DEFAULT 0,
  providers_used      TEXT[],
  error               TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documento deve ter formato válido (CPF 11 ou CNPJ 14 dígitos)
ALTER TABLE document_searches
  ADD CONSTRAINT chk_document_searches_value
  CHECK (
    (document_type = 'cpf' AND document_value ~ '^\d{11}$') OR
    (document_type = 'cnpj' AND document_value ~ '^\d{14}$')
  );

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_document_searches_tenant
  ON document_searches(tenant_id);

CREATE INDEX IF NOT EXISTS idx_document_searches_status
  ON document_searches(status)
  WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_document_searches_client
  ON document_searches(client_id)
  WHERE client_id IS NOT NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE document_searches ENABLE ROW LEVEL SECURITY;

-- ─── COMMENTS ────────────────────────────────────────────────────────────────

COMMENT ON TABLE document_searches IS 'Registro de buscas de processos por CPF ou CNPJ via Judit API';
COMMENT ON COLUMN document_searches.document_type IS 'cpf ou cnpj';
COMMENT ON COLUMN document_searches.document_value IS 'Número do documento, somente dígitos';
COMMENT ON COLUMN document_searches.client_id IS 'Se busca originada de um cliente, vincula processos importados';
