# Story LITIX-6.1: API PATCH para Campos Manuais do Escritorio

**Epic:** Epic 6 - Edicao de Dados do Escritorio
**Status:** Ready for Dev
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** Nenhuma (tabela ja existe com migration 002)

---

## User Story

Como advogado, quero atualizar os dados internos do meu escritorio em cada processo (cliente, responsavel, contingencia, probabilidade, etc.) via API, para que minha equipe possa gerenciar os processos de forma completa.

## Contexto

Os 12 campos manuais do escritorio ja existem na tabela `monitored_cases` (migration 002_template_90_campos.sql), mas nao existe endpoint para edita-los. A pagina de detalhe exibe esses campos como read-only. Esta story cria o endpoint PATCH que permitira a edicao.

---

## Acceptance Criteria

- [ ] AC1: PATCH `/api/v1/cases/[id]` aceita corpo JSON com campos editaveis e retorna o registro atualizado
- [ ] AC2: Campos editaveis (whitelist): `cliente`, `responsavel`, `setor`, `contingencia`, `probabilidade`, `risco`, `faixa`, `resultado`, `desfecho`, `provisionamento`, `reserva`, `relacionamento`, `notes`, `tags`
- [ ] AC3: Validacao com Zod: `probabilidade` aceita apenas `provavel|possivel|remota`, `contingencia` aceita `ativa|passiva`, `risco` aceita `baixo|medio|alto|critico`, `provisionamento` e `reserva` sao numeros positivos
- [ ] AC4: Apenas membros do tenant com role `owner`, `admin` ou `member` podem editar (viewer nao pode)
- [ ] AC5: Retorna 404 se o processo nao pertence ao tenant
- [ ] AC6: Retorna 422 com erros de validacao claros se dados invalidos
- [ ] AC7: `updated_at` e atualizado automaticamente
- [ ] AC8: Apos update bem-sucedido, dispara webhook `process.updated` com dados completos (fire-and-forget) para endpoints que assinam esse evento

---

## Dev Notes

### Schema existente (monitored_cases)

Os campos ja existem no banco (migration 002):
```sql
cliente TEXT, contingencia TEXT, probabilidade TEXT, faixa TEXT,
risco TEXT, resultado TEXT, desfecho TEXT, responsavel TEXT,
setor TEXT, relacionamento TEXT, provisionamento DECIMAL(15,2),
reserva DECIMAL(15,2)
```

Campos da migration 001 que tambem sao editaveis:
```sql
notes TEXT, tags TEXT[]
```

### Endpoint

```typescript
// src/app/api/v1/cases/[cnj]/route.ts (novo arquivo)
// PATCH /api/v1/cases/:id

const patchSchema = z.object({
  cliente: z.string().max(200).optional(),
  responsavel: z.string().max(200).optional(),
  setor: z.string().max(100).optional(),
  contingencia: z.enum(['ativa', 'passiva']).optional(),
  probabilidade: z.enum(['provavel', 'possivel', 'remota']).optional(),
  risco: z.enum(['baixo', 'medio', 'alto', 'critico']).optional(),
  faixa: z.string().max(100).optional(),
  resultado: z.string().max(500).optional(),
  desfecho: z.string().max(500).optional(),
  provisionamento: z.number().min(0).optional(),
  reserva: z.number().min(0).optional(),
  relacionamento: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})
```

### Webhook

Adicionar evento `process.updated` ao array de eventos validos em:
- `src/app/api/v1/webhooks/route.ts` (schema de criacao)
- `src/app/api/v1/webhooks/[id]/route.ts` (schema de edicao)
- `src/features/webhooks/components/create-webhook-form.tsx` (UI)

Chamar `dispatchWebhooks()` com eventType `process.updated` apos o update.

### Arquivos a criar/modificar

```
src/app/api/v1/cases/[cnj]/route.ts  -- NOVO: PATCH handler
src/app/api/v1/webhooks/route.ts     -- MODIFICAR: adicionar 'process.updated' ao enum
src/app/api/v1/webhooks/[id]/route.ts -- MODIFICAR: idem
src/features/webhooks/components/create-webhook-form.tsx -- MODIFICAR: idem
```

---

## Tasks

- [ ] Task 1: Criar PATCH `/api/v1/cases/[cnj]/route.ts`
  - [ ] Subtask 1.1: Schema Zod com whitelist de campos
  - [ ] Subtask 1.2: Auth check (tenant + role >= member)
  - [ ] Subtask 1.3: Update no Supabase com service client
  - [ ] Subtask 1.4: Retornar registro atualizado

- [ ] Task 2: Integrar webhook dispatch
  - [ ] Subtask 2.1: Adicionar `process.updated` ao enum de eventos
  - [ ] Subtask 2.2: Chamar dispatchWebhooks apos update
  - [ ] Subtask 2.3: Atualizar form de webhook na UI

- [ ] Task 3: Testes
  - [ ] Subtask 3.1: PATCH com dados validos retorna 200
  - [ ] Subtask 3.2: PATCH com dados invalidos retorna 422
  - [ ] Subtask 3.3: Viewer nao pode editar (403)
  - [ ] Subtask 3.4: Processo de outro tenant retorna 404

---

## Definition of Done

- [ ] Endpoint PATCH funcionando com validacao
- [ ] Webhook `process.updated` disparado apos edicao
- [ ] Campos atualizados refletem na pagina de detalhe
- [ ] Story status: Ready for Review
