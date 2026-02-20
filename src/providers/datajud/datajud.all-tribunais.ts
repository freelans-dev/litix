/**
 * Complete list of all DataJud public API aliases.
 *
 * Used by CpfMonitorService when MONITOR_TRIBUNAIS=all.
 *
 * Total: 92 endpoints
 *   Superiores        5  (STF, STJ, TST, TSE, STM)
 *   Estaduais        27  (TJ de cada estado + DF)
 *   Militares Est.    3  (TJMMG, TJMRS, TJMSP)
 *   Federal           6  (TRF1–TRF6)
 *   Trabalho         24  (TRT1–TRT24)
 *   Eleitoral        27  (TRE de cada estado + DF)
 */

// ── 5 Superiores ──────────────────────────────────────────────────────────────
const SUPERIORES = [
  'api_publica_stf',
  'api_publica_stj',
  'api_publica_tst',
  'api_publica_tse',
  'api_publica_stm',
] as const;

// ── 3 Militares Estaduais (MG, RS, SP) ───────────────────────────────────────
const MILITARES_ESTADUAIS = [
  'api_publica_tjmmg',
  'api_publica_tjmrs',
  'api_publica_tjmsp',
] as const;

// ── 6 TRFs ────────────────────────────────────────────────────────────────────
const FEDERAL = [
  'api_publica_trf1', 'api_publica_trf2', 'api_publica_trf3',
  'api_publica_trf4', 'api_publica_trf5', 'api_publica_trf6',
] as const;

// ── 27 TREs ───────────────────────────────────────────────────────────────────
const ELEITORAL = [
  'api_publica_treac', 'api_publica_treal', 'api_publica_tream', 'api_publica_treap',
  'api_publica_treba', 'api_publica_trece', 'api_publica_tredf', 'api_publica_trees',
  'api_publica_trego', 'api_publica_trema', 'api_publica_tremt', 'api_publica_trems',
  'api_publica_tremg', 'api_publica_trepa', 'api_publica_trepb', 'api_publica_trepr',
  'api_publica_trepe', 'api_publica_trepi', 'api_publica_trerj', 'api_publica_trern',
  'api_publica_trers', 'api_publica_trero', 'api_publica_trerr', 'api_publica_tresc',
  'api_publica_trese', 'api_publica_tresp', 'api_publica_treto',
] as const;

/** All 92 DataJud public indexes, ordered by litigation volume (high-volume first). */
export const ALL_TRIBUNAIS_ALIASES: readonly string[] = [
  // High-volume state courts first (faster to find hits)
  'api_publica_tjsp', 'api_publica_tjrj', 'api_publica_tjmg',
  'api_publica_tjrs', 'api_publica_tjpr', 'api_publica_tjsc',
  'api_publica_tjba', 'api_publica_tjgo', 'api_publica_tjdft',
  // Federal
  ...FEDERAL,
  // Labour (high volume)
  'api_publica_trt2', 'api_publica_trt15', 'api_publica_trt1',
  'api_publica_trt3', 'api_publica_trt4', 'api_publica_trt9',
  // Remaining state courts
  'api_publica_tjma', 'api_publica_tjpe', 'api_publica_tjce', 'api_publica_tjpa',
  'api_publica_tjmt', 'api_publica_tjms', 'api_publica_tjpb', 'api_publica_tjpi',
  'api_publica_tjrn', 'api_publica_tjro', 'api_publica_tjrr', 'api_publica_tjse',
  'api_publica_tjto', 'api_publica_tjac', 'api_publica_tjal', 'api_publica_tjam',
  'api_publica_tjap', 'api_publica_tjes',
  // Remaining TRTs
  'api_publica_trt5',  'api_publica_trt6',  'api_publica_trt7',  'api_publica_trt8',
  'api_publica_trt10', 'api_publica_trt11', 'api_publica_trt12', 'api_publica_trt13',
  'api_publica_trt14', 'api_publica_trt16', 'api_publica_trt17', 'api_publica_trt18',
  'api_publica_trt19', 'api_publica_trt20', 'api_publica_trt21', 'api_publica_trt22',
  'api_publica_trt23', 'api_publica_trt24',
  // Superiores
  ...SUPERIORES,
  // Military state
  ...MILITARES_ESTADUAIS,
  // Electoral
  ...ELEITORAL,
];

// Sanity check at module load
const _count = ALL_TRIBUNAIS_ALIASES.length;
if (_count !== 92) {
  // Non-fatal: log mismatch (dev aid)
  console.warn(`[datajud] ALL_TRIBUNAIS_ALIASES: expected 92, got ${_count}`);
}

export const TOTAL_TRIBUNAIS = ALL_TRIBUNAIS_ALIASES.length;
