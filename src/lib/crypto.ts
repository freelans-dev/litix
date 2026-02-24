import { randomBytes, createHmac } from 'crypto'

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString('hex')}`
}

export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Format CNJ number: 1234567-89.2024.8.26.0100
 */
export function formatCNJ(cnj: string): string {
  const clean = cnj.replace(/\D/g, '')
  if (clean.length !== 20) return cnj
  return `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(13, 14)}.${clean.slice(14, 16)}.${clean.slice(16, 20)}`
}

export function parseCNJ(cnj: string): string {
  return cnj.replace(/\D/g, '')
}

export function isValidCNJ(cnj: string): boolean {
  const digits = cnj.replace(/\D/g, '')
  return digits.length === 20
}
