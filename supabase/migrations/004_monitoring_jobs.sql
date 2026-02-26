-- =============================================================================
-- Migration 004: Tabela de jobs de monitoramento
-- Registra cada execucao do cron de monitoramento para auditoria
-- =============================================================================

CREATE TABLE IF NOT EXISTS monitoring_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'no_change')),
  provider_used   TEXT,
  movements_found INTEGER NOT NULL DEFAULT 0
                  CHECK (movements_found >= 0),
  duration_ms     INTEGER,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_monitoring_jobs_completed_after_started
    CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

-- Indexes for query patterns
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_case
  ON monitoring_jobs(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_tenant
  ON monitoring_jobs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_status
  ON monitoring_jobs(status)
  WHERE status IN ('pending', 'running');

-- BRIN index for cleanup DELETE (created_at is append-only, naturally ordered)
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_created_at
  ON monitoring_jobs USING BRIN (created_at);

-- RLS: enabled but no policies.
-- This is intentional — monitoring_jobs is a system/audit table accessed only
-- via service role (cron job, admin APIs). Service role bypasses RLS.
-- End users have no direct access to this table.
ALTER TABLE monitoring_jobs ENABLE ROW LEVEL SECURITY;

-- Cleanup: remove jobs older than 30 days (run via pg_cron when available)
-- SELECT cron.schedule('cleanup-monitoring-jobs', '0 4 * * *', $$
--   DELETE FROM monitoring_jobs WHERE created_at < now() - interval '30 days';
-- $$);
-- Alternative for free tier: Vercel Cron calling a cleanup API endpoint.

COMMENT ON TABLE monitoring_jobs IS 'Registro de cada execucao do cron de monitoramento';
COMMENT ON COLUMN monitoring_jobs.status IS 'pending=aguardando, running=executando, completed=novas movs, no_change=sem mudanca, failed=erro';
COMMENT ON COLUMN monitoring_jobs.duration_ms IS 'Tempo de execucao em milissegundos';
COMMENT ON COLUMN monitoring_jobs.movements_found IS 'Quantidade de novas movimentacoes encontradas nesta execucao';
