import type { TipoParte, TipoDocumento } from './enums.js';

export interface Advogado {
  nome: string;
  oab?: string;
  uf?: string;
}

export interface Parte {
  nome: string;
  documento?: string;
  tipoDocumento?: TipoDocumento;
  lado: TipoParte;
  advogados?: Advogado[];
}
