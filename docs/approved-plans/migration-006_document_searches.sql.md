# Migration 006: document_searches

## Objetivo
Criar tabela `document_searches` para registrar buscas de processos por CPF/CNPJ via Judit API.

## Justificativa
Atualmente o Litix só permite cadastrar processos por CNJ individual ou importação por OAB. Usuários precisam buscar todos os processos de uma pessoa (CPF) ou empresa (CNPJ) diretamente.

## Schema

```sql
CREATE TABLE document_searches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id           UUID NOT NULL REFERENCES tenant_members(id),
  document_type       TEXT NOT NULL CHECK (document_type IN ('cpf', 'cnpj')),
  document_value      TEXT NOT NULL,
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
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
```

## Indexes
- `idx_document_searches_tenant` — tenant_id
- `idx_document_searches_status` — status parcial (pending, running)
- `idx_document_searches_client` — client_id parcial (NOT NULL)

## Constraints
- `document_type` IN ('cpf', 'cnpj')
- `status` IN ('pending', 'running', 'completed', 'failed')
- CPF = 11 dígitos, CNPJ = 14 dígitos (CHECK constraint)

## RLS
Habilitado. API routes usam service role.

## Impacto
- Nenhuma tabela existente é alterada
- Nova tabela isolada, sem FK que afete tabelas existentes (exceto tenants, tenant_members, clients)

## Aprovado
Data: 2026-02-28
