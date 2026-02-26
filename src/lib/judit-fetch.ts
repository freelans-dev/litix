/**
 * Fetches process data from Judit API and returns mapped fields for DB storage.
 * Maps to all 90-field template columns.
 * Polls until completed or times out (~25s).
 */

const JUDIT_API_KEY = process.env.JUDIT_API_KEY!
const REQUESTS_URL = 'https://requests.prod.judit.io'

export interface JuditProcessData {
  // Dados básicos do processo
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

  // Campos expandidos (template 90 campos)
  foro: string | null
  tipo: string | null
  natureza: string | null
  justica: string | null
  instancia: number | null
  ente: string | null
  orgao: string | null
  ultimo_andamento: string | null
  ultimo_step_date: string | null
  justice_code: string | null
  tribunal_code: string | null
  instance_code: string | null
  sigilo: number
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

  // Partes com advogados
  partes_json: Array<{
    nome: string
    lado: string
    documento?: string
    tipo_pessoa?: string
    advogados?: Array<{ nome: string; oab?: string }>
  }> | null

  // Movimentações
  movimentos: Array<{
    data: string
    descricao: string
    tipo?: string
    codigo?: string
  }> | null

  // Metadados
  provider: string
  request_id: string | null
  provider_raw: Record<string, unknown>  // Dados brutos para provider_data
}

export async function fetchCaseFromJudit(cnj: string): Promise<JuditProcessData | null> {
  if (!JUDIT_API_KEY) return null

  // 1. Create request
  const createRes = await fetch(`${REQUESTS_URL}/requests`, {
    method: 'POST',
    headers: { 'api-key': JUDIT_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      search: {
        search_type: 'lawsuit_cnj',
        search_key: cnj,
        response_type: 'lawsuit',
        cache_ttl_in_days: 1,
      },
    }),
  })

  if (!createRes.ok) return null
  const createData = await createRes.json() as { request_id: string }
  const requestId = createData.request_id
  if (!requestId) return null

  // 2. Poll up to 5 times × 5s = 25s
  for (let i = 0; i < 5; i++) {
    await sleep(5000)

    const statusRes = await fetch(`${REQUESTS_URL}/requests/${requestId}`, {
      headers: { 'api-key': JUDIT_API_KEY },
    })
    if (!statusRes.ok) continue
    const { status } = await statusRes.json() as { status: string }

    if (status === 'failed' || status === 'cancelled') return null

    if (status === 'completed') {
      const params = new URLSearchParams({
        request_id: requestId,
        response_type: 'lawsuit',
        page: '1',
        page_size: '1',
      })
      const respRes = await fetch(`${REQUESTS_URL}/responses?${params}`, {
        headers: { 'api-key': JUDIT_API_KEY },
      })
      if (!respRes.ok) return null
      const respData = await respRes.json() as {
        page_data: Array<{ response_data: Record<string, unknown> }>
      }

      const item = respData.page_data?.[0]
      if (!item?.response_data) return null

      return mapResponseData(item.response_data, requestId)
    }
  }

  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapResponseData(rd: Record<string, any>, requestId: string): JuditProcessData {
  const subjects = rd.subjects as Array<{ code?: string; name?: string }> | undefined
  const classifications = rd.classifications as Array<{ code?: string; name?: string }> | undefined
  const courts = rd.courts as Array<{ code?: string; name?: string }> | undefined
  const parties = rd.parties as Array<{
    name: string
    side?: string
    person_type?: string
    main_document?: string
    entity_type?: string
    lawyers?: Array<{ name: string; oab?: string }>
  }> | undefined
  const steps = rd.steps as Array<{
    step_date: string
    content?: string
    step_type?: string
    step_id?: string
  }> | undefined
  const lastStep = rd.last_step as {
    step_date?: string
    content?: string
    steps_count?: number
  } | undefined

  // Extract autor/réu principal
  const autores = parties?.filter(p => p.side === 'Active') ?? []
  const reus = parties?.filter(p => p.side === 'Passive') ?? []

  // Build últimas 5 movimentações summary
  const last5 = steps
    ?.slice(0, 5)
    .map(s => {
      const date = s.step_date?.substring(0, 10) ?? ''
      const text = (s.content ?? '').split('\n')[0].substring(0, 120)
      return `[${date}] ${text}`
    })
    .join('\n') ?? null

  // Map status
  const phase = rd.phase as string | undefined
  const rawStatus = rd.status as string | undefined
  let mappedStatus = 'ativo'
  if (phase?.toLowerCase() === 'arquivado' || rawStatus?.toLowerCase() === 'arquivado') mappedStatus = 'arquivado'
  else if (rawStatus?.toLowerCase() === 'finalizado') mappedStatus = 'finalizado'
  else if (rawStatus?.toLowerCase()?.includes('suspen')) mappedStatus = 'suspenso'

  return {
    cnj: (rd.code as string) ?? '',
    tribunal: (rd.tribunal_acronym as string) ?? null,
    area: (rd.area as string)?.toLowerCase() ?? null,
    classe: classifications?.[0]?.name ?? null,
    assunto_principal: subjects?.[0]?.name ?? null,
    juiz: (rd.judge as string) ?? null,
    valor_causa: typeof rd.amount === 'number' && rd.amount > 0 ? rd.amount : null,
    data_distribuicao: rd.distribution_date ? (rd.distribution_date as string).substring(0, 10) : null,
    status: mappedStatus,
    nome_caso: (rd.name as string) ?? null,

    // Campos expandidos
    foro: (rd.county as string) ?? null,
    tipo: null, // Judit doesn't return this directly
    natureza: (rd.area as string) ?? null,
    justica: (rd.justice_description as string) ?? null,
    instancia: typeof rd.instance === 'number' ? rd.instance : null,
    ente: null, // Not available from Judit
    orgao: courts?.[0]?.name ?? null,
    ultimo_andamento: lastStep?.content?.split('\n')[0]?.substring(0, 500) ?? null,
    ultimo_step_date: lastStep?.step_date ?? null,
    justice_code: (rd.justice as string) ?? null,
    tribunal_code: (rd.tribunal as string) ?? null,
    instance_code: typeof rd.instance === 'number' ? String(rd.instance) : null,
    sigilo: typeof rd.secrecy_level === 'number' ? rd.secrecy_level : 0,
    assuntos_json: subjects?.map(s => ({ codigo: s.code ?? '', nome: s.name ?? '' })) ?? null,
    classificacao: classifications?.map(c => c.name).join(', ') ?? null,
    vara: courts?.[0]?.name ?? null,
    link_tribunal: null, // Judit doesn't provide this
    ultimas_5_mov: last5,
    autor_principal: autores[0]?.name ?? null,
    reu_principal: reus[0]?.name ?? null,
    estado: (rd.state as string) ?? null,
    cidade: (rd.city as string) ?? null,
    fase: phase ?? null,

    // Partes com advogados
    partes_json: parties?.map(p => ({
      nome: p.name,
      lado: mapLado(p.side),
      documento: p.main_document || undefined,
      tipo_pessoa: p.person_type ?? p.entity_type ?? undefined,
      advogados: p.lawyers?.length
        ? p.lawyers.map(l => ({ nome: l.name, oab: l.oab }))
        : undefined,
    })) ?? null,

    // Movimentações
    movimentos: steps?.map(s => ({
      data: s.step_date,
      descricao: s.content ?? '',
      tipo: s.step_type ?? undefined,
      codigo: s.step_id ?? undefined,
    })) ?? null,

    // Metadados
    provider: 'judit',
    request_id: requestId,
    provider_raw: rd, // Raw data for provider_data JSONB
  }
}

