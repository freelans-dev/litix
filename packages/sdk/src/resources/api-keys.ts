import type { HttpClient } from '../http.js'
import type { ApiKey, ApiKeyCreate, ApiKeyCreated } from '../types.js'

export class ApiKeysResource {
  constructor(private http: HttpClient) {}

  list(): Promise<{ data: ApiKey[] }> {
    return this.http.get('/api-keys')
  }

  create(data?: ApiKeyCreate): Promise<ApiKeyCreated> {
    return this.http.post('/api-keys', data ?? {})
  }

  update(id: string, data: { name?: string; is_active?: boolean }): Promise<ApiKey> {
    return this.http.patch(`/api-keys/${id}`, data)
  }

  revoke(id: string): Promise<void> {
    return this.http.delete(`/api-keys/${id}`)
  }
}
