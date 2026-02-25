-- =============================================================================
-- Migration 002: Expandir monitored_cases para template de 90 campos
-- Adiciona campos do escritório (manual) + campos das APIs faltantes
-- =============================================================================

-- ─── CAMPOS DO ESCRITÓRIO (preenchidos manualmente pelo advogado) ────────────

ALTER TABLE monitored_cases
  ADD COLUMN IF NOT EXISTS cliente           TEXT,              -- Nome do cliente
  ADD COLUMN IF NOT EXISTS contingencia      TEXT,              -- Tipo de contingência (ativa/passiva)
  ADD COLUMN IF NOT EXISTS probabilidade     TEXT,              -- Probabilidade (provável/possível/remota)
  ADD COLUMN IF NOT EXISTS faixa             TEXT,              -- Faixa de valor
  ADD COLUMN IF NOT EXISTS risco             TEXT,              -- Nível de risco
  ADD COLUMN IF NOT EXISTS resultado         TEXT,              -- Resultado esperado/obtido
  ADD COLUMN IF NOT EXISTS desfecho          TEXT,              -- Desfecho do caso
  ADD COLUMN IF NOT EXISTS responsavel       TEXT,              -- Advogado responsável
  ADD COLUMN IF NOT EXISTS setor             TEXT,              -- Setor do escritório
  ADD COLUMN IF NOT EXISTS relacionamento    TEXT,              -- Relacionamento com cliente
  ADD COLUMN IF NOT EXISTS provisionamento   DECIMAL(15,2),     -- Valor provisionado
  ADD COLUMN IF NOT EXISTS reserva           DECIMAL(15,2);     -- Valor de reserva

-- ─── CAMPOS DAS APIs (faltantes) ────────────────────────────────────────────

ALTER TABLE monitored_cases
  ADD COLUMN IF NOT EXISTS nome_caso         TEXT,              -- Nome do caso (autor x réu) - campo 18
  ADD COLUMN IF NOT EXISTS foro              TEXT,              -- Foro/Comarca - campo 19
  ADD COLUMN IF NOT EXISTS tipo              TEXT,              -- Tipo processual - campo 20
  ADD COLUMN IF NOT EXISTS natureza          TEXT,              -- Natureza jurídica - campo 21
  ADD COLUMN IF NOT EXISTS justica           TEXT,              -- Tipo de justiça (Estadual/Federal/Trabalho) - campo 25
  ADD COLUMN IF NOT EXISTS instancia         SMALLINT,          -- Instância (1, 2, 3) - campo 26
  ADD COLUMN IF NOT EXISTS ente              TEXT,              -- Ente federativo - campo 27
  ADD COLUMN IF NOT EXISTS orgao             TEXT,              -- Órgão julgador (vara/turma/câmara) - campo 28
  ADD COLUMN IF NOT EXISTS ultimo_andamento  TEXT,              -- Texto da última movimentação - campo 30
  ADD COLUMN IF NOT EXISTS tracking_id       TEXT,              -- ID do tracking no provider - campo 34
  ADD COLUMN IF NOT EXISTS request_id        TEXT,              -- ID do request no provider - campo 35
  ADD COLUMN IF NOT EXISTS ultimo_step_date  TIMESTAMPTZ,       -- Data da última movimentação - campo 36
  ADD COLUMN IF NOT EXISTS justice_code      TEXT,              -- Código da justiça (5=trab, 8=est, etc) - campo 38
  ADD COLUMN IF NOT EXISTS tribunal_code     TEXT,              -- Código numérico do tribunal - campo 39
  ADD COLUMN IF NOT EXISTS instance_code     TEXT,              -- Código da instância - campo 40
  ADD COLUMN IF NOT EXISTS sigilo            SMALLINT DEFAULT 0,-- Nível de sigilo (0-5) - campo 42
  ADD COLUMN IF NOT EXISTS assuntos_json     JSONB,             -- Todos os assuntos [{codigo, nome}] - campo 43
  ADD COLUMN IF NOT EXISTS classificacao     TEXT,              -- Classificação processual - campo 44
  ADD COLUMN IF NOT EXISTS vara              TEXT,              -- Vara/Turma específica - campo 45
  ADD COLUMN IF NOT EXISTS link_tribunal     TEXT,              -- URL de consulta pública - campo 46
  ADD COLUMN IF NOT EXISTS ultimas_5_mov     TEXT,              -- Resumo das últimas 5 movimentações - campo 47
  ADD COLUMN IF NOT EXISTS dias_sem_mov      INTEGER,           -- Dias sem movimentação (calculado) - campo 48
  ADD COLUMN IF NOT EXISTS completeness      DECIMAL(5,2),      -- Score de completude 0-100 - campo 49
  ADD COLUMN IF NOT EXISTS merged_from       TEXT[];            -- Quais providers contribuíram dados - campo 50

