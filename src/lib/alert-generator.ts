/**
 * Generates alerts for all active tenant members when new movements are detected.
 * Called from the monitoring cron job and manual refresh.
 */

import { createServiceClient } from '@/lib/supabase/service'
import { formatCNJ } from '@/lib/crypto'

interface NewMovement {
  id: string
  movement_date: string
  description: string
  type: string | null
}

/**
 * Creates one alert per active member for a case that has new movements.
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

  // Get all active members of this tenant
  const { data: members } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (!members || members.length === 0) return 0

  const formattedCnj = formatCNJ(cnj)
  const movCount = newMovements.length
  const latestMov = newMovements[0] // already sorted by date desc

  const title = movCount === 1
    ? `Nova movimentacao em ${formattedCnj}`
    : `${movCount} novas movimentacoes em ${formattedCnj}`

  const body = latestMov.description.length > 200
    ? latestMov.description.substring(0, 200) + '...'
    : latestMov.description

  const alerts = members.map((member) => ({
    tenant_id: tenantId,
    member_id: member.id,
    case_id: caseId,
    movement_id: latestMov.id,
    type: 'new_movement',
    title,
    body: tribunal ? `${tribunal} — ${body}` : body,
    read: false,
    email_sent: false,
  }))

  const { error } = await supabase.from('alerts').insert(alerts)
  if (error) {
    console.error('[alert-generator] Failed to insert alerts:', error.message)
    return 0
  }

  return alerts.length
}
