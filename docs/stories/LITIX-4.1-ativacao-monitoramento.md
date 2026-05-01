# Story LITIX-4.1: Ativacao Automatica de Monitoramento Pos-Importacao

**Epic:** Epic 4 - Monitoramento com Alertas
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 3 pontos
**Dependencias:** LITIX-2.2, LITIX-2.3

---

## User Story

Como advogado, quero que todos os processos importados entrem automaticamente em monitoramento para nao precisar ativar um por um.

## Contexto

O monitoramento e o produto core do Litix. Apos a importacao por OAB (LITIX-2.2), todos os processos devem ter `monitor_enabled=true` em `monitored_cases`. Esta story cobre a UI de gerenciamento de monitoramento — ligar/desligar por processo, ver frequencia, ver proxima verificacao — e a tabela `monitoring_jobs` que rastreia ciclos.

---

## Acceptance Criteria

- [ ] AC1: Todos os processos importados por OAB tem `monitor_enabled=true` por padrao (definido no job LITIX-2.2)
- [ ] AC2: Coluna "Monitoramento" na lista de processos com toggle on/off por processo
- [ ] AC3: Toggle desliga (`monitor_enabled=false`) ou liga monitoramento com confirmacao
- [ ] AC4: Indicador "Ultima verificacao: X minutos atras" e "Proxima: em Y horas" por processo
- [ ] AC5: Frequencia de monitoramento definida por plano: Free/Solo 2x/dia, Escritorio 4x/dia, Pro 12x/dia
- [ ] AC6: Tabela `monitoring_jobs` criada para rastrear cada ciclo de verificacao por processo
- [ ] AC7: Badge "Novo" em processos com movimentacao detectada nas ultimas 24h

---

## Dev Notes

### Schema Relevante

```sql
-- monitoring_jobs (criar nesta story):
CREATE TABLE monitoring_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  provider_used TEXT,
  movements_found INTEGER DEFAULT 0,
  hash_before TEXT,
  hash_after TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_monitoring_jobs_case_id ON monitoring_jobs(case_id);
CREATE INDEX idx_monitoring_jobs_tenant_id ON monitoring_jobs(tenant_id, created_at DESC);
ALTER TABLE monitoring_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON monitoring_jobs USING (tenant_id = auth.tenant_id());
```

### Componentes/Arquivos Esperados

```
src/
  app/
    dashboard/
      processos/
        page.tsx                     -- Lista de processos com coluna de monitoramento
  features/
    processes/
      components/
        monitoring-toggle.tsx        -- Toggle com confirmacao
        monitoring-status-badge.tsx  -- "Ultima verificacao X min atras"
        new-movement-badge.tsx       -- Badge "Novo"
      hooks/
        use-monitoring.ts
```

### API Contracts

```
PATCH /api/v1/processes/:id/monitoring  -- body: { enabled: boolean }
GET   /api/v1/processes                 -- lista com last_sync, monitor_enabled, has_new_movement
```

---

## Tasks

- [ ] Task 1: Criar migration de `monitoring_jobs`
- [ ] Task 2: Implementar lista de processos
  - [ ] Subtask 2.1: `GET /api/v1/processes` com paginacao, filtros, campos de monitoramento
  - [ ] Subtask 2.2: Pagina `/dashboard/processos` com tabela e colunas de status
- [ ] Task 3: Implementar toggle de monitoramento
  - [ ] Subtask 3.1: `PATCH /api/v1/processes/:id/monitoring`
  - [ ] Subtask 3.2: `monitoring-toggle.tsx` com confirmacao
- [ ] Task 4: Testes
  - [ ] Subtask 4.1: Toggle desativa monitoramento e processo sai do proximo ciclo
  - [ ] Subtask 4.2: Frequencia correta por plano

---

## Definition of Done

- [ ] Tabela `monitoring_jobs` criada
- [ ] Lista de processos com coluna de monitoramento
- [ ] Toggle funcionando com frequencia por plano
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
