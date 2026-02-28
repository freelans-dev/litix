/**
 * Provider Query Tracking — fire-and-forget audit trail for all external API calls.
 *
 * Tracks every provider query with: provider, search type, tribunal, duration,
 * completeness score, and estimated cost. Used by the analytics dashboard.
 */

import { createServiceClient } from '@/lib/supabase/service'

const PROVIDER_COST_BRL: Record<string, number> = {
  datajud: 0,
  judit: parseFloat(process.env.JUDIT_COST_BRL ?? '0.15'),
  codilo: parseFloat(process.env.CODILO_COST_BRL ?? '0.20'),
  escavador: parseFloat(process.env.ESCAVADOR_COST_BRL ?? '0.25'),
  predictus: parseFloat(process.env.PREDICTUS_COST_BRL ?? '0.20'),
}

interface ProviderQueryRecord {
  tenant_id?: string
  provider: string
  search_type: 'cnj' | 'cpf' | 'cnpj' | 'oab'
  search_key: string
  tribunal?: string
  status: 'success' | 'error' | 'timeout' | 'not_found'
  duration_ms: number
  completeness_score?: number
  fields_returned?: number
  error?: string
  source_flow: 'case_register' | 'cron_monitor' | 'document_search' | 'oab_import'
}

/**
 * Records a provider query for analytics. Fire-and-forget — never blocks the main flow.
 */
export function trackProviderQuery(record: ProviderQueryRecord): void {
  const costEstimate =
    record.status === 'success' ? (PROVIDER_COST_BRL[record.provider] ?? 0) : 0

  const supabase = createServiceClient()

  supabase
    .from('provider_queries')
    .insert({
      tenant_id: record.tenant_id ?? null,
      provider: record.provider,
      search_type: record.search_type,
      search_key: record.search_key,
      tribunal: record.tribunal ?? null,
      status: record.status,
      duration_ms: record.duration_ms,
      completeness_score: record.completeness_score ?? null,
      fields_returned: record.fields_returned ?? null,
      cost_estimate_brl: costEstimate,
      error: record.error ?? null,
      source_flow: record.source_flow,
    })
    .then(({ error }) => {
      if (error) {
        console.error('[provider-tracking] Failed to track query:', error.message)
      }
    })
}
