import type { ProcessoUnificado, Tribunal, Assunto } from '../../models/processo-unificado.js';
import type { Parte, Advogado } from '../../models/parte.js';
import type { Movimentacao } from '../../models/movimentacao.js';
import type { AreaJuridica, StatusProcesso, TipoParte } from '../../models/enums.js';
import type {
  EscavadorProcesso,
  EscavadorFonte,
  EscavadorEnvolvido,
  EscavadorMovimentacao,
} from './escavador.types.js';

export function mapEscavadorToUnificado(
  processo: EscavadorProcesso,
  movimentacoes: EscavadorMovimentacao[],
  requestId: string,
): ProcessoUnificado {
  // Use the first tribunal fonte (highest data quality)
  const fonteTribunal = processo.fontes.find((f) => f.tipo === 'TRIBUNAL') ?? processo.fontes[0];
  const capa = fonteTribunal?.capa;

  return {
    cnj: processo.numero_cnj,
    area: mapArea(capa?.area),
    nome: capa?.classe ?? undefined,
    dataDistribuicao: capa?.data_distribuicao ? new Date(capa.data_distribuicao) : processo.data_inicio ? new Date(processo.data_inicio) : undefined,
    instancia: fonteTribunal?.grau ?? undefined,
    tribunal: buildTribunal(processo, fonteTribunal),
    assuntos: buildAssuntos(capa ?? null),
    juiz: capa?.orgao_julgador ?? undefined,
    situacao: mapStatus(fonteTribunal?.status_predito, fonteTribunal?.arquivado),
    valor: capa?.valor_causa?.valor ?? undefined,
    partes: fonteTribunal ? mapEnvolvidos(fonteTribunal.envolvidos) : undefined,
    movimentacoes: movimentacoes.map(mapMovimentacao),
    origem: {
      provider: 'escavador',
      requestId,
      fetchedAt: new Date(),
    },
  };
}

function buildTribunal(
  processo: EscavadorProcesso,
  fonte?: EscavadorFonte,
): Tribunal | undefined {
  const tribunal = fonte?.tribunal;
  if (!tribunal && !processo.unidade_origem) return undefined;

  return {
    sigla: tribunal?.sigla ?? processo.unidade_origem?.tribunal_sigla ?? '',
    nome: tribunal?.nome,
    instancia: fonte?.grau ?? undefined,
    comarca: processo.unidade_origem?.cidade,
    vara: processo.unidade_origem?.nome,
  };
}

function buildAssuntos(capa: EscavadorFonte['capa']): Assunto[] | undefined {
  if (!capa) return undefined;

  const assuntos: Assunto[] = [];

  if (capa.assunto_principal_normalizado) {
    assuntos.push({
      codigo: String(capa.assunto_principal_normalizado.id),
      descricao: capa.assunto_principal_normalizado.nome,
      principal: true,
    });
  }

  for (const a of capa.assuntos_normalizados) {
    if (capa.assunto_principal_normalizado && a.id === capa.assunto_principal_normalizado.id) continue;
    assuntos.push({
      codigo: String(a.id),
      descricao: a.nome,
      principal: false,
    });
  }

  if (assuntos.length === 0 && capa.assunto) {
    assuntos.push({ descricao: capa.assunto, principal: true });
  }

  return assuntos.length > 0 ? assuntos : undefined;
}

function mapEnvolvidos(envolvidos: EscavadorEnvolvido[]): Parte[] {
  const partes: Parte[] = [];

  for (const env of envolvidos) {
    if (env.polo === 'ADVOGADO' || env.polo === 'NENHUM') continue;

    const advogados: Advogado[] = (env.advogados ?? []).map((adv) => {
      const oab = adv.oabs?.[0];
      return {
        nome: adv.nome ?? '',
        oab: oab ? `OAB/${oab.uf} ${oab.numero}` : undefined,
        uf: oab?.uf,
      };
    });

    partes.push({
      nome: env.nome ?? '',
      documento: env.cpf ?? env.cnpj ?? undefined,
      tipoDocumento: env.cpf ? 'cpf' : env.cnpj ? 'cnpj' : undefined,
      lado: mapPolo(env.polo),
      advogados: advogados.length > 0 ? advogados : undefined,
    });
  }

  return partes;
}

function mapMovimentacao(mov: EscavadorMovimentacao): Movimentacao {
  return {
    data: new Date(mov.data),
    tipo: mov.classificacao_predita?.nome ?? mov.tipo ?? undefined,
    descricao: mov.conteudo,
    codigo: String(mov.id),
  };
}

function mapPolo(polo: string): TipoParte {
  switch (polo) {
    case 'ATIVO': return 'autor';
    case 'PASSIVO': return 'reu';
    default: return 'desconhecido';
  }
}

function mapArea(area?: string | null): AreaJuridica | undefined {
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

function mapStatus(statusPredito?: string | null, arquivado?: boolean | null): StatusProcesso | undefined {
  if (arquivado) return 'arquivado';
  if (!statusPredito) return undefined;
  const normalized = statusPredito.toUpperCase();
  if (normalized === 'ATIVO' || normalized === 'EM ANDAMENTO') return 'ativo';
  if (normalized.includes('INATIV') || normalized.includes('FINALIZ') || normalized.includes('BAIXA')) return 'finalizado';
  if (normalized.includes('ARQUIV')) return 'arquivado';
  return 'ativo';
}
