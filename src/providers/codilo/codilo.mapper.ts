import type { ProcessoUnificado, Tribunal, Assunto } from '../../models/processo-unificado.js';
import type { Parte, Advogado } from '../../models/parte.js';
import type { Movimentacao } from '../../models/movimentacao.js';
import type { AreaJuridica, StatusProcesso, TipoParte } from '../../models/enums.js';
import type { CodiloProcessResult, CodiloCoverItem, CodiloPerson, CodiloStep, CodiloWebhookPayload } from './codilo.types.js';

export function mapCodiloToUnificado(result: CodiloProcessResult, requestId: string): ProcessoUnificado {
  const { properties, people, steps } = result;
  const cover = parseCover(result.cover);

  const cnj = properties.cnj ?? properties.number ?? cover['Número Processo'] ?? '';

  // Sort steps chronologically descending (most recent first) for inference
  const stepsSorted = steps
    ? [...steps].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  return {
    cnj,
    area: mapArea(properties.subject ?? cover['Assunto']),
    nome: stripClassCode(properties.class ?? cover['Classe Judicial']),
    dataDistribuicao: parseDate(properties.startAt ?? cover['Data da Distribuição']),
    instancia: properties.degree ? parseInt(properties.degree, 10) || undefined : undefined,
    tribunal: buildTribunal(cover, properties),
    assuntos: buildAssuntos(properties.subject ?? cover['Assunto']),
    // Juiz = magistrado (pessoa). Órgão Julgador (vara) vai em tribunal.vara — não misturar.
    juiz: cover['Juiz'] ?? undefined,
    situacao: mapStatus(
      properties.status ??
      cover['Situação'] ??
      cover['Situacao'] ??
      cover['Status do Processo'] ??
      inferStatusFromSteps(stepsSorted),
    ),
    fase: mapFase(
      cover['Fase'] ??
      cover['Fase Processual'] ??
      inferFaseFromSteps(stepsSorted),
    ),
    valor: parseValor(
      properties.actionValue ??
      cover['Valor da Ação'] ??
      cover['Valor da Causa'] ??
      cover['Valor'],
    ),
    partes: people?.map(mapPerson),
    movimentacoes: steps?.map(mapStep),
    ultimaAtualizacao: stepsSorted[0] ? new Date(stepsSorted[0].timestamp) : undefined,
    origem: {
      provider: 'codilo',
      requestId,
      fetchedAt: new Date(),
    },
  };
}

export function mapCodiloWebhookToUnificado(payload: CodiloWebhookPayload): ProcessoUnificado | null {
  if (!payload.data || payload.data.length === 0) return null;
  return mapCodiloToUnificado(payload.data[0]!, payload.requestId);
}

/**
 * Converts cover array [{description, value}] into a keyed map.
 */
function parseCover(cover: CodiloCoverItem[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of cover) {
    map[item.description] = item.value;
  }
  return map;
}

function buildTribunal(
  cover: Record<string, string>,
  properties: CodiloProcessResult['properties'],
): Tribunal | undefined {
  const jurisdiction = properties.jurisdiction ?? cover['Jurisdição'];
  const origin = properties.origin ?? cover['Órgão Julgador'];
  if (!jurisdiction && !origin) return undefined;

  return {
    sigla: '', // Will be enriched from CNJ or info metadata
    nome: jurisdiction,
    instancia: properties.degree ? parseInt(properties.degree, 10) || undefined : undefined,
    comarca: jurisdiction,
    vara: origin,
  };
}

function buildAssuntos(subject?: string): Assunto[] | undefined {
  if (!subject) return undefined;
  // Subject may contain hierarchy like "DIREITO TRIBUTÁRIO (14) - Impostos (5916) - ..."
  const parts = subject.split(' - ').map((s) => s.trim());
  return parts.map((desc, i) => ({
    descricao: desc,
    principal: i === 0,
  }));
}

function mapPerson(person: CodiloPerson): Parte {
  return {
    nome: person.name,
    documento: person.doc,
    tipoDocumento: person.doc
      ? person.doc.replace(/\D/g, '').length <= 11 ? 'cpf' : 'cnpj'
      : undefined,
    lado: mapPole(person.pole, person.description),
    advogados: person.lawyers?.map(mapLawyer),
  };
}

function mapLawyer(lawyer: { name: string; uf?: string; oab?: string }): Advogado {
  return {
    nome: lawyer.name,
    oab: lawyer.oab ? `OAB/${lawyer.uf ?? '??'} ${lawyer.oab}` : undefined,
    uf: lawyer.uf,
  };
}

function mapStep(step: CodiloStep): Movimentacao {
  const descricao = step.title || step.description;
  const conteudo = step.description && step.description !== step.title && step.description !== ''
    ? step.description
    : undefined;
  return {
    data: new Date(step.timestamp),
    tipo: extractTipoFromTitle(step.title),
    descricao,
    conteudo,
  };
}

/**
 * Extracts type from step title pattern "- TypeName (TypeName)".
 * E.g.: "- Sentença (Sentença)" → "Sentença"
 *       "- Despacho (Despacho)" → "Despacho"
 *       "Distribuído por sorteio" → undefined
 */
function extractTipoFromTitle(title: string): string | undefined {
  if (!title) return undefined;
  const match = title.match(/\(([^)]+)\)\s*$/);
  return match ? match[1]!.trim() : undefined;
}

