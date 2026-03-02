# Migration Plan: 008_fix_litix_1_1_gaps.sql

**Aprovado por:** @db-sage
**Data:** 2026-03-01
**Story:** LITIX-1.1 — Schema Multi-Tenant + RLS
**Tipo:** Incremental corrective migration (ADD COLUMN / CREATE INDEX apenas)

---

## Objetivo

Fechar os gaps identificados entre o schema atual (`001_litix_schema.sql`) e os Acceptance Criteria da story LITIX-1.1. Esta migration é **100% aditiva** — nunca remove colunas, nunca recria tabelas, preserva todos os dados existentes.

---

## Gaps Identificados

| # | Tabela | Gap | AC |
|---|--------|-----|----|
| 1 | `tenants` | Falta coluna `stripe_subscription_id` | AC1 |
| 2 | `profiles` | Falta `tenant_id`, `display_name` (tem `full_name`), GIN index em display_name | AC3 |
| 3 | `plan_limits` | Falta coluna `stripe_price_id` | AC4 |
| 4 | `subscriptions` | Falta `current_period_start`; tem `stripe_current_period_end` mas AC exige `current_period_end` | AC5 |
| 5 | `audit_log` | Usa BIGSERIAL (não UUID); tem `member_id` mas AC pede `user_id`; falta `resource_type`, `resource_id`, `metadata`, `user_agent` | AC6 |
| 6 | Extensões | Falta `pg_cron` e `pgmq` | AC12 |
| 7 | Testes | Arquivo `supabase/tests/rls-isolation.test.sql` não existe | AC13 |

---

## Estratégia de Execução

### Princípios
- `ADD COLUMN IF NOT EXISTS` em todas as alterações de tabela
- `CREATE INDEX IF NOT EXISTS` em todos os novos índices
- `UPDATE` para migrar dados existentes antes de aplicar constraints
- Idempotente: pode ser executado múltiplas vezes sem efeitos colaterais
- pg_cron e pgmq instalados no schema `extensions` (padrão Supabase)

### Decisão sobre audit_log.id (BIGSERIAL → UUID)
O AC6 especifica `id UUID` mas a tabela atual usa `BIGSERIAL`. A estratégia segura é:
- NÃO alterar a PK existente (operação destrutiva de alto risco em produção)
- Adicionar todas as colunas faltando (`user_id`, `resource_type`, `resource_id`, `metadata`, `user_agent`)
- Migrar dados de `member_id` para `user_id` via JOIN com `tenant_members`
- A conversão da PK para UUID fica como task futura com janela de manutenção

### Profiles: user_id
O AC3 lista `user_id` como coluna em profiles. O schema atual usa `id` como FK para `auth.users` (i.e., `id = auth.uid()`). Como `user_id` seria redundante com `id`, a coluna `user_id` será adicionada como TEXT nullable para compatibilidade futura, mas o id principal continua sendo a FK para auth.users.

---

## Arquivos a Criar

1. `supabase/migrations/008_fix_litix_1_1_gaps.sql` — migration principal
2. `supabase/tests/rls-isolation.test.sql` — testes pgTAP de isolamento

---

## Rollback Plan

Em caso de falha durante a migration:
```sql
-- Reverter colunas adicionadas (apenas se necessário — dados podem ser perdidos)
ALTER TABLE tenants DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS tenant_id, DROP COLUMN IF EXISTS display_name;
ALTER TABLE plan_limits DROP COLUMN IF EXISTS stripe_price_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS current_period_start, DROP COLUMN IF EXISTS current_period_end;
ALTER TABLE audit_log DROP COLUMN IF EXISTS user_id, DROP COLUMN IF EXISTS resource_type,
  DROP COLUMN IF EXISTS resource_id, DROP COLUMN IF EXISTS metadata, DROP COLUMN IF EXISTS user_agent;
```

---

## Aprovação

- [x] Plano revisado pelo @db-sage
- [x] Estratégia incremental confirmada (sem DROP COLUMN)
- [x] Migração de dados mapeada
- [x] Idempotência verificada
