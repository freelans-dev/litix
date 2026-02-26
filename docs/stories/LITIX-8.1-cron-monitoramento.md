# Story LITIX-8.1: Cron de Monitoramento Automatico

**Epic:** Epic 4 - Monitoramento com Alertas
**Status:** In Progress
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** LITIX-4.1 (toggle existe), LITIX-3.1 (ficha unica)

---

## User Story

Como sistema, preciso verificar periodicamente todos os processos monitorados e detectar novas movimentacoes, para alertar o advogado automaticamente.

## Contexto

O toggle de monitoramento ja existe (LITIX-4.1 parcial). O refresh manual tambem (POST /api/v1/cases/[cnj]/refresh). O que falta e o **motor automatico** — um cron job que roda periodicamente, seleciona processos que precisam ser verificados baseado na frequencia do plano, e processa em batch.

Abordagem: Vercel Cron → API route protegida por CRON_SECRET → batch processing.

---

## Acceptance Criteria

- [x] AC1: Endpoint POST /api/v1/cron/monitor protegido por CRON_SECRET header
- [x] AC2: Seleciona processos onde monitor_enabled=true e last_checked_at esta vencido conforme plan_limits.monitoring_frequency_hours
- [x] AC3: Processa em batch (max 10 por execucao para caber no timeout do Vercel)
- [x] AC4: Para cada caso: fetch Judit, detectar movimentacoes novas, inserir, atualizar last_checked_at
- [x] AC5: Quando novas movimentacoes sao detectadas: criar alertas para todos os membros ativos do tenant
- [x] AC6: Quando novas movimentacoes sao detectadas: disparar webhooks
- [x] AC7: Registrar cada execucao na tabela monitoring_jobs
- [x] AC8: vercel.json configurado com cron schedule
- [x] AC9: Retornar resumo: { processed, newMovements, alerts, errors }

---

## Implementacao

### Arquivos Criados
- `supabase/migrations/004_monitoring_jobs.sql`
- `src/app/api/v1/cron/monitor/route.ts`
- `src/lib/alert-generator.ts`
- `vercel.json`

### Arquivos Modificados
- `src/app/api/v1/cases/[cnj]/refresh/route.ts` (adiciona geracao de alertas)
