/**
 * Builds the full webhook payload from a monitored_cases row and its movements.
 * Mirrors all data displayed on the case detail page (/dashboard/cases/[cnj]).
 * Intentionally excludes: provider_data (heavy raw JSON), tenant_id, last_movement_hash, tracking_id.
 */

export interface WebhookCasePayload {
  event: string
  timestamp: string
  case: {
    id: string
    cnj: string
    tribunal: string | null
    area: string | null
    classe: string | null
    assunto_principal: string | null
    juiz: string | null
    valor_causa: number | null
    data_distribuicao: string | null
    status: string | null
    nome_caso: string | null
    foro: string | null
    tipo: string | null
    natureza: string | null
    justica: string | null
    instancia: number | null
    ente: string | null
    orgao: string | null
    ultimo_andamento: string | null
    ultimo_step_date: string | null
    sigilo: number | null
    assuntos_json: Array<{ codigo: string; nome: string }> | null
    classificacao: string | null
    vara: string | null
    link_tribunal: string | null
    ultimas_5_mov: string | null
    autor_principal: string | null
    reu_principal: string | null
    estado: string | null
    cidade: string | null
    fase: string | null
    dias_sem_mov: number | null
    completeness: number | null
    movement_count: number
    partes_json: Array<{
      nome: string
      lado: string
      documento?: string
      tipo_pessoa?: string
      advogados?: Array<{ nome: string; oab?: string }>
    }> | null
    client_id: string | null
    cliente: string | null
    responsavel: string | null
    setor: string | null
    contingencia: string | null
    probabilidade: string | null
    risco: string | null
    faixa: string | null
    resultado: string | null
    desfecho: string | null
    provisionamento: number | null
    reserva: number | null
    provider: string | null
    merged_from: string[] | null
    request_id: string | null
    monitor_enabled: boolean
    created_at: string
    updated_at: string
  }
  movements: Array<{
    id: string
    movement_date: string
    type: string | null
    description: string
    code: string | null
    provider: string | null
  }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildWebhookPayload(
  eventType: string,
  caseRow: Record<string, any>,
  movements: Array<Record<string, any>>
): WebhookCasePayload {
  return {
    event: eventType,
    timestamp: new Date().toISOString(),
    case: {
      id: caseRow.id ?? '',
      cnj: caseRow.cnj ?? '',
      tribunal: caseRow.tribunal ?? null,
      area: caseRow.area ?? null,
      classe: caseRow.classe ?? null,
      assunto_principal: caseRow.assunto_principal ?? null,
      juiz: caseRow.juiz ?? null,
      valor_causa: caseRow.valor_causa ?? null,
      data_distribuicao: caseRow.data_distribuicao ?? null,
      status: caseRow.status ?? null,
      nome_caso: caseRow.nome_caso ?? null,
      foro: caseRow.foro ?? null,
      tipo: caseRow.tipo ?? null,
      natureza: caseRow.natureza ?? null,
      justica: caseRow.justica ?? null,
      instancia: caseRow.instancia ?? null,
      ente: caseRow.ente ?? null,
      orgao: caseRow.orgao ?? null,
      ultimo_andamento: caseRow.ultimo_andamento ?? null,
      ultimo_step_date: caseRow.ultimo_step_date ?? null,
      sigilo: caseRow.sigilo ?? null,
      assuntos_json: caseRow.assuntos_json ?? null,
      classificacao: caseRow.classificacao ?? null,
      vara: caseRow.vara ?? null,
      link_tribunal: caseRow.link_tribunal ?? null,
      ultimas_5_mov: caseRow.ultimas_5_mov ?? null,
      autor_principal: caseRow.autor_principal ?? null,
      reu_principal: caseRow.reu_principal ?? null,
      estado: caseRow.estado ?? null,
      cidade: caseRow.cidade ?? null,
      fase: caseRow.fase ?? null,
      dias_sem_mov: caseRow.dias_sem_mov ?? null,
      completeness: caseRow.completeness ?? null,
      movement_count: caseRow.movement_count ?? 0,
      partes_json: caseRow.partes_json ?? null,
      client_id: caseRow.client_id ?? null,
      cliente: caseRow.cliente ?? null,
      responsavel: caseRow.responsavel ?? null,
      setor: caseRow.setor ?? null,
      contingencia: caseRow.contingencia ?? null,
      probabilidade: caseRow.probabilidade ?? null,
      risco: caseRow.risco ?? null,
      faixa: caseRow.faixa ?? null,
      resultado: caseRow.resultado ?? null,
      desfecho: caseRow.desfecho ?? null,
      provisionamento: caseRow.provisionamento ?? null,
      reserva: caseRow.reserva ?? null,
      provider: caseRow.provider ?? null,
      merged_from: caseRow.merged_from ?? null,
      request_id: caseRow.request_id ?? null,
      monitor_enabled: caseRow.monitor_enabled ?? false,
      created_at: caseRow.created_at ?? '',
      updated_at: caseRow.updated_at ?? '',
    },
    movements: movements.map((m) => ({
      id: m.id ?? '',
      movement_date: m.movement_date ?? '',
      type: m.type ?? null,
      description: m.description ?? '',
      code: m.code ?? null,
      provider: m.provider ?? null,
    })),
  }
}
