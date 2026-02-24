// ── Escavador API V2 Types ──

export interface EscavadorProcesso {
  numero_cnj: string;
  quantidade_movimentacoes: number;
  fontes_tribunais_estao_arquivadas: boolean;
  titulo_polo_ativo: string | null;
  titulo_polo_passivo: string | null;
  ano_inicio: number;
  data_inicio: string | null;
  data_ultima_movimentacao: string;
  data_ultima_verificacao: string;
  tempo_desde_ultima_verificacao: string;
  tipo_match: string | null;
  match_fontes: {
    tribunal: boolean;
    diario_oficial: boolean;
  };
  estado_origem: {
    nome: string;
    sigla: string;
  } | null;
  unidade_origem: {
    nome: string;
    cidade: string;
    estado: { nome: string; sigla: string };
    tribunal_sigla: string;
    endereco: string | null;
    classificacao: string | null;
  } | null;
  fontes: EscavadorFonte[];
}

export interface EscavadorFonte {
  id: number;
  processo_fonte_id: number;
  descricao: string;
  nome: string;
  sigla: string;
  tipo: string;
  grau: number;
  grau_formatado: string;
  sistema: string;
  data_inicio: string;
  data_ultima_movimentacao: string;
  data_ultima_verificacao: string | null;
  fisico: boolean;
  quantidade_movimentacoes: number;
  quantidade_envolvidos: number;
  segredo_justica: boolean | null;
  arquivado: boolean | null;
  status_predito: string | null;
  url: string | null;
  caderno: string | null;
  tribunal: EscavadorTribunal | null;
  capa: EscavadorCapa | null;
  envolvidos: EscavadorEnvolvido[];
  tipos_envolvido_pesquisado: Array<{ tipo: string; polo: string }>;
  match_documento_por: string | null;
}

export interface EscavadorTribunal {
  id: number;
  nome: string;
  sigla: string;
  categoria: string | null;
  estados: Array<{ nome: string; sigla: string }>;
}

export interface EscavadorCapa {
  assunto_principal_normalizado: EscavadorAssunto | null;
  assuntos_normalizados: EscavadorAssunto[];
  classe: string | null;
  assunto: string | null;
  area: string | null;
  orgao_julgador: string | null;
  data_distribuicao: string | null;
  data_arquivamento: string | null;
  valor_causa: {
    valor: number;
    moeda: string;
    valor_formatado: string;
  } | null;
  informacoes_complementares: Array<{ tipo: string; valor: string }>;
}

export interface EscavadorAssunto {
  id: number;
  nome: string;
  nome_com_pai: string;
  path_completo: string;
}

export interface EscavadorEnvolvido {
  nome: string | null;
  tipo: string | null;
  tipo_normalizado: string;
  tipo_pessoa: string;
  quantidade_processos: number;
  polo: string;
  prefixo: string | null;
  sufixo: string | null;
  cpf: string | null;
  cnpj: string | null;
  oabs: Array<{ numero: number; uf: string; tipo: string }>;
  advogados: EscavadorEnvolvido[];
}

// ── Movimentações (endpoint separado) ──

export interface EscavadorMovimentacoesResponse {
  items: EscavadorMovimentacao[];
  links: { next: string | null };
  paginator: { per_page: number };
}

export interface EscavadorMovimentacao {
  id: number;
  data: string;
  tipo: string | null;
  tipo_publicacao: string | null;
  conteudo: string;
  texto_categoria: string | null;
  classificacao_predita: {
    nome: string;
    descricao: string;
    hierarquia: string;
  } | null;
  fonte: {
    fonte_id: number;
    nome: string | null;
    tipo: string | null;
    sigla: string | null;
    grau: number | null;
    grau_formatado: string;
    caderno: string | null;
    tribunal: EscavadorTribunal | null;
  };
}

// ── Busca por envolvido ──

export interface EscavadorEnvolvidoResponse {
  envolvido_encontrado: {
    nome: string;
    tipo_pessoa: string;
    quantidade_processos: number;
    cpfs_com_esse_nome: number;
  };
  items: EscavadorProcesso[];
  links: { next: string | null };
  paginator: { per_page: number };
}

// ── Busca por advogado ──

export interface EscavadorAdvogadoResponse {
  advogado_encontrado: {
    nome: string;
    tipo_pessoa: string;
    quantidade_processos: number;
  };
  items: EscavadorProcesso[];
  links: { next: string | null };
  paginator: { per_page: number };
}

// ── Atualização de processo ──

export interface EscavadorSolicitacaoAtualizacao {
  id: number;
  status: 'PENDENTE' | 'SUCESSO' | 'NAO_ENCONTRADO' | 'ERRO';
  criado_em: string;
  numero_cnj: string;
  concluido_em: string | null;
}

// ── Monitoramento (V1) ──

export interface EscavadorMonitoramentoBody {
  tipo: 'UNICO' | 'NUMDOC' | 'NOME';
  valor: string;
  tribunal?: string;
  frequencia: 'DIARIA' | 'SEMANAL';
}

export interface EscavadorMonitoramentoResponse {
  id: number;
  tipo: string;
  valor: string;
  frequencia: string;
  criado_em: string;
}

// ── Webhook callback ──

export interface EscavadorCallbackPayload {
  id: number;
  evento: string;
  item_tipo: string;
  item_id: number;
  criado_em: string;
  dados: unknown;
}

// ── Error ──

export interface EscavadorErrorResponse {
  resposta: {
    mensagem?: string;
    erro?: string;
    erros?: Record<string, string[]>;
  };
  http_status: number;
  sucesso: false;
}
