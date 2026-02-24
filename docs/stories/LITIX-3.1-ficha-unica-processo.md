# Story LITIX-3.1: Ficha Unica do Processo (Multi-Provider)

**Epic:** Epic 3 - Ficha Unica do Processo
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 8 pontos
**Dependencias:** LITIX-2.2

---

## User Story

Como advogado, quero ver a ficha completa de um processo com todos os dados unificados de multiplos providers em um unico lugar, sem precisar acessar o portal do tribunal.

## Contexto

A ficha do processo e a view central do produto. Ela agrega dados de até 5 providers (DataJud, Codilo, Escavador, Judit, Predictus) via `MergeService`, exibe um `completenessScore` indicando a riqueza das informacoes, e deixa claro de onde cada dado veio. O model `ProcessoUnificado` ja existe no backend — esta story o expoe no frontend.

---

## Acceptance Criteria

- [ ] AC1: Rota `/dashboard/processos/:cnj` exibe ficha completa do processo
- [ ] AC2: Secao de cabecalho: CNJ formatado, tribunal, vara, juiz, classe, assunto, valor da causa, data de distribuicao, status
- [ ] AC3: Secao de partes: autor(es), reu(s), advogados de cada parte com OAB
- [ ] AC4: Timeline de movimentacoes em ordem cronologica reversa com: data, tipo, descricao, provider de origem
- [ ] AC5: Barra de completude (`completenessScore` de 0-100) com tooltip explicando o que esta faltando
- [ ] AC6: Badge de provider attribution em cada secao (DataJud, Judit, etc.)
- [ ] AC7: Botao "Atualizar agora" que forca nova consulta multi-provider e atualiza os dados
- [ ] AC8: Dados cacheados no Vercel KV por 5 minutos — "Atualizar agora" invalida o cache
- [ ] AC9: Loading skeleton enquanto dados carregam
- [ ] AC10: Processo nao encontrado exibe tela de erro amigavel com opcao de buscar manualmente

---

## Dev Notes

### Schema Relevante

```sql
-- case_movements (criar nesta story):
CREATE TABLE case_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  data_movimento TIMESTAMPTZ NOT NULL,
  tipo TEXT,
  descricao TEXT NOT NULL,
  complemento TEXT,
  provider_origin TEXT NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_case_movements_case_id ON case_movements(case_id);
CREATE INDEX idx_case_movements_data ON case_movements(case_id, data_movimento DESC);
ALTER TABLE case_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON case_movements USING (tenant_id = auth.tenant_id());
```

### API Contract

```
GET /api/v1/processes/:cnj
```

Response: `ProcessoUnificado` (definido em `~/litix/src/models/processo-unificado.model.ts`)

```typescript
// Query cache key: `process:${tenantId}:${cnj}`
// TTL: 5 minutos (Vercel KV)
```

### Componentes/Arquivos Esperados

```
src/
  app/
    dashboard/
      processos/
        [cnj]/
          page.tsx                    -- Server Component que fetch dados
          loading.tsx                 -- Skeleton
  features/
    processes/
      components/
        process-header.tsx           -- Cabecalho com dados principais
        process-parties.tsx          -- Secao de partes
        process-movements.tsx        -- Timeline de movimentacoes
        completeness-bar.tsx         -- Barra de completude com tooltip
        provider-badge.tsx           -- Badge por provider (reutilizar de LITIX-2.3)
        process-skeleton.tsx         -- Loading state
      hooks/
        use-process.ts               -- Fetch e cache do processo
      services/
        process.service.ts
      types/
        process.types.ts             -- ProcessoUnificado adaptado para frontend
```

### Caching com Vercel KV

```typescript
// src/lib/cache.ts
import { kv } from '@vercel/kv'

export async function getCachedProcess(tenantId: string, cnj: string) {
  return kv.get<ProcessoUnificado>(`process:${tenantId}:${cnj}`)
}

export async function setCachedProcess(tenantId: string, cnj: string, data: ProcessoUnificado) {
  return kv.set(`process:${tenantId}:${cnj}`, data, { ex: 300 }) // 5 min
}

export async function invalidateProcessCache(tenantId: string, cnj: string) {
  return kv.del(`process:${tenantId}:${cnj}`)
}
```

---

## Tasks

- [ ] Task 1: Criar migration de `case_movements`
  - [ ] Subtask 1.1: Migration com schema, indexes e RLS

- [ ] Task 2: Implementar API route de processo
  - [ ] Subtask 2.1: `GET /api/v1/processes/:cnj` com cache KV e fallback para orchestrator
  - [ ] Subtask 2.2: `POST /api/v1/processes/:cnj/refresh` para forcar atualizacao

- [ ] Task 3: Implementar componentes da ficha
  - [ ] Subtask 3.1: `process-header.tsx` com todos os metadados
  - [ ] Subtask 3.2: `process-parties.tsx` com lista de partes e advogados
  - [ ] Subtask 3.3: `process-movements.tsx` com timeline paginada (20 por pagina)
  - [ ] Subtask 3.4: `completeness-bar.tsx` com tooltip de campos ausentes
  - [ ] Subtask 3.5: `process-skeleton.tsx` para loading state

- [ ] Task 4: Implementar pagina
  - [ ] Subtask 4.1: Server Component em `/dashboard/processos/[cnj]/page.tsx`
  - [ ] Subtask 4.2: `loading.tsx` com skeleton

- [ ] Task 5: Testes
  - [ ] Subtask 5.1: Processo com dados de 3 providers exibe completeness > 80
  - [ ] Subtask 5.2: Segundo fetch dentro de 5min retorna cache (sem chamar providers)
  - [ ] Subtask 5.3: "Atualizar agora" invalida cache e busca dados frescos
  - [ ] Subtask 5.4: CNJ invalido retorna tela de erro

---

## Definition of Done

- [ ] Tabela `case_movements` criada com RLS
- [ ] API com cache KV implementada
- [ ] Ficha completa com todas as secoes renderizando
- [ ] Provider attribution visivel em cada secao
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
