# Story LITIX-7.2: CRUD API de Clientes

**Epic:** Epic 7 - Entidade de Cliente
**Status:** Ready for Dev
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** LITIX-7.1 (tabela clients)

---

## User Story

Como advogado, quero gerenciar meus clientes via API (criar, listar, editar, remover), para poder manter um cadastro atualizado que sera vinculado aos processos.

## Contexto

Com a tabela `clients` criada em LITIX-7.1, precisamos dos endpoints REST para CRUD completo. Os endpoints seguem o padrao existente (auth via getTenantContext, service client, Zod validation).

---

## Acceptance Criteria

- [ ] AC1: GET `/api/v1/clients` lista clientes do tenant com paginacao e busca por nome
- [ ] AC2: POST `/api/v1/clients` cria cliente com validacao Zod
- [ ] AC3: PATCH `/api/v1/clients/[id]` atualiza campos do cliente
- [ ] AC4: DELETE `/api/v1/clients/[id]` desativa cliente (soft delete via is_active=false)
- [ ] AC5: GET `/api/v1/clients/[id]` retorna cliente com contagem de processos vinculados
- [ ] AC6: Documento duplicado no mesmo tenant retorna 409
- [ ] AC7: Apenas membros (role >= member) podem criar/editar/deletar
- [ ] AC8: Viewers podem listar e ver detalhes

---

## Dev Notes

### Schemas Zod

```typescript
const createSchema = z.object({
  name: z.string().min(2).max(200),
  tipo_pessoa: z.enum(['fisica', 'juridica']).optional(),
  documento: z.string().regex(/^\d{11}$|^\d{14}$/).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address_line: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2).optional(),
  zip_code: z.string().max(10).optional(),
  notes: z.string().max(2000).optional(),
})
```

### Endpoints

```
src/app/api/v1/clients/route.ts         -- GET (list) + POST (create)
src/app/api/v1/clients/[id]/route.ts    -- GET (detail) + PATCH + DELETE
```

### GET list query params

- `q` — busca por nome (ilike)
- `page` — paginacao (default 1)
- `limit` — itens por pagina (default 50, max 100)
- `active` — filtrar por is_active (default true)

### GET detail com contagem de processos

```typescript
const { data: client } = await supabase
  .from('clients')
  .select('*')
  .eq('id', id)
  .eq('tenant_id', ctx.tenantId)
  .single()

const { count } = await supabase
  .from('monitored_cases')
  .select('id', { count: 'exact', head: true })
  .eq('client_id', id)

return { ...client, case_count: count ?? 0 }
```

---

## Tasks

- [ ] Task 1: Criar GET + POST `/api/v1/clients/route.ts`
  - [ ] Subtask 1.1: GET com paginacao, busca, filtro active
  - [ ] Subtask 1.2: POST com validacao e check de duplicata de documento

- [ ] Task 2: Criar GET + PATCH + DELETE `/api/v1/clients/[id]/route.ts`
  - [ ] Subtask 2.1: GET detail com case_count
  - [ ] Subtask 2.2: PATCH com validacao parcial
  - [ ] Subtask 2.3: DELETE soft (is_active = false)

---

## Definition of Done

- [ ] CRUD completo funcionando
- [ ] Validacao Zod em todos os endpoints
- [ ] Tenant isolation garantida
- [ ] Story status: Ready for Review
