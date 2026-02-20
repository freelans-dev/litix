import type { ProcessoUnificado, Tribunal, Assunto } from '../../models/processo-unificado.js';
import type { Parte, Advogado } from '../../models/parte.js';
import type { Movimentacao } from '../../models/movimentacao.js';
import type { AreaJuridica, TipoParte, NivelSigilo } from '../../models/enums.js';
import type {
  DataJudHit,
  DataJudParte,
  DataJudMovimento,
  DataJudAdvogado,
} from './datajud.types.js';

export function mapDataJudToUnificado(hit: DataJudHit, requestId: string): ProcessoUnificado {
  const src = hit._source;

  const cnj = src.numeroProcesso ?? requestId;
  const assuntos = buildAssuntos(src.assuntos);

  return {
    cnj,
    area: mapArea(src.assuntos?.[0]?.nome ?? src.classe?.nome),
    nome: src.classe?.nome,
    dataDistribuicao: parseDate(src.dataAjuizamento),
    instancia: mapGrau(src.grau),
    tribunal: buildTribunal(src, hit._index),
    assuntos,
    juiz: undefined, // DataJud does not expose judge name
    situacao: undefined, // DataJud does not carry status field
    fase: undefined,
    nivelSigilo: mapNivelSigilo(src.nivelSigilo),
    valor: src.valorCausa?.valor ?? undefined,
    partes: src.partes?.map(mapParte).filter((p): p is Parte => p !== null),
    movimentacoes: src.movimentos?.map(mapMovimento),
    ultimaAtualizacao: parseDate(src.dataHoraUltimaAtualizacao),
    origem: {
      provider: 'datajud',
      requestId,
      fetchedAt: new Date(),
    },
  };
}

function buildTribunal(
  src: DataJudHit['_source'],
  index?: string,
): Tribunal | undefined {
  const sigla = src.tribunal?.sigla ?? extractSiglaFromIndex(index);
  const nome = src.tribunal?.nome;
  const vara = src.orgaoJulgador?.nome;

  if (!sigla && !nome && !vara) return undefined;

  return {
    sigla: sigla ?? '',
    nome,
    instancia: mapGrau(src.grau),
    vara,
  };
}

function extractSiglaFromIndex(index?: string): string | undefined {
  if (!index) return undefined;
  // 'api_publica_tjsp' → 'TJSP'
  const parts = index.split('_');
  const suffix = parts[parts.length - 1];
  return suffix ? suffix.toUpperCase() : undefined;
}

function buildAssuntos(
  assuntos?: DataJudHit['_source']['assuntos'],
): Assunto[] | undefined {
  if (!assuntos || assuntos.length === 0) return undefined;
  return assuntos.map((a, i) => ({
    codigo: a.codigo?.toString(),
    descricao: a.nome ?? '',
    principal: i === 0,
  }));
}

function mapParte(parte: DataJudParte): Parte | null {
  if (!parte.nome) return null;

  const documento = parte.cpfCnpj ?? parte.documento;
  const tipoDoc = documento
    ? documento.replace(/\D/g, '').length <= 11 ? 'cpf' : 'cnpj'
    : undefined;

  return {
    nome: parte.nome,
    documento,
    tipoDocumento: tipoDoc,
    lado: mapTipoParte(parte.tipoParte?.nome),
    advogados: parte.advogados
      ?.map(mapAdvogado)
      .filter((a): a is Advogado => a !== null),
  };
}

function mapAdvogado(adv: DataJudAdvogado): Advogado | null {
  if (!adv.nome) return null;
  return {
    nome: adv.nome,
    oab: adv.numeroOAB ?? undefined,
  };
}

function mapMovimento(mov: DataJudMovimento): Movimentacao {
  const tipo = mov.nome;
  const complemento = mov.complementosTabelados
    ?.map((c) => c.descricao ?? c.nome ?? c.value)
    .filter(Boolean)
    .join('; ');

  return {
    data: parseDate(mov.dataHora) ?? new Date(0),
    tipo,
    descricao: tipo ?? '',
    conteudo: complemento || undefined,
    codigo: mov.codigo?.toString(),
  };
}

function mapTipoParte(nome?: string): TipoParte {
  if (!nome) return 'desconhecido';
  const n = normalizeText(nome);
  if (n.includes('autor') || n.includes('requerente') || n.includes('exequente') || n.includes('impetrante')) return 'autor';
  if (n.includes('reu') || n.includes('requerido') || n.includes('executado') || n.includes('impetrado')) return 'reu';
  if (n.includes('advogad')) return 'advogado';
  if (n.includes('interessad') || n.includes('terceiro')) return 'interessado';
  if (n.includes('ativo') || n.includes('polo ativo')) return 'ativo';
  if (n.includes('passivo') || n.includes('polo passivo')) return 'passivo';
  return 'desconhecido';
}

function mapGrau(grau?: string): number | undefined {
  if (!grau) return undefined;
  const g = grau.toUpperCase();
  if (g === 'G1' || g === 'JE') return 1;
  if (g === 'G2' || g === 'TRIB') return 2;
  if (g === 'G3' || g === 'SUP') return 3;
  return undefined;
}

function mapNivelSigilo(nivel?: number): NivelSigilo | undefined {
  if (nivel === undefined || nivel === null) return undefined;
  if (nivel >= 0 && nivel <= 5) return nivel as NivelSigilo;
  return undefined;
}

function mapArea(subject?: string): AreaJuridica | undefined {
  if (!subject) return undefined;
  const n = normalizeText(subject);
  if (n.includes('civel') || n.includes('civil') || n.includes('obrigacao') || n.includes('contrato')) return 'civel';
  if (n.includes('criminal') || n.includes('penal') || n.includes('crime')) return 'criminal';
  if (n.includes('trabalh') || n.includes('clt')) return 'trabalhista';
  if (n.includes('tribut') || n.includes('fiscal')) return 'tributario';
  if (n.includes('administrat')) return 'administrativo';
  if (n.includes('ambiental')) return 'ambiental';
  if (n.includes('consumidor') || n.includes('cdc')) return 'consumidor';
  if (n.includes('eleitoral')) return 'eleitoral';
  if (n.includes('militar')) return 'militar';
  if (n.includes('previdenci') || n.includes('inss')) return 'previdenciario';
  return 'outro';
}

function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const brMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`);
  return undefined;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
