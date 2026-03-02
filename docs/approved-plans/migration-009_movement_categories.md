# Migration Plan: 009_movement_categories.sql

**Aprovado por:** @analyst
**Data:** 2026-03-01
**Tipo:** Incremental (ADD COLUMN + backfill + index)

---

## Objetivo

Adicionar coluna `category TEXT` em `case_movements` para classificacao deterministica de movimentacoes processuais. Backfill via SQL regex. Usado para filtros na UI da pagina de detalhe do processo.

---

## Mudancas

1. `ALTER TABLE case_movements ADD COLUMN IF NOT EXISTS category TEXT`
2. `UPDATE case_movements SET category = CASE...END WHERE category IS NULL` — backfill via regex em `type || description`
3. `CREATE INDEX idx_movements_case_category ON case_movements(case_id, category)` — para filtros por categoria

---

## Categorias

| Categoria | Keywords |
|-----------|----------|
| sentenca | sentenca, sentença |
| decisao | decisao, decisão, tutela, liminar |
| despacho | despacho, conclusos |
| citacao | citacao, citação, citado |
| intimacao | intimacao, intimação, intimado |
| peticao | peticao, petição, juntada |
| recurso | recurso, apelacao, apelação, agravo, embargos |
| audiencia | audiencia, audiência, pauta |
| pericia | pericia, perícia, perito, laudo |
| cumprimento | cumprimento, execucao, execução, penhora, bloqueio, arresto |
| distribuicao | distribuicao, distribuição, redistribu |
| outros | default (nenhum match) |

---

## Estrategia

- `ADD COLUMN IF NOT EXISTS` — idempotente
- Backfill usa `WHERE category IS NULL` — safe para re-run
- Index composto `(case_id, category)` otimiza filtros por processo
- Classificacao identica em SQL (backfill) e TypeScript (ingest) garante consistencia

---

## Rollback

```sql
DROP INDEX IF EXISTS idx_movements_case_category;
ALTER TABLE case_movements DROP COLUMN IF EXISTS category;
```

---

## Aprovacao

- [x] Plano revisado
- [x] Estrategia incremental (ADD COLUMN apenas)
- [x] Idempotencia verificada
- [x] Backfill safe (WHERE category IS NULL)
