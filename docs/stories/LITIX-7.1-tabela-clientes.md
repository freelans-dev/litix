# Story LITIX-7.1: Tabela de Clientes (Entidade Separada)

**Epic:** Epic 7 - Entidade de Cliente
**Status:** Ready for Dev
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** Nenhuma

---

## User Story

Como advogado, quero cadastrar meus clientes com dados completos (nome, CNPJ/CPF, contato, tipo) em um cadastro centralizado, para poder vincular processos a clientes e ter uma visao unificada por cliente.

## Contexto

Atualmente `cliente` e um campo TEXT em `monitored_cases`. Precisamos de uma entidade `clients` separada com dados estruturados. O campo TEXT `cliente` sera mantido para retrocompatibilidade, mas um novo `client_id` FK sera adicionado para vincular ao cadastro.

---

## Acceptance Criteria

- [ ] AC1: Tabela `clients` criada com campos: id, tenant_id, name, tipo_pessoa, documento, email, phone, address_line, city, state, zip_code, notes, is_active, created_at, updated_at
- [ ] AC2: RLS policy garante isolamento por tenant (SELECT, INSERT, UPDATE, DELETE)
- [ ] AC3: `monitored_cases` recebe coluna `client_id UUID REFERENCES clients(id)` nullable
- [ ] AC4: Index em `clients(tenant_id, name)` e `clients(tenant_id, documento)`
- [ ] AC5: Unique constraint em `clients(tenant_id, documento)` WHERE documento IS NOT NULL
- [ ] AC6: `tipo_pessoa` aceita apenas 'fisica' ou 'juridica'
- [ ] AC7: `documento` validado por CHECK (11 chars para CPF, 14 para CNPJ, ou NULL)

---

## Dev Notes

### Schema

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tipo_pessoa TEXT CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  documento TEXT,  -- CPF (11 digits) ou CNPJ (14 digits)
  email TEXT,
  phone TEXT,
  address_line TEXT,
  city TEXT,
  state TEXT CHECK (length(state) = 2),
  zip_code TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK em monitored_cases
ALTER TABLE monitored_cases
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
```

### RLS

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_tenant_isolation ON clients
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Service role bypass (para API routes com createServiceClient)
CREATE POLICY clients_service_role ON clients
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Arquivo

```
supabase/migrations/003_clients_table.sql
```

---

## Tasks

- [ ] Task 1: Criar migration 003_clients_table.sql
  - [ ] Subtask 1.1: CREATE TABLE clients com todos os campos
  - [ ] Subtask 1.2: RLS policies
  - [ ] Subtask 1.3: Indexes e constraints
  - [ ] Subtask 1.4: ALTER TABLE monitored_cases ADD client_id FK
  - [ ] Subtask 1.5: Aplicar migration no Supabase

---

## Definition of Done

- [ ] Migration aplicada sem erros
- [ ] Tabela clients existe com RLS
- [ ] monitored_cases tem coluna client_id
- [ ] Story status: Ready for Review
