// ── Authentication ──

export interface PredictusAuthResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

// ── Busca por CNJ ──

export interface PredictusBuscaCnjBody {
  numeroProcessoUnico: string;
}

// ── Busca por CPF/CNPJ ──

export interface PredictusBuscaCpfBody {
  cpf?: string;
  cnpj?: string;
  polo?: 'ATIVO' | 'PASSIVO';
  grausProcesso?: number[];
  tribunais?: string[];
  valorCausa?: {
    maiorQue?: number | null;
    menorQue?: number | null;
    maiorIgualQue?: number | null;
    menorIgualQue?: number | null;
  };
  dataDistribuicao?: {
    inicio?: string;
    fim?: string;
  };
  classesProcessuais?: number[];
  assuntosCNJ?: number[];
  statusProcessuais?: string[];
  ramosDoDireito?: string[];
  segmentos?: string[];
  limiteResultados?: number;
}

// ── Busca por OAB ──

export interface PredictusBuscaOabBody {
  oab: {
    numero: number;
    uf: string;
  };
  grausProcesso?: number[];
  tribunais?: string[];
  limiteResultados?: number;
}

// ── Processo (response) ──

export interface PredictusProcesso {
  urlProcesso: string;
  numeroProcessoUnico: string;
  numeroProcessoAntigo: string;
  statusObservacao: string;
  grauProcesso: number;
  juiz: string;
  relator: string;
  revisores: string[];
  area: string;
  sistema: string;
  tribunal: string;
  uf: string;
  orgaoJulgador: string;
  unidadeOrigem: string;
  classeProcessual: {
    nome: string;
    codigoCNJ: number;
  };
  assuntosCNJ: PredictusAssunto[];
  dataDistribuicao: string;
  dataAutuacao: string;
  partes: PredictusParte[];
  advogadosSemParte: PredictusAdvogado[];
  movimentos: PredictusMovimento[];
  valorCausa: {
    moeda: string;
    valor: number;
  } | null;
  eTutelaAntecipada: boolean;
  eJusticaGratuita: boolean;
  ePrioritario: boolean;
  eSegredoJustica: boolean;
  eProcessoDigital: boolean;
  dataProcessamento: string;
  statusPredictus: {
    statusProcesso: string;
    julgamentos: unknown[];
    dataArquivamento: string | null;
  };
}

export interface PredictusAssunto {
  titulo: string;
  codigoCNJ: number;
  ePrincipal: boolean;
}

export interface PredictusParte {
  nome: string;
  polo: 'ATIVO' | 'PASSIVO';
  cpf: string | null;
  cnpj: string | null;
  origemDocumento: string;
  advogados: PredictusAdvogado[];
}

export interface PredictusAdvogado {
  nome: string;
  cpf: string | null;
  oab: {
    numero: number;
    uf: string;
  } | null;
}

export interface PredictusMovimento {
  indice: number;
  nomeOriginal: string;
  descricao: string;
  classificacaoCNJ: string;
  data: string;
}

// ── Error ──

export interface PredictusErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}
