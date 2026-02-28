/**
 * Case Fetch Cascade — DataJud (free) → Judit (paid)
 *
 * Replaces direct fetchCaseFromJudit() calls in production flows.
 * Tries the free DataJud API first; only falls back to paid Judit
 * if DataJud data is insufficient (completeness < threshold).
 *
 * When both providers return data, merges them to maximize completeness.
 */

import type { JuditProcessData } from '@/lib/judit-fetch'
import { fetchCaseFromJudit } from '@/lib/judit-fetch'
import { fetchCaseFromDataJud } from '@/lib/datajud-fetch'
import { trackProviderQuery } from '@/lib/provider-tracking'

const CASCADE_COMPLETENESS_THRESHOLD = parseFloat(
  process.env.CASCADE_COMPLETENESS_THRESHOLD ?? '0.65'
)

export interface CaseFetchResult {
  data: JuditProcessData
  providers: string[]
  merged: boolean
  completenessScore: number
  datajudDurationMs?: number
  juditDurationMs?: number
}

/**
 * Fetches case data using progressive cascade: DataJud (free) → Judit (paid).
 *
 * @param cnj - 20-digit CNJ string (no punctuation)
 * @param options.tenantId - tenant ID for tracking (optional)
 * @param options.sourceFlow - which flow triggered this fetch
 */
export async function fetchCase(
  cnj: string,
  options?: {
    tenantId?: string
    sourceFlow?: 'case_register' | 'cron_monitor' | 'document_search' | 'oab_import'
  },
): Promise<CaseFetchResult | null> {
  const sourceFlow = options?.sourceFlow ?? 'case_register'
  const tenantId = options?.tenantId

  // ── Step 1: Try DataJud (free, sync, ~2-5s) ──────────────────────────

  const datajudStart = Date.now()
  const datajudResult = await fetchCaseFromDataJud(cnj)
  const datajudDurationMs = Date.now() - datajudStart

  if (datajudResult) {
    const completeness = calculateCompleteness(datajudResult)

    // Track DataJud query
    trackProviderQuery({
      tenant_id: tenantId,
      provider: 'datajud',
      search_type: 'cnj',
      search_key: cnj,
      tribunal: datajudResult.tribunal ?? undefined,
      status: 'success',
      duration_ms: datajudDurationMs,
      completeness_score: completeness,
      fields_returned: countFilledFields(datajudResult),
      source_flow: sourceFlow,
    })

    if (completeness >= CASCADE_COMPLETENESS_THRESHOLD) {
      // DataJud is sufficient — no need for paid Judit
      return {
        data: datajudResult,
        providers: ['datajud'],
        merged: false,
        completenessScore: completeness,
        datajudDurationMs,
      }
    }

    // DataJud returned data but it's incomplete — try Judit to fill gaps
    const juditStart = Date.now()
    const juditResult = await fetchCaseFromJudit(cnj)
    const juditDurationMs = Date.now() - juditStart

    if (juditResult) {
      const juditCompleteness = calculateCompleteness(juditResult)

      trackProviderQuery({
        tenant_id: tenantId,
        provider: 'judit',
        search_type: 'cnj',
        search_key: cnj,
        tribunal: juditResult.tribunal ?? undefined,
        status: 'success',
        duration_ms: juditDurationMs,
        completeness_score: juditCompleteness,
        fields_returned: countFilledFields(juditResult),
        source_flow: sourceFlow,
      })

      // Merge both results
      const merged = mergeCaseData(datajudResult, juditResult)
      const mergedCompleteness = calculateCompleteness(merged)

      return {
        data: merged,
        providers: ['datajud', 'judit'],
        merged: true,
        completenessScore: mergedCompleteness,
        datajudDurationMs,
        juditDurationMs,
      }
    }

    // Judit failed — use incomplete DataJud data
    trackProviderQuery({
      tenant_id: tenantId,
      provider: 'judit',
      search_type: 'cnj',
      search_key: cnj,
      status: 'error',
      duration_ms: juditDurationMs,
      source_flow: sourceFlow,
      error: 'No data returned',
    })

    return {
      data: datajudResult,
      providers: ['datajud'],
      merged: false,
      completenessScore: completeness,
      datajudDurationMs,
      juditDurationMs,
    }
  }

  // ── Step 2: DataJud failed — fall back to Judit (paid) ────────────────

  trackProviderQuery({
    tenant_id: tenantId,
    provider: 'datajud',
    search_type: 'cnj',
    search_key: cnj,
    status: datajudResult === null ? 'not_found' : 'error',
    duration_ms: datajudDurationMs,
    source_flow: sourceFlow,
  })

  const juditStart = Date.now()
  const juditResult = await fetchCaseFromJudit(cnj)
  const juditDurationMs = Date.now() - juditStart

  if (!juditResult) {
    trackProviderQuery({
      tenant_id: tenantId,
      provider: 'judit',
      search_type: 'cnj',
      search_key: cnj,
      status: 'not_found',
      duration_ms: juditDurationMs,
      source_flow: sourceFlow,
    })
    return null
  }

  const juditCompleteness = calculateCompleteness(juditResult)

  trackProviderQuery({
    tenant_id: tenantId,
    provider: 'judit',
    search_type: 'cnj',
    search_key: cnj,
    tribunal: juditResult.tribunal ?? undefined,
    status: 'success',
    duration_ms: juditDurationMs,
    completeness_score: juditCompleteness,
    fields_returned: countFilledFields(juditResult),
    source_flow: sourceFlow,
  })

  return {
    data: juditResult,
    providers: ['judit'],
    merged: false,
    completenessScore: juditCompleteness,
    datajudDurationMs,
    juditDurationMs,
  }
}

