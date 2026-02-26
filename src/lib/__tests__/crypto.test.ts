import { describe, it, expect } from 'vitest'
import {
  formatCNJ,
  parseCNJ,
  isValidCNJ,
  signWebhookPayload,
  generateWebhookSecret,
} from '../crypto'

describe('isValidCNJ', () => {
  it('accepts a 20-digit CNJ', () => {
    expect(isValidCNJ('00000011220238260100')).toBe(true)
  })

  it('accepts a formatted CNJ', () => {
    expect(isValidCNJ('0000001-12.2023.8.26.0100')).toBe(true)
  })

  it('rejects too short', () => {
    expect(isValidCNJ('123456789')).toBe(false)
  })

  it('rejects too long', () => {
    expect(isValidCNJ('123456789012345678901')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidCNJ('')).toBe(false)
  })
})

describe('formatCNJ', () => {
  it('formats a 20-digit string', () => {
    expect(formatCNJ('00000011220238260100')).toBe('0000001-12.2023.8.26.0100')
  })

  it('returns input unchanged if not 20 digits', () => {
    expect(formatCNJ('12345')).toBe('12345')
  })

  it('strips existing formatting and re-formats', () => {
    expect(formatCNJ('0000001-12.2023.8.26.0100')).toBe('0000001-12.2023.8.26.0100')
  })
})

describe('parseCNJ', () => {
  it('strips non-digit characters', () => {
    expect(parseCNJ('0000001-12.2023.8.26.0100')).toBe('00000011220238260100')
  })

  it('returns digits unchanged', () => {
    expect(parseCNJ('00000011220238260100')).toBe('00000011220238260100')
  })
})

describe('signWebhookPayload', () => {
  it('returns consistent HMAC for same input', () => {
    const sig1 = signWebhookPayload('test-payload', 'secret-key')
    const sig2 = signWebhookPayload('test-payload', 'secret-key')
    expect(sig1).toBe(sig2)
  })

  it('returns different HMAC for different payload', () => {
    const sig1 = signWebhookPayload('payload-a', 'secret-key')
    const sig2 = signWebhookPayload('payload-b', 'secret-key')
    expect(sig1).not.toBe(sig2)
  })

  it('returns different HMAC for different secret', () => {
    const sig1 = signWebhookPayload('test-payload', 'key-a')
    const sig2 = signWebhookPayload('test-payload', 'key-b')
    expect(sig1).not.toBe(sig2)
  })

  it('returns a hex string', () => {
    const sig = signWebhookPayload('test', 'key')
    expect(sig).toMatch(/^[0-9a-f]+$/)
  })
})

describe('generateWebhookSecret', () => {
  it('starts with whsec_ prefix', () => {
    const secret = generateWebhookSecret()
    expect(secret).toMatch(/^whsec_/)
  })

  it('generates unique values', () => {
    const a = generateWebhookSecret()
    const b = generateWebhookSecret()
    expect(a).not.toBe(b)
  })
})
