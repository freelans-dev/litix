import type { ProcessoUnificado, Tribunal, Assunto } from '../../models/processo-unificado.js';
import type { Parte, Advogado } from '../../models/parte.js';
import type { Movimentacao } from '../../models/movimentacao.js';
import type { Anexo } from '../../models/anexo.js';
import type { AreaJuridica, StatusProcesso, FaseProcesso, NivelSigilo, TipoParte } from '../../models/enums.js';
import type { JuditLawsuitData, JuditParty, JuditStep, JuditAttachment, JuditWebhookPayload } from './judit.types.js';

export function mapJuditToUnificado(rd: JuditLawsuitData, requestId: string): ProcessoUnificado {
  return {
    cnj: rd.code ?? '',
    area: mapArea(rd.area),
    nome: rd.name,
    dataDistribuicao: rd.distribution_date ? new Date(rd.distribution_date) : undefined,
    instancia: rd.instance ?? undefined,
    tribunal: buildTribunal(rd),
    assuntos: rd.subjects?.map(mapAssunto),
    juiz: rd.judge,
    situacao: mapStatus(rd.status),
    fase: mapFase(rd.phase),
    nivelSigilo: mapSigilo(rd.secrecy_level),
    valor: rd.amount,
    partes: rd.parties?.map(mapParty),
    movimentacoes: rd.steps?.map(mapStep),
    anexos: rd.attachments?.map(mapAttachment),
    origem: {
      provider: 'judit',
      requestId,
      fetchedAt: new Date(),
    },
  };
}

export function mapJuditWebhookToUnificado(payload: JuditWebhookPayload): ProcessoUnificado | null {
  if (!('code' in payload.payload)) return null;
  return mapJuditToUnificado(payload.payload as JuditLawsuitData, payload.reference_id);
}

function buildTribunal(rd: JuditLawsuitData): Tribunal | undefined {
  if (!rd.tribunal_acronym) return undefined;
  return {
    sigla: rd.tribunal_acronym,
    nome: rd.justice_description,
    instancia: rd.instance,
    comarca: rd.county ?? rd.city,
  };
}

function mapAssunto(s: { code?: string; name?: string; description?: string; main?: boolean }): Assunto {
  return {
    codigo: s.code,
    descricao: s.name ?? s.description ?? '',
    principal: s.main ?? false,
  };
}

function mapParty(p: JuditParty): Parte {
  return {
    nome: p.name,
    documento: p.main_document,
    tipoDocumento: p.main_document
      ? p.main_document.length <= 14 ? 'cpf' : 'cnpj'
      : undefined,
    lado: mapLado(p.side),
    advogados: p.lawyers?.map(mapAdvogado),
  };
}

function mapAdvogado(l: { name: string; oab?: string }): Advogado {
  const oabMatch = l.oab?.match(/OAB\/(\w{2})\s*(\d+)/i);
  return {
    nome: l.name,
    oab: l.oab,
    uf: oabMatch?.[1],
  };
}

function mapStep(s: JuditStep): Movimentacao {
  return {
    data: new Date(s.step_date),
    tipo: s.step_type,
    descricao: s.content ?? '',
    codigo: s.step_id,
  };
}

function mapAttachment(a: JuditAttachment): Anexo {
  return {
    movimentacaoId: a.step_id,
    data: new Date(a.attachment_date),
    nome: a.attachment_name,
    extensao: a.extension,
  };
}

function mapLado(side?: string): TipoParte {
  if (!side) return 'desconhecido';
  const normalized = side.toUpperCase();
  const mapping: Record<string, TipoParte> = {
    ACTIVE: 'autor',
    PASSIVE: 'reu',
    INTERESTED: 'interessado',
    UNKNOWN: 'desconhecido',
    AUTOR: 'autor',
    RÉU: 'reu',
    REU: 'reu',
    REQUERENTE: 'requerente',
    REQUERIDO: 'requerido',
    ADVOGADO: 'advogado',
  };
  return mapping[normalized] ?? 'desconhecido';
}

function mapArea(area?: string): AreaJuridica | undefined {
  if (!area) return undefined;
  const normalized = area.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('CIVEL') || normalized.includes('CIVIL')) return 'civel';
  if (normalized.includes('CRIMINAL') || normalized.includes('PENAL')) return 'criminal';
  if (normalized.includes('TRABALH')) return 'trabalhista';
  if (normalized.includes('TRIBUT')) return 'tributario';
  if (normalized.includes('ADMINISTRAT')) return 'administrativo';
  if (normalized.includes('AMBIENTAL')) return 'ambiental';
  if (normalized.includes('CONSUMIDOR')) return 'consumidor';
  if (normalized.includes('ELEITORAL')) return 'eleitoral';
  if (normalized.includes('MILITAR')) return 'militar';
  if (normalized.includes('PREVIDENCI')) return 'previdenciario';
  return 'outro';
}

function mapStatus(status?: string): StatusProcesso | undefined {
  if (!status) return undefined;
  const normalized = status.toUpperCase();
  if (normalized === 'ATIVO') return 'ativo';
  if (normalized === 'FINALIZADO') return 'finalizado';
  if (normalized.includes('ARQUIV')) return 'arquivado';
  if (normalized.includes('SUSPEN')) return 'suspenso';
  if (normalized.includes('SOBREST')) return 'sobrestado';
  if (normalized.includes('CANCEL')) return 'cancelado';
  return 'ativo';
}

function mapFase(phase?: string): FaseProcesso | undefined {
  if (!phase) return undefined;
  const normalized = phase.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('INICIAL')) return 'inicial';
  if (normalized.includes('SENTENCA')) return 'sentenca';
  if (normalized.includes('EXECUCAO')) return 'execucao';
  if (normalized.includes('RECURSO')) return 'recurso';
  if (normalized.includes('ARQUIV')) return 'arquivado';
  return 'outro';
}

function mapSigilo(level?: number): NivelSigilo | undefined {
  if (level === undefined || level === null) return undefined;
  if (level >= 0 && level <= 5) return level as NivelSigilo;
  return undefined;
}