-- ─── CAMPOS DE AUTOR/RÉU SEPARADOS (para busca rápida) ─────────────────────

ALTER TABLE monitored_cases
  ADD COLUMN IF NOT EXISTS autor_principal   TEXT,              -- Nome do autor principal - campo 16
  ADD COLUMN IF NOT EXISTS reu_principal     TEXT,              -- Nome do réu principal - campo 17
  ADD COLUMN IF NOT EXISTS estado            TEXT,              -- UF do tribunal (SP, RJ, etc)
  ADD COLUMN IF NOT EXISTS cidade            TEXT,              -- Cidade
  ADD COLUMN IF NOT EXISTS fase              TEXT;              -- Fase atual (Arquivado, Conhecimento, Execução)

-- ─── ÍNDICES PARA BUSCAS FREQUENTES ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cases_cliente       ON monitored_cases(tenant_id, cliente) WHERE cliente IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_responsavel   ON monitored_cases(tenant_id, responsavel) WHERE responsavel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_probabilidade ON monitored_cases(tenant_id, probabilidade) WHERE probabilidade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_autor         ON monitored_cases USING GIN (autor_principal gin_trgm_ops) WHERE autor_principal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_reu           ON monitored_cases USING GIN (reu_principal gin_trgm_ops) WHERE reu_principal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_justica       ON monitored_cases(tenant_id, justica) WHERE justica IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_instancia     ON monitored_cases(tenant_id, instancia) WHERE instancia IS NOT NULL;

-- ─── FUNCTION: Calcular dias sem movimentação ──────────────────────────────

CREATE OR REPLACE FUNCTION update_dias_sem_mov()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ultimo_step_date IS NOT NULL THEN
    NEW.dias_sem_mov := EXTRACT(DAY FROM (now() - NEW.ultimo_step_date))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dias_sem_mov ON monitored_cases;
CREATE TRIGGER trg_dias_sem_mov
  BEFORE INSERT OR UPDATE OF ultimo_step_date ON monitored_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_dias_sem_mov();

-- ─── FUNCTION: Calcular completeness score ──────────────────────────────────

CREATE OR REPLACE FUNCTION update_completeness()
RETURNS TRIGGER AS $$
DECLARE
  filled INTEGER := 0;
  total INTEGER := 25; -- campos API que importam
BEGIN
  IF NEW.tribunal IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.area IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.classe IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.assunto_principal IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.juiz IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.valor_causa IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.data_distribuicao IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.status IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.justica IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.instancia IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.orgao IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.foro IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.nome_caso IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.autor_principal IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.reu_principal IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.partes_json IS NOT NULL AND jsonb_array_length(NEW.partes_json) > 0 THEN filled := filled + 1; END IF;
  IF NEW.ultimo_andamento IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.movement_count > 0 THEN filled := filled + 1; END IF;
  IF NEW.vara IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.natureza IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.estado IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.fase IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.classificacao IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.sigilo IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.provider_data IS NOT NULL THEN filled := filled + 1; END IF;

  NEW.completeness := ROUND((filled::DECIMAL / total) * 100, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_completeness ON monitored_cases;
CREATE TRIGGER trg_completeness
  BEFORE INSERT OR UPDATE ON monitored_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_completeness();

-- ─── UPDATE: Recalcular para registros existentes ──────────────────────────

UPDATE monitored_cases SET updated_at = now()
WHERE TRUE; -- Trigger recalcula completeness e dias_sem_mov

-- ─── COMMENT: Documentação dos campos ──────────────────────────────────────

COMMENT ON COLUMN monitored_cases.cliente IS 'Preenchido pelo escritório';
COMMENT ON COLUMN monitored_cases.contingencia IS 'Preenchido pelo escritório: ativa/passiva';
COMMENT ON COLUMN monitored_cases.probabilidade IS 'Preenchido pelo escritório: provável/possível/remota';
COMMENT ON COLUMN monitored_cases.responsavel IS 'Advogado responsável no escritório';
COMMENT ON COLUMN monitored_cases.completeness IS 'Score automático 0-100 de completude dos dados API';
COMMENT ON COLUMN monitored_cases.dias_sem_mov IS 'Dias sem movimentação, calculado automaticamente';
COMMENT ON COLUMN monitored_cases.merged_from IS 'Array de providers que contribuíram dados: {datajud,judit}';
