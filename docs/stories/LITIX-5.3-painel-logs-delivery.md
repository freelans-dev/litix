# Story LITIX-5.3: Painel de Logs de Delivery com Reenvio

**Epic:** Epic 5 - Webhook para Integracao
**Status:** Draft
**Prioridade:** Should
**Estimativa:** 3 pontos
**Dependencias:** LITIX-5.2

---

## User Story

Como admin do escritorio, quero ver o historico de entregas de webhook e reenviar manualmente as que falharam para depurar integrações.

---

## Acceptance Criteria

- [ ] AC1: Pagina `/dashboard/settings/webhooks/:id/logs` com lista de deliveries do endpoint
- [ ] AC2: Colunas: data, evento, status (badge colorido), tentativas, codigo HTTP de resposta
- [ ] AC3: Clique em delivery expande: payload enviado (formatado JSON) e response recebido
- [ ] AC4: Filtro por status: todos, sucesso, falha, dead_letter
- [ ] AC5: Botao "Reenviar" em deliveries com status failed ou dead_letter — cria novo delivery e enfileira job
- [ ] AC6: Dados retidos por 30 dias (pg_cron de limpeza)

---

## Dev Notes

### API Contracts

```
GET  /api/v1/webhooks/:id/deliveries?status=failed&page=1
POST /api/v1/webhooks/:id/deliveries/:deliveryId/retry
```

### Componentes/Arquivos Esperados

```
src/
  app/
    dashboard/
      settings/
        webhooks/
          [id]/
            logs/
              page.tsx
  features/
    webhooks/
      components/
        delivery-logs-table.tsx
        delivery-detail.tsx          -- Expandivel com payload + response
        delivery-retry-button.tsx
```

---

## Tasks

- [ ] Task 1: Implementar API de logs
  - [ ] Subtask 1.1: `GET /api/v1/webhooks/:id/deliveries` com filtros
  - [ ] Subtask 1.2: `POST /api/v1/webhooks/:id/deliveries/:deliveryId/retry`

- [ ] Task 2: Implementar UI de logs
  - [ ] Subtask 2.1: `delivery-logs-table.tsx` com badges coloridos por status
  - [ ] Subtask 2.2: `delivery-detail.tsx` expandivel com payload/response formatado
  - [ ] Subtask 2.3: `delivery-retry-button.tsx`

- [ ] Task 3: Limpeza automatica (pg_cron — 30 dias)

- [ ] Task 4: Testes
  - [ ] Delivery failed → botao reenviar → novo job enfileirado

---

## Definition of Done

- [ ] Painel de logs com filtros e detalhe
- [ ] Reenvio manual funcionando
- [ ] Limpeza automatica configurada
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
