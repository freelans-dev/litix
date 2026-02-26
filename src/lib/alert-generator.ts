/**
 * Generates alerts for all active tenant members when new movements are detected.
 * Called from the monitoring cron job and manual refresh.
 * Sends email notifications via Resend (fire-and-forget).
 */

import { createServiceClient } from '@/lib/supabase/service'
import { formatCNJ } from '@/lib/crypto'
import { getResendClient, RESEND_FROM } from '@/lib/resend'

interface NewMovement {
  id: string
  movement_date: string
  description: string
  type: string | null
}

/**
 * Creates one alert per active member for a case that has new movements.
 * Sends email notifications to members with known email addresses.
 * Returns the number of alerts created.
 */
export async function generateAlerts(
  tenantId: string,
  caseId: string,
  cnj: string,
  tribunal: string | null,
  newMovements: NewMovement[]
): Promise<number> {
  if (newMovements.length === 0) return 0

  const supabase = createServiceClient()

  // Get all active members with their user_id for email lookup
  const { data: members } = await supabase
    .from('tenant_members')
    .select('id, user_id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (!members || members.length === 0) return 0

  const formattedCnj = formatCNJ(cnj)
  const movCount = newMovements.length
  const latestMov = newMovements[0] // already sorted by date desc

  const title = movCount === 1
    ? `Nova movimentacao em ${formattedCnj}`
    : `${movCount} novas movimentacoes em ${formattedCnj}`

  const bodyText = latestMov.description.length > 200
    ? latestMov.description.substring(0, 200) + '...'
    : latestMov.description

  const alertBody = tribunal ? `${tribunal} — ${bodyText}` : bodyText

  const alerts = members.map((member) => ({
    tenant_id: tenantId,
    member_id: member.id,
    case_id: caseId,
    movement_id: latestMov.id,
    type: 'new_movement' as const,
    title,
    body: alertBody,
    read: false,
    email_sent: false,
  }))

  const { data: insertedAlerts, error } = await supabase
    .from('alerts')
    .insert(alerts)
    .select('id, member_id')

  if (error) {
    console.error('[alert-generator] Failed to insert alerts:', error.message)
    return 0
  }

  // Fire-and-forget email sending — don't block the cron job
  sendAlertEmails(
    supabase,
    members,
    insertedAlerts ?? [],
    tenantId,
    cnj,
    formattedCnj,
    tribunal,
    title,
    bodyText,
    newMovements
  ).catch((err) => {
    console.error('[alert-generator] Email sending failed:', err)
  })

  return alerts.length
}

async function sendAlertEmails(
  supabase: ReturnType<typeof createServiceClient>,
  members: Array<{ id: string; user_id: string }>,
  insertedAlerts: Array<{ id: string; member_id: string }>,
  tenantId: string,
  cnj: string,
  formattedCnj: string,
  tribunal: string | null,
  title: string,
  bodyText: string,
  movements: NewMovement[]
) {
  const resend = getResendClient()
  if (!resend) return // Resend not configured

  // Get emails for all members
  const userIds = members.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  if (!profiles || profiles.length === 0) return

  const profileMap = new Map(profiles.map((p) => [p.id, p]))
  const memberAlertMap = new Map(insertedAlerts.map((a) => [a.member_id, a.id]))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.litix.com.br'
  const caseUrl = `${appUrl}/dashboard/cases/${cnj}`
  const alertsUrl = `${appUrl}/dashboard/alerts`

  const sentAlertIds: string[] = []

  for (const member of members) {
    const profile = profileMap.get(member.user_id)
    if (!profile?.email) continue

    const alertId = memberAlertMap.get(member.id)

    const movementListHtml = movements
      .slice(0, 5)
      .map((m) => `<li style="margin-bottom:8px;"><strong>${m.movement_date}</strong> — ${m.description}</li>`)
      .join('')

    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: profile.email,
        subject: title,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#1a1a2e;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;">
              <h2 style="margin:0;font-size:18px;">Litix — Alerta de Movimentacao</h2>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
              <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">Processo</p>
              <p style="margin:0 0 16px;font-size:18px;font-weight:600;font-family:monospace;">${formattedCnj}</p>
              ${tribunal ? `<p style="margin:0 0 16px;font-size:14px;color:#6b7280;">${tribunal}</p>` : ''}
              <p style="margin:0 0 8px;font-size:14px;font-weight:600;">${movements.length} nova${movements.length > 1 ? 's' : ''} movimentac${movements.length > 1 ? 'oes' : 'ao'}:</p>
              <ul style="padding-left:20px;font-size:14px;color:#374151;">${movementListHtml}</ul>
              ${movements.length > 5 ? `<p style="font-size:13px;color:#6b7280;">e mais ${movements.length - 5} movimentac${movements.length - 5 > 1 ? 'oes' : 'ao'}...</p>` : ''}
              <div style="margin-top:24px;">
                <a href="${caseUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">Ver processo</a>
                <a href="${alertsUrl}" style="display:inline-block;margin-left:12px;color:#2563eb;font-size:14px;text-decoration:none;">Ver todos os alertas</a>
              </div>
              <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
                Voce recebeu este email porque o monitoramento esta ativo para este processo no Litix.
              </p>
            </div>
          </div>
        `,
      })

      if (alertId) sentAlertIds.push(alertId)
    } catch (err) {
      console.error(`[alert-generator] Failed to send email to ${profile.email}:`, err)
    }
  }

  // Mark alerts as email_sent
  if (sentAlertIds.length > 0) {
    await supabase
      .from('alerts')
      .update({ email_sent: true })
      .in('id', sentAlertIds)
  }
}
