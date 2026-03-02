// ---- Pagination ----

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
}

// ---- Cases ----

export interface Case {
  id: string
  cnj: string
  tribunal: string | null
  nome_caso: string | null
  classe: string | null
  area: string | null
  assunto_principal: string | null
  status: string | null
  fase: string | null
  juiz: string | null
  valor_causa: number | null
  data_distribuicao: string | null
  autor_principal: string | null
  reu_principal: string | null
  orgao: string | null
  vara: string | null
  foro: string | null
  instancia: number | null
  monitor_enabled: boolean
  movement_count: number | null
  ultimo_step_date: string | null
  ultimo_andamento: string | null
  completeness: number | null
  provider: string | null
  merged_from: string[] | null
  created_at: string
}

export interface CaseCreate {
  cnj: string
  tribunal?: string
  monitor_enabled?: boolean
  provider?: 'datajud' | 'codilo' | 'escavador' | 'judit' | 'predictus'
}

export interface CaseUpdate {
  cliente?: string | null
  responsavel?: string | null
  setor?: string | null
  contingencia?: string | null
  probabilidade?: string | null
  risco?: string | null
  faixa?: string | null
  resultado?: string | null
  desfecho?: string | null
  provisionamento?: number | null
  reserva?: number | null
  notes?: string | null
}

export interface CaseListParams {
  q?: string
  monitor?: boolean
  status?: string
  client?: string
  page?: number
  limit?: number
}

// ---- Movements ----

export interface Movement {
  id: string
  movement_date: string
  description: string
  type: string | null
  category: string | null
}

// ---- Clients ----

export interface Client {
  id: string
  name: string
  tipo_pessoa: string | null
  documento: string | null
  email: string | null
  phone: string | null
  address_line: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface ClientCreate {
  name: string
  tipo_pessoa?: 'fisica' | 'juridica'
  documento?: string
  email?: string
  phone?: string
  address_line?: string
  city?: string
  state?: string
  zip_code?: string
  notes?: string
}

export interface ClientUpdate extends Partial<ClientCreate> {
  is_active?: boolean
}

export interface ClientListParams {
  q?: string
  active?: boolean
  page?: number
  limit?: number
}

export interface ExposureScore {
  score: number
  level: string
  factors: Array<{ key: string; name: string; raw: number; detail: string }>
  summary: {
    total_cases: number
    active_cases: number
    total_valor_ativo: number
    cases_provavel: number
    cases_critico_alto: number
    cases_passiva: number
    cases_execucao: number
    areas: Record<string, number>
    max_valor: number
  }
  narrative: string | null
  case_count: number
}

// ---- Alerts ----

export interface Alert {
  id: string
  type: string
  title: string
  body: string | null
  cnj: string | null
  case_id: string | null
  is_read: boolean
  created_at: string
}

export interface AlertListParams {
  filter?: 'unread' | 'deadline'
  page?: number
  limit?: number
}

// ---- Webhooks ----

export interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  secret: string
  created_at: string
}

export interface WebhookCreate {
  name: string
  url: string
  events: ('process.movement' | 'process.deadline' | 'process.status' | 'process.updated')[]
}

export interface WebhookUpdate {
  name?: string
  url?: string
  events?: string[]
  is_active?: boolean
}

// ---- Team ----

export interface TeamMember {
  user_id: string
  role: string
  is_active: boolean
  accepted_at: string | null
  email: string | null
  full_name: string | null
}

export interface InviteParams {
  email: string
  role?: 'admin' | 'member' | 'viewer'
}

// ---- Profile ----

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  oab_number: string | null
  oab_state: string | null
}

export interface ProfileUpdate {
  full_name?: string
  phone?: string
}

// ---- Searches ----

export interface DocumentSearch {
  id: string
  document: string
  document_type: string
  status: string
  cases_found: number | null
  cases_imported: number | null
  created_at: string
}

export interface OabImport {
  id: string
  oab_number: string
  oab_uf: string
  status: string
  cases_found: number | null
  cases_imported: number | null
  created_at: string
}

// ---- API Keys ----

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export interface ApiKeyCreate {
  name?: string
}

export interface ApiKeyCreated extends ApiKey {
  api_key: string
  warning: string
}

// ---- Analytics ----

export interface ProviderAnalytics {
  by_provider: Array<{ provider: string; count: number; cost: number; avg_completeness: number }>
  daily: Array<{ date: string; provider: string; count: number }>
  by_tribunal: Array<{ tribunal: string; provider: string; count: number }>
  success_rate: Array<{ provider: string; status: string; count: number }>
  totals: { queries: number; cost: number; savings: number }
}

// ---- AI Summary ----

export interface AiSummaryResult {
  summary?: string
  classifications?: Array<{
    movement_date: string
    category: string
    importance: string
    one_liner: string
  }>
  timeline?: string
}
