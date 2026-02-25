/**
 * Fetches process data from Judit API and returns mapped fields for DB storage.
 * Polls until completed or times out (~25s).
 */

const JUDIT_API_KEY = process.env.JUDIT_API_KEY!
const REQUESTS_URL = 'https://requests.prod.judit.io'

interface JuditProcessData {
  cnj: string
  tribunal: string | null
  area: string | null
  classe: string | null
  assunto_principal: string | null
  juiz: string | null
  valor_causa: number | null
  data_distribuicao: string | null
  status: string | null
  nome: string | null
  comarca: string | null
  partes_json: Array<{ nome: string; lado: string; documento?: string; tipo_pessoa?: string }> | null
  movimentos: Array<{ data: string; descricao: string; tipo?: string; codigo?: string }> | null
  provider: string
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
  const { request_id } = await createRes.json() as { request_id: string }
  if (!request_id) return null

  // 2. Poll up to 5 times × 5s = 25s
  for (let i = 0; i < 5; i++) {
    await sleep(5000)

    const statusRes = await fetch(`${REQUESTS_URL}/requests/${request_id}`, {
      headers: { 'api-key': JUDIT_API_KEY },
    })
    if (!statusRes.ok) continue
    const { status } = await statusRes.json() as { status: string }

    if (status === 'failed' || status === 'cancelled') return null

    if (status === 'completed') {
      const params = new URLSearchParams({
        request_id,
        response_type: 'lawsuit',
        page: '1',
        page_size: '1',
      })
      const respRes = await fetch(`${REQUESTS_URL}/responses?${params}`, {
        headers: { 'api-key': JUDIT_API_KEY },
      })
      if (!respRes.ok) return null
      const respData = await respRes.json() as { page_data: Array<{ response_data: Record<string, unknown> }> }

      const item = respData.page_data?.[0]
      if (!item?.response_data) return null

      return mapResponseData(item.response_data)
    }
  }

  return null
}

function mapResponseData(rd: Record<string, unknown>): JuditProcessData {
  const subjects = rd.subjects as Array<{ code?: string; name?: string }> | undefined
  const parties = rd.parties as Array<{
    name: string
    side?: string
    person_type?: string
    main_document?: string
    entity_type?: string
  }> | undefined
  const steps = rd.steps as Array<{
    step_date: string
    content?: string
    step_type?: string
    step_id?: string
  }> | undefined

  return {
    cnj: (rd.code as string) ?? '',
    tribunal: (rd.tribunal_acronym as string) ?? null,
    area: (rd.area as string) ?? null,
    classe: null,
    assunto_principal: subjects?.[0]?.name ?? null,
    juiz: (rd.judge as string) ?? null,
    valor_causa: typeof rd.amount === 'number' && rd.amount > 0 ? rd.amount : null,
    data_distribuicao: rd.distribution_date
      ? (rd.distribution_date as string).substring(0, 10)
      : null,
    status: ((rd.phase as string)?.toLowerCase() === 'arquivado' ? 'arquivado' : (rd.status as string)?.toLowerCase() === 'finalizado' ? 'finalizado' : 'ativo') ?? null,
    nome: (rd.name as string) ?? null,
    comarca: (rd.county as string) ?? (rd.city as string) ?? null,
    partes_json: parties?.map((p) => ({
      nome: p.name,
      lado: mapLado(p.side),
      documento: p.main_document ?? undefined,
      tipo_pessoa: p.entity_type ?? undefined,
    })) ?? null,
    movimentos: steps?.map((s) => ({
      data: s.step_date,
      descricao: s.content ?? '',
      tipo: s.step_type ?? undefined,
      codigo: s.step_id ?? undefined,
    })) ?? null,
    provider: 'judit',
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
