# Story LITIX-5.2: Job de Delivery com Retry Exponential Backoff + Dead-Letter

**Epic:** Epic 5 - Webhook para Integracao
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 8 pontos
**Dependencias:** LITIX-5.1, LITIX-4.3

---

## User Story

Como sistema, preciso entregar eventos via webhook com confiabilidade, retentando automaticamente em caso de falha, para que integradores possam confiar no Litix.

## Contexto

Este e o diferencial tecnico mais importante do Epic 5. O delivery confiavel com retry exponencial e dead-letter queue e o que permite que escritorios integrem o Litix com seus sistemas sem se preocupar com falhas de rede temporarias. O `webhook-dispatcher.service.ts` ja existe no backend — precisa ser migrado para Trigger.dev.

---

## Acceptance Criteria

- [ ] AC1: Quando alerta e criado (LITIX-4.2), job `webhook-dispatcher` e enfileirado no Trigger.dev para cada endpoint ativo do tenant que subscreve o evento
- [ ] AC2: Payload enviado via HTTP POST com headers: `Content-Type: application/json`, `X-Litix-Signature: sha256=<hmac>`, `X-Litix-Event: new_movement`, `X-Litix-Delivery: <delivery_id>`
- [ ] AC3: Retry com exponential backoff: tentativa 1 (imediato), 2 (5s), 3 (25s), 4 (2min), 5 (10min)
- [ ] AC4: Timeout por tentativa: 10 segundos
- [ ] AC5: Entrega considerada bem-sucedida se response HTTP 2xx
- [ ] AC6: Apos 5 falhas, delivery marcado como `dead_letter` e job encerrado (sem mais tentativas)
- [ ] AC7: `webhook_deliveries` atualizado apos cada tentativa com: `attempt_count`, `last_response_status`, `last_response_body`, `next_attempt_at`
- [ ] AC8: Payload assinado com HMAC-SHA256 usando o `secret` do endpoint — receptor pode validar autenticidade
- [ ] AC9: Endpoint desativado (`is_active=false`) nao recebe deliveries (pula na fila)

---

## Dev Notes

### Migracao do webhook-dispatcher.service.ts

Adaptar `~/litix/src/services/webhook-dispatcher.service.ts` para Trigger.dev.

### Job Trigger.dev

```typescript
// src/trigger/webhook-dispatcher.ts
export const webhookDispatcherTask = task({
  id: 'webhook-dispatcher',
  maxDuration: 700, // 11+ min para cobrir todos os retries
  retry: {
    maxAttempts: 5,
    factor: 5,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 600000, // 10 min
  },
  run: async (payload: { deliveryId: string }) => {
    const { deliveryId } = payload
    const supabase = createServiceClient()

    const { data: delivery } = await supabase
      .from('webhook_deliveries')
      .select('*, webhook_endpoints(*)')
      .eq('id', deliveryId)
      .single()

    if (!delivery.webhook_endpoints.is_active) return { skipped: true }

    const signature = signWebhookPayload(
      JSON.stringify(delivery.payload),
      delivery.webhook_endpoints.secret
    )

    const response = await fetch(delivery.webhook_endpoints.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Litix-Signature': `sha256=${signature}`,
        'X-Litix-Event': delivery.event_type,
        'X-Litix-Delivery': deliveryId,
      },
      body: JSON.stringify(delivery.payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    const responseBody = await response.text().catch(() => '')
    const success = response.status >= 200 && response.status < 300

    await supabase.from('webhook_deliveries').update({
      status: success ? 'success' : 'failed',
      attempt_count: delivery.attempt_count + 1,
      last_response_status: response.status,
      last_response_body: responseBody.slice(0, 1000),
      delivered_at: success ? new Date() : null,
    }).eq('id', deliveryId)

    if (!success) throw new Error(`HTTP ${response.status}: ${responseBody}`)
    return { success: true, status: response.status }
  },
  onFailure: async (payload, error, { ctx }) => {
    if (ctx.attempt.number >= 5) {
      const supabase = createServiceClient()
      await supabase.from('webhook_deliveries')
        .update({ status: 'dead_letter' })
        .eq('id', payload.deliveryId)
    }
  }
})
```

### Payload Format

```json
{
  "id": "evt_uuid",
  "type": "new_movement",
  "created_at": "2026-02-24T13:00:00Z",
  "data": {
    "process": {
      "cnj": "1234567-89.2024.8.26.0100",
      "tribunal": "TJSP",
      "provider": "datajud"
    },
    "movements": [
      {
        "date": "2026-02-24",
        "type": "Despacho",
        "description": "Cite-se o reu"
      }
    ]
  }
}
```

### Arquivos Esperados

```
src/
  trigger/
    webhook-dispatcher.ts           -- Job com retry logic
  lib/
    crypto.ts                       -- signWebhookPayload (de LITIX-5.1)
```

---

## Tasks

- [ ] Task 1: Adaptar `webhook-dispatcher.service.ts` existente
  - [ ] Subtask 1.1: Remover Express dependencies, adaptar para Trigger.dev
  - [ ] Subtask 1.2: Implementar HMAC signing com secret do endpoint

- [ ] Task 2: Implementar job com retry
  - [ ] Subtask 2.1: `src/trigger/webhook-dispatcher.ts` com configuracao de retry
  - [ ] Subtask 2.2: `onFailure` handler para marcar dead_letter apos 5 tentativas
  - [ ] Subtask 2.3: Atualizar `webhook_deliveries` apos cada tentativa

- [ ] Task 3: Integrar com criacao de alertas (LITIX-4.2)
  - [ ] Subtask 3.1: Ao criar alerta, criar `webhook_deliveries` para cada endpoint ativo
  - [ ] Subtask 3.2: Enfileirar job no Trigger.dev para cada delivery criado

- [ ] Task 4: Testes
  - [ ] Subtask 4.1: Endpoint retorna 200 → delivery marcado como success
  - [ ] Subtask 4.2: Endpoint retorna 500 → retry automatico com backoff
  - [ ] Subtask 4.3: Apos 5 falhas → dead_letter
  - [ ] Subtask 4.4: HMAC valido no receptor (usando secret conhecido)
  - [ ] Subtask 4.5: Endpoint desativado → nao recebe delivery

---

## Definition of Done

- [ ] Job de delivery com retry exponencial implementado
- [ ] HMAC-SHA256 assinando todos os payloads
- [ ] Dead-letter queue apos 5 falhas
- [ ] `webhook_deliveries` atualizado com historico completo
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