/**
 * Builds the DB update payload from JuditProcessData.
 * Use this in POST and refresh routes to avoid duplication.
 */
export function buildCaseUpdateFromJudit(
  juditData: JuditProcessData,
  fallbackTribunal?: string | null
): Record<string, unknown> {
  return {
    tribunal: juditData.tribunal ?? fallbackTribunal ?? null,
    area: juditData.area,
    classe: juditData.classe,
    assunto_principal: juditData.assunto_principal,
    juiz: juditData.juiz,
    valor_causa: juditData.valor_causa,
    data_distribuicao: juditData.data_distribuicao,
    status: juditData.status,
    nome_caso: juditData.nome_caso,
    foro: juditData.foro,
    natureza: juditData.natureza,
    justica: juditData.justica,
    instancia: juditData.instancia,
    orgao: juditData.orgao,
    ultimo_andamento: juditData.ultimo_andamento,
    ultimo_step_date: juditData.ultimo_step_date,
    justice_code: juditData.justice_code,
    tribunal_code: juditData.tribunal_code,
    instance_code: juditData.instance_code,
    sigilo: juditData.sigilo,
    assuntos_json: juditData.assuntos_json,
    classificacao: juditData.classificacao,
    vara: juditData.vara,
    link_tribunal: juditData.link_tribunal,
    ultimas_5_mov: juditData.ultimas_5_mov,
    autor_principal: juditData.autor_principal,
    reu_principal: juditData.reu_principal,
    estado: juditData.estado,
    cidade: juditData.cidade,
    fase: juditData.fase,
    partes_json: juditData.partes_json,
    provider: juditData.provider,
    provider_data: juditData.provider_raw,
    request_id: juditData.request_id,
    merged_from: [juditData.provider],
    last_checked_at: new Date().toISOString(),
    movement_count: juditData.movimentos?.length ?? 0,
  }
}

function mapLado(side?: string): string {
  if (!side) return 'desconhecido'
  const m: Record<string, string> = {
    Active: 'autor',
    Passive: 'réu',
    Unknown: 'desconhecido',
    Interested: 'interessado',
  }
  return m[side] ?? side.toLowerCase()
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
