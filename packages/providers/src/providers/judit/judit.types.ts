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
  user_id: string;
  company_id: string;
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

// ── Responses (actual API structure) ──
// Endpoint: GET /responses?request_id=...&response_type=lawsuit
// Returns: { page_data: JuditResponseItem[] }

export interface JuditResponsesPage {
  request_status: string;
  page: string | number;
  page_count: number;
  all_pages_count: number;
  all_count: number;
  page_data: JuditResponseItem[];
}

export interface JuditResponseItem {
  response_id: string;
  request_id: string;
  response_type: string;
  user_id: string;
  origin: string;
  origin_id: string;
  response_data: JuditLawsuitData;
  tags: Record<string, unknown>;
  created_at: string;
  request_created_at: string;
}

// ── Lawsuit data (inside response_data) ──

export interface JuditLawsuitData {
  code?: string;
  justice?: string;
  tribunal?: string;
  tribunal_acronym?: string;
  instance?: number;
  distribution_date?: string;
  judge?: string;
  secrecy_level?: number;
  subjects?: JuditSubject[];
  classifications?: Array<{ code?: string; name?: string }>;
  courts?: Array<{ code?: string; name?: string }>;
  parties?: JuditParty[];
  steps?: JuditStep[];
  attachments?: JuditAttachment[];
  related_lawsuits?: Array<{ code?: string; instance?: number }>;
  last_step?: JuditLastStep;
  county?: string;
  amount?: number;
  state?: string;
  city?: string;
  justice_description?: string;
  area?: string;
  phase?: string;
  status?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  free_justice?: boolean;
  metadata?: Record<string, unknown>;
  crawler?: {
    source_name?: string;
    crawl_id?: string;
    weight?: number;
    updated_at?: string;
  };
  tags?: Record<string, unknown>;
}

export interface JuditSubject {
  code?: string;
  name?: string;         // API uses 'name', not 'description'
  description?: string;  // kept for compatibility
  main?: boolean;
}

export interface JuditParty {
  name: string;
  main_document?: string;
  side?: string;
  person_type?: string;
  entity_type?: string;
  documents?: Array<{ document_type?: string; document?: string }>;
  lawyers?: JuditLawyer[];
  tags?: Record<string, unknown>;
}

export interface JuditLawyer {
  name: string;
  oab?: string;
}

export interface JuditStep {
  step_id?: string;
  step_date: string;
  step_type?: string;
  content?: string;
  private?: boolean;
  lawsuit_cnj?: string;
  lawsuit_instance?: number;
  tags?: Record<string, unknown>;
}

export interface JuditLastStep extends JuditStep {
  steps_count?: number;
}

export interface JuditAttachment {
  attachment_id?: string;
  step_id?: string;
  attachment_date: string;
  attachment_name: string;
  extension?: string;
  status?: string;
  user_data?: unknown;
  tags?: Record<string, unknown>;
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
  payload: JuditLawsuitData | JuditApplicationInfo | JuditApplicationError;
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
