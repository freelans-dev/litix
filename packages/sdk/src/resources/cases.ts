import type { HttpClient } from '../http.js'
import type { Case, CaseCreate, CaseUpdate, CaseListParams, PaginatedResponse, AiSummaryResult } from '../types.js'

export class CasesResource {
  constructor(private http: HttpClient) {}

  list(params?: CaseListParams): Promise<PaginatedResponse<Case>> {
    return this.http.get('/cases', params as Record<string, string | number | boolean | undefined>)
  }

  get(cnj: string): Promise<Case> {
    return this.http.get(`/cases/${cnj}`)
  }

  create(data: CaseCreate): Promise<Case> {
    return this.http.post('/cases', data)
  }

  update(cnj: string, data: CaseUpdate): Promise<Case> {
    return this.http.patch(`/cases/${cnj}`, data)
  }

  delete(cnj: string): Promise<void> {
    return this.http.delete(`/cases/${cnj}`)
  }

  toggleMonitor(cnj: string, enabled: boolean): Promise<Case> {
    return this.http.patch(`/cases/${cnj}/monitor`, { monitor_enabled: enabled })
  }

  refresh(cnj: string): Promise<{ queued: boolean; cnj: string }> {
    return this.http.post(`/cases/${cnj}/refresh`)
  }

  aiSummary(cnj: string, type: 'movements' | 'timeline' = 'movements'): Promise<AiSummaryResult> {
    return this.http.post(`/cases/${cnj}/ai-summary`, { type })
  }
}
