/**
 * DataJud Public API wrapper — free, synchronous CNJ lookup.
 *
 * Returns JuditProcessData (same interface as judit-fetch.ts) for seamless
 * compatibility with buildCaseUpdateFromJudit().
 *
 * DataJud provides: cnj, tribunal, area, classe, assuntos, valor_causa,
 * data_distribuicao, partes, movimentacoes, instancia, orgao, foro, sigilo.
 *
 * DataJud does NOT provide: juiz, status, fase, nome_caso, link_tribunal.
 */

import type { JuditProcessData } from '@/lib/judit-fetch'

const DATAJUD_API_KEY =
  process.env.DATAJUD_API_KEY ??
  'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='

const DATAJUD_BASE_URL =
  process.env.DATAJUD_BASE_URL ?? 'https://api-publica.datajud.cnj.jus.br'

const DATAJUD_TIMEOUT_MS = 15_000

// ─── CNJ → Tribunal Alias Mapping ─────────────────────────────────────────

const CNJ_REGEX = /^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$/

const ESTADUAL: Record<string, string> = {
  '01': 'tjac', '02': 'tjal', '03': 'tjam', '04': 'tjap',
  '05': 'tjba', '06': 'tjce', '07': 'tjdft', '08': 'tjes',
  '09': 'tjgo', '10': 'tjma', '11': 'tjmt', '12': 'tjms',
  '13': 'tjmg', '14': 'tjpa', '15': 'tjpb', '16': 'tjpr',
  '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn',
  '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc',
  '25': 'tjse', '26': 'tjsp', '27': 'tjto',
}

const FEDERAL: Record<string, string> = {
  '01': 'trf1', '02': 'trf2', '03': 'trf3',
  '04': 'trf4', '05': 'trf5', '06': 'trf6',
}

const TRABALHO: Record<string, string> = {
  '00': 'tst',
  '01': 'trt1', '02': 'trt2', '03': 'trt3', '04': 'trt4',
  '05': 'trt5', '06': 'trt6', '07': 'trt7', '08': 'trt8',
  '09': 'trt9', '10': 'trt10', '11': 'trt11', '12': 'trt12',
  '13': 'trt13', '14': 'trt14', '15': 'trt15', '16': 'trt16',
  '17': 'trt17', '18': 'trt18', '19': 'trt19', '20': 'trt20',
  '21': 'trt21', '22': 'trt22', '23': 'trt23', '24': 'trt24',
}

const ELEITORAL: Record<string, string> = {
  '00': 'tse',
  '01': 'treac', '02': 'treal', '03': 'tream', '04': 'treap',
  '05': 'treba', '06': 'trece', '07': 'tredf', '08': 'trees',
  '09': 'trego', '10': 'trema', '11': 'tremt', '12': 'trems',
  '13': 'tremg', '14': 'trepa', '15': 'trepb', '16': 'trepr',
  '17': 'trepe', '18': 'trepi', '19': 'trerj', '20': 'trern',
  '21': 'trers', '22': 'trero', '23': 'trerr', '24': 'tresc',
  '25': 'trese', '26': 'tresp', '27': 'treto',
}

/**
 * Formats a 20-digit CNJ string into NNNNNNN-DD.AAAA.J.TT.OOOO format.
 */
