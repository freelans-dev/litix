// ── Request creation ──

export interface JuditCreateRequestBody {
  search: {
    search_type: 'lawsuit_cnj' | 'cpf' | 'cnpj' | 'oab' | 'name';
    search_key: string;
    response_type?: 'lawsuit' | 'parties' | 'attachments' | 'step' | 'lawsuits';
    cache_ttl_in_days?: number;
    search_params?: {
      lawsuit_instance?: number;
      filter?: {
        side?: string;
        amount_gte?: number;
        distribution_date_gte?: string;
        distribution_date_lte?: string;
        tribunals?: { keys: string[] };
      };
    };
  };
  callback_url?: string;
  with_attachments?: boolean;
}

export interface JuditCreateRequestResponse {
  request_id: string;
  status: string;
  search: {
    search_type: string;
    search_key: string;
  };
  origin: string;
  origin_id: string;
  tags: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Polling ──

export interface JuditRequestStatus {
  request_id: string;
  status: 'created' | 'pending' | 'started' | 'processing' | 'completed' | 'cancelled' | 'failed';
  created_at: string;
  updated_at: string;
}

// ── Responses ──

export interface JuditResponsesPage {
  page: number;
  page_count: number;
  all_pages_count: number;
  all_count: number;
  data: JuditResponseItem[];
}

export interface JuditResponseItem {
  response_id: string;
  request_id: string;
  response_type: string;
  user_id: string;
  origin: string;
  origin_id: string;
  cached_response: boolean;
  tags: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  lawsuit?: JuditLawsuit;
}

// ── Lawsuit ──

export interface JuditLawsuit {
  response_data: {
    area?: string;
    name?: string;
    distribution_date?: string;
    instance?: string;
    courts?: string;
    secrecy_level?: number;
    subjects?: JuditSubject[];
    classifications?: string[];
    judge?: string;
    code?: string;
    justice_description?: string;
    county?: string;
    tribunal_acronym?: string;
    city?: string;
    state?: string;
    situation?: string;
    phase?: string;
    status?: string;
    amount?: number;
  };
  parties?: JuditParty[];
  steps?: JuditStep[];
  attachments?: JuditAttachment[];
  related_lawsuits?: Array<{ code?: string; instance?: string }>;
}

export interface JuditSubject {
  code?: string;
  description?: string;
  main?: boolean;
}

export interface JuditParty {
  name: string;
  main_document?: string;
  side?: string;
  person_type?: string;
  documents?: Array<{ document_type?: string; document?: string }>;
  lawyers?: JuditLawyer[];
}

export interface JuditLawyer {
  name: string;
  oab?: string;
}

export interface JuditStep {
  step_date: string;
  step_type?: string;
  content?: string;
  private?: boolean;
  step_id?: string;
}

export interface JuditAttachment {
  step_id?: string;
  attachment_date: string;
  attachment_name: string;
  extension?: string;
}

// ── Tracking ──

export interface JuditCreateTrackingBody {
  search: {
    search_type: 'lawsuit_cnj';
    search_key: string;
    response_type?: 'lawsuit';
  };
  recurrence: number;
}

export interface JuditTrackingResponse {
  tracking_id: string;
  user_id: string;
  status: string;
  recurrence: number;
  search: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Webhook ──

export interface JuditWebhookPayload {
  user_id: string;
  callback_id: string;
  event_type: string;
  reference_type: 'request' | 'tracking';
  reference_id: string;
  payload: JuditLawsuit | JuditApplicationInfo | JuditApplicationError;
}

export interface JuditApplicationInfo {
  response_type: 'application_info';
  code: number;
  message: string;
}

export interface JuditApplicationError {
  response_type: 'application_error';
  code: number;
  message: string;
}

// ── Error ──

export interface JuditErrorResponse {
  error: {
    name: string;
    message: string;
    data: unknown[];
  };
}
