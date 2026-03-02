import { describe, it, expect } from 'vitest'
import { classifyMovement, CATEGORY_LABELS, CATEGORY_COLORS } from '../movement-classifier'

describe('classifyMovement', () => {
  it('classifies sentenca', () => {
    expect(classifyMovement(null, 'Prolatada sentença de procedência parcial')).toBe('sentenca')
    expect(classifyMovement('Sentença', 'Julgamento')).toBe('sentenca')
  })

  it('classifies decisao', () => {
    expect(classifyMovement(null, 'Decisão interlocutória deferindo tutela antecipada')).toBe('decisao')
    expect(classifyMovement(null, 'Concedida liminar')).toBe('decisao')
    expect(classifyMovement('Decisao', 'Tutela de urgência')).toBe('decisao')
  })

  it('classifies despacho', () => {
    expect(classifyMovement(null, 'Autos conclusos para despacho')).toBe('despacho')
    expect(classifyMovement('Despacho', 'Cite-se')).toBe('despacho')
  })

  it('classifies citacao', () => {
    expect(classifyMovement(null, 'Citação por Edital - Expedição')).toBe('citacao')
    expect(classifyMovement(null, 'Réu citado pessoalmente')).toBe('citacao')
  })

  it('classifies intimacao', () => {
    expect(classifyMovement(null, 'Intimação Eletrônica - Expedição')).toBe('intimacao')
    expect(classifyMovement(null, 'Parte intimado para manifestação')).toBe('intimacao')
  })

  it('classifies peticao', () => {
    expect(classifyMovement(null, 'Petição de juntada de documentos')).toBe('peticao')
    expect(classifyMovement(null, 'Juntada de petição')).toBe('peticao')
  })

  it('classifies recurso', () => {
    expect(classifyMovement(null, 'Recurso de apelação interposto')).toBe('recurso')
    expect(classifyMovement(null, 'Agravo de instrumento')).toBe('recurso')
    expect(classifyMovement(null, 'Embargos de declaração')).toBe('recurso')
  })

  it('classifies audiencia', () => {
    expect(classifyMovement(null, 'Audiência de conciliação designada')).toBe('audiencia')
    expect(classifyMovement(null, 'Incluído em pauta')).toBe('audiencia')
  })

  it('classifies pericia', () => {
    expect(classifyMovement(null, 'Nomeado perito judicial')).toBe('pericia')
    expect(classifyMovement(null, 'Laudo pericial apresentado')).toBe('pericia')
  })

  it('classifies cumprimento', () => {
    expect(classifyMovement(null, 'Fase de cumprimento iniciada')).toBe('cumprimento')
    expect(classifyMovement(null, 'Penhora de bens efetivada')).toBe('cumprimento')
    expect(classifyMovement(null, 'Bloqueio judicial via SISBAJUD')).toBe('cumprimento')
  })

  it('classifies distribuicao', () => {
    expect(classifyMovement(null, 'Distribuição por sorteio')).toBe('distribuicao')
    expect(classifyMovement(null, 'Redistribuição para nova vara')).toBe('distribuicao')
  })

  it('returns outros for unrecognized text', () => {
    expect(classifyMovement(null, 'Ato ordinatório praticado')).toBe('outros')
    expect(classifyMovement(null, 'Certidão de decurso de prazo')).toBe('outros')
  })

  it('combines type and description for classification', () => {
    expect(classifyMovement('Sentença', 'Ato praticado')).toBe('sentenca')
  })

  it('handles null type gracefully', () => {
    expect(classifyMovement(null, 'Audiência marcada')).toBe('audiencia')
  })

  it('first matching rule wins (sentenca before decisao)', () => {
    expect(classifyMovement(null, 'Sentença que decidiu a tutela')).toBe('sentenca')
  })
})

describe('CATEGORY_LABELS', () => {
  it('has labels for all categories including todos', () => {
    expect(CATEGORY_LABELS.todos).toBe('Todas')
    expect(CATEGORY_LABELS.sentenca).toBe('Sentença')
    expect(CATEGORY_LABELS.outros).toBe('Outros')
  })
})

describe('CATEGORY_COLORS', () => {
  it('has color classes for all categories', () => {
    expect(CATEGORY_COLORS.sentenca).toContain('bg-red')
    expect(CATEGORY_COLORS.outros).toContain('bg-gray')
  })
})