function formatCnjForQuery(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length !== 20) return digits
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`
}

/**
 * Maps a formatted CNJ to its DataJud Elasticsearch index alias.
 * Returns null for unmapped tribunals.
 */
export function cnjToTribunalAlias(cnj: string): string | null {
  const match = cnj.match(CNJ_REGEX)
  if (!match) return null

  const j = match[4]!
  const tt = match[5]!

  switch (j) {
    case '1': return 'api_publica_stf'
    case '3': return 'api_publica_stj'
    case '2': return null // CNJ has no litigation index
    case '7': {
      if (tt === '00' || tt === '01') return 'api_publica_stm'
      return null
    }
    case '8': {
      const suffix = ESTADUAL[tt]
      return suffix ? `api_publica_${suffix}` : null
    }
    case '4': {
      const suffix = FEDERAL[tt]
      return suffix ? `api_publica_${suffix}` : null
    }
    case '5': {
      const suffix = TRABALHO[tt]
      return suffix ? `api_publica_${suffix}` : null
    }
    case '6': {
      const suffix = ELEITORAL[tt]
      return suffix ? `api_publica_${suffix}` : null
    }
    default:
      return null
  }
}

// ─── DataJud Response Types (inline, from packages/providers) ──────────────

interface DataJudSource {
  numeroProcesso?: string
  dataAjuizamento?: string
  dataHoraUltimaAtualizacao?: string
  classe?: { codigo?: number; nome?: string }
  assuntos?: Array<{ codigo?: number; nome?: string }>
  orgaoJulgador?: { codigo?: string; nome?: string; codigoMunicipioIBGE?: string }
  tribunal?: { codigo?: string; nome?: string; sigla?: string }
  grau?: string
  nivelSigilo?: number
  movimentos?: Array<{
    codigo?: number
    nome?: string
    dataHora?: string
    complementosTabelados?: Array<{ descricao?: string; nome?: string; value?: string }>
  }>
  partes?: Array<{
    nome?: string
    cpfCnpj?: string
    documento?: string
    tipoParte?: { codigo?: number; nome?: string }
    advogados?: Array<{ nome?: string; numeroOAB?: string }>
  }>
  valorCausa?: { valor?: number }
}

interface DataJudHit {
  _index?: string
  _source: DataJudSource
}

interface DataJudSearchResponse {
  hits?: {
    total?: { value?: number }
    hits?: DataJudHit[]
  }
}

// ─── Main Fetch Function ───────────────────────────────────────────────────

export async function fetchCaseFromDataJud(cnj: string): Promise<JuditProcessData | null> {
  try {
    const formatted = formatCnjForQuery(cnj)
    const alias = cnjToTribunalAlias(formatted)
    if (!alias) return null // Unknown tribunal

    const url = `${DATAJUD_BASE_URL}/${alias}/_search`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DATAJUD_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `APIKey ${DATAJUD_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: {
            match: { numeroProcesso: formatted },
          },
          size: 1,
        }),
      })

      if (!res.ok) return null

      const data = await res.json() as DataJudSearchResponse
      const hit = data.hits?.hits?.[0]
      if (!hit?._source) return null

      return mapDataJudToJuditFormat(hit, formatted)
    } finally {
      clearTimeout(timeout)
    }
  } catch {
    // DataJud failures are non-fatal — cascade will try Judit
    return null
  }
}

// ─── Response Mapper ───────────────────────────────────────────────────────

