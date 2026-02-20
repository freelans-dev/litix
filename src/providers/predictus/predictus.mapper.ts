import type { ProcessoUnificado, Tribunal, Assunto } from '../../models/processo-unificado.js';
import type { Parte, Advogado } from '../../models/parte.js';
import type { Movimentacao } from '../../models/movimentacao.js';
import type { AreaJuridica, StatusProcesso, NivelSigilo, TipoParte } from '../../models/enums.js';
import type { PredictusProcesso, PredictusParte, PredictusMovimento, PredictusAdvogado } from './predictus.types.js';

export function mapPredictusToUnificado(
  processo: PredictusProcesso,
  requestId: string,
): ProcessoUnificado {
  // Convert 20-digit NPU back to CNJ format: NNNNNNN-DD.AAAA.J.TR.OOOO
  const cnj = formatCnj(processo.numeroProcessoUnico);

  return {
    cnj,
    area: mapArea(processo.area),
    nome: processo.classeProcessual?.nome,
    dataDistribuicao: processo.dataDistribuicao ? new Date(processo.dataDistribuicao) : undefined,
    instancia: processo.grauProcesso || undefined,
    tribunal: buildTribunal(processo),
    assuntos: processo.assuntosCNJ?.map(mapAssunto),
    juiz: processo.juiz || processo.relator || undefined,
    situacao: mapStatus(processo.statusPredictus?.statusProcesso),
    nivelSigilo: processo.eSegredoJustica ? 1 as NivelSigilo : undefined,
    valor: processo.valorCausa?.valor ?? undefined,
    partes: processo.partes?.map(mapParte),
    movimentacoes: processo.movimentos?.map(mapMovimento),
    origem: {
      provider: 'predictus',
      requestId,
      fetchedAt: new Date(),
    },
  };
}

function formatCnj(npu: string): string {
  const d = npu.replace(/\D/g, '');
  if (d.length !== 20) return npu;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d[13]}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

function buildTribunal(processo: PredictusProcesso): Tribunal | undefined {
  if (!processo.tribunal) return undefined;
  return {
    sigla: processo.tribunal,
    instancia: processo.grauProcesso || undefined,
    comarca: processo.unidadeOrigem || undefined,
    vara: processo.orgaoJulgador || undefined,
  };
}

function mapAssunto(a: { titulo: string; codigoCNJ: number; ePrincipal: boolean }): Assunto {
  return {
    codigo: String(a.codigoCNJ),
    descricao: a.titulo,
    principal: a.ePrincipal,
  };
}

function mapParte(p: PredictusParte): Parte {
  return {
    nome: p.nome,
    documento: p.cpf ?? p.cnpj ?? undefined,
    tipoDocumento: p.cpf ? 'cpf' : p.cnpj ? 'cnpj' : undefined,
    lado: mapPolo(p.polo),
    advogados: p.advogados?.map(mapAdvogado),
  };
}

function mapAdvogado(a: PredictusAdvogado): Advogado {
  return {
    nome: a.nome,
    oab: a.oab ? `OAB/${a.oab.uf} ${a.oab.numero}` : undefined,
    uf: a.oab?.uf,
  };
}

function mapMovimento(m: PredictusMovimento): Movimentacao {
  return {
    data: new Date(m.data),
    tipo: m.classificacaoCNJ || undefined,
    descricao: m.descricao || m.nomeOriginal,
    codigo: String(m.indice),
  };
}

function mapPolo(polo: string): TipoParte {
  switch (polo) {
    case 'ATIVO': return 'autor';
    case 'PASSIVO': return 'reu';
    default: return 'desconhecido';
  }
}

function mapArea(area?: string): AreaJuridica | undefined {
  if (!area) return undefined;
  const normalized = area.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('CIVEL') || normalized.includes('CIVIL')) return 'civel';
  if (normalized.includes('CRIMINAL') || normalized.includes('PENAL')) return 'criminal';
  if (normalized.includes('TRABALH')) return 'trabalhista';
  if (normalized.includes('TRIBUT') || normalized.includes('FISCAL')) return 'tributario';
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
  if (normalized.includes('ATIV') || normalized === 'EM ANDAMENTO') return 'ativo';
  if (normalized.includes('FINALIZ') || normalized.includes('TRANSIT') || normalized.includes('ENCERR')) return 'finalizado';
  if (normalized.includes('ARQUIV') || normalized.includes('BAIXA')) return 'arquivado';
  if (normalized.includes('SUSPEN')) return 'suspenso';
  if (normalized.includes('SOBREST')) return 'sobrestado';
  if (normalized.includes('CANCEL') || normalized.includes('EXTINT')) return 'cancelado';
  return 'ativo';
}
