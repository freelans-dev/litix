import { describe, it, expect } from 'vitest'
import { computeExposureScore } from '../exposure-score'
import type { CaseForScoring } from '../exposure-score'

const baseCriticalCase: CaseForScoring = {
  id: '1',
  status: 'ativo',
  area: 'trabalhista',
  instancia: 2,
  fase: 'Execucao',
  risco: 'critico',
  probabilidade: 'provavel',
  contingencia: 'passiva',
  valor_causa: 500000,
  provisionamento: null,
  reserva: null,
  dias_sem_mov: 200,
  movement_count: 15,
  ultimo_step_date: new Date().toISOString(),
}

const baseLowRiskCase: CaseForScoring = {
  id: '2',
  status: 'ativo',
  area: 'civel',
  instancia: 1,
  fase: 'Conhecimento',
  risco: 'baixo',
  probabilidade: 'remota',
  contingencia: 'ativa',
  valor_causa: 5000,
  provisionamento: null,
  reserva: null,
  dias_sem_mov: 10,
  movement_count: 3,
  ultimo_step_date: new Date().toISOString(),
}

describe('computeExposureScore', () => {
  it('returns score 0 for empty case list', () => {
    const result = computeExposureScore([])
    expect(result.score).toBe(0)
    expect(result.level).toBe('baixo')
    expect(result.factors).toHaveLength(0)
  })

  it('returns score > 50 for a high-risk portfolio', () => {
    const result = computeExposureScore([baseCriticalCase, baseCriticalCase])
    expect(result.score).toBeGreaterThan(50)
  })

  it('returns score < 30 for a low-risk portfolio', () => {
    const result = computeExposureScore([baseLowRiskCase])
    expect(result.score).toBeLessThan(30)
  })

  it('score is always between 0 and 100', () => {
    const result = computeExposureScore([baseCriticalCase])
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('assigns level critico for extreme portfolio', () => {
    const worstCase: CaseForScoring = { ...baseCriticalCase, valor_causa: 10_000_000 }
    const cases = Array.from({ length: 10 }, (_, i) => ({ ...worstCase, id: String(i) }))
    const result = computeExposureScore(cases)
    expect(result.level).toBe('critico')
  })

  it('low-risk case has lower score than high-risk case', () => {
    const lowResult = computeExposureScore([baseLowRiskCase])
    const highResult = computeExposureScore([baseCriticalCase])
    expect(lowResult.score).toBeLessThan(highResult.score)
  })

  it('returns 4 factors', () => {
    const result = computeExposureScore([baseCriticalCase])
    expect(result.factors).toHaveLength(4)
    expect(result.factors.map((f) => f.key)).toEqual([
      'financial',
      'risk_quality',
      'volume',
      'activity',
    ])
  })

  it('closed cases do not increase financial score', () => {
    const closed: CaseForScoring = {
      ...baseCriticalCase,
      status: 'finalizado',
      valor_causa: 10_000_000,
    }
    const result = computeExposureScore([closed])
    const financial = result.factors.find((f) => f.key === 'financial')
    expect(financial!.raw).toBe(0)
  })

  it('provisionamento reduces financial score', () => {
    const unprov = computeExposureScore([{ ...baseCriticalCase, provisionamento: null }])
    const prov = computeExposureScore([{ ...baseCriticalCase, provisionamento: 500000 }])
    const unprovFinancial = unprov.factors.find((f) => f.key === 'financial')!.raw
    const provFinancial = prov.factors.find((f) => f.key === 'financial')!.raw
    expect(provFinancial).toBeLessThan(unprovFinancial)
  })

  it('computes portfolio summary correctly', () => {
    const result = computeExposureScore([baseCriticalCase, baseLowRiskCase])
    expect(result.summary.total_cases).toBe(2)
    expect(result.summary.active_cases).toBe(2)
    expect(result.summary.total_valor_ativo).toBe(505000)
    expect(result.summary.cases_provavel).toBe(1)
    expect(result.summary.cases_critico_alto).toBe(1)
    expect(result.summary.cases_passiva).toBe(1)
    expect(result.summary.cases_execucao).toBe(1)
  })

  it('handles all null fields gracefully', () => {
    const nullCase: CaseForScoring = {
      id: '1',
      status: null,
      area: null,
      instancia: null,
      fase: null,
      risco: null,
      probabilidade: null,
      contingencia: null,
      valor_causa: null,
      provisionamento: null,
      reserva: null,
      dias_sem_mov: null,
      movement_count: 0,
      ultimo_step_date: null,
    }
    const result = computeExposureScore([nullCase])
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('higher valor_causa increases financial score', () => {
    const low = computeExposureScore([{ ...baseCriticalCase, valor_causa: 1000 }])
    const high = computeExposureScore([{ ...baseCriticalCase, valor_causa: 1_000_000 }])
    const lowFinancial = low.factors.find((f) => f.key === 'financial')!.raw
    const highFinancial = high.factors.find((f) => f.key === 'financial')!.raw
    expect(highFinancial).toBeGreaterThan(lowFinancial)
  })
})
