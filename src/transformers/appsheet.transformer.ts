import type { ProcessoUnificado } from '../models/processo-unificado.js';
import { getTribunalSiglaFromCnj } from '../utils/tribunal-map.js';
import { getTribunalLink } from '../utils/tribunal-links.js';

/**
 * Flat JSON structure for AppSheet (Google Sheets via Apps Script).
 * All fields are primitives (string, number, boolean) — no nested objects.
 */
export interface AppSheetProcesso {
  // Identificação
  cnj: string;
  area: string;
  classe: string;
  instancia: number | null;

  // Tribunal
  tribunal_sigla: string;
  tribunal_nome: string;
  tribunal_comarca: string;
  tribunal_vara: string;
  link_tribunal: string;

  // Datas
  data_distribuicao: string;
  ultima_atualizacao: string;

  // Status
  situacao: string;
  fase: string;
  valor: number | null;

  // Juiz
  juiz: string;

  // Assuntos (concatenados)
  assunto_principal: string;
  assuntos_todos: string;

  // Partes - Polo Ativo (autores)
  polo_ativo_nomes: string;
  polo_ativo_documentos: string;
  polo_ativo_advogados: string;

  // Partes - Polo Passivo (réus)
  polo_passivo_nomes: string;
  polo_passivo_documentos: string;
  polo_passivo_advogados: string;

  // Movimentações
  total_movimentacoes: number;
  ultima_movimentacao_data: string;
  ultima_movimentacao_descricao: string;
  ultimas_5_movimentacoes: string;
  dias_sem_movimentacao: number | null;

  // Metadados
  provider: string;
  request_id: string;
  fetched_at: string;
  completeness_score: number | null;
  merged: boolean;
  merged_providers: string;
}

export function transformToAppSheet(processo: ProcessoUnificado): AppSheetProcesso {
  const poloAtivo = (processo.partes ?? []).filter((p) =>
    ['autor', 'requerente', 'ativo'].includes(p.lado),
  );
  const poloPassivo = (processo.partes ?? []).filter((p) =>
    ['reu', 'requerido', 'passivo'].includes(p.lado),
  );

  const movs = (processo.movimentacoes ?? [])
    .slice()
    .sort((a, b) => b.data.getTime() - a.data.getTime());

  const ultimasMov = movs.slice(0, 5).map((m) =>
    `[${formatDate(m.data)}] ${m.descricao}`,
  );

  const assuntoPrincipal = processo.assuntos?.find((a) => a.principal)?.descricao
    ?? processo.assuntos?.[0]?.descricao
    ?? '';

  // Ajuste 2: tribunal_sigla extraída do CNJ quando provider não retorna
  const tribunalSigla = processo.tribunal?.sigla || getTribunalSiglaFromCnj(processo.cnj);

  // Ajuste 6: link de consulta pública do tribunal
  const linkTribunal = getTribunalLink(tribunalSigla, processo.cnj);

  // Ajuste 5: dias sem movimentação
  const diasSemMov = movs[0]
    ? Math.floor((Date.now() - movs[0].data.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    // Identificação
    cnj: processo.cnj,
    area: processo.area ?? '',
    classe: processo.nome ?? '',
    instancia: processo.instancia ?? null,

    // Tribunal
    tribunal_sigla: tribunalSigla,
    tribunal_nome: processo.tribunal?.nome ?? '',
    tribunal_comarca: processo.tribunal?.comarca ?? '',
    tribunal_vara: processo.tribunal?.vara ?? '',
    link_tribunal: linkTribunal,

    // Datas
    data_distribuicao: processo.dataDistribuicao ? formatDate(processo.dataDistribuicao) : '',
    ultima_atualizacao: processo.ultimaAtualizacao ? formatDateTime(processo.ultimaAtualizacao) : formatDateTime(new Date()),

    // Status
    situacao: processo.situacao ?? '',
    fase: processo.fase ?? '',
    valor: processo.valor ?? null,

    // Juiz
    juiz: processo.juiz ?? '',

    // Assuntos
    assunto_principal: assuntoPrincipal,
    assuntos_todos: (processo.assuntos ?? []).map((a) => a.descricao).join(' | '),

    // Polo Ativo
    polo_ativo_nomes: poloAtivo.map((p) => p.nome).join('; '),
    polo_ativo_documentos: poloAtivo.map((p) => p.documento ?? '').filter(Boolean).join('; '),
    polo_ativo_advogados: dedupAdvogados(poloAtivo.flatMap((p) => p.advogados ?? [])),

    // Polo Passivo
    polo_passivo_nomes: poloPassivo.map((p) => p.nome).join('; '),
    polo_passivo_documentos: poloPassivo.map((p) => p.documento ?? '').filter(Boolean).join('; '),
    polo_passivo_advogados: dedupAdvogados(poloPassivo.flatMap((p) => p.advogados ?? [])),

    // Movimentações
    total_movimentacoes: movs.length,
    ultima_movimentacao_data: movs[0] ? formatDateTime(movs[0].data) : '',
    ultima_movimentacao_descricao: movs[0]?.descricao ?? '',
    ultimas_5_movimentacoes: ultimasMov.join(' | '),
    dias_sem_movimentacao: diasSemMov,

    // Metadados
    provider: processo.origem.provider,
    request_id: processo.origem.requestId,
    fetched_at: formatDateTime(processo.origem.fetchedAt),
    completeness_score: processo.completenessScore ?? null,
    merged: !!processo.mergedFrom && processo.mergedFrom.length > 1,
    merged_providers: (processo.mergedFrom ?? []).map((o) => o.provider).join(', '),
  };
}

/**
 * Deduplica advogados por OAB (ou por nome se sem OAB).
 */
function dedupAdvogados(advogados: Array<{ nome: string; oab?: string }>): string {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const a of advogados) {
    const key = a.oab ?? a.nome;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(a.oab ? `${a.nome} (${a.oab})` : a.nome);
  }
  return result.join('; ');
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateTime(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
