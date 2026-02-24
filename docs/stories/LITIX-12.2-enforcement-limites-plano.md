# Story LITIX-12.2: Middleware de Enforcement de Limites por Plano

**Epic:** Epic 12 - Billing e Enforcement de Planos
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** LITIX-12.1, LITIX-1.1

---

## User Story

Como sistema, preciso enforcar os limites de cada plano para garantir a sustentabilidade do negocio e motivar upgrades.

## Contexto

Sem enforcement, usuarios no plano free poderiam usar o produto como pro. Esta story implementa um middleware de limites que verifica `plan_limits` antes de operacoes criticas (adicionar processo, convidar membro, criar webhook). Usa cache KV para evitar queries ao banco a cada request.

---

## Acceptance Criteria

- [ ] AC1: Funcao `checkPlanLimit(tenantId, limitType)` implementada que consulta `plan_limits` vs uso atual do tenant
- [ ] AC2: Limites verificados antes de: adicionar processo ao monitoramento, convidar membro, criar webhook endpoint
- [ ] AC3: Cache dos limites do plano no Vercel KV por 1 hora (`plan_limits:${tenantId}`)
- [ ] AC4: Soft limit em 80%: banner amarelo no dashboard "Voce esta usando 80% dos seus processos"
- [ ] AC5: Hard limit em 100%: operacao bloqueada com mensagem "Limite atingido. Atualize seu plano para continuar."
- [ ] AC6: Mensagem de erro inclui link direto para `/dashboard/billing` com plano sugerido pre-selecionado
- [ ] AC7: Downgrade de plano: se tenant tem mais processos que o novo limite, processos excedentes tem `monitor_enabled=false` (nao sao deletados)
- [ ] AC8: Rate limiting por plano em `/api/v1/**`: Free 60 req/min, Solo 120, Escritorio 300, Pro 1000 — usando Vercel KV como sliding window counter

---

## Dev Notes

### Funcao de Verificacao de Limite

```typescript
// src/lib/plan-limits.ts
import { kv } from '@vercel/kv'
import { createServiceClient } from './supabase/service'

export type LimitType = 'max_cases' | 'max_users' | 'webhook_endpoints'

export async function checkPlanLimit(tenantId: string, limitType: LimitType): Promise<{
  allowed: boolean
  current: number
  max: number
  percentage: number
}> {
  const cacheKey = `plan_limits:${tenantId}`
  let limits = await kv.get<PlanLimitsCache>(cacheKey)

  if (!limits) {
    const supabase = createServiceClient()
    const { data } = await supabase.rpc('get_tenant_usage', { p_tenant_id: tenantId })
    limits = data
    await kv.set(cacheKey, limits, { ex: 3600 }) // 1h
  }

  const max = limits[limitType]
  const current = limits[`current_${limitType}`]
  const percentage = max === -1 ? 0 : Math.round((current / max) * 100) // -1 = unlimited (enterprise)

  return {
    allowed: max === -1 || current < max,
    current,
    max,
    percentage,
  }
}
```

### Funcao SQL de Uso Atual

```sql
CREATE OR REPLACE FUNCTION get_tenant_usage(p_tenant_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'max_cases', pl.max_cases,
    'current_max_cases', COUNT(DISTINCT mc.id),
    'max_users', pl.max_users,
    'current_max_users', COUNT(DISTINCT tm.id),
    'webhook_endpoints', pl.webhook_endpoints,
    'current_webhook_endpoints', COUNT(DISTINCT we.id),
    'api_rate_limit', pl.api_rate_limit
  )
  FROM tenants t
  JOIN subscriptions s ON s.tenant_id = t.id
  JOIN plan_limits pl ON pl.plan = s.plan
  LEFT JOIN monitored_cases mc ON mc.tenant_id = t.id AND mc.monitor_enabled = true
  LEFT JOIN tenant_members tm ON tm.tenant_id = t.id AND tm.is_active = true
  LEFT JOIN webhook_endpoints we ON we.tenant_id = t.id AND we.is_active = true
  WHERE t.id = p_tenant_id
  GROUP BY pl.max_cases, pl.max_users, pl.webhook_endpoints, pl.api_rate_limit;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### Rate Limiting (Upstash Redis via Vercel KV)

```typescript
// src/lib/rate-limit.ts
import { kv } from '@vercel/kv'

export async function checkRateLimit(tenantId: string, plan: string): Promise<boolean> {
  const limits = { free: 60, solo: 120, escritorio: 300, pro: 1000, enterprise: -1 }
  const limit = limits[plan] ?? 60
  if (limit === -1) return true // enterprise: sem limite

  const key = `rate:${tenantId}:${Math.floor(Date.now() / 60000)}` // janela de 1 minuto
  const count = await kv.incr(key)
  if (count === 1) await kv.expire(key, 60)
  return count <= limit
}
```

### Componentes/Arquivos Esperados

```
src/
  lib/
    plan-limits.ts                   -- checkPlanLimit() + get_tenant_usage SQL
    rate-limit.ts                    -- checkRateLimit() com sliding window
  components/
    plan-limit-banner.tsx            -- Banner de aviso em 80% e 100%
    upgrade-prompt.tsx               -- Prompt de upgrade com plano sugerido
```

---

## Tasks

- [ ] Task 1: Implementar `get_tenant_usage` SQL function
- [ ] Task 2: Implementar `checkPlanLimit()` com cache KV
- [ ] Task 3: Integrar verificacao nas APIs criticas
  - [ ] Subtask 3.1: `POST /api/v1/processes/:cnj/monitor` — verificar max_cases
  - [ ] Subtask 3.2: `POST /api/v1/team/invite` — verificar max_users
  - [ ] Subtask 3.3: `POST /api/v1/webhooks` — verificar webhook_endpoints
- [ ] Task 4: Implementar rate limiting nas API routes
- [ ] Task 5: Implementar banners de soft limit no dashboard
- [ ] Task 6: Logica de downgrade (monitor_enabled=false para excedentes)
- [ ] Task 7: Testes
  - [ ] Subtask 7.1: Plano free com 10 processos → 11o bloqueado
  - [ ] Subtask 7.2: 80% de uso → banner amarelo aparece
  - [ ] Subtask 7.3: Rate limit excedido → 429 Too Many Requests
  - [ ] Subtask 7.4: Downgrade desativa monitoramento dos excedentes

---

## Definition of Done

- [ ] `checkPlanLimit()` implementado com cache KV
- [ ] Rate limiting em todas as API routes
- [ ] Banners de soft/hard limit no dashboard
- [ ] Logica de downgrade implementada
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
