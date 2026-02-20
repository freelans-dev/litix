/**
 * DataJud CNJ Public API types.
 * All fields optional — DataJud may omit any field for restricted or incomplete records.
 */

export interface DataJudClasse {
  codigo?: number;
  nome?: string;
}

export interface DataJudAssunto {
  codigo?: number;
  nome?: string;
}

export interface DataJudOrgaoJulgador {
  codigo?: string;
  nome?: string;
  codigoMunicipioIBGE?: string;
}

export interface DataJudTribunal {
  codigo?: string;
  nome?: string;
  sigla?: string;
}

export interface DataJudAdvogado {
  nome?: string;
  codigoAdvogado?: string;
  numeroOAB?: string;
  tipoRepresentante?: string;
}

export interface DataJudTipoParte {
  codigo?: number;
  nome?: string;
}

export interface DataJudParte {
  nome?: string;
  /** CPF or CNPJ — field name may be 'cpfCnpj' or 'documento' depending on tribunal */
  cpfCnpj?: string;
  documento?: string;
  tipoParte?: DataJudTipoParte;
  advogados?: DataJudAdvogado[];
}

export interface DataJudComplementoTabelado {
  codigo?: number;
  nome?: string;
  descricao?: string;
  value?: string;
}

export interface DataJudMovimento {
  codigo?: number;
  nome?: string;
  dataHora?: string;
  complementosTabelados?: DataJudComplementoTabelado[];
}

export interface DataJudValorCausa {
  valor?: number;
  moeda?: string;
}

export interface DataJudSource {
  numeroProcesso?: string;
  dataAjuizamento?: string;
  dataHoraUltimaAtualizacao?: string;
  classe?: DataJudClasse;
  assuntos?: DataJudAssunto[];
  orgaoJulgador?: DataJudOrgaoJulgador;
  tribunal?: DataJudTribunal;
  grau?: string;
  nivelSigilo?: number;
  movimentos?: DataJudMovimento[];
  partes?: DataJudParte[];
  valorCausa?: DataJudValorCausa;
}

export interface DataJudHit {
  _index?: string;
  _id?: string;
  _score?: number | null;
  _source: DataJudSource;
}

export interface DataJudSearchResponse {
  took?: number;
  timed_out?: boolean;
  hits?: {
    total?: { value?: number; relation?: string };
    hits?: DataJudHit[];
  };
}

export interface DataJudQuery {
  query: unknown;
  size?: number;
  _source?: string[] | boolean;
  sort?: unknown[];
}
