# Story LITIX-2.1: Cadastro de OAB no Perfil do Usuario

**Epic:** Epic 2 - Import Automatico por OAB
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 3 pontos
**Dependencias:** LITIX-1.3, LITIX-1.4

---

## User Story

Como advogado, quero cadastrar meu numero OAB no meu perfil para que o Litix possa encontrar automaticamente todos os processos onde atuo.

## Contexto

O numero OAB (ex: SP123456 ou 123456/SP) e o identificador unico do advogado no sistema judicial brasileiro. Ao cadastrar a OAB, o Litix usa esse numero para buscar processos nos providers (DataJud, Judit, Escavador) via busca por documento. Esta e a porta de entrada para o diferencial core do produto: importacao automatica sem digitar CNJ um por um.

---

## Acceptance Criteria

- [ ] AC1: Campo de OAB disponivel na pagina de perfil (`/dashboard/settings/profile`) com campos `oab_number` (numero) e `oab_uf` (UF, select com 27 estados + DF)
- [ ] AC2: Validacao do formato: numero entre 1-999999, UF valida — validado via Zod no frontend e backend
- [ ] AC3: Ao salvar OAB valida, campo atualizado na tabela `profiles` e job de importacao e enfileirado automaticamente (Trigger.dev)
- [ ] AC4: Indicador visual na pagina: "OAB nao cadastrada" (estado inicial) → "Importando processos..." (durante job) → "X processos importados" (concluido)
- [ ] AC5: Membro pode cadastrar ate `plan_limits.max_oab_per_member` numeros OAB (Free/Solo: 1, Escritorio/Pro: 3, Enterprise: ilimitado)
- [ ] AC6: Onboarding wizard pos-signup sugere cadastrar OAB como primeiro passo com explicacao do beneficio
- [ ] AC7: Membro pode remover uma OAB cadastrada — processos importados por ela NAO sao removidos automaticamente (usuario decide)

---

## Dev Notes

### Schema Relevante

```sql
-- profiles (LITIX-1.1) — atualizar colunas:
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS oab_numbers JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'idle';
-- oab_numbers: [{ number: "123456", uf: "SP", imported_at: null, process_count: 0 }]

-- oab_imports (criar nesta story):
CREATE TABLE oab_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES tenant_members(id),
  oab_number TEXT NOT NULL,
  oab_uf TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  total_found INTEGER DEFAULT 0,
  imported INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_oab_imports_tenant_id ON oab_imports(tenant_id);
CREATE INDEX idx_oab_imports_member_id ON oab_imports(member_id);
ALTER TABLE oab_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON oab_imports USING (tenant_id = auth.tenant_id());
```

### API Contracts

```
GET  /api/v1/profile                    -- perfil atual do usuario
PATCH /api/v1/profile                   -- atualizar perfil (nome, avatar, OABs)
POST /api/v1/profile/oab               -- adicionar OAB e enfileirar importacao
DELETE /api/v1/profile/oab/:oab        -- remover OAB do perfil
GET  /api/v1/profile/oab/imports       -- historico de importacoes OAB
```

### Componentes/Arquivos Esperados

```
src/
  app/
    dashboard/
      settings/
        profile/
          page.tsx                      -- Pagina de perfil
      onboarding/
        page.tsx                        -- Wizard de onboarding pos-signup
  features/
    profile/
      components/
        profile-form.tsx               -- Formulario de perfil
        oab-field.tsx                  -- Campo de OAB com select de UF
        oab-import-status.tsx          -- Indicador de status da importacao
        onboarding-wizard.tsx          -- Wizard de boas-vindas
      hooks/
        use-profile.ts
      services/
        profile.service.ts
      schemas/
        profile.schema.ts              -- OABSchema: number 1-999999, uf in ESTADOS
```

### Estados da OAB

```
idle → (cadastrar OAB) → queued → running → completed
                                          └→ failed (com mensagem de erro)
```

### Trigger.dev Integration

Ao salvar OAB, chamar:
```typescript
import { tasks } from '@trigger.dev/sdk/v3'
await tasks.trigger('oab-import', {
  tenantId,
  memberId,
  oabNumber,
  oabUf,
  importId, // ID do registro oab_imports criado
})
```

---

## Tasks

- [ ] Task 1: Criar migration da tabela `oab_imports`
  - [ ] Subtask 1.1: Migration com schema, indexes e RLS policy

- [ ] Task 2: Implementar API de perfil
  - [ ] Subtask 2.1: `GET /api/v1/profile` — retorna perfil com OABs cadastradas
  - [ ] Subtask 2.2: `POST /api/v1/profile/oab` — valida OAB, cria oab_imports, enfileira job
  - [ ] Subtask 2.3: `DELETE /api/v1/profile/oab/:oab` — remove OAB do perfil

- [ ] Task 3: Implementar UI de perfil
  - [ ] Subtask 3.1: `oab-field.tsx` com input de numero + select de UF + botao adicionar
  - [ ] Subtask 3.2: `oab-import-status.tsx` mostrando estado idle/queued/running/completed
  - [ ] Subtask 3.3: Pagina `/dashboard/settings/profile/page.tsx`

- [ ] Task 4: Implementar onboarding wizard
  - [ ] Subtask 4.1: Detectar primeiro acesso (profile sem OAB cadastrada)
  - [ ] Subtask 4.2: `onboarding-wizard.tsx` com steps: Bem-vindo → Cadastrar OAB → Aguardar importacao

- [ ] Task 5: Testes
  - [ ] Subtask 5.1: OAB com formato invalido rejeitada (numero > 999999, UF invalida)
  - [ ] Subtask 5.2: Segunda OAB no plano Free/Solo rejeitada com mensagem de upgrade
  - [ ] Subtask 5.3: Salvar OAB enfileira job no Trigger.dev

---

## Definition of Done

- [ ] Tabela `oab_imports` criada com RLS
- [ ] API de perfil + OAB implementada com validacao
- [ ] UI de perfil com campo OAB e status de importacao
- [ ] Onboarding wizard implementado
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