// ─── Completeness Scoring ──────────────────────────────────────────────────

export function calculateCompleteness(data: JuditProcessData): number {
  const fields = [
    data.cnj,
    data.tribunal,
    data.area,
    data.classe,
    data.assunto_principal,
    data.juiz,
    data.valor_causa,
    data.data_distribuicao,
    data.status,
    data.nome_caso,
    data.partes_json?.length,
    data.movimentos?.length,
    data.instancia,
    data.orgao,
  ]
  const total = fields.length
  const filled = fields.filter(f => f !== null && f !== undefined && f !== 0).length
  return filled / total
}

function countFilledFields(data: JuditProcessData): number {
  const fields = [
    data.cnj, data.tribunal, data.area, data.classe, data.assunto_principal,
    data.juiz, data.valor_causa, data.data_distribuicao, data.status,
    data.nome_caso, data.foro, data.natureza, data.justica, data.instancia,
    data.orgao, data.ultimo_andamento, data.ultimo_step_date, data.sigilo,
    data.classificacao, data.vara, data.autor_principal, data.reu_principal,
    data.estado, data.cidade, data.fase,
    data.partes_json?.length, data.movimentos?.length, data.assuntos_json?.length,
  ]
  return fields.filter(f => f !== null && f !== undefined && f !== 0).length
}

// ─── Merge Logic ───────────────────────────────────────────────────────────

function mergeCaseData(
  datajud: JuditProcessData,
  judit: JuditProcessData,
): JuditProcessData {
  const datajudScore = calculateCompleteness(datajud)
  const juditScore = calculateCompleteness(judit)
  const [primary, secondary] = juditScore >= datajudScore
    ? [judit, datajud]
    : [datajud, judit]

  return {
    // Scalar fields: non-null wins, prefer primary (more complete source)
    cnj: primary.cnj || secondary.cnj,
    tribunal: primary.tribunal ?? secondary.tribunal,
    area: primary.area ?? secondary.area,
    classe: primary.classe ?? secondary.classe,
    assunto_principal: primary.assunto_principal ?? secondary.assunto_principal,
    juiz: primary.juiz ?? secondary.juiz,
    valor_causa: primary.valor_causa ?? secondary.valor_causa,
    data_distribuicao: primary.data_distribuicao ?? secondary.data_distribuicao,
    status: primary.status ?? secondary.status,
    nome_caso: primary.nome_caso ?? secondary.nome_caso,
    foro: primary.foro ?? secondary.foro,
    tipo: primary.tipo ?? secondary.tipo,
    natureza: primary.natureza ?? secondary.natureza,
    justica: primary.justica ?? secondary.justica,
    instancia: primary.instancia ?? secondary.instancia,
    ente: primary.ente ?? secondary.ente,
    orgao: primary.orgao ?? secondary.orgao,
    ultimo_andamento: primary.ultimo_andamento ?? secondary.ultimo_andamento,
    ultimo_step_date: primary.ultimo_step_date ?? secondary.ultimo_step_date,
    justice_code: primary.justice_code ?? secondary.justice_code,
    tribunal_code: primary.tribunal_code ?? secondary.tribunal_code,
    instance_code: primary.instance_code ?? secondary.instance_code,
    sigilo: primary.sigilo ?? secondary.sigilo ?? 0,
    assuntos_json: mergeArraysByKey(
      primary.assuntos_json, secondary.assuntos_json, a => a.nome,
    ),
    classificacao: primary.classificacao ?? secondary.classificacao,
    vara: primary.vara ?? secondary.vara,
    link_tribunal: primary.link_tribunal ?? secondary.link_tribunal,
    ultimas_5_mov: primary.ultimas_5_mov ?? secondary.ultimas_5_mov,
    autor_principal: primary.autor_principal ?? secondary.autor_principal,
    reu_principal: primary.reu_principal ?? secondary.reu_principal,
    estado: primary.estado ?? secondary.estado,
    cidade: primary.cidade ?? secondary.cidade,
    fase: primary.fase ?? secondary.fase,

    // Array fields: union with dedup
    partes_json: mergeArraysByKey(
      primary.partes_json, secondary.partes_json, p => p.nome.toLowerCase(),
    ),
    movimentos: mergeArraysByKey(
      primary.movimentos, secondary.movimentos,
      m => `${m.data?.substring(0, 10)}|${m.descricao.substring(0, 80)}`,
    ),

    // Metadata: reflect both providers
    provider: primary.provider,
    request_id: primary.request_id ?? secondary.request_id,
    provider_raw: {
      primary: primary.provider_raw,
      secondary: secondary.provider_raw,
    },
  }
}

function mergeArraysByKey<T>(
  a: T[] | null,
  b: T[] | null,
  keyFn: (item: T) => string,
): T[] | null {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a

  const seen = new Set<string>()
  const result = [...a]
  for (const item of a) {
    seen.add(keyFn(item))
  }
  for (const item of b) {
    const key = keyFn(item)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }
  return result
}
