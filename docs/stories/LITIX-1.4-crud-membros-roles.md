# Story LITIX-1.4: CRUD de Membros e Roles do Escritorio

**Epic:** Epic 1 - Fundacao Multi-Tenant e Autenticacao
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** LITIX-1.2, LITIX-1.3

---

## User Story

Como owner do escritorio, quero gerenciar os membros da minha equipe — convidar, alterar roles e remover acesso — para controlar quem pode ver e fazer o que na plataforma.

## Contexto

Escritorios de advocacia tem hierarquia clara: socios (owners/admins), advogados associados (members) e estagiarios/clientes (viewers). A plataforma precisa refletir isso com RBAC (Role-Based Access Control) granular. Esta story cobre a UI e API de gerenciamento de membros, complementando o fluxo de convite criado em LITIX-1.2.

---

## Acceptance Criteria

- [ ] AC1: Pagina `/dashboard/settings/team` lista todos os membros do tenant com nome, email, role e status (ativo/pendente)
- [ ] AC2: Owner pode convidar novo membro via formulario (email + role) — dispara email de convite (LITIX-1.2)
- [ ] AC3: Owner pode alterar role de qualquer membro (exceto o proprio, para evitar lockout)
- [ ] AC4: Admin pode convidar members e viewers, mas nao pode alterar role de outros admins ou owners
- [ ] AC5: Owner/Admin podem desativar membro (`is_active = false`) — membro perde acesso imediatamente (proximo login falha no Auth Hook)
- [ ] AC6: Membro desativado pode ser reativado por owner/admin
- [ ] AC7: Contagem de membros ativos e verificada contra `plan_limits.max_users` antes de permitir novo convite — se no limite, exibe mensagem de upgrade
- [ ] AC8: Lista de membros mostra convites pendentes (aceite_at IS NULL) com opcao de reenviar convite
- [ ] AC9: Permissoes enforced via RLS no banco (nao apenas na UI) — API retorna 403 para operacoes nao permitidas

---

## Dev Notes

### Schema Relevante

```sql
-- tenant_members (LITIX-1.1)
-- Operacoes desta story:
SELECT * FROM tenant_members WHERE tenant_id = auth.tenant_id() ORDER BY created_at;
UPDATE tenant_members SET role = $1 WHERE id = $2 AND tenant_id = auth.tenant_id();
UPDATE tenant_members SET is_active = false WHERE id = $2 AND tenant_id = auth.tenant_id();

-- RLS: INSERT/UPDATE/DELETE restritos a owner e admin
```

### API Contracts

```
GET    /api/v1/team/members              -- lista membros do tenant
POST   /api/v1/team/invite               -- convidar membro (redireciona para auth/invite)
PATCH  /api/v1/team/members/:id/role     -- alterar role
PATCH  /api/v1/team/members/:id/status   -- ativar/desativar
DELETE /api/v1/team/members/:id          -- remover membro (soft delete via is_active=false)
POST   /api/v1/team/members/:id/resend   -- reenviar convite pendente
```

### Componentes/Arquivos Esperados

```
src/
  app/
    dashboard/
      settings/
        team/
          page.tsx                    -- Pagina de gerenciamento de equipe
  features/
    team/
      components/
        members-table.tsx             -- Tabela de membros com acoes
        invite-member-dialog.tsx      -- Dialog de convite
        role-badge.tsx                -- Badge colorido por role
        member-actions-menu.tsx       -- Menu de acoes por membro
      hooks/
        use-team.ts                   -- Hook para CRUD de membros
      services/
        team.service.ts               -- Chamadas de API
      schemas/
        team.schema.ts                -- Zod schemas
```

### Permissoes por Role

| Acao | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| Ver membros | ✓ | ✓ | ✓ | ✓ |
| Convidar owner/admin | ✓ | ✗ | ✗ | ✗ |
| Convidar member/viewer | ✓ | ✓ | ✗ | ✗ |
| Alterar role de qualquer um | ✓ | ✗ | ✗ | ✗ |
| Desativar membro | ✓ | ✓* | ✗ | ✗ |
| Reativar membro | ✓ | ✓* | ✗ | ✗ |

*Admin nao pode desativar outros admins nem owners

---

## Tasks

- [ ] Task 1: Implementar API routes de gerenciamento de equipe
  - [ ] Subtask 1.1: `GET /api/v1/team/members` com paginacao
  - [ ] Subtask 1.2: `PATCH /api/v1/team/members/:id/role` com validacao de permissao
  - [ ] Subtask 1.3: `PATCH /api/v1/team/members/:id/status` (ativar/desativar)
  - [ ] Subtask 1.4: `POST /api/v1/team/members/:id/resend` para reenviar convite

- [ ] Task 2: Implementar pagina de gerenciamento de equipe
  - [ ] Subtask 2.1: `members-table.tsx` com colunas nome, email, role, status, acoes
  - [ ] Subtask 2.2: `invite-member-dialog.tsx` com select de role e validacao de limite do plano
  - [ ] Subtask 2.3: `member-actions-menu.tsx` com acoes condicionais por role do usuario logado
  - [ ] Subtask 2.4: Pagina `/dashboard/settings/team/page.tsx`

- [ ] Task 3: Testes
  - [ ] Subtask 3.1: Teste: owner pode alterar role de admin para member
  - [ ] Subtask 3.2: Teste: admin nao pode alterar role de owner (403)
  - [ ] Subtask 3.3: Teste: desativar membro invalida acesso no proximo login
  - [ ] Subtask 3.4: Teste: convite com limite de plano atingido retorna erro amigavel

---

## Testes

| Caso de Teste | Tipo | Resultado Esperado |
|---|---|---|
| Owner altera role member→admin | API | 200, role atualizado |
| Admin tenta alterar role owner | API | 403 Forbidden |
| Desativar membro existente | API | is_active=false, proximo login falha |
| Convidar quando no limite do plano | API | 422 com mensagem de upgrade |
| Reenviar convite pendente | API | Email reenviado, 200 |
| Member tenta acessar /team API | API | 403 Forbidden |

---

## Definition of Done

- [ ] CRUD de membros funcionando com permissoes enforced
- [ ] Verificacao de limite de plano no convite
- [ ] Pagina de equipe com UI responsiva
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
