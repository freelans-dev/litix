/**
 * WhatsApp notification via Z-API.
 * Fire-and-forget — never blocks the main flow.
 */

const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID
const ZAPI_TOKEN = process.env.ZAPI_TOKEN
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN

function isConfigured(): boolean {
  return !!(ZAPI_INSTANCE_ID && ZAPI_TOKEN)
}

/**
 * Sends a WhatsApp text message via Z-API.
 * Phone must be in format: 5511999999999 (country code + DDD + number)
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<boolean> {
  if (!isConfigured()) return false

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ZAPI_CLIENT_TOKEN ? { 'Client-Token': ZAPI_CLIENT_TOKEN } : {}),
      },
      body: JSON.stringify({
        phone,
        message,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[whatsapp] Z-API error ${res.status}: ${body}`)
      return false
    }

    return true
  } catch (err) {
    console.error('[whatsapp] Failed to send message:', err)
    return false
  }
}

/**
 * Formats an alert as a WhatsApp message.
 */
export function formatAlertWhatsApp(params: {
  cnj: string
  tribunal: string | null
  movementCount: number
  movements: Array<{ movement_date: string; description: string }>
  aiSummary?: string | null
  caseUrl: string
}): string {
  const header = `⚖️ *Litix — Nova Movimentação*\n\n`
  const caseInfo = `📋 *Processo:* ${params.cnj}\n${params.tribunal ? `🏛️ *Tribunal:* ${params.tribunal}\n` : ''}\n`

  const aiBlock = params.aiSummary
    ? `💡 *Resumo IA:*\n${params.aiSummary}\n\n`
    : ''

  const movList = params.movements
    .slice(0, 3)
    .map((m) => `• ${m.movement_date} — ${m.description.substring(0, 150)}${m.description.length > 150 ? '...' : ''}`)
    .join('\n')

  const movBlock = `📌 *${params.movementCount} movimentação(ões):*\n${movList}\n`
  const extra = params.movementCount > 3 ? `\n_e mais ${params.movementCount - 3}..._\n` : ''

  const link = `\n🔗 ${params.caseUrl}`

  return header + caseInfo + aiBlock + movBlock + extra + link
}
