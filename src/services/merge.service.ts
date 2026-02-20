import type { ProcessoUnificado } from '../models/processo-unificado.js';
import type { Parte } from '../models/parte.js';
import type { Movimentacao } from '../models/movimentacao.js';
import type { Anexo } from '../models/anexo.js';

/**
 * Merges two ProcessoUnificado results from different providers.
 *
 * Strategy:
 * - Scalar fields: non-null wins. If both non-null, prefer the more complete source.
 * - Arrays: union-merge with deduplication by natural key.
 * - Multi-instance: when providers return different court degrees, the higher
 *   degree wins for nome/instancia/dataDistribuicao, and the lower degree's
 *   class/date are preserved in classeOrigem/dataDistribuicaoOrigem.
 * - Recalculates completeness score after merge.
 */
export function mergeProcessos(a: ProcessoUnificado, b: ProcessoUnificado): ProcessoUnificado {
  const scoreA = calculateCompleteness(a);
  const scoreB = calculateCompleteness(b);
  const [primary, secondary] = scoreA >= scoreB ? [a, b] : [b, a];

  const merged: ProcessoUnificado = {
    cnj: primary.cnj || secondary.cnj,
    area: primary.area ?? secondary.area,
    nome: primary.nome ?? secondary.nome,
    dataDistribuicao: primary.dataDistribuicao ?? secondary.dataDistribuicao,
    instancia: primary.instancia ?? secondary.instancia,
    tribunal: primary.tribunal ?? secondary.tribunal,
    assuntos: mergeAssuntos(primary.assuntos, secondary.assuntos),
    juiz: primary.juiz ?? secondary.juiz,
    situacao: primary.situacao ?? secondary.situacao,
    fase: primary.fase ?? secondary.fase,
    nivelSigilo: primary.nivelSigilo ?? secondary.nivelSigilo,
    valor: primary.valor ?? secondary.valor,
    partes: mergePartes(primary.partes, secondary.partes),
    movimentacoes: mergeMovimentacoes(primary.movimentacoes, secondary.movimentacoes),
    anexos: mergeAnexos(primary.anexos, secondary.anexos),
    origem: primary.origem,
    mergedFrom: [primary.origem, secondary.origem],
    ultimaAtualizacao: new Date(),
  };

  // ── Multi-instance override ──────────────────────────────────────────────
  // When two sources report different court degrees (e.g. DataJud → G1,
  // Codilo → G2), they are complementary records of the same lawsuit.
  // Promote the higher-degree metadata and preserve the lower-degree origin.
  const multiInst = detectMultiInstancia(a, b);
  if (multiInst) {
    const { higher, lower } = multiInst;
    merged.nome             = higher.nome ?? merged.nome;
    merged.instancia        = higher.instancia;
    merged.dataDistribuicao = higher.dataDistribuicao ?? merged.dataDistribuicao;
    merged.classeOrigem           = lower.nome ?? undefined;
    merged.dataDistribuicaoOrigem = lower.dataDistribuicao ?? undefined;
    // Prefer higher-degree tribunal context but keep sigla from either
    if (higher.tribunal) {
      merged.tribunal = {
        ...higher.tribunal,
        sigla: higher.tribunal.sigla || lower.tribunal?.sigla || '',
      };
    }
  }

  merged.completenessScore = calculateCompleteness(merged);
  return merged;
}

/**
 * Detects multi-instance scenario: both sources have instancia set,
 * they differ, and the class names differ (ruling out duplicate data).
 * Returns { higher, lower } or null if not multi-instance.
 */
function detectMultiInstancia(
  a: ProcessoUnificado,
  b: ProcessoUnificado,
): { higher: ProcessoUnificado; lower: ProcessoUnificado } | null {
  if (a.instancia == null || b.instancia == null) return null;
  if (a.instancia === b.instancia) return null;
  // Only flag if class names are actually different (not just missing)
  if (a.nome && b.nome && normalizeText(a.nome) === normalizeText(b.nome)) return null;

  return a.instancia > b.instancia
    ? { higher: a, lower: b }
    : { higher: b, lower: a };
}

export function calculateCompleteness(p: ProcessoUnificado): number {
  const fields = [
    p.cnj,
    p.area,
    p.nome,
    p.dataDistribuicao,
    p.instancia,
    p.tribunal,
    p.assuntos?.length,
    p.juiz,
    p.situacao,
    p.fase,
    p.valor,
    p.partes?.length,
    p.movimentacoes?.length,
    p.anexos?.length,
  ];
  const total = fields.length;
  const filled = fields.filter((f) => f !== undefined && f !== null && f !== 0).length;
  return filled / total;
}

function mergeAssuntos(
  a?: ProcessoUnificado['assuntos'],
  b?: ProcessoUnificado['assuntos'],
): ProcessoUnificado['assuntos'] {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  const seen = new Set<string>();
  const result = [...a];
  for (const item of a) {
    seen.add(normalizeText(item.descricao));
  }
  for (const item of b) {
    const key = normalizeText(item.descricao);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function mergePartes(a?: Parte[], b?: Parte[]): Parte[] | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  const seen = new Set<string>();
  const result = [...a];
  for (const p of a) {
    seen.add(parteKey(p));
  }
  for (const p of b) {
    const key = parteKey(p);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}

function mergeMovimentacoes(a?: Movimentacao[], b?: Movimentacao[]): Movimentacao[] | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  const seen = new Set<string>();
  const result = [...a];
  for (const m of a) {
    seen.add(movimentacaoKey(m));
  }
  for (const m of b) {
    const key = movimentacaoKey(m);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(m);
    }
  }
  return result.sort((x, y) => y.data.getTime() - x.data.getTime());
}

function mergeAnexos(a?: Anexo[], b?: Anexo[]): Anexo[] | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  const seen = new Set<string>();
  const result = [...a];
  for (const an of a) {
    seen.add(anexoKey(an));
  }
  for (const an of b) {
    const key = anexoKey(an);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(an);
    }
  }
  return result;
}

function parteKey(p: Parte): string {
  return normalizeText(`${p.nome}|${p.documento ?? ''}`);
}

function movimentacaoKey(m: Movimentacao): string {
  return `${m.data.toISOString().slice(0, 10)}|${normalizeText(m.descricao).slice(0, 80)}`;
}

function anexoKey(a: Anexo): string {
  return `${a.data.toISOString().slice(0, 10)}|${normalizeText(a.nome)}`;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
