/**
 * Maps CNJ number to DataJud Elasticsearch index alias.
 *
 * CNJ format: NNNNNNN-DD.AAAA.J.TT.OOOO
 *   J  = Justice segment (1 digit)
 *   TT = Tribunal code (2 digits)
 *
 * J values:
 *   1 = STF          4 = Federal (TRF)    7 = Militar (STM)
 *   2 = CNJ          5 = Trabalho (TRT)   8 = Estadual (TJ)
 *   3 = STJ          6 = Eleitoral (TRE)  9 = Militar Estadual
 */

const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/;

const ESTADUAL: Record<string, string> = {
  '01': 'tjac', '02': 'tjal', '03': 'tjam', '04': 'tjap',
  '05': 'tjba', '06': 'tjce', '07': 'tjdft', '08': 'tjes',
  '09': 'tjgo', '10': 'tjma', '11': 'tjmt', '12': 'tjms',
  '13': 'tjmg', '14': 'tjpa', '15': 'tjpb', '16': 'tjpr',
  '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn',
  '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc',
  '25': 'tjse', '26': 'tjsp', '27': 'tjto',
};

const FEDERAL: Record<string, string> = {
  '01': 'trf1', '02': 'trf2', '03': 'trf3',
  '04': 'trf4', '05': 'trf5', '06': 'trf6',
};

const TRABALHO: Record<string, string> = {
  '00': 'tst',
  '01': 'trt1',  '02': 'trt2',  '03': 'trt3',
  '04': 'trt4',  '05': 'trt5',  '06': 'trt6',
  '07': 'trt7',  '08': 'trt8',  '09': 'trt9',
  '10': 'trt10', '11': 'trt11', '12': 'trt12',
  '13': 'trt13', '14': 'trt14', '15': 'trt15',
  '16': 'trt16', '17': 'trt17', '18': 'trt18',
  '19': 'trt19', '20': 'trt20', '21': 'trt21',
  '22': 'trt22', '23': 'trt23', '24': 'trt24',
};

const ELEITORAL: Record<string, string> = {
  '00': 'tse',
  '01': 'treac', '02': 'treal', '03': 'tream', '04': 'treap',
  '05': 'treba', '06': 'trece', '07': 'tredf', '08': 'trees',
  '09': 'trego', '10': 'trema', '11': 'tremt', '12': 'trems',
  '13': 'tremg', '14': 'trepa', '15': 'trepb', '16': 'trepr',
  '17': 'trepe', '18': 'trepi', '19': 'trerj', '20': 'trern',
  '21': 'trers', '22': 'trero', '23': 'trerr', '24': 'tresc',
  '25': 'trese', '26': 'tresp', '27': 'treto',
};

/**
 * Converts a formatted CNJ number to its DataJud Elasticsearch index alias.
 * Returns null for unknown/unmapped tribunal codes.
 *
 * @example
 * cnjToTribunalAlias('0804495-71.2018.8.10.0001') // → 'api_publica_tjma'
 * cnjToTribunalAlias('0000123-45.2024.4.03.6100') // → 'api_publica_trf3'
 */
export function cnjToTribunalAlias(cnj: string): string | null {
  const normalized = cnj.replace(/\s/g, '');
  const match = normalized.match(CNJ_REGEX);
  if (!match) return null;

  const j = match[1]!;
  const tt = match[2]!;

  switch (j) {
    case '1': return 'api_publica_stf';
    case '3': return 'api_publica_stj';
    case '2': return null; // CNJ has no litigation index
    case '7': {
      if (tt === '00' || tt === '01') return 'api_publica_stm';
      return null; // JMU not in DataJud
    }
    case '8': {
      const suffix = ESTADUAL[tt];
      return suffix ? `api_publica_${suffix}` : null;
    }
    case '4': {
      const suffix = FEDERAL[tt];
      return suffix ? `api_publica_${suffix}` : null;
    }
    case '5': {
      const suffix = TRABALHO[tt];
      return suffix ? `api_publica_${suffix}` : null;
    }
    case '6': {
      const suffix = ELEITORAL[tt];
      return suffix ? `api_publica_${suffix}` : null;
    }
    default:
      return null;
  }
}

