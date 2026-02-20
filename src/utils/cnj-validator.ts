/**
 * Validates CNJ format: NNNNNNN-DD.AAAA.J.TR.OOOO
 * Where:
 *   NNNNNNN = process number (7 digits)
 *   DD      = check digits (2 digits)
 *   AAAA    = year (4 digits)
 *   J       = justice segment (1 digit)
 *   TR      = tribunal (2 digits)
 *   OOOO    = origin (4 digits)
 */
const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

export function isValidCnj(cnj: string): boolean {
  return CNJ_REGEX.test(cnj);
}

/** Strips all non-digit chars and reformats as CNJ. */
export function normalizeCnj(cnj: string): string | null {
  const digits = cnj.replace(/\D/g, '');
  if (digits.length !== 20) return null;

  const formatted = `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
  return isValidCnj(formatted) ? formatted : null;
}
