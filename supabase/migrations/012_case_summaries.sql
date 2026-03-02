-- Migration 012: Persist AI-generated case summaries
-- Avoids repeated API calls and enables freshness control

CREATE TABLE IF NOT EXISTS public.case_summaries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id             UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  summary_type        TEXT NOT NULL DEFAULT 'timeline',
  content             TEXT NOT NULL,
  movement_count      INTEGER NOT NULL DEFAULT 0,
  last_movement_date  TIMESTAMPTZ,
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE case_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON case_summaries
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- One summary per type per case (upsert-friendly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_summaries_case_type
  ON case_summaries(case_id, summary_type);

-- Usage analytics per tenant
CREATE INDEX IF NOT EXISTS idx_case_summaries_tenant_date
  ON case_summaries(tenant_id, generated_at DESC);