function mapPole(pole?: string, description?: string): TipoParte {
  const text = (pole ?? description ?? '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (text.includes('ACTIVE') || text.includes('ATIVO') || text.includes('EXEQUENTE') || text.includes('AUTOR') || text.includes('REQUERENTE') || text.includes('IMPETRANTE')) return 'autor';
  if (text.includes('PASSIVE') || text.includes('PASSIVO') || text.includes('EXECUTADO') || text.includes('REU') || text.includes('REQUERIDO') || text.includes('IMPETRADO')) return 'reu';
  if (text.includes('ADVOGAD')) return 'advogado';
  if (text.includes('INTERESSAD') || text.includes('TERCEIRO')) return 'interessado';
  return 'desconhecido';
}

function mapArea(subject?: string): AreaJuridica | undefined {
  if (!subject) return undefined;
  const normalized = subject.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('CIVEL') || normalized.includes('CIVIL') || normalized.includes('OBRIGACAO') || normalized.includes('CONTRATO')) return 'civel';
  if (normalized.includes('CRIMINAL') || normalized.includes('PENAL') || normalized.includes('CRIME')) return 'criminal';
  if (normalized.includes('TRABALH') || normalized.includes('CLT')) return 'trabalhista';
  if (normalized.includes('TRIBUT') || normalized.includes('FISCAL')) return 'tributario';
  if (normalized.includes('ADMINISTRAT')) return 'administrativo';
  if (normalized.includes('AMBIENTAL')) return 'ambiental';
  if (normalized.includes('CONSUMIDOR') || normalized.includes('CDC')) return 'consumidor';
  if (normalized.includes('ELEITORAL')) return 'eleitoral';
  if (normalized.includes('MILITAR')) return 'militar';
  if (normalized.includes('PREVIDENCI') || normalized.includes('INSS')) return 'previdenciario';
  return 'outro';
}

function mapStatus(status?: string): StatusProcesso | undefined {
  if (!status) return undefined;
  const n = normalizeText(status);
  if (n.includes('ativo') || n.includes('andamento') || n.includes('em tramitacao')) return 'ativo';
  if (n.includes('finaliz') || n.includes('encerr') || n.includes('extint') || n.includes('julgado')) return 'finalizado';
  if (n.includes('transit') && n.includes('julgado')) return 'finalizado';
  if (n.includes('arquiv') || n.includes('baixad')) return 'arquivado';
  if (n.includes('suspen')) return 'suspenso';
  if (n.includes('sobrest')) return 'sobrestado';
  if (n.includes('cancel')) return 'cancelado';
  return 'ativo';
}

function mapFase(fase?: string): import('../../models/enums.js').FaseProcesso | undefined {
  if (!fase) return undefined;
  const n = normalizeText(fase);
  if (n.includes('sentenca') || n.includes('transito')) return 'sentenca';
  if (n.includes('recurso') || n.includes('apelac') || n.includes('agravo') || n.includes('embargos')) return 'recurso';
  if (n.includes('execuc') || n.includes('cumprimento') || n.includes('penhora') || n.includes('leilao')) return 'execucao';
  if (n.includes('arquiv') || n.includes('baixado')) return 'arquivado';
  if (n.includes('cit') || n.includes('contest') || n.includes('instruc') || n.includes('audienc') || n.includes('inicial')) return 'inicial';
  return 'outro';
}

/**
 * Infers process status from the most recent steps.
 * Checks last 5 steps for termination/suspension keywords.
 */
function inferStatusFromSteps(sortedSteps: CodiloStep[]): string | undefined {
  // Check last 15 steps — termination events often preceded by notification steps
  const recent = sortedSteps.slice(0, 15);
  for (const step of recent) {
    const text = normalizeText(`${step.title} ${step.description}`);
    if (text.includes('extint') || text.includes('transit') || text.includes('sentenca prolatada') || text.includes('julgado procedente') || text.includes('julgado improcedente')) return 'FINALIZADO';
    if (text.includes('arquiv') || text.includes('baixado')) return 'ARQUIVADO';
    if (text.includes('suspen')) return 'SUSPENSO';
    if (text.includes('sobrest')) return 'SOBRESTADO';
    if (text.includes('cancel')) return 'CANCELADO';
  }
  return undefined;
}

/**
 * Infers current process phase from the most recent steps.
 */
function inferFaseFromSteps(sortedSteps: CodiloStep[]): string | undefined {
  const recent = sortedSteps.slice(0, 10);
  for (const step of recent) {
    const text = normalizeText(`${step.title} ${step.description}`);
    if (text.includes('sentenca') || text.includes('transito em julgado')) return 'SENTENCA';
    if (text.includes('recurso') || text.includes('apelac') || text.includes('agravo')) return 'RECURSO';
    if (text.includes('execuc') || text.includes('cumprimento') || text.includes('extint') || text.includes('penhora') || text.includes('leilao')) return 'EXECUCAO';
    if (text.includes('audiencia') || text.includes('instrucao') || text.includes('contest') || text.includes('citac')) return 'INICIAL';
  }
  return undefined;
}

/**
 * Strips TPU code from class name: "EXECUÇÃO FISCAL (1116)" → "EXECUÇÃO FISCAL"
 */
function stripClassCode(name?: string): string | undefined {
  if (!name) return undefined;
  return name.replace(/\s*\(\d+\)\s*$/, '').trim() || undefined;
}

function parseValor(value?: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  const brMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`);
  return undefined;
}
