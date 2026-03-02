import type { HttpClient } from '../http.js'
import type { Client, ClientCreate, ClientUpdate, ClientListParams, PaginatedResponse, ExposureScore } from '../types.js'

export class ClientsResource {
  constructor(private http: HttpClient) {}

  list(params?: ClientListParams): Promise<PaginatedResponse<Client>> {
    return this.http.get('/clients', params as Record<string, string | number | boolean | undefined>)
  }

  get(id: string): Promise<Client> {
    return this.http.get(`/clients/${id}`)
  }

  create(data: ClientCreate): Promise<Client> {
    return this.http.post('/clients', data)
  }

  update(id: string, data: ClientUpdate): Promise<Client> {
    return this.http.patch(`/clients/${id}`, data)
  }

  delete(id: string): Promise<void> {
    return this.http.delete(`/clients/${id}`)
  }

  exposureScore(id: string, options?: { ai?: boolean }): Promise<ExposureScore> {
    return this.http.get(`/clients/${id}/exposure-score`, { ai: options?.ai ? 'true' : undefined })
  }
}
