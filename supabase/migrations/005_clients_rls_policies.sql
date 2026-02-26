-- =============================================================================
-- Migration 005: Add RLS policies to clients table
-- RLS was enabled in 003 but no policies were created.
-- Without policies, anon/authenticated users see 0 rows.
-- =============================================================================

-- Tenant isolation: SELECT
CREATE POLICY "tenant_isolation_select" ON clients
  FOR SELECT USING (tenant_id = auth.tenant_id());

-- Tenant isolation: INSERT
CREATE POLICY "tenant_isolation_insert" ON clients
  FOR INSERT WITH CHECK (tenant_id = auth.tenant_id());

-- Tenant isolation: UPDATE
CREATE POLICY "tenant_isolation_update" ON clients
  FOR UPDATE USING (tenant_id = auth.tenant_id());

-- Tenant isolation: DELETE (soft delete via is_active, but allow hard delete too)
CREATE POLICY "tenant_isolation_delete" ON clients
  FOR DELETE USING (tenant_id = auth.tenant_id());
