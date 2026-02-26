import { describe, it, expect } from 'vitest'
import { buildWebhookPayload } from '../webhook-payload'

const MOCK_CASE = {
  id: 'case-1',
  cnj: '00000011220238260100',
  tribunal: 'TJSP',
  area: 'civel',
  classe: 'Procedimento Comum',
  assunto_principal: 'Cobrança',
  juiz: 'João da Silva',
  valor_causa: 50000,
  data_distribuicao: '2023-01-15',
  status: 'ativo',
  monitor_enabled: true,
  movement_count: 5,
  created_at: '2023-01-15T10:00:00Z',
  updated_at: '2023-06-20T14:30:00Z',
}

const MOCK_MOVEMENTS = [
  {
    id: 'mov-1',
    movement_date: '2023-06-20',
    type: 'despacho',
    description: 'Juntada de documento',
    code: '123',
    provider: 'judit',
  },
]

describe('buildWebhookPayload', () => {
  it('includes event type and timestamp', () => {
    const payload = buildWebhookPayload('process.movement', MOCK_CASE, MOCK_MOVEMENTS)
    expect(payload.event).toBe('process.movement')
    expect(payload.timestamp).toBeTruthy()
  })

  it('maps case fields correctly', () => {
    const payload = buildWebhookPayload('process.movement', MOCK_CASE, MOCK_MOVEMENTS)
    expect(payload.case.id).toBe('case-1')
    expect(payload.case.cnj).toBe('00000011220238260100')
    expect(payload.case.tribunal).toBe('TJSP')
    expect(payload.case.valor_causa).toBe(50000)
    expect(payload.case.monitor_enabled).toBe(true)
  })

  it('maps movements correctly', () => {
    const payload = buildWebhookPayload('process.movement', MOCK_CASE, MOCK_MOVEMENTS)
    expect(payload.movements).toHaveLength(1)
    expect(payload.movements[0].id).toBe('mov-1')
    expect(payload.movements[0].description).toBe('Juntada de documento')
  })

  it('handles empty movements array', () => {
    const payload = buildWebhookPayload('process.created', MOCK_CASE, [])
    expect(payload.movements).toHaveLength(0)
  })

  it('defaults missing fields to null or empty', () => {
    const payload = buildWebhookPayload('process.movement', { id: 'x', cnj: '123' }, [])
    expect(payload.case.tribunal).toBeNull()
    expect(payload.case.juiz).toBeNull()
    expect(payload.case.valor_causa).toBeNull()
    expect(payload.case.movement_count).toBe(0)
    expect(payload.case.monitor_enabled).toBe(false)
    expect(payload.case.created_at).toBe('')
  })

  it('includes office data fields', () => {
    const caseWithOffice = {
      ...MOCK_CASE,
      cliente: 'Empresa XYZ',
      responsavel: 'Dr. Maria',
      contingencia: 'possivel',
      probabilidade: 'provavel',
      provisionamento: 25000,
    }
    const payload = buildWebhookPayload('process.movement', caseWithOffice, [])
    expect(payload.case.cliente).toBe('Empresa XYZ')
    expect(payload.case.responsavel).toBe('Dr. Maria')
    expect(payload.case.provisionamento).toBe(25000)
  })
})
