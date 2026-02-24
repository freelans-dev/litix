# Story LITIX-1.1: Schema Multi-Tenant + RLS

**Epic:** Epic 1 - Fundacao Multi-Tenant e Autenticacao
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 8 pontos
**Dependencias:** Nenhuma (story inicial)

---

## User Story

Como admin do Litix, quero que toda a base de dados seja estruturada com isolamento por tenant para que os dados de cada escritorio nunca se misturem com os de outros.

## Contexto

O Litix e um SaaS multi-tenant onde cada escritorio (tenant) deve ter seus dados completamente isolados. A decisao arquitetural ADR-001 define o uso de Shared Schema + RLS (Row Level Security) do PostgreSQL como mecanismo de isolamento — um unico banco, todas as tabelas com `tenant_id`, e policies RLS que garantem que um usuario nunca acessa dados de outro tenant. Este e o alicerce de toda a aplicacao; sem ele, nenhum outro epic pode comecar. O banco de dados e Supabase PostgreSQL 15+ com extensoes `uuid-ossp`, `pg_trgm`, `pg_cron` e `pgmq`.

---

## Acceptance Criteria

- [ ] AC1: Tabela `tenants` criada com campos `id`, `slug`, `name`, `plan`, `stripe_customer_id`, `stripe_subscription_id`, `settings`, `trial_ends_at`, `is_active`, `created_at`, `updated_at`; indexes em `slug`, `plan`, `stripe_customer_id`
- [ ] AC2: Tabela `tenant_members` criada com `id`, `tenant_id`, `user_id`, `role` (enum: owner/admin/member/viewer), `invited_by`, `invited_at`, `accepted_at`, `is_active`, `created_at`, `updated_at`; constraint UNIQUE em (tenant_id, user_id); indexes em tenant_id, user_id, (tenant_id, role)
- [ ] AC3: Tabela `profiles` criada com `id`, `tenant_id`, `user_id`, `display_name`, `email`, `avatar_url`, `oab_number`, `oab_uf`, `phone`, `created_at`, `updated_at`; index GIN em `display_name` para busca textual
- [ ] AC4: Tabela `plan_limits` criada e populada com os 5 planos (free, solo, escritorio, pro, enterprise) incluindo `max_cases`, `max_users`, `max_oab_per_member`, `api_rate_limit`, `webhook_endpoints`, `monitoring_frequency_hours`, `features` (JSONB), `price_monthly_brl`, `stripe_price_id`
- [ ] AC5: Tabela `subscriptions` criada com `id`, `tenant_id`, `plan`, `status` (enum), `stripe_subscription_id`, `stripe_price_id`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `canceled_at`, `created_at`, `updated_at`; UNIQUE em tenant_id
- [ ] AC6: Tabela `audit_log` criada com `id`, `tenant_id`, `user_id`, `action`, `resource_type`, `resource_id`, `metadata`, `ip_address`, `user_agent`, `created_at`; indexes em tenant_id, user_id, action, (tenant_id, created_at DESC), (resource_type, resource_id)
- [ ] AC7: RLS habilitado em todas as tabelas; funcoes helper `auth.tenant_id()`, `auth.user_role()`, `auth.member_id()` criadas para extrair claims do JWT
- [ ] AC8: Policies RLS na tabela `tenants`: SELECT usando `id = auth.tenant_id()`, UPDATE restrito a role `owner`
- [ ] AC9: Policies RLS em `tenant_members`: SELECT para todo o tenant; INSERT/UPDATE/DELETE restritos a roles `owner` e `admin`
- [ ] AC10: Policies RLS genericas aplicadas a todas as tabelas de dados via loop SQL (profiles, monitored_cases, case_movements, monitoring_jobs, alerts, webhook_endpoints, webhook_deliveries, api_keys, subscriptions, audit_log, oab_imports, deadlines, client_portal_links, analytics_snapshots)
- [ ] AC11: Trigger `set_updated_at` aplicado a todas as tabelas com coluna `updated_at`
- [ ] AC12: Extensoes habilitadas: `uuid-ossp`, `pg_trgm`, `pg_cron`, `pgmq`
- [ ] AC13: Teste de isolamento: usuario do tenant A nao consegue ler, escrever nem deletar dados do tenant B (teste automatizado via Supabase test client com JWTs distintos)
- [ ] AC14: Migration executavel via `supabase db push` sem erros em ambiente local e staging

