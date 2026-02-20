/**
 * Maps CNJ justice segment (J) + tribunal code (TR) to tribunal sigla.
 *
 * CNJ format: NNNNNNN-DD.AAAA.J.TR.OOOO
 *   J  = Justice segment (1 digit): 1=STF, 2=CNJ, 3=STJ, 4=Federal, 5=Trabalho, 6=Eleitoral, 7=Militar, 8=Estadual, 9=Militar Estadual
 *   TR = Tribunal code (2 digits): varies per justice segment
 */

const TRIBUNAIS_ESTADUAIS: Record<string, string> = {
  '01': 'TJAC', '02': 'TJAL', '03': 'TJAP', '04': 'TJAM', '05': 'TJBA',
  '06': 'TJCE', '07': 'TJDF', '08': 'TJES', '09': 'TJGO', '10': 'TJMA',
  '11': 'TJMT', '12': 'TJMS', '13': 'TJMG', '14': 'TJPA', '15': 'TJPB',
  '16': 'TJPR', '17': 'TJPE', '18': 'TJPI', '19': 'TJRJ', '20': 'TJRN',
  '21': 'TJRS', '22': 'TJRO', '23': 'TJRR', '24': 'TJSC', '25': 'TJSP',
  '26': 'TJSE', '27': 'TJTO',
};

const TRIBUNAIS_FEDERAIS: Record<string, string> = {
  '01': 'TRF1', '02': 'TRF2', '03': 'TRF3', '04': 'TRF4', '05': 'TRF5',
  '06': 'TRF6',
};

const TRIBUNAIS_TRABALHO: Record<string, string> = {
  '01': 'TRT1', '02': 'TRT2', '03': 'TRT3', '04': 'TRT4', '05': 'TRT5',
  '06': 'TRT6', '07': 'TRT7', '08': 'TRT8', '09': 'TRT9', '10': 'TRT10',
  '11': 'TRT11', '12': 'TRT12', '13': 'TRT13', '14': 'TRT14', '15': 'TRT15',
  '16': 'TRT16', '17': 'TRT17', '18': 'TRT18', '19': 'TRT19', '20': 'TRT20',
  '21': 'TRT21', '22': 'TRT22', '23': 'TRT23', '24': 'TRT24',
};

const TRIBUNAIS_ELEITORAIS: Record<string, string> = {
  '01': 'TRE-AC', '02': 'TRE-AL', '03': 'TRE-AP', '04': 'TRE-AM', '05': 'TRE-BA',
  '06': 'TRE-CE', '07': 'TRE-DF', '08': 'TRE-ES', '09': 'TRE-GO', '10': 'TRE-MA',
  '11': 'TRE-MT', '12': 'TRE-MS', '13': 'TRE-MG', '14': 'TRE-PA', '15': 'TRE-PB',
  '16': 'TRE-PR', '17': 'TRE-PE', '18': 'TRE-PI', '19': 'TRE-RJ', '20': 'TRE-RN',
  '21': 'TRE-RS', '22': 'TRE-RO', '23': 'TRE-RR', '24': 'TRE-SC', '25': 'TRE-SP',
  '26': 'TRE-SE', '27': 'TRE-TO',
};

const TRIBUNAIS_SUPERIORES: Record<string, string> = {
  '1': 'STF',
  '2': 'CNJ',
  '3': 'STJ',
};

const JUSTICE_SEGMENT_MAP: Record<string, Record<string, string>> = {
  '4': TRIBUNAIS_FEDERAIS,
  '5': TRIBUNAIS_TRABALHO,
  '6': TRIBUNAIS_ELEITORAIS,
  '7': {}, // Militar da União (JMU)
  '8': TRIBUNAIS_ESTADUAIS,
  '9': {}, // Militar Estadual
};

/**
 * Extracts tribunal sigla from a CNJ number.
 * CNJ format: NNNNNNN-DD.AAAA.J.TR.OOOO
 */
export function getTribunalSiglaFromCnj(cnj: string): string {
  const digits = cnj.replace(/\D/g, '');
  if (digits.length !== 20) return '';

  // J = position 13 (0-indexed), TR = positions 14-15
  const justiceSegment = digits[13]!;
  const tribunalCode = digits.slice(14, 16);

  // Superior courts
  if (['1', '2', '3'].includes(justiceSegment)) {
    return TRIBUNAIS_SUPERIORES[justiceSegment] ?? '';
  }

  // TST (Tribunal Superior do Trabalho)
  if (justiceSegment === '5' && tribunalCode === '00') return 'TST';

  // TSE (Tribunal Superior Eleitoral)
  if (justiceSegment === '6' && tribunalCode === '00') return 'TSE';

  // STM (Superior Tribunal Militar)
  if (justiceSegment === '7' && tribunalCode === '00') return 'STM';

  const segmentMap = JUSTICE_SEGMENT_MAP[justiceSegment];
  if (!segmentMap) return '';

  return segmentMap[tribunalCode] ?? '';
}

/**
 * UF from tribunal code (for estaduais).
 */
const TRIBUNAL_UF: Record<string, string> = {
  TJAC: 'AC', TJAL: 'AL', TJAP: 'AP', TJAM: 'AM', TJBA: 'BA',
  TJCE: 'CE', TJDF: 'DF', TJES: 'ES', TJGO: 'GO', TJMA: 'MA',
  TJMT: 'MT', TJMS: 'MS', TJMG: 'MG', TJPA: 'PA', TJPB: 'PB',
  TJPR: 'PR', TJPE: 'PE', TJPI: 'PI', TJRJ: 'RJ', TJRN: 'RN',
  TJRS: 'RS', TJRO: 'RO', TJRR: 'RR', TJSC: 'SC', TJSP: 'SP',
  TJSE: 'SE', TJTO: 'TO',
};

export function getUfFromTribunal(sigla: string): string {
  return TRIBUNAL_UF[sigla] ?? '';
}
