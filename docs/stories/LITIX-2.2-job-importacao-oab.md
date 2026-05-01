# Story LITIX-2.2: Job Trigger.dev de Importacao por OAB

**Epic:** Epic 2 - Import Automatico por OAB
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 8 pontos
**Dependencias:** LITIX-2.1

---

## User Story

Como sistema, preciso executar um job em background que busque todos os processos de um advogado por numero OAB em multiplos providers e os importe para o banco do tenant.

## Contexto

O job de importacao e o coracao do Epic 2. Ele usa o orchestrator existente do Litix (race strategy) para buscar processos nos providers DataJud, Judit e Escavador simultaneamente por numero OAB, unifica os resultados via MergeService, deduplica por CNJ, e insere os processos na tabela `monitored_cases`. O job roda no Trigger.dev (Node.js worker) com timeout de ate 10 minutos para cobrir varredura de 92 tribunais.

---

## Acceptance Criteria

- [ ] AC1: Job `oab-import` implementado no Trigger.dev que recebe `{ tenantId, memberId, oabNumber, oabUf, importId }`
- [ ] AC2: Busca executada em paralelo nos providers DataJud (busca por OAB em todos os 92 tribunais), Judit e Escavador
- [ ] AC3: Resultados unificados via MergeService existente (`src/services/merge.service.ts`) com deduplicacao por CNJ
- [ ] AC4: Cada processo encontrado inserido em `monitored_cases` com campos: `cnj`, `tenant_id`, `imported_by_member_id`, `tribunal`, `provider_origin`, `raw_data` (JSONB), `is_active=true`, `monitor_enabled=true`
- [ ] AC5: Provider attribution preservada: `provider_origin` registra de qual provider o processo veio (ou 'merged' se de varios)
- [ ] AC6: Limite do plano respeitado: se tenant ja tem `max_cases` processos, importacao para ao atingir o limite e registra aviso
- [ ] AC7: Progresso atualizado em `oab_imports` a cada 10% de progresso (`imported`, `total_found`, `status`)
- [ ] AC8: Supabase Realtime notifica o frontend sobre atualizacoes em `oab_imports` para progress bar em tempo real
- [ ] AC9: Se job falha (timeout, erro de provider), `oab_imports.status = 'failed'` com detalhes do erro
- [ ] AC10: Job idempotente: se CNJ ja existe em `monitored_cases` do tenant, atualiza dados mas nao duplica
- [ ] AC11: Respeita limites de rate dos providers (circuit breaker existente)

---

## Dev Notes

### Schema Relevante

```sql
-- monitored_cases (criar nesta story):
CREATE TABLE monitored_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  imported_by_member_id UUID REFERENCES tenant_members(id),
  cnj TEXT NOT NULL,
  tribunal TEXT,
  classe TEXT,
  assunto TEXT,
  valor_causa NUMERIC,
  data_distribuicao DATE,
  status TEXT DEFAULT 'ativo',
  provider_origin TEXT NOT NULL, -- 'datajud'|'judit'|'escavador'|'merged'|'manual'
  raw_data JSONB,
  completeness_score INTEGER DEFAULT 0,
  monitor_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync TIMESTAMPTZ,
  last_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, cnj)
);
CREATE INDEX idx_monitored_cases_tenant_id ON monitored_cases(tenant_id);
CREATE INDEX idx_monitored_cases_cnj ON monitored_cases(cnj);
CREATE INDEX idx_monitored_cases_monitor ON monitored_cases(tenant_id, monitor_enabled) WHERE monitor_enabled = true;
ALTER TABLE monitored_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON monitored_cases USING (tenant_id = auth.tenant_id());
```

### Arquivos do Trigger.dev

```
src/
  trigger/
    oab-import.ts                     -- Job principal de importacao
  lib/
    providers/                        -- Adaptar providers existentes de ~/litix/src/providers/
      datajud.provider.ts
      judit.provider.ts
      escavador.provider.ts
    services/
      orchestrator.service.ts         -- Adaptar de ~/litix/src/services/orchestrator.service.ts
      merge.service.ts                -- Adaptar de ~/litix/src/services/merge.service.ts
```

