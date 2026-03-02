# Story LITIX-2.4: Deduplicacao e Associacao Cross-Member no Escritorio

**Epic:** Epic 2 - Import Automatico por OAB
**Status:** Done
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** LITIX-2.2

---

## User Story

Como owner do escritorio, quero que quando dois advogados do escritorio atuem no mesmo processo, ele apareca apenas uma vez no dashboard, associado a ambos.

## Contexto

Em escritorios com multiplos advogados, e comum que mais de um membro atue no mesmo processo. Sem deduplicacao cross-member, o mesmo processo apareceria N vezes no dashboard. A solucao e uma tabela de associacao `case_members` que vincula processos (da tabela `monitored_cases`, que tem UNIQUE por cnj+tenant) a membros especificos.

---

## Acceptance Criteria

- [x]AC1: Tabela `case_members` criada com `case_id`, `member_id`, `role` (lead/collaborator), vinculando membros a processos
- [x]AC2: Durante importacao por OAB, se processo ja existe no tenant (mesmo CNJ), cria apenas o vinculo em `case_members` sem duplicar o processo
- [x]AC3: Processo aparece uma unica vez no dashboard do escritorio, mas na visao de cada advogado aparece com seu nome/badge
- [x]AC4: Processo com 2+ advogados mostra todos os responsaveis (avatares empilhados)
- [x]AC5: Filtro "Meus processos" no dashboard retorna apenas processos onde o membro logado tem vinculo em `case_members`
- [x]AC6: Remover vinculo de um membro do processo nao exclui o processo do tenant (apenas o vinculo)

---

## Dev Notes

### Schema Relevante

```sql
CREATE TABLE case_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'lead', -- lead, collaborator
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, member_id)
);
CREATE INDEX idx_case_members_tenant_id ON case_members(tenant_id);
CREATE INDEX idx_case_members_case_id ON case_members(case_id);
CREATE INDEX idx_case_members_member_id ON case_members(member_id);
ALTER TABLE case_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON case_members USING (tenant_id = auth.tenant_id());
```

### Logica de Upsert no Job de Importacao

```typescript
// Em oab-import.ts, ao inserir processo:
const { data: existingCase } = await supabase
  .from('monitored_cases')
  .select('id')
  .eq('tenant_id', tenantId)
  .eq('cnj', processo.cnj)
  .single()

if (existingCase) {
  // Processo ja existe — apenas adicionar vinculo
  await supabase.from('case_members').upsert({
    tenant_id: tenantId,
    case_id: existingCase.id,
    member_id: memberId,
    role: 'collaborator',
  }, { onConflict: 'case_id,member_id' })
} else {
  // Processo novo — inserir e vincular
  const { data: newCase } = await supabase.from('monitored_cases').insert({ ... }).select().single()
  await supabase.from('case_members').insert({
    tenant_id: tenantId,
    case_id: newCase.id,
    member_id: memberId,
    role: 'lead',
  })
}
```

### Componentes/Arquivos Esperados

```
src/
  features/
    cases/
      components/
        case-members-avatars.tsx      -- Avatares empilhados dos responsaveis
      hooks/
        use-my-cases.ts              -- Filtra por case_members do membro logado
```

---

## Tasks

- [x]Task 1: Criar migration de `case_members`
  - [x]Subtask 1.1: Migration com schema, indexes e RLS

- [x]Task 2: Atualizar job de importacao (LITIX-2.2)
  - [x]Subtask 2.1: Logica de upsert com verificacao de processo existente
  - [x]Subtask 2.2: Criar vinculo em `case_members` para todos os casos (novos e existentes)

- [x]Task 3: Atualizar queries de listagem
  - [x]Subtask 3.1: Query de dashboard do escritorio: JOIN com `case_members` para mostrar responsaveis
  - [x]Subtask 3.2: Filtro "Meus processos": WHERE case_members.member_id = auth.member_id()
  - [x]Subtask 3.3: Componente `case-members-avatars.tsx`

- [x]Task 4: Testes
  - [x]Subtask 4.1: Importar mesma OAB 2 advogados — processo aparece 1x com 2 responsaveis
  - [x]Subtask 4.2: Filtro "Meus processos" mostra apenas processos do membro logado
  - [x]Subtask 4.3: Remover vinculo nao exclui o processo

---

## Definition of Done

- [x]Tabela `case_members` criada com RLS
- [x]Importacao com deduplicacao cross-member funcionando
- [x]UI exibe responsaveis multiplos corretamente
- [x]Filtros por membro funcionando
- [x]Testes passando
- [x]Code review aprovado
- [x]Story status: Ready for Review