---

## Dev Notes

### Schema Relevante

Esta story cria as tabelas fundamentais. Referencia completa em `docs/litix-architecture.md` secao 3.2.

Tabelas criadas nesta story:
- `tenants` — escritorios (tenants)
- `tenant_members` — vinculo usuario <-> tenant com role
- `profiles` — dados de perfil do usuario dentro do tenant
- `plan_limits` — configuracao estatica dos planos (sem tenant_id, tabela global)
- `subscriptions` — assinatura atual do tenant
- `audit_log` — log de auditoria de operacoes sensiveis

Tabelas que serao usadas por stories futuras mas devem ter RLS configurado aqui:
- `monitored_cases`, `case_movements`, `monitoring_jobs`, `alerts`
- `webhook_endpoints`, `webhook_deliveries`, `api_keys`
- `oab_imports`, `deadline_rules`, `deadlines`
- `client_portal_links`, `analytics_snapshots`

Nota: As tabelas listadas no ultimo bloco serao criadas em suas respectivas stories (LITIX-2.x, LITIX-3.x, etc.), mas o loop RLS desta story precisara ser atualizado ou essas tables precisarao ter suas policies aplicadas em suas proprias migrations.

**Estrategia recomendada:** Criar as policies RLS de cada tabela na propria migration da story que cria a tabela, nao no loop. Isso permite dependencies claras entre migrations.

### Funcoes Helper RLS

```sql
CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.member_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'member_id')::uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

Estas funcoes sao `SECURITY DEFINER` e `STABLE` — executam com privilegios do criador e podem ser cacheadas por transacao. Usadas em todas as RLS policies.

### Convencoes de Schema

- Primary keys: UUID via `gen_random_uuid()`
- `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE` em toda tabela de dados
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` + trigger automatico
- Soft delete via `is_active BOOLEAN NOT NULL DEFAULT true` (nao `deleted_at`)
- Naming: snake_case para tabelas e colunas

### API Contracts Relevantes

Esta story nao expoe endpoints de API diretamente. O schema criado aqui e consumido por todas as outras stories.

Endpoint de signup (`POST /auth/signup`) em LITIX-1.2 criara registros nas tabelas `tenants`, `tenant_members`, `profiles` e `subscriptions`.

### Componentes/Arquivos Esperados

```
supabase/
  migrations/
    0001_create_extensions.sql          -- uuid-ossp, pg_trgm, pg_cron, pgmq
    0002_create_tenants.sql             -- tabela tenants + indexes
    0003_create_tenant_members.sql      -- tabela tenant_members + indexes
    0004_create_profiles.sql            -- tabela profiles + indexes GIN
    0005_create_plan_limits.sql         -- tabela plan_limits + seed data
    0006_create_subscriptions.sql       -- tabela subscriptions + indexes
    0007_create_audit_log.sql           -- tabela audit_log + indexes
    0008_create_rls_helpers.sql         -- funcoes auth.tenant_id(), auth.user_role(), auth.member_id()
    0009_enable_rls_tenants.sql         -- RLS para tabelas tenants + tenant_members
    0010_create_updated_at_trigger.sql  -- funcao trigger_set_updated_at + aplicacao
```

### Notas Tecnicas

- **ADR-001:** Multi-tenancy via Shared Schema + RLS. Nao usar schema-per-tenant nem db-per-tenant.
- **service_role bypass:** O Supabase `service_role` key bypassa RLS automaticamente. Jobs do Trigger.dev usam `service_role` — nao precisam de policies especiais, mas devem sempre passar `tenant_id` explicitamente nas queries para evitar cross-tenant acidental.
- **`plan_limits` nao tem `tenant_id`:** E uma tabela global de configuracao. Nao precisa de RLS de isolamento, mas deve ter RLS habilitado com policy de SELECT publica (todos podem ler planos).
- **`deadline_rules`:** Tem `tenant_id` nullable — regras globais (tenant_id IS NULL) sao visiveis a todos. Policy: `USING (tenant_id IS NULL OR tenant_id = auth.tenant_id())`.
- Ao rodar `supabase gen types typescript --local > src/types/database.ts`, os tipos TypeScript serao gerados automaticamente a partir do schema. Isso deve ser feito apos cada migration.

