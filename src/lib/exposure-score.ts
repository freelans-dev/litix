/**
 * Legal Exposure Score — computes a 0-100 risk score for a client's lawsuit portfolio.
 * Pure function, no DB calls, fully testable.
 */

export interface CaseForScoring {
  id: string
  status: string | null
  area: string | null
  instancia: number | null
  fase: string | null
  risco: string | null
  probabilidade: string | null
  contingencia: string | null
  valor_causa: number | null
  provisionamento: number | null
  reserva: number | null
  dias_sem_mov: number | null
  movement_count: number
  ultimo_step_date: string | null
}

export interface ScoreFactor {
  name: string
  key: string
  weight: number
  raw: number
  weighted: number
  detail: string
}

export interface PortfolioSummary {
  total_cases: number
  active_cases: number
  total_valor_ativo: number
  cases_provavel: number
  cases_critico_alto: number
  cases_passiva: number
  cases_execucao: number
  areas: Record<string, number>
  max_valor: number
}

export interface ExposureScoreResult {
  score: number
  level: 'baixo' | 'moderado' | 'alto' | 'critico'
  factors: ScoreFactor[]
  summary: PortfolioSummary
}

const RISCO_POINTS: Record<string, number> = {
  critico: 30,
  alto: 20,
  medio: 10,
  baixo: 3,
}

const PROB_POINTS: Record<string, number> = {
  provavel: 25,
  possivel: 15,
  remota: 5,
}

const AREA_WEIGHTS: Record<string, number> = {
  trabalhista: 1.0,
  tributario: 0.9,
  tributária: 0.9,
  criminal: 0.8,
  civel: 0.7,
  cível: 0.7,
}

function isActive(status: string | null): boolean {
  return status === 'ativo' || status === null
}

function isExecucao(fase: string | null): boolean {
  if (!fase) return false
  return fase.toLowerCase().includes('execu')
}

