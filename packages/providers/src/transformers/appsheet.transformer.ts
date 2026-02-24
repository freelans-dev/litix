import type { ProcessoUnificado } from '../models/processo-unificado.js';
import type { Parte } from '../models/parte.js';
import { getTribunalSiglaFromCnj } from '../utils/tribunal-map.js';
import { getTribunalLink } from '../utils/tribunal-links.js';
import { calculateCompleteness } from '../services/merge.service.js';

/**
 * Flat JSON structure for AppSheet / Google Sheets.
 * All values are primitives — no nested objects.
 *
 * Groups:
 *   1. Gestão       — manual fields, always empty from API (13)
 *   2. Processo     — API-filled process fields (21)
 *   3. Tracking     — system-filled tracking fields (5)
 *   4. Internacional — English/international fields (8)
 *   5. Meta         — diagnostic extras (5)
 *   6. Partes       — flat party grid 1–10 (40)
 *
 * Total: 92 fields
 */
export interface AppSheetProcesso {
  // ── 1. Gestão (manual — always empty from API) ──
  id: string;
  cliente: string;
  contingencia: string;
  probabilidade: string;
  faixa: string;
  risco: string;
  resultado: string;
  desfecho: string;
  responsavel: string;
  setor: string;
  relacionamento: string;
  provisionamento: string;
  reserva: string;

  // ── 2. Processo (API-filled) ──
  numero: string;           // CNJ number
  distribuicao: string;     // Filing date (current/highest instance)
  distribuicao_origem: string; // Original filing date (1st instance, multi-degree cases)
  autor: string;            // Active parties (joined)
  reu: string;              // Passive parties (joined)
  caso: string;             // Case summary (class + main subject)
  foro: string;             // Court jurisdiction
  tipo: string;             // Legal area (PT)
  natureza: string;         // Legal nature (PT)
  classe: string;           // Formal class name (current/highest instance)
  classe_origem: string;    // Original procedural class (1st instance, multi-degree cases)
  valor: number | null;     // Claim value
  status: string;           // Process status
  justica: string;          // Justice branch (PT)
  instancia: number | null; // Court degree
  ente: string;             // Government entity (if applicable)
  orgao: string;            // Judging body / court room
  atualizacao: string;      // Last update datetime
  andamento: string;        // Latest movement description
  monitoramento: string;    // Monitoring flag (manual)
  cadastro: string;         // Registration date (manual)

  // ── 3. Tracking (system-filled) ──
  timestamp: string;        // Data fetch timestamp
  tracking: string;         // Internal tracking ID
  request: string;          // Provider request ID
  step: string;             // Current step (latest movement type)
  steps: number;            // Total movement count

  // ── 4. Internacional (English fields) ──
  justice: string;          // Justice branch (EN)
  tribunal_en: string;      // Tribunal acronym
  instance_en: string;      // Degree as string
  acronym: string;          // Tribunal acronym (same as tribunal_en)
  secrecy: string;          // Secrecy level (0–5)
  subjects: string;         // All subjects (joined)
  classification: string;   // Process class name (EN/formal)
  court: string;            // Court room / judging body

  // ── 5. Meta (diagnostic extras) ──
  link_tribunal: string;
  ultimas_5_movimentacoes: string;
  dias_sem_movimentacao: number | null;
  completeness_score: number | null;
  merged: boolean;

  // ── 6. Partes flat grid (1–10) ──
  parte_1: string;    posicao_1: string;  documento_1: string;  advogado_1: string;
  parte_2: string;    posicao_2: string;  documento_2: string;  advogado_2: string;
  parte_3: string;    posicao_3: string;  documento_3: string;  advogado_3: string;
  parte_4: string;    posicao_4: string;  documento_4: string;  advogado_4: string;
  parte_5: string;    posicao_5: string;  documento_5: string;  advogado_5: string;
  parte_6: string;    posicao_6: string;  documento_6: string;  advogado_6: string;
  parte_7: string;    posicao_7: string;  documento_7: string;  advogado_7: string;
  parte_8: string;    posicao_8: string;  documento_8: string;  advogado_8: string;
  parte_9: string;    posicao_9: string;  documento_9: string;  advogado_9: string;
  parte_10: string;   posicao_10: string; documento_10: string; advogado_10: string;
}

