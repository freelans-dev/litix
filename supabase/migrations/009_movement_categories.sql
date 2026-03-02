-- Migration 009: Add category column to case_movements for deterministic classification
-- Enables filtering by movement type (sentenca, decisao, despacho, etc.)

-- 1. Add column
ALTER TABLE case_movements ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Backfill existing rows via regex on type + description
UPDATE case_movements SET category = CASE
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(sentença|sentenca)' THEN 'sentenca'
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(decisão|decisao|tutela|liminar)' THEN 'decisao'
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(despacho|conclusos)' THEN 'despacho'
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(citação|citacao|citado)' THEN 'citacao'
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(intimação|intimacao|intimado)' THEN 'intimacao'
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(petição|peticao|juntada)' THEN 'peticao'
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(recurso|apelação|apelacao|agravo|embargos)' THEN 'recurso'
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(audiência|audiencia|pauta)' THEN 'audiencia'
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(perícia|pericia|perito|laudo)' THEN 'pericia'
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(cumprimento|execução|execucao|penhora|bloqueio|arresto)' THEN 'cumprimento'
  WHEN LOWER(COALESCE(type, '') || ' ' || description) ~ '(distribuição|distribuicao|redistribu)' THEN 'distribuicao'
  ELSE 'outros'
END WHERE category IS NULL;

-- 3. Index for filtered queries by case + category
CREATE INDEX IF NOT EXISTS idx_movements_case_category ON case_movements(case_id, category);
