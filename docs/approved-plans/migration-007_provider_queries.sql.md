# Migration Plan: 007_provider_queries

## Purpose
Audit trail for all external provider API calls. Tracks provider, search type,
tribunal, duration, completeness score, and estimated cost per query.

## Table: provider_queries
- Fire-and-forget inserts from all production flows (case registration, cron monitor, document search, OAB import)
- Used by analytics dashboard for usage metrics, cost tracking, and tribunal coverage analysis
- Service-role only access (RLS enabled, no user policies)

## Columns
- `id` UUID PK
- `tenant_id` UUID FK → tenants (nullable for system queries)
- `provider` TEXT NOT NULL — 'datajud', 'judit', 'codilo', etc.
- `search_type` TEXT — 'cnj', 'cpf', 'cnpj', 'oab'
- `search_key` TEXT — the CNJ or document number queried
- `tribunal` TEXT — tribunal identified from the query
- `status` TEXT — 'success', 'error', 'timeout', 'not_found'
- `duration_ms` INTEGER — API call duration
- `completeness_score` REAL — 0.0-1.0 data completeness
- `fields_returned` INTEGER — count of non-null fields
- `cost_estimate_brl` REAL — estimated cost in BRL
- `error` TEXT — error message if failed
- `source_flow` TEXT — which flow triggered the query
- `created_at` TIMESTAMPTZ

## Indexes
- `(tenant_id, created_at DESC)` — tenant analytics queries
- `(provider, created_at DESC)` — provider usage over time
- `(tribunal, provider)` — tribunal × provider matrix
- BRIN on `created_at` — cleanup queries

## Risk Assessment
- Low risk: append-only audit table
- No impact on existing tables or flows
- RLS enabled, no user-facing policies