function mapDataJudToJuditFormat(hit: DataJudHit, cnj: string): JuditProcessData {
  const src = hit._source
  const indexAlias = hit._index ?? ''

  // Extract tribunal sigla from index name (e.g., 'api_publica_tjsp' → 'TJSP')
  const tribunalSigla = src.tribunal?.sigla ?? extractSiglaFromIndex(indexAlias)

  // Map area from first subject or class name
  const area = mapArea(src.assuntos?.[0]?.nome ?? src.classe?.nome)

  // Map parties
  const parties = src.partes
    ?.filter(p => p.nome)
    .map(p => ({
      nome: p.nome!,
      lado: mapTipoParte(p.tipoParte?.nome),
      documento: (p.cpfCnpj ?? p.documento) || undefined,
      tipo_pessoa: undefined,
      advogados: p.advogados
        ?.filter(a => a.nome)
        .map(a => ({ nome: a.nome!, oab: a.numeroOAB })),
    }))

  // Map movements
  const movements = src.movimentos?.map(m => {
    const complemento = m.complementosTabelados
      ?.map(c => c.descricao ?? c.nome ?? c.value)
      .filter(Boolean)
      .join('; ')

    return {
      data: m.dataHora ?? '',
      descricao: m.nome ?? '',
      tipo: m.nome ?? undefined,
      codigo: m.codigo?.toString() ?? undefined,
      complemento,
    }
  })

  // Build last 5 movements summary
  const last5 = movements
    ?.slice(0, 5)
    .map(m => {
      const date = m.data?.substring(0, 10) ?? ''
      const text = m.descricao.substring(0, 120)
      return `[${date}] ${text}`
    })
    .join('\n') ?? null

  // Author / defendant
  const autores = parties?.filter(p =>
    p.lado === 'autor' || p.lado === 'ativo'
  ) ?? []
  const reus = parties?.filter(p =>
    p.lado === 'réu' || p.lado === 'passivo'
  ) ?? []

  // Map grau to instance number
  const grau = src.grau?.toUpperCase()
  let instancia: number | null = null
  if (grau === 'G1' || grau === 'JE') instancia = 1
  else if (grau === 'G2' || grau === 'TRIB') instancia = 2
  else if (grau === 'G3' || grau === 'SUP') instancia = 3

  // Map assuntos
  const assuntosJson = src.assuntos?.map(a => ({
    codigo: a.codigo?.toString() ?? '',
    nome: a.nome ?? '',
  })) ?? null

  return {
    cnj: src.numeroProcesso ?? cnj.replace(/\D/g, ''),
    tribunal: tribunalSigla ?? null,
    area: area ?? null,
    classe: src.classe?.nome ?? null,
    assunto_principal: src.assuntos?.[0]?.nome ?? null,
    juiz: null, // DataJud does not expose judge name
    valor_causa: src.valorCausa?.valor ?? null,
    data_distribuicao: src.dataAjuizamento?.substring(0, 10) ?? null,
    status: null, // DataJud does not carry status
    nome_caso: null, // DataJud does not carry case name

    foro: null,
    tipo: null,
    natureza: area ?? null,
    justica: null,
    instancia,
    ente: null,
    orgao: src.orgaoJulgador?.nome ?? null,
    ultimo_andamento: movements?.[0]?.descricao?.substring(0, 500) ?? null,
    ultimo_step_date: movements?.[0]?.data ?? null,
    justice_code: null,
    tribunal_code: null,
    instance_code: instancia ? String(instancia) : null,
    sigilo: src.nivelSigilo ?? 0,
    assuntos_json: assuntosJson,
    classificacao: src.classe?.nome ?? null,
    vara: src.orgaoJulgador?.nome ?? null,
    link_tribunal: null,
    ultimas_5_mov: last5,
    autor_principal: autores[0]?.nome ?? null,
    reu_principal: reus[0]?.nome ?? null,
    estado: null,
    cidade: null,
    fase: null,

    partes_json: parties ?? null,

    movimentos: movements?.map(m => ({
      data: m.data,
      descricao: m.descricao,
      tipo: m.tipo,
      codigo: m.codigo,
    })) ?? null,

    provider: 'datajud',
    request_id: null,
    provider_raw: { _source: src, _index: indexAlias },
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function extractSiglaFromIndex(index: string): string | null {
  if (!index) return null
  const parts = index.split('_')
  const suffix = parts[parts.length - 1]
  return suffix ? suffix.toUpperCase() : null
}

function mapTipoParte(nome?: string): string {
  if (!nome) return 'desconhecido'
  const n = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  if (n.includes('autor') || n.includes('requerente') || n.includes('exequente') || n.includes('impetrante')) return 'autor'
  if (n.includes('reu') || n.includes('requerido') || n.includes('executado') || n.includes('impetrado')) return 'réu'
  if (n.includes('interessad') || n.includes('terceiro')) return 'interessado'
  if (n.includes('ativo') || n.includes('polo ativo')) return 'ativo'
  if (n.includes('passivo') || n.includes('polo passivo')) return 'passivo'
  return 'desconhecido'
}

function mapArea(subject?: string): string | null {
  if (!subject) return null
  const n = subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  if (n.includes('civel') || n.includes('civil') || n.includes('obrigacao') || n.includes('contrato')) return 'civel'
  if (n.includes('criminal') || n.includes('penal') || n.includes('crime')) return 'criminal'
  if (n.includes('trabalh') || n.includes('clt')) return 'trabalhista'
  if (n.includes('tribut') || n.includes('fiscal')) return 'tributario'
  if (n.includes('administrat')) return 'administrativo'
  if (n.includes('consumidor') || n.includes('cdc')) return 'consumidor'
  if (n.includes('previdenci') || n.includes('inss')) return 'previdenciario'
  return null
}
