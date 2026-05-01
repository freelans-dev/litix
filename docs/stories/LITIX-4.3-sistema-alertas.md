# Story LITIX-4.3: Sistema de Alertas In-App e Email

**Epic:** Epic 4 - Monitoramento com Alertas
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** LITIX-4.2

---

## User Story

Como advogado, quero receber alertas imediatos quando houver novas movimentacoes nos meus processos, tanto no dashboard quanto por email.

## Contexto

O alerta e o momento de maior valor do produto — e quando o Litix prova que funciona. Deve ser rapido (< 5 min apos deteccao), claro (o que mudou, em qual processo) e acionavel (link direto para a ficha do processo). Dois canais: in-app (badge + lista de notificacoes) e email.

---

## Acceptance Criteria

- [ ] AC1: Tabela `alerts` criada com `case_id`, `tenant_id`, `member_id` (quem deve receber), `type`, `is_read`, `metadata` (movimentacoes detectadas)
- [ ] AC2: Badge de alertas nao lidos no header do dashboard (contador atualizado via Supabase Realtime)
- [ ] AC3: Clique no badge abre drawer/sidebar com lista de alertas (tipo, processo, data, resumo)
- [ ] AC4: Clique no alerta navega para ficha do processo e marca alerta como lido
- [ ] AC5: Email enviado em ate 5 minutos apos deteccao de movimentacao — conteudo: nome do processo (CNJ), tribunal, descricao da movimentacao, link para ficha
- [ ] AC6: Email enviado apenas para membros com vinculo ao processo em `case_members`
- [ ] AC7: Usuario pode desativar alertas por email em preferencias de perfil (`profiles.notify_email`)
- [ ] AC8: Alertas podem ser marcados como lidos individualmente ou "marcar todos como lidos"
- [ ] AC9: Alertas retidos por 90 dias, apos isso deletados automaticamente (pg_cron)

---

## Dev Notes

### Schema Relevante

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES monitored_cases(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'new_movement', -- new_movement, deadline_approaching, etc.
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}', -- { movement_count, movements: [...], cnj, tribunal }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_member_unread ON alerts(member_id, is_read) WHERE is_read = false;
CREATE INDEX idx_alerts_tenant_id ON alerts(tenant_id);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_own_alerts" ON alerts USING (
  member_id = auth.member_id() OR auth.user_role() IN ('owner', 'admin')
);

-- Limpeza automatica de alertas antigos (pg_cron)
SELECT cron.schedule('cleanup-alerts', '0 3 * * *', $$
  DELETE FROM alerts WHERE created_at < now() - interval '90 days';
$$);
```

### Job de Email (Trigger.dev)

```typescript
// src/trigger/send-alert-email.ts
export const sendAlertEmailTask = task({
  id: 'send-alert-email',
  run: async (payload: { alertId: string }) => {
    // Busca alerta + membro + processo
    // Verifica notify_email = true
    // Envia via Resend/SendGrid
    // Template: CNJ, tribunal, movimentacao, link
  }
})
```

### Supabase Realtime para Badge

```typescript
// src/features/alerts/hooks/use-unread-alerts.ts
const channel = supabase
  .channel('unread_alerts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'alerts',
    filter: `member_id=eq.${memberId}`,
  }, () => refetchCount())
  .subscribe()
```

### Componentes/Arquivos Esperados

```
src/
  features/
    alerts/
      components/
        alerts-badge.tsx             -- Badge no header com contador
        alerts-drawer.tsx            -- Drawer lateral com lista de alertas
        alert-item.tsx               -- Item individual com tipo, processo, data
      hooks/
        use-alerts.ts
        use-unread-alerts.ts         -- Realtime hook para contador
      services/
        alerts.service.ts
  trigger/
    send-alert-email.ts             -- Job de envio de email
```

### Email Provider

Usar **Resend** (resend.com) — simples, com SDK TypeScript e plano free generoso (100 emails/dia).

---

## Tasks

- [ ] Task 1: Criar migration de `alerts` com RLS e pg_cron de limpeza

- [ ] Task 2: Implementar componentes de alertas
  - [ ] Subtask 2.1: `alerts-badge.tsx` com contador e Realtime
  - [ ] Subtask 2.2: `alerts-drawer.tsx` com lista paginada
  - [ ] Subtask 2.3: `alert-item.tsx` com link para processo

- [ ] Task 3: Implementar API de alertas
  - [ ] Subtask 3.1: `GET /api/v1/alerts` com filtros (lido/nao-lido)
  - [ ] Subtask 3.2: `PATCH /api/v1/alerts/:id/read`
  - [ ] Subtask 3.3: `POST /api/v1/alerts/read-all`

- [ ] Task 4: Implementar email
  - [ ] Subtask 4.1: Instalar e configurar Resend
  - [ ] Subtask 4.2: Template de email de alerta
  - [ ] Subtask 4.3: Job `send-alert-email` no Trigger.dev
  - [ ] Subtask 4.4: Preferencia `notify_email` no perfil

- [ ] Task 5: Testes
  - [ ] Subtask 5.1: Alerta criado → badge incrementa em tempo real
  - [ ] Subtask 5.2: Marcar como lido → badge decrementa
  - [ ] Subtask 5.3: Email enviado para membro com notify_email=true
  - [ ] Subtask 5.4: Email nao enviado para membro com notify_email=false

---

## Definition of Done

- [ ] Tabela `alerts` com RLS e limpeza automatica
- [ ] Badge em tempo real funcionando
- [ ] Drawer de alertas com marcacao como lido
- [ ] Email de alerta enviado em < 5 min
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