---

## Tasks

- [ ] Task 1: Configurar projeto Supabase local (supabase init, docker)
  - [ ] Subtask 1.1: Instalar Supabase CLI (`npm install -g supabase`)
  - [ ] Subtask 1.2: Executar `supabase init` na raiz do projeto
  - [ ] Subtask 1.3: Configurar `supabase/config.toml` com project ID
  - [ ] Subtask 1.4: Executar `supabase start` para subir ambiente local

- [ ] Task 2: Criar migration de extensoes
  - [ ] Subtask 2.1: `0001_create_extensions.sql` com uuid-ossp, pg_trgm, pg_cron, pgmq

- [ ] Task 3: Criar migrations das tabelas core
  - [ ] Subtask 3.1: `0002_create_tenants.sql` — tabela tenants com CHECK em plan, indexes
  - [ ] Subtask 3.2: `0003_create_tenant_members.sql` — tabela tenant_members com UNIQUE constraint
  - [ ] Subtask 3.3: `0004_create_profiles.sql` — tabela profiles com GIN index em display_name
  - [ ] Subtask 3.4: `0005_create_plan_limits.sql` — tabela + INSERT dos 5 planos com features JSONB
  - [ ] Subtask 3.5: `0006_create_subscriptions.sql` — tabela subscriptions com UNIQUE em tenant_id
  - [ ] Subtask 3.6: `0007_create_audit_log.sql` — tabela audit_log com indexes compostos

- [ ] Task 4: Criar funcoes RLS e habilitar isolamento
  - [ ] Subtask 4.1: `0008_create_rls_helpers.sql` — funcoes `auth.tenant_id()`, `auth.user_role()`, `auth.member_id()`
  - [ ] Subtask 4.2: `0009_enable_rls_tenants.sql` — policies para `tenants` e `tenant_members`
  - [ ] Subtask 4.3: Policies RLS para `profiles`, `subscriptions`, `audit_log`
  - [ ] Subtask 4.4: `0010_create_updated_at_trigger.sql` — trigger function + aplicacao em todas as tabelas com `updated_at`

- [ ] Task 5: Gerar tipos TypeScript
  - [ ] Subtask 5.1: Executar `supabase gen types typescript --local > src/types/database.ts`
  - [ ] Subtask 5.2: Criar `src/types/index.ts` re-exportando tipos uteis

- [ ] Task 6: Escrever testes de isolamento
  - [ ] Subtask 6.1: Criar `supabase/tests/rls-isolation.test.ts`
  - [ ] Subtask 6.2: Teste: usuario do tenant A nao ve registros do tenant B em `monitored_cases` (quando criada)
  - [ ] Subtask 6.3: Teste: usuario do tenant A nao ve `tenant_members` do tenant B
  - [ ] Subtask 6.4: Teste: INSERT com tenant_id errado e rejeitado pela policy
  - [ ] Subtask 6.5: Executar `supabase test db` e garantir 100% de pass

---

## Testes

| Caso de Teste | Tipo | Resultado Esperado |
|---|---|---|
| Usuario A faz SELECT em monitored_cases do tenant B | RLS | 0 rows retornados |
| Usuario A faz INSERT em tenant_members com tenant_id do tenant B | RLS | Erro: violacao de policy |
| service_role faz SELECT em qualquer tabela | Bypass | Todos os rows retornados |
| SELECT em plan_limits sem autenticacao | RLS | Policy deve permitir (tabela publica) |
| auth.tenant_id() com JWT sem claim | Helper | NULL retornado |
| Trigger updated_at | Trigger | Coluna atualizada automaticamente no UPDATE |
| supabase db push | Migration | Executa sem erros em local e staging |

---

## Definition of Done

- [ ] Todas as migrations em `supabase/migrations/` com nome e numero sequencial
- [ ] `supabase db push` executa sem erros
- [ ] `supabase gen types typescript` gera `src/types/database.ts` sem erros
- [ ] Testes de isolamento RLS passando (`supabase test db`)
- [ ] Seed data de plan_limits com os 5 planos inserido e verificado
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
