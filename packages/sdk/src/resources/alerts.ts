import type { HttpClient } from '../http.js'
import type { Alert, AlertListParams, PaginatedResponse } from '../types.js'

export class AlertsResource {
  constructor(private http: HttpClient) {}

  list(params?: AlertListParams): Promise<PaginatedResponse<Alert>> {
    return this.http.get('/alerts', params as Record<string, string | number | boolean | undefined>)
  }

  markAllRead(): Promise<{ updated: number }> {
    return this.http.patch('/alerts', { mark_all_read: true })
  }

  markRead(id: string, isRead = true): Promise<Alert> {
    return this.http.patch(`/alerts/${id}`, { is_read: isRead })
  }
}