/**
 * Complete list of all DataJud public aliases.
 * Used by monitoring scripts to search across all tribunals.
 */
export const ALL_DATAJUD_ALIASES = [
  // Superiores
  'api_publica_stf', 'api_publica_stj', 'api_publica_tst',
  'api_publica_tse', 'api_publica_stm',
  // Estaduais (27)
  'api_publica_tjac', 'api_publica_tjal', 'api_publica_tjam', 'api_publica_tjap',
  'api_publica_tjba', 'api_publica_tjce', 'api_publica_tjdft', 'api_publica_tjes',
  'api_publica_tjgo', 'api_publica_tjma', 'api_publica_tjmt', 'api_publica_tjms',
  'api_publica_tjmg', 'api_publica_tjpa', 'api_publica_tjpb', 'api_publica_tjpr',
  'api_publica_tjpe', 'api_publica_tjpi', 'api_publica_tjrj', 'api_publica_tjrn',
  'api_publica_tjrs', 'api_publica_tjro', 'api_publica_tjrr', 'api_publica_tjsc',
  'api_publica_tjse', 'api_publica_tjsp', 'api_publica_tjto',
  // Federal (6 TRFs)
  'api_publica_trf1', 'api_publica_trf2', 'api_publica_trf3',
  'api_publica_trf4', 'api_publica_trf5', 'api_publica_trf6',
  // Trabalho (24 TRTs + TST)
  'api_publica_trt1',  'api_publica_trt2',  'api_publica_trt3',
  'api_publica_trt4',  'api_publica_trt5',  'api_publica_trt6',
  'api_publica_trt7',  'api_publica_trt8',  'api_publica_trt9',
  'api_publica_trt10', 'api_publica_trt11', 'api_publica_trt12',
  'api_publica_trt13', 'api_publica_trt14', 'api_publica_trt15',
  'api_publica_trt16', 'api_publica_trt17', 'api_publica_trt18',
  'api_publica_trt19', 'api_publica_trt20', 'api_publica_trt21',
  'api_publica_trt22', 'api_publica_trt23', 'api_publica_trt24',
  // Eleitoral (27 TREs + TSE)
  'api_publica_treac', 'api_publica_treal', 'api_publica_tream', 'api_publica_treap',
  'api_publica_treba', 'api_publica_trece', 'api_publica_tredf', 'api_publica_trees',
  'api_publica_trego', 'api_publica_trema', 'api_publica_tremt', 'api_publica_trems',
  'api_publica_tremg', 'api_publica_trepa', 'api_publica_trepb', 'api_publica_trepr',
  'api_publica_trepe', 'api_publica_trepi', 'api_publica_trerj', 'api_publica_trern',
  'api_publica_trers', 'api_publica_trero', 'api_publica_trerr', 'api_publica_tresc',
  'api_publica_trese', 'api_publica_tresp', 'api_publica_treto',
] as const;

/**
 * Smaller set of high-traffic tribunals for quick document searches.
 * Covers ~85% of Brazilian litigation volume.
 */
export const COMMON_DATAJUD_ALIASES = [
  'api_publica_tjsp', 'api_publica_tjrj', 'api_publica_tjmg',
  'api_publica_tjrs', 'api_publica_tjpr', 'api_publica_tjsc',
  'api_publica_tjba', 'api_publica_tjgo', 'api_publica_tjdft',
  'api_publica_trf1', 'api_publica_trf2', 'api_publica_trf3',
  'api_publica_trf4', 'api_publica_trf5', 'api_publica_trt2',
  'api_publica_trt15', 'api_publica_tst', 'api_publica_stj',
] as const;
