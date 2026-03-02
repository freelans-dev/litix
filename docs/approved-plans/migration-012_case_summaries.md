# Migration 012: case_summaries

## Objetivo
Persistir resumos AI gerados para processos, evitando chamadas repetidas à API do Claude e permitindo controle de freshness baseado em novas movimentações.

## Tabela: case_summaries

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| tenant_id | UUID FK tenants | Isolamento multi-tenant |
| case_id | UUID FK monitored_cases | Processo relacionado |
| summary_type | TEXT | 'timeline' ou 'movements' |
| content | TEXT | Conteúdo do resumo gerado |
| movement_count | INTEGER | Quantidade de movimentações no momento da geração |
| last_movement_date | TIMESTAMPTZ | Data da movimentação mais recente no momento da geração |
| generated_at | TIMESTAMPTZ | Quando o resumo foi gerado |
| created_at | TIMESTAMPTZ | |

## RLS
- Tenant isolation via `current_setting('app.tenant_id')`

## Índices
- `(case_id, summary_type)` UNIQUE — um resumo por tipo por caso
- `(tenant_id, created_at DESC)` — para analytics de uso

## Lógica de Freshness
Um resumo é considerado **stale** quando:
1. `movement_count` atual do caso > `movement_count` salvo (novas movimentações)
2. `generated_at` > 7 dias atrás

## Impacto
- Reduz chamadas à API Anthropic drasticamente
- Permite tracking de uso para cobrança futura
- Nenhuma breaking change