export function transformToAppSheet(processo: ProcessoUnificado): AppSheetProcesso {
  const allPartes = processo.partes ?? [];
  const poloAtivo = allPartes.filter((p) => ['autor', 'requerente', 'ativo'].includes(p.lado));
  const poloPassivo = allPartes.filter((p) => ['reu', 'requerido', 'passivo'].includes(p.lado));

  const movs = (processo.movimentacoes ?? [])
    .slice()
    .sort((a, b) => b.data.getTime() - a.data.getTime());

  const ultimasMov = movs
    .slice(0, 5)
    .map((m) => `[${formatDate(m.data)}] ${m.descricao}`);

  const assuntoPrincipal = processo.assuntos?.find((a) => a.principal)?.descricao
    ?? processo.assuntos?.[0]?.descricao
    ?? '';

  const tribunalSigla = processo.tribunal?.sigla || getTribunalSiglaFromCnj(processo.cnj);
  const linkTribunal = getTribunalLink(tribunalSigla, processo.cnj);

  const diasSemMov = movs[0]
    ? Math.floor((Date.now() - movs[0].data.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Partição para a grade flat de partes (todos os tipos, máximo 10)
  const parteSlots = buildParteSlots(allPartes, 10);

  return {
    // ── 1. Gestão (empty — filled manually in AppSheet) ──
    id: '',
    cliente: '',
    contingencia: '',
    probabilidade: '',
    faixa: '',
    risco: '',
    resultado: '',
    desfecho: '',
    responsavel: '',
    setor: '',
    relacionamento: '',
    provisionamento: '',
    reserva: '',

    // ── 2. Processo ──
    numero: processo.cnj,
    distribuicao: processo.dataDistribuicao ? formatDate(processo.dataDistribuicao) : '',
    distribuicao_origem: processo.dataDistribuicaoOrigem ? formatDate(processo.dataDistribuicaoOrigem) : '',
    autor: poloAtivo.map((p) => p.nome).join('; '),
    reu: poloPassivo.map((p) => p.nome).join('; '),
    caso: buildCaso(processo.nome, assuntoPrincipal),
    foro: processo.tribunal?.comarca ?? processo.tribunal?.nome ?? '',
    tipo: processo.area ?? '',
    natureza: processo.area ?? '',
    classe: processo.nome ?? '',
    classe_origem: processo.classeOrigem ?? '',
    valor: processo.valor ?? null,
    status: processo.situacao ?? '',
    justica: mapJustica(processo.cnj),
    instancia: processo.instancia ?? null,
    ente: detectEnte(allPartes),
    orgao: processo.tribunal?.vara ?? '',
    atualizacao: processo.ultimaAtualizacao
      ? formatDateTime(processo.ultimaAtualizacao)
      : movs[0]?.data
        ? formatDateTime(movs[0].data)
        : '',
    andamento: movs[0]?.descricao ?? '',
    monitoramento: '',
    cadastro: '',

    // ── 3. Tracking ──
    timestamp: formatDateTime(processo.origem.fetchedAt),
    tracking: '',
    request: processo.origem.requestId,
    step: movs[0]?.tipo ?? movs[0]?.descricao?.slice(0, 80) ?? '',
    steps: movs.length,

    // ── 4. Internacional ──
    justice: mapJusticeEn(processo.cnj),
    tribunal_en: tribunalSigla,
    instance_en: processo.instancia?.toString() ?? '',
    acronym: tribunalSigla,
    secrecy: processo.nivelSigilo?.toString() ?? '0',
    subjects: (processo.assuntos ?? []).map((a) => a.descricao).join(' | '),
    classification: processo.nome ?? '',
    court: processo.tribunal?.vara ?? '',

    // ── 5. Meta ──
    link_tribunal: linkTribunal,
    ultimas_5_movimentacoes: ultimasMov.join(' | '),
    dias_sem_movimentacao: diasSemMov,
    completeness_score: processo.completenessScore ?? calculateCompleteness(processo),
    merged: !!processo.mergedFrom && processo.mergedFrom.length > 1,

    // ── 6. Partes flat ──
    ...parteSlots,
  };
}

// ── Helpers ──

function buildCaso(nome?: string, assuntoPrincipal?: string): string {
  if (!nome && !assuntoPrincipal) return '';
  if (!assuntoPrincipal) return nome ?? '';
  if (!nome) return assuntoPrincipal;
  return `${nome} — ${assuntoPrincipal}`;
}

function detectEnte(partes: Parte[]): string {
  const keywords = ['estado', 'municipio', 'prefeitura', 'uniao federal', 'fazenda publica', 'ministerio', 'autarquia', 'inss', 'governo'];
  const gov = partes.find((p) => {
    const n = p.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return keywords.some((k) => n.includes(k));
  });
  return gov?.nome ?? '';
}

function mapJustica(cnj: string): string {
  const digits = cnj.replace(/\D/g, '');
  if (digits.length !== 20) return '';
  switch (digits[13]) {
    case '1': return 'STF';
    case '2': return 'CNJ';
    case '3': return 'STJ';
    case '4': return 'Federal';
    case '5': return 'Trabalhista';
    case '6': return 'Eleitoral';
    case '7': return 'Militar';
    case '8': return 'Estadual';
    case '9': return 'Militar Estadual';
    default: return '';
  }
}

function mapJusticeEn(cnj: string): string {
  const digits = cnj.replace(/\D/g, '');
  if (digits.length !== 20) return '';
  switch (digits[13]) {
    case '1': return 'Federal Supreme Court (STF)';
    case '2': return 'National Justice Council';
    case '3': return 'Superior Court of Justice (STJ)';
    case '4': return 'Federal Justice';
    case '5': return 'Labour Justice';
    case '6': return 'Electoral Justice';
    case '7': return 'Military Justice';
    case '8': return 'State Justice';
    case '9': return 'State Military Justice';
    default: return '';
  }
}

type ParteSlots = Pick<AppSheetProcesso,
  | 'parte_1' | 'posicao_1' | 'documento_1' | 'advogado_1'
  | 'parte_2' | 'posicao_2' | 'documento_2' | 'advogado_2'
  | 'parte_3' | 'posicao_3' | 'documento_3' | 'advogado_3'
  | 'parte_4' | 'posicao_4' | 'documento_4' | 'advogado_4'
  | 'parte_5' | 'posicao_5' | 'documento_5' | 'advogado_5'
  | 'parte_6' | 'posicao_6' | 'documento_6' | 'advogado_6'
  | 'parte_7' | 'posicao_7' | 'documento_7' | 'advogado_7'
  | 'parte_8' | 'posicao_8' | 'documento_8' | 'advogado_8'
  | 'parte_9' | 'posicao_9' | 'documento_9' | 'advogado_9'
  | 'parte_10' | 'posicao_10' | 'documento_10' | 'advogado_10'
>;

function buildParteSlots(partes: Parte[], max: number): ParteSlots {
  const slots: ParteSlots = {} as ParteSlots;
  for (let i = 1; i <= max; i++) {
    const p = partes[i - 1];
    const n = i as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
    (slots as Record<string, string>)[`parte_${n}`] = p?.nome ?? '';
    (slots as Record<string, string>)[`posicao_${n}`] = p?.lado ?? '';
    (slots as Record<string, string>)[`documento_${n}`] = p?.documento ?? '';
    (slots as Record<string, string>)[`advogado_${n}`] = p?.advogados?.[0]?.nome ?? '';
  }
  return slots;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateTime(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
