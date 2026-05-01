# Story LITIX-4.4: Pagina de Historico de Alertas com Filtros

**Epic:** Epic 4 - Monitoramento com Alertas
**Status:** Draft
**Prioridade:** Should
**Estimativa:** 3 pontos
**Dependencias:** LITIX-4.3

---

## User Story

Como advogado, quero ver o historico completo de alertas com filtros para nao perder nenhuma movimentacao importante.

---

## Acceptance Criteria

- [ ] AC1: Pagina `/dashboard/alertas` com lista completa de alertas do membro (e do tenant para owners/admins)
- [ ] AC2: Filtros: lido/nao-lido, tipo de alerta, processo especifico, periodo (ultimos 7/30/90 dias)
- [ ] AC3: Ordenacao por data (padrao: mais recente primeiro)
- [ ] AC4: Paginacao com 20 alertas por pagina
- [ ] AC5: Clique em alerta navega para ficha do processo
- [ ] AC6: Botao "Marcar todos como lidos" com confirmacao
- [ ] AC7: Owner/admin podem ver alertas de todos os membros do tenant com filtro por membro

---

## Dev Notes

### API Contracts

```
GET /api/v1/alerts?read=false&type=new_movement&period=30&page=1
PATCH /api/v1/alerts/read-all
```

### Componentes/Arquivos Esperados

```
src/
  app/
    dashboard/
      alertas/
        page.tsx
  features/
    alerts/
      components/
        alerts-page.tsx              -- Layout da pagina de alertas
        alerts-filters.tsx           -- Filtros de periodo, tipo, membro
        alerts-list.tsx              -- Lista paginada
```

---

## Tasks

- [ ] Task 1: Implementar pagina de alertas
  - [ ] Subtask 1.1: `alerts-filters.tsx` com filtros de periodo, tipo, lido/nao-lido
  - [ ] Subtask 1.2: `alerts-list.tsx` com paginacao
  - [ ] Subtask 1.3: Pagina `/dashboard/alertas/page.tsx`
- [ ] Task 2: Filtro por membro para owners/admins
- [ ] Task 3: Testes de filtros e paginacao

---

## Definition of Done

- [ ] Pagina de alertas com todos os filtros
- [ ] Paginacao funcionando
- [ ] Filtro por membro para owners/admins
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
