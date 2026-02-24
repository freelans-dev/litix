# Litix — Índice de Stories

**Projeto:** Litix — Plataforma SaaS de Monitoramento Processual Multi-Provider
**Fase atual:** Fase 0 + MVP
**Total de stories:** 20
**Última atualização:** 2026-02-24

---

## Visão Geral por Fase

| Fase | Epics | Stories | Estimativa Total |
|------|-------|---------|-----------------|
| Fase 0 — Fundação | Epic 1 | 4 stories | 23 pts |
| MVP | Epic 2, 3, 4, 5, 12 (parcial) | 16 stories | 74 pts |
| **Total** | | **20 stories** | **97 pts** |

---

## Epic 1 — Fundação Multi-Tenant e Autenticação

| ID | Título | Prioridade | Estimativa | Dependências | Status |
|----|--------|-----------|-----------|--------------|--------|
| [LITIX-1.1](LITIX-1.1-schema-multi-tenant.md) | Schema Multi-Tenant + RLS + Auth Hook | Must | 8 pts | — | Draft |
| [LITIX-1.2](LITIX-1.2-supabase-auth.md) | Supabase Auth + Signup Multi-Tenant | Must | 5 pts | LITIX-1.1 | Draft |
| [LITIX-1.3](LITIX-1.3-middleware-nextjs.md) | Middleware Next.js + Proteção de Rotas | Must | 3 pts | LITIX-1.2 | Draft |
| [LITIX-1.4](LITIX-1.4-crud-membros-roles.md) | CRUD de Membros e Roles | Must | 7 pts | LITIX-1.3 | Draft |

**Subtotal Epic 1:** 23 pts

---

## Epic 2 — Importação de Processos por OAB

| ID | Título | Prioridade | Estimativa | Dependências | Status |
|----|--------|-----------|-----------|--------------|--------|
| [LITIX-2.1](LITIX-2.1-cadastro-oab.md) | Cadastro de OAB no Perfil | Must | 3 pts | LITIX-1.3 | Draft |
| [LITIX-2.2](LITIX-2.2-job-importacao-oab.md) | Job de Importação OAB via Providers | Must | 8 pts | LITIX-2.1 | Draft |
| [LITIX-2.3](LITIX-2.3-tela-resultado-importacao.md) | Tela de Resultado da Importação | Must | 5 pts | LITIX-2.2 | Draft |
| [LITIX-2.4](LITIX-2.4-deduplicacao-cross-member.md) | Deduplicação Cross-Member | Should | 3 pts | LITIX-2.2 | Draft |

**Subtotal Epic 2:** 19 pts

---

## Epic 3 — Ficha Única de Processo

| ID | Título | Prioridade | Estimativa | Dependências | Status |
|----|--------|-----------|-----------|--------------|--------|
| [LITIX-3.1](LITIX-3.1-ficha-unica-processo.md) | Ficha Única do Processo | Must | 8 pts | LITIX-2.2 | Draft |
| [LITIX-3.2](LITIX-3.2-provider-attribution-completeness.md) | Provider Attribution + Completeness Score | Should | 5 pts | LITIX-3.1 | Draft |
| [LITIX-3.3](LITIX-3.3-consulta-avulsa-cnj.md) | Consulta Avulsa por CNJ | Should | 3 pts | LITIX-1.3 | Draft |

**Subtotal Epic 3:** 16 pts

---

## Epic 4 — Monitoramento e Alertas

| ID | Título | Prioridade | Estimativa | Dependências | Status |
|----|--------|-----------|-----------|--------------|--------|
| [LITIX-4.1](LITIX-4.1-ativacao-monitoramento.md) | Ativação de Monitoramento por Processo | Must | 3 pts | LITIX-3.1 | Draft |
| [LITIX-4.2](LITIX-4.2-job-monitoramento-ciclo.md) | Job de Monitoramento — Ciclo Periódico | Must | 8 pts | LITIX-4.1 | Draft |
| [LITIX-4.3](LITIX-4.3-sistema-alertas.md) | Sistema de Alertas (Email + Realtime) | Must | 5 pts | LITIX-4.2 | Draft |
| [LITIX-4.4](LITIX-4.4-historico-alertas.md) | Histórico de Alertas com Filtros | Should | 3 pts | LITIX-4.3 | Draft |

**Subtotal Epic 4:** 19 pts

---

## Epic 5 — Webhook para Integração

