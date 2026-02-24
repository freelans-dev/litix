# Story LITIX-3.2: Provider Attribution e Completeness Score

**Epic:** Epic 3 - Ficha Unica do Processo
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 3 pontos
**Dependencias:** LITIX-3.1

---

## User Story

Como advogado, quero saber de qual fonte cada informacao do processo veio e o quao completa esta a ficha, para confiar nos dados que estou vendo.

## Contexto

A transparencia de fonte e um diferencial competitivo do Litix (Gap #3 da analise competitiva). Nenhum concorrente informa de onde veio cada dado. O `completenessScore` (0-100) calculado pelo `MergeService` indica a riqueza das informacoes — quanto maior, mais confiavel.

---

## Acceptance Criteria

- [ ] AC1: Cada secao da ficha (partes, movimentacoes, dados do processo) exibe badge do provider de origem
- [ ] AC2: Se dado veio de merge de N providers, badge exibe "Unificado (N fontes)" com tooltip listando os providers
- [ ] AC3: Tooltip do badge mostra: data de coleta por provider, status de cada provider (ok/timeout/error)
- [ ] AC4: Barra de completude com numero percentual e cor (vermelho <40, amarelo 40-70, verde >70)
- [ ] AC5: Tooltip da barra lista campos ausentes: "Falta: valor da causa, assunto, juiz"
- [ ] AC6: Status page de providers disponivel em `/status` (publica, sem login) — uptime de cada provider nas ultimas 24h

---

## Dev Notes

### Calculo do CompletionScore

```typescript
// src/lib/services/merge.service.ts (adaptar do existente)
const SCORED_FIELDS = [
  { field: 'tribunal', weight: 10 },
  { field: 'classe', weight: 10 },
  { field: 'assunto', weight: 10 },
  { field: 'juiz', weight: 10 },
  { field: 'valor_causa', weight: 10 },
  { field: 'data_distribuicao', weight: 10 },
  { field: 'partes', weight: 15 }, // array nao vazio
  { field: 'advogados', weight: 15 }, // array nao vazio
  { field: 'movimentacoes', weight: 10 }, // array nao vazio
]

function calcCompletenessScore(processo: ProcessoUnificado): number {
  const totalWeight = SCORED_FIELDS.reduce((sum, f) => sum + f.weight, 0) // 100
  const earned = SCORED_FIELDS
    .filter(f => !!processo[f.field])
    .reduce((sum, f) => sum + f.weight, 0)
  return Math.round((earned / totalWeight) * 100)
}
```

### Componentes/Arquivos Esperados

```
src/
  features/
    processes/
      components/
        provider-badge.tsx           -- Badge com tooltip (expandir de LITIX-2.3/3.1)
        completeness-bar.tsx         -- Barra com tooltip de campos ausentes
        provider-status-card.tsx     -- Card de status de provider para /status
  app/
    status/
      page.tsx                       -- Pagina publica de status dos providers
```

---

## Tasks

- [ ] Task 1: Expandir `provider-badge.tsx` com tooltip detalhado
  - [ ] Subtask 1.1: Tooltip com data de coleta e status por provider
  - [ ] Subtask 1.2: Variante "Unificado (N fontes)"

- [ ] Task 2: Implementar `completeness-bar.tsx`
  - [ ] Subtask 2.1: Barra com cor dinamica por threshold
  - [ ] Subtask 2.2: Tooltip com lista de campos ausentes

- [ ] Task 3: Implementar pagina de status
  - [ ] Subtask 3.1: `GET /api/v1/providers/status` — consulta circuit breaker status
  - [ ] Subtask 3.2: Pagina `/status` publica com uptime por provider (24h)

---

## Definition of Done

- [ ] Provider attribution visivel com tooltip em todos os campos
- [ ] Completeness bar com cores e tooltip de campos ausentes
- [ ] Pagina /status publica funcionando
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
