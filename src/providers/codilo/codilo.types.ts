// ── Authentication ──

export interface CodiloAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ── Request (manual - requires platform/court) ──

export interface CodiloCallback {
  method: 'POST';
  url: string;
  headers?: Record<string, string>;
}

export interface CodiloRequestBody {
  source: string;
  platform: string;
  search: string;
  query: string;
  param: {
    key: string;
    value: string;
  };
  callbacks?: CodiloCallback[];
  makeDownload?: boolean;
  format?: 'default' | 'full';
}

// ── Autorequest (auto-discovers tribunal) ──

export interface CodiloAutoRequestBody {
  key: 'cnj' | 'cpf' | 'cnpj' | 'name';
  value: string;
  callbacks?: CodiloCallback[];
  ignore?: boolean;
}

// ── Autorequest response ──

export interface CodiloAutoRequestResponse {
  success: boolean;
  data: {
    id: string;
    key: string;
    value: string;
    createdAt: string;
    credentials: boolean;
    requests: Array<{
      id: string;
      status: string;
      source: string;
      platform: string;
      query: string;
      court: string;
      search: string;
      uf: string;
      param: { key: string; value: string };
      makeDownload: boolean;
      respondedAt: string | null;
      createdAt: string;
    }>;
  };
}

// ── Manual request response ──

export interface CodiloRequestResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
    source: string;
    platform: string;
    query: string;
    court: string;
    respondedAt: string | null;
    createdAt: string;
  };
}

// ── Polling (GET /request/{id}) ──

export interface CodiloRequestPolling {
  success: boolean;
  type: string;
  requested: {
    id: string;
    status: 'pending' | 'success' | 'warning' | 'error';
    source: string;
    platform: string;
    query: string;
    court: string;
    search: string;
    uf: string;
    param: { key: string; value: string };
    makeDownload: boolean;
    respondedAt: string | null;
    createdAt: string;
  };
  info: {
    source: string;
    platform: string;
    search: string;
    query: string;
    paramKey: string;
    url: string;
  };
  data: CodiloProcessResult[];
}

// ── Process data from Codilo ──

export interface CodiloCoverItem {
  description: string;
  value: string;
}

export interface CodiloProcessResult {
  cover: CodiloCoverItem[];
  properties: {
    number?: string;
    startAt?: string;
    subject?: string;
    jurisdiction?: string;
    origin?: string;
    degree?: string;
    cnj?: string;
    class?: string;
    status?: string;
    actionValue?: string;
  };
  people: CodiloPerson[];
  steps: CodiloStep[];
}

export interface CodiloPerson {
  pole: string;
  description: string;
  name: string;
  doc?: string;
  lawyers?: Array<{
    name: string;
    uf?: string;
    oab?: string;
  }>;
}

export interface CodiloStep {
  timestamp: string;
  title: string;
  description: string;
}

// ── Push monitoring ──

export interface CodiloPushBody {
  cnj: string;
  callbacks?: CodiloCallback[];
  ignore?: boolean;
}

export interface CodiloPushResponse {
  id: string;
  cnj: string;
  createdAt: string;
  sources: Array<{
    id: string;
    platform: string;
    court: string;
    status: string;
  }>;
}

// ── Disable scopes ──

export interface CodiloDisableScopesBody {
  infoIds: string[];
}

export interface CodiloDisableScopesResponse {
  infoId: string;
  message: string;
}

// ── Coverage ──

export interface CodiloTribunal {
  id: string;
  sigla: string;
  nome: string;
}

// ── Webhook (callback payload) ──

export interface CodiloWebhookPayload {
  action: 'requestStatusChanged';
  requestId: string;
  respondedAt: string;
  status: 'success' | 'warning' | 'error';
  type: string;
  requested: {
    id: string;
    status: string;
    source: string;
    platform: string;
    court: string;
    createdAt: string;
    respondedAt: string;
  };
  info: {
    source: string;
    platform: string;
    search: string;
    query: string;
  };
  data: CodiloProcessResult[];
}
