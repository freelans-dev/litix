import type { AreaJuridica, StatusProcesso, FaseProcesso, NivelSigilo } from './enums.js';
import type { Parte } from './parte.js';
import type { Movimentacao } from './movimentacao.js';
import type { Anexo } from './anexo.js';
import type { ProviderName } from '../providers/provider.interface.js';

export interface DadosOrigem {
  provider: ProviderName;
  requestId: string;
  fetchedAt: Date;
  rawPayload?: unknown;
}

export interface Tribunal {
  sigla: string;
  nome?: string;
  instancia?: number;
  comarca?: string;
  vara?: string;
}

export interface Assunto {
  codigo?: string;
  descricao: string;
  principal: boolean;
}

export interface ProcessoUnificado {
  cnj: string;
  area?: AreaJuridica;
  nome?: string;
  dataDistribuicao?: Date;
  instancia?: number;
  tribunal?: Tribunal;
  assuntos?: Assunto[];
  juiz?: string;
  situacao?: StatusProcesso;
  fase?: FaseProcesso;
  nivelSigilo?: NivelSigilo;
  valor?: number;
  partes?: Parte[];
  movimentacoes?: Movimentacao[];
  anexos?: Anexo[];
  origem: DadosOrigem;
  mergedFrom?: DadosOrigem[];
  completenessScore?: number;
  ultimaAtualizacao?: Date;
  /** Original procedural class from lower instance, populated on multi-degree merges. */
  classeOrigem?: string;
  /** Original filing date from lower instance, populated on multi-degree merges. */
  dataDistribuicaoOrigem?: Date;
}
