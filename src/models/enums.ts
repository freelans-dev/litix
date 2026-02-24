export type AreaJuridica =
  | 'civel'
  | 'criminal'
  | 'trabalhista'
  | 'tributario'
  | 'administrativo'
  | 'ambiental'
  | 'consumidor'
  | 'eleitoral'
  | 'militar'
  | 'previdenciario'
  | 'outro';

export type StatusProcesso =
  | 'ativo'
  | 'finalizado'
  | 'arquivado'
  | 'suspenso'
  | 'sobrestado'
  | 'cancelado';

export type FaseProcesso =
  | 'inicial'
  | 'sentenca'
  | 'execucao'
  | 'recurso'
  | 'arquivado'
  | 'outro';

export type NivelSigilo = 0 | 1 | 2 | 3 | 4 | 5;

export type TipoParte =
  | 'autor'
  | 'reu'
  | 'advogado'
  | 'requerente'
  | 'requerido'
  | 'interessado'
  | 'ativo'
  | 'passivo'
  | 'desconhecido';

export type TipoDocumento = 'cpf' | 'cnpj' | 'rg' | 'oab';
