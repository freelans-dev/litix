# Architect Agent Memory - Litix Project

## Project: Litix
- **Type:** SaaS B2B legaltech - monitoramento e consulta processual multi-provider
- **Repo:** ~/litix/
- **Management (AIOS):** ~/meu-projeto/

## Key Architecture Decisions
- Multi-tenancy: Shared schema + RLS (ADR-001)
- Auth: Supabase Auth Hook injects tenant_id, role, member_id into JWT (ADR-002)
- Background jobs: Trigger.dev v3, not Edge Functions (ADR-003)
- Storage abstraction: Repository Pattern for Supabase -> AWS migration path (ADR-004)
- API auth: API keys (ltx_ prefixed, SHA-256 hashed), not JWT for public API (ADR-005)

## Existing Codebase (backend pre-migration)
- Express + TypeScript ESM in ~/litix/src/
- 5 providers: datajud, codilo, escavador, judit, predictus
- OrchestratorService with strategies: race, fallback, primary-only
- CircuitBreaker per provider
- MergeService with multi-instance detection
- MonitorService uses file-based JSON storage (data/*.json) -- must migrate to Supabase
- SchedulerService uses setInterval -- must migrate to pg_cron + Trigger.dev

## Schema (18 tables)
- Core: tenants, tenant_members, profiles
- Cases: monitored_cases, case_movements
- Operations: monitoring_jobs, alerts, webhook_endpoints, webhook_deliveries
- Platform: api_keys, subscriptions, plan_limits, audit_log
- Features: oab_imports, deadline_rules, deadlines, client_portal_links, analytics_snapshots

## Tech Stack Target
- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- Supabase (Auth + PostgreSQL + RLS + pg_cron + pgmq)
- Trigger.dev v3 for background jobs
- Stripe for billing
- Vercel KV (Upstash Redis) for caching
- Vercel for deployment