### Estrutura do Job

```typescript
// src/trigger/oab-import.ts
import { task, logger } from '@trigger.dev/sdk/v3'
import { createServiceClient } from '@/lib/supabase/service'

export const oabImportTask = task({
  id: 'oab-import',
  maxDuration: 600, // 10 minutos
  run: async (payload: OabImportPayload) => {
    const { tenantId, memberId, oabNumber, oabUf, importId } = payload
    const supabase = createServiceClient() // service_role para bypass RLS

    // 1. Atualizar status para 'running'
    await supabase.from('oab_imports').update({ status: 'running', started_at: new Date() }).eq('id', importId)

    // 2. Buscar processos nos providers em paralelo
    const results = await orchestrator.searchByDocument({
      document: `${oabNumber}/${oabUf}`,
      documentType: 'oab',
      strategy: 'race',
      providers: ['datajud', 'judit', 'escavador'],
      enableMerge: true,
    })

    // 3. Deduplica e insere em monitored_cases
    const merged = mergeService.deduplicate(results)
    let imported = 0
    for (const processo of merged) {
      await supabase.from('monitored_cases').upsert({
        tenant_id: tenantId,
        imported_by_member_id: memberId,
        cnj: processo.cnj,
        // ... outros campos
      }, { onConflict: 'tenant_id,cnj' })
      imported++
      // Atualizar progresso a cada 10 processos
      if (imported % 10 === 0) {
        await supabase.from('oab_imports').update({ imported, total_found: merged.length }).eq('id', importId)
      }
    }

    // 4. Finalizar
    await supabase.from('oab_imports').update({
      status: 'completed',
      imported,
      total_found: merged.length,
      completed_at: new Date(),
    }).eq('id', importId)

    return { imported, total: merged.length }
  },
})
```

### Migracao dos Providers Existentes

Os providers existentes em `~/litix/src/providers/` precisam ser adaptados:
- Remover dependencias do Express (req/res)
- Adaptar para uso via `service_role` key do Supabase
- Manter as interfaces `ILegalDataProvider` existentes
- Referencia: `~/litix/src/providers/provider.interface.ts`

---

## Tasks

- [ ] Task 1: Criar migration de `monitored_cases`
  - [ ] Subtask 1.1: Migration com schema completo, indexes, RLS, trigger updated_at

- [ ] Task 2: Migrar providers existentes
  - [ ] Subtask 2.1: Copiar e adaptar `src/providers/datajud/` para Next.js (remover Express deps)
  - [ ] Subtask 2.2: Copiar e adaptar `src/providers/judit/`
  - [ ] Subtask 2.3: Copiar e adaptar `src/providers/escavador/`
  - [ ] Subtask 2.4: Adaptar `orchestrator.service.ts` e `merge.service.ts`

- [ ] Task 3: Implementar job Trigger.dev
  - [ ] Subtask 3.1: Instalar `@trigger.dev/sdk` e configurar `trigger.config.ts`
  - [ ] Subtask 3.2: Implementar `src/trigger/oab-import.ts` com logica completa
  - [ ] Subtask 3.3: Implementar helper `createServiceClient()` para uso nos jobs

- [ ] Task 4: Configurar Supabase Realtime
  - [ ] Subtask 4.1: Habilitar Realtime na tabela `oab_imports` no Supabase Dashboard
  - [ ] Subtask 4.2: Hook `use-import-progress.ts` no frontend que subscreve changes

- [ ] Task 5: Testes
  - [ ] Subtask 5.1: Job com OAB sem processos completa com `total_found=0`
  - [ ] Subtask 5.2: Deduplicacao: mesma OAB importada 2x nao duplica processos
  - [ ] Subtask 5.3: Limite de plano: para ao atingir `max_cases`
  - [ ] Subtask 5.4: Falha de provider primario aciona fallback

---

## Definition of Done

- [ ] Tabela `monitored_cases` criada com RLS
- [ ] Providers migrados e funcionando no contexto Next.js
- [ ] Job `oab-import` implementado e testavel localmente
- [ ] Progresso atualizado em tempo real via Supabase Realtime
- [ ] Testes de integracao passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