| ID | Título | Prioridade | Estimativa | Dependências | Status |
|----|--------|-----------|-----------|--------------|--------|
| [LITIX-5.1](LITIX-5.1-crud-webhook-endpoints.md) | CRUD de Webhook Endpoints | Must | 5 pts | LITIX-1.3, LITIX-4.3 | Draft |
| [LITIX-5.2](LITIX-5.2-job-webhook-delivery.md) | Job de Delivery com Retry Exponential Backoff | Must | 8 pts | LITIX-5.1, LITIX-4.3 | Draft |
| [LITIX-5.3](LITIX-5.3-painel-logs-delivery.md) | Painel de Logs de Delivery com Reenvio | Should | 3 pts | LITIX-5.2 | Draft |

**Subtotal Epic 5:** 16 pts

---

## Epic 12 — Billing e Enforcement de Planos (MVP parcial)

| ID | Título | Prioridade | Estimativa | Dependências | Status |
|----|--------|-----------|-----------|--------------|--------|
| [LITIX-12.1](LITIX-12.1-pagina-planos-checkout.md) | Página de Planos e Checkout Stripe | Must | 8 pts | LITIX-1.1, LITIX-1.3 | Draft |
| [LITIX-12.2](LITIX-12.2-enforcement-limites-plano.md) | Middleware de Enforcement de Limites por Plano | Must | 5 pts | LITIX-12.1, LITIX-1.1 | Draft |
| [LITIX-12.3](LITIX-12.3-portal-assinatura.md) | Portal de Gerenciamento de Assinatura | Should | 3 pts | LITIX-12.1 | Draft |

**Subtotal Epic 12 (MVP):** 16 pts

---

## Grafo de Dependências

```
LITIX-1.1 ─── LITIX-1.2 ─── LITIX-1.3 ─── LITIX-1.4
                                │
                    ┌───────────┼───────────────────────────────┐
                    │           │                               │
               LITIX-2.1   LITIX-3.3                      LITIX-12.1
                    │                                          │
               LITIX-2.2                               LITIX-12.2
               ┌────┴─────┐                            LITIX-12.3
          LITIX-2.3   LITIX-2.4
               │
          LITIX-3.1 ─── LITIX-3.2
               │
          LITIX-4.1
               │
          LITIX-4.2 ─── LITIX-5.1 ─── LITIX-5.2 ─── LITIX-5.3
               │              │
          LITIX-4.3 ──────────┘
               │
          LITIX-4.4
```

---

## Ordem Sugerida de Desenvolvimento

### Sprint 1 — Fundação (23 pts)
1. LITIX-1.1 — Schema + RLS + Auth Hook
2. LITIX-1.2 — Supabase Auth + Signup
3. LITIX-1.3 — Middleware Next.js
4. LITIX-1.4 — CRUD Membros

### Sprint 2 — Importação + Billing base (27 pts)
5. LITIX-12.1 — Página de Planos + Stripe Checkout
6. LITIX-2.1 — Cadastro OAB
7. LITIX-2.2 — Job Importação OAB
8. LITIX-2.3 — Tela Resultado Importação

### Sprint 3 — Ficha + Monitoramento (24 pts)
9. LITIX-3.1 — Ficha Única do Processo
10. LITIX-3.3 — Consulta Avulsa CNJ
11. LITIX-4.1 — Ativação de Monitoramento
12. LITIX-4.2 — Job de Monitoramento
13. LITIX-4.3 — Sistema de Alertas

### Sprint 4 — Integrações + Enforcement (27 pts)
14. LITIX-12.2 — Enforcement de Limites
15. LITIX-5.1 — CRUD Webhook Endpoints
16. LITIX-5.2 — Job Webhook Delivery
17. LITIX-2.4 — Deduplicação Cross-Member
18. LITIX-3.2 — Provider Attribution
19. LITIX-4.4 — Histórico Alertas
20. LITIX-5.3 — Painel Logs Delivery
21. LITIX-12.3 — Portal Assinatura Stripe

---

## Legenda

| Campo | Valores |
|-------|---------|
| Prioridade | Must / Should / Could |
| Estimativa | Story Points (1, 2, 3, 5, 8, 13) |
| Status | Draft / Ready for Dev / In Progress / Ready for Review / Done |

---

## Documentos de Referência

- [PRD Litix](../litix-prd.md) — Product Requirements Document completo
- [Arquitetura Litix](../litix-architecture.md) — Schema SQL, 40 endpoints, 8 ADRs
- [Pesquisa de Mercado](../market-research.md) — TAM/SAM/SOM, segmentos, precificação
- [Análise Competitiva](../competitive-analysis.md) — 10 competidores, 5 gaps