function formatBRL(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`
  return `R$ ${value.toFixed(0)}`
}

export function computeExposureScore(cases: CaseForScoring[]): ExposureScoreResult {
  if (cases.length === 0) {
    return {
      score: 0,
      level: 'baixo',
      factors: [],
      summary: {
        total_cases: 0,
        active_cases: 0,
        total_valor_ativo: 0,
        cases_provavel: 0,
        cases_critico_alto: 0,
        cases_passiva: 0,
        cases_execucao: 0,
        areas: {},
        max_valor: 0,
      },
    }
  }

  const activeCases = cases.filter((c) => isActive(c.status))
  const activeCount = activeCases.length

  // --- Portfolio Summary ---
  const totalValorAtivo = activeCases.reduce((sum, c) => sum + (c.valor_causa ?? 0), 0)
  const totalProvisionamento = activeCases.reduce((sum, c) => sum + (c.provisionamento ?? 0), 0)
  const maxValor = Math.max(0, ...activeCases.map((c) => c.valor_causa ?? 0))
  const casesProvavel = activeCases.filter((c) => c.probabilidade === 'provavel').length
  const casesCriticoAlto = activeCases.filter(
    (c) => c.risco === 'critico' || c.risco === 'alto'
  ).length
  const casesPassiva = activeCases.filter((c) => c.contingencia === 'passiva').length
  const casesExecucao = activeCases.filter((c) => isExecucao(c.fase)).length

  const areas: Record<string, number> = {}
  for (const c of activeCases) {
    const area = c.area ?? 'outros'
    areas[area] = (areas[area] ?? 0) + 1
  }

  const summary: PortfolioSummary = {
    total_cases: cases.length,
    active_cases: activeCount,
    total_valor_ativo: totalValorAtivo,
    cases_provavel: casesProvavel,
    cases_critico_alto: casesCriticoAlto,
    cases_passiva: casesPassiva,
    cases_execucao: casesExecucao,
    areas,
    max_valor: maxValor,
  }

  // --- Factor 1: Financial Exposure (40%) ---
  let financialRaw = 0
  if (activeCount > 0 && totalValorAtivo > 0) {
    const normalizedValor = Math.min(
      100,
      (Math.log10(totalValorAtivo + 1) / Math.log10(5_000_000)) * 100
    )
    const coverageRatio = totalProvisionamento / (totalValorAtivo + 1)
    const coverageDiscount = Math.min(20, coverageRatio * 20)
    financialRaw = Math.max(0, normalizedValor - coverageDiscount)
  }

  const financialDetail =
    activeCount > 0
      ? `${formatBRL(totalValorAtivo)} em causas ativas${totalProvisionamento > 0 ? ` · ${formatBRL(totalProvisionamento)} provisionado` : ''}`
      : 'Sem causas ativas'

  // --- Factor 2: Risk Quality (25%) ---
  let riskRaw = 0
  if (activeCount > 0) {
    let totalRiskPoints = 0
    for (const c of activeCases) {
      totalRiskPoints += RISCO_POINTS[c.risco ?? ''] ?? 0
      totalRiskPoints += PROB_POINTS[c.probabilidade ?? ''] ?? 0
      totalRiskPoints += c.contingencia === 'passiva' ? 10 : c.contingencia === 'ativa' ? 2 : 0
      totalRiskPoints += (c.instancia ?? 0) >= 3 ? 15 : (c.instancia ?? 0) >= 2 ? 8 : 0
      totalRiskPoints += isExecucao(c.fase) ? 20 : 0
    }
    const maxPossible = activeCount * 100
    riskRaw = Math.min(100, (totalRiskPoints / maxPossible) * 100)
  }

  const riskDetails: string[] = []
  if (casesCriticoAlto > 0) riskDetails.push(`${casesCriticoAlto} risco alto/critico`)
  if (casesProvavel > 0) riskDetails.push(`${casesProvavel} probabilidade provavel`)
  if (casesPassiva > 0) riskDetails.push(`${casesPassiva} como reu`)
  const riskDetail = riskDetails.length > 0 ? riskDetails.join(' · ') : 'Sem anotacoes de risco'

  // --- Factor 3: Volume and Diversity (20%) ---
  let volumeRaw = 0
  if (activeCount > 0) {
    const countScore = Math.min(100, (activeCount / 20) * 100)

    let areaRiskSum = 0
    for (const c of activeCases) {
      const areaKey = (c.area ?? '').toLowerCase()
      areaRiskSum += AREA_WEIGHTS[areaKey] ?? 0.5
    }
    const areaScore = Math.min(100, (areaRiskSum / 15) * 100)

    const escalatedCount = activeCases.filter((c) => (c.instancia ?? 0) >= 2).length
    const escalationScore = Math.min(100, (escalatedCount / 5) * 100)

    volumeRaw = countScore * 0.5 + areaScore * 0.3 + escalationScore * 0.2
  }

  const volumeDetail = `${activeCount} ativos de ${cases.length} total · ${Object.keys(areas).length} area(s)`

  // --- Factor 4: Activity Signals (15%) ---
  let activityRaw = 0
  if (activeCount > 0) {
    const stagnantCount = activeCases.filter((c) => (c.dias_sem_mov ?? 0) > 180).length
    const stagnationScore = (stagnantCount / activeCount) * 100

    const highActivityCount = activeCases.filter((c) => c.movement_count > 10).length
    const velocityScore = (highActivityCount / activeCount) * 100

    const now = Date.now()
    const thirtyDaysMs = 30 * 86_400_000
    const recentCount = activeCases.filter((c) => {
      if (!c.ultimo_step_date) return false
      return new Date(c.ultimo_step_date).getTime() > now - thirtyDaysMs
    }).length
    const recencyScore = (recentCount / activeCount) * 100

    activityRaw = stagnationScore * 0.4 + velocityScore * 0.4 + recencyScore * 0.2
  }

  const activityDetail =
    activeCount > 0
      ? `${activeCases.filter((c) => (c.dias_sem_mov ?? 0) > 180).length} estagnados · ${activeCases.filter((c) => c.movement_count > 10).length} alta atividade`
      : 'Sem causas ativas'

  // --- Final Score ---
  const factors: ScoreFactor[] = [
    {
      name: 'Exposicao Financeira',
      key: 'financial',
      weight: 0.4,
      raw: Math.round(financialRaw),
      weighted: financialRaw * 0.4,
      detail: financialDetail,
    },
    {
      name: 'Qualidade de Risco',
      key: 'risk_quality',
      weight: 0.25,
      raw: Math.round(riskRaw),
      weighted: riskRaw * 0.25,
      detail: riskDetail,
    },
    {
      name: 'Volume e Diversidade',
      key: 'volume',
      weight: 0.2,
      raw: Math.round(volumeRaw),
      weighted: volumeRaw * 0.2,
      detail: volumeDetail,
    },
    {
      name: 'Sinais de Atividade',
      key: 'activity',
      weight: 0.15,
      raw: Math.round(activityRaw),
      weighted: activityRaw * 0.15,
      detail: activityDetail,
    },
  ]

  const rawScore = factors.reduce((sum, f) => sum + f.weighted, 0)
  const score = Math.round(Math.min(100, Math.max(0, rawScore)))

  const level: ExposureScoreResult['level'] =
    score <= 25 ? 'baixo' : score <= 50 ? 'moderado' : score <= 75 ? 'alto' : 'critico'

  return { score, level, factors, summary }
}
