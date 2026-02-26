import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null

  if (!_resend) {
    _resend = new Resend(key)
  }
  return _resend
}

export const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'alertas@litix.com.br'
