-- =============================================================================
-- Migration 007: Provider query tracking table
-- Audit trail for all external provider API calls (DataJud, Judit, Codilo, etc.)
-- Used by analytics dashboard for usage, cost, and quality metrics.
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_queries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  search_type         TEXT NOT NULL DEFAULT 'cnj'
                      CHECK (search_type IN ('cnj', 'cpf', 'cnpj', 'oab')),
  search_key          TEXT NOT NULL,
  tribunal            TEXT,
  status              TEXT NOT NULL DEFAULT 'success'
                      CHECK (status IN ('success', 'error', 'timeout', 'not_found')),
  duration_ms         INTEGER,
  completeness_score  REAL CHECK (completeness_score IS NULL OR (completeness_score >= 0 AND completeness_score <= 1)),
  fields_returned     INTEGER CHECK (fields_returned IS NULL OR fields_returned >= 0),
  cost_estimate_brl   REAL NOT NULL DEFAULT 0 CHECK (cost_estimate_brl >= 0),
  error               TEXT,
  source_flow         TEXT CHECK (source_flow IS NULL OR source_flow IN (
    'case_register', 'cron_monitor', 'document_search', 'oab_import'
  )),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analytics query patterns
CREATE INDEX IF NOT EXISTS idx_provider_queries_tenant
  ON provider_queries(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_queries_provider
  ON provider_queries(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_queries_tribunal
  ON provider_queries(tribunal, provider)
  WHERE tribunal IS NOT NULL;

-- BRIN index for cleanup DELETE (created_at is append-only)
CREATE INDEX IF NOT EXISTS idx_provider_queries_created_brin
  ON provider_queries USING BRIN (created_at);

-- RLS: enabled but no policies.
-- This is an audit table accessed only via service role.
ALTER TABLE provider_queries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE provider_queries IS 'Audit trail for external provider API calls';
COMMENT ON COLUMN provider_queries.provider IS 'Provider name: datajud, judit, codilo, escavador, predictus';
COMMENT ON COLUMN provider_queries.completeness_score IS 'Data completeness 0.0-1.0 based on filled fields';
COMMENT ON COLUMN provider_queries.cost_estimate_brl IS 'Estimated cost in BRL (datajud=0, judit~0.15)';
COMMENT ON COLUMN provider_queries.source_flow IS 'Which production flow triggered this query';
