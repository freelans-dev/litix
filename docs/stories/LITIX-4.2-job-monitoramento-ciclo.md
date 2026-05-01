# Story LITIX-4.2: Job de Monitoramento (pg_cron + Trigger.dev + Hash Comparison)

**Epic:** Epic 4 - Monitoramento com Alertas
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 8 pontos
**Dependencias:** LITIX-4.1, LITIX-2.2

---

## User Story

Como sistema, preciso verificar periodicamente todos os processos monitorados e detectar novas movimentacoes comparando hashes, para alertar o advogado em tempo real.

## Contexto

O ciclo de monitoramento e o motor do Litix. O `pg_cron` agenda a verificacao periodicamente, seleciona processos que precisam ser verificados e publica mensagens na fila `pgmq`. O Trigger.dev consome a fila e executa a verificacao usando o orchestrator existente (com fallback multi-provider). A deteccao de mudanca usa SHA-256 hash das movimentacoes — logica ja existente em `~/litix/src/services/monitor.service.ts`.

---

## Acceptance Criteria

- [ ] AC1: Job `pg_cron` roda a cada hora, seleciona processos onde `monitor_enabled=true` e `last_sync < now() - interval` (baseado no plano)
- [ ] AC2: Processos selecionados publicados em fila `pgmq` como mensagens individuais
- [ ] AC3: Trigger.dev consome a fila e executa job `monitor-case` por processo
- [ ] AC4: Job `monitor-case` consulta processo via orchestrator (strategy: fallback, provider: primario do tenant → demais)
- [ ] AC5: Hash SHA-256 das movimentacoes atuais comparado com `monitored_cases.last_hash`
- [ ] AC6: Se hash mudou: novas movimentacoes inseridas em `case_movements`, `last_hash` e `last_sync` atualizados, alerta criado
- [ ] AC7: Se hash igual: apenas `last_sync` atualizado, nenhum alerta criado
- [ ] AC8: `monitoring_jobs` registra cada execucao com: provider_used, movements_found, hash_before/after, status, timestamps
- [ ] AC9: Circuit breaker por provider: se provider falha 5x em 5 min, fallback para proximo; se todos falham, `status=failed` com log
- [ ] AC10: Throughput: suportar 100.000 processos/ciclo

---

## Dev Notes

### pg_cron Job

```sql
-- Roda a cada hora, agenda verificacoes baseadas no plano do tenant
SELECT cron.schedule('monitor-cycle', '0 * * * *', $$
  SELECT pgmq.send(
    'monitoring_queue',
    json_build_object('case_id', mc.id, 'tenant_id', mc.tenant_id, 'priority', pl.monitoring_frequency_hours)
  )
  FROM monitored_cases mc
  JOIN tenants t ON t.id = mc.tenant_id
  JOIN subscriptions s ON s.tenant_id = t.id
  JOIN plan_limits pl ON pl.plan = s.plan
  WHERE mc.monitor_enabled = true
    AND (mc.last_sync IS NULL OR mc.last_sync < now() - (pl.monitoring_frequency_hours || ' hours')::interval)
    AND t.is_active = true;
$$);
```

### Trigger.dev Job

```typescript
// src/trigger/monitor-case.ts
import { task } from '@trigger.dev/sdk/v3'

export const monitorCaseTask = task({
  id: 'monitor-case',
  maxDuration: 60, // 1 minuto por processo
  run: async (payload: { caseId: string; tenantId: string }) => {
    const { caseId, tenantId } = payload
    const supabase = createServiceClient()

    // 1. Buscar dados atuais do processo
    const { data: monitoredCase } = await supabase.from('monitored_cases').select('*').eq('id', caseId).single()

    // 2. Consultar via orchestrator (fallback strategy)
    const result = await orchestrator.searchByCnj({
      cnj: monitoredCase.cnj,
      strategy: 'fallback',
      enableMerge: false, // para monitoramento, pegar o mais rapido
    })

    // 3. Calcular hash das movimentacoes
    const newHash = sha256(JSON.stringify(result.movimentacoes))

    if (newHash !== monitoredCase.last_hash) {
      // 4. Detectou mudanca — inserir movimentacoes novas e criar alerta
      const newMovements = result.movimentacoes.filter(m => !existsInDB(m))
      await supabase.from('case_movements').insert(newMovements.map(m => ({ ...m, case_id: caseId, tenant_id: tenantId })))
      await supabase.from('alerts').insert({ case_id: caseId, tenant_id: tenantId, type: 'new_movement', metadata: { count: newMovements.length } })
      await supabase.from('monitored_cases').update({ last_hash: newHash, last_sync: new Date() }).eq('id', caseId)
    } else {
      await supabase.from('monitored_cases').update({ last_sync: new Date() }).eq('id', caseId)
    }
  }
})
```

### Migracao do Monitor Service Existente

Adaptar `~/litix/src/services/monitor.service.ts`:
- Remover Express dependencies
- Manter logica de hash comparison
- Adaptar para uso com Supabase service_role

### Arquivos Esperados

```
src/
  trigger/
    monitor-case.ts                  -- Job de verificacao por processo
    monitor-queue-consumer.ts        -- Consumer da fila pgmq
  lib/
    services/
      monitor.service.ts             -- Adaptado do backend existente
supabase/
  migrations/
    0020_setup_pgmq.sql             -- Habilitar pgmq e criar fila
    0021_setup_cron_monitor.sql     -- pg_cron job de agendamento
```

---

## Tasks

- [ ] Task 1: Configurar pgmq e fila de monitoramento
  - [ ] Subtask 1.1: Migration para habilitar pgmq e criar `monitoring_queue`
  - [ ] Subtask 1.2: Migration com pg_cron job de agendamento

- [ ] Task 2: Implementar job `monitor-case`
  - [ ] Subtask 2.1: Adaptar `monitor.service.ts` para Next.js sem Express
  - [ ] Subtask 2.2: Implementar `src/trigger/monitor-case.ts` com logica completa
  - [ ] Subtask 2.3: Implementar consumer da fila pgmq

- [ ] Task 3: Implementar criacao de alertas
  - [ ] Subtask 3.1: Criar tabela `alerts` (feita em LITIX-4.3)
  - [ ] Subtask 3.2: INSERT em `alerts` quando hash muda

- [ ] Task 4: Testes de integracao
  - [ ] Subtask 4.1: Processo com movimentacao nova → hash muda → alerta criado
  - [ ] Subtask 4.2: Processo sem mudanca → apenas last_sync atualizado
  - [ ] Subtask 4.3: Provider primario falha → fallback para secundario
  - [ ] Subtask 4.4: Todos os providers falham → monitoring_job status=failed

---

## Definition of Done

- [ ] pgmq configurado com fila de monitoramento
- [ ] pg_cron agendando verificacoes por plano
- [ ] Job `monitor-case` funcionando com hash comparison
- [ ] Circuit breaker ativo por provider
- [ ] Testes de integracao passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
