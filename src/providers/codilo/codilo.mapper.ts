import type { ProcessoUnificado, Tribunal, Assunto } from '../../models/processo-unificado.js';
import type { Parte, Advogado } from '../../models/parte.js';
import type { Movimentacao } from '../../models/movimentacao.js';
import type { AreaJuridica, StatusProcesso, TipoParte } from '../../models/enums.js';
import type { CodiloProcessResult, CodiloCoverItem, CodiloPerson, CodiloStep, CodiloWebhookPayload } from './codilo.types.js';

export function mapCodiloToUnificado(result: CodiloProcessResult, requestId: string): ProcessoUnificado {
  const { properties, people, steps } = result;
  const cover = parseCover(result.cover);

  const cnj = properties.cnj ?? properties.number ?? cover['Número Processo'] ?? '';

  return {
    cnj,
    area: mapArea(properties.subject ?? cover['Assunto']),
    nome: properties.class ?? cover['Classe Judicial'],
    dataDistribuicao: parseDate(properties.startAt ?? cover['Data da Distribuição']),
    instancia: properties.degree ? parseInt(properties.degree, 10) || undefined : undefined,
    tribunal: buildTribunal(cover, properties),
    assuntos: buildAssuntos(properties.subject ?? cover['Assunto']),
    juiz: cover['Juiz'] ?? cover['Órgão Julgador'],
    situacao: mapStatus(properties.status),
    valor: parseValor(properties.actionValue),
    partes: people?.map(mapPerson),
    movimentacoes: steps?.map(mapStep),
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
  return {
    data: new Date(step.timestamp),
    descricao: step.title || step.description,
    conteudo: step.description !== step.title ? step.description : undefined,
  };
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
  const normalized = status.toUpperCase();
  if (normalized.includes('ATIV') || normalized === 'EM ANDAMENTO') return 'ativo';
  if (normalized.includes('FINALIZ') || normalized.includes('TRANSIT') || normalized.includes('ENCERR')) return 'finalizado';
  if (normalized.includes('ARQUIV') || normalized.includes('BAIXA')) return 'arquivado';
  if (normalized.includes('SUSPEN')) return 'suspenso';
  if (normalized.includes('SOBREST')) return 'sobrestado';
  if (normalized.includes('CANCEL') || normalized.includes('EXTINT')) return 'cancelado';
  return 'ativo';
}

function parseValor(value?: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}

function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  const brMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`);
  return undefined;
}
