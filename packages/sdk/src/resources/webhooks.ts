import type { HttpClient } from '../http.js'
import type { WebhookEndpoint, WebhookCreate, WebhookUpdate } from '../types.js'

export class WebhooksResource {
  constructor(private http: HttpClient) {}

  list(): Promise<{ data: WebhookEndpoint[] }> {
    return this.http.get('/webhooks')
  }

  create(data: WebhookCreate): Promise<WebhookEndpoint> {
    return this.http.post('/webhooks', data)
  }

  update(id: string, data: WebhookUpdate): Promise<WebhookEndpoint> {
    return this.http.patch(`/webhooks/${id}`, data)
  }

  delete(id: string): Promise<void> {
    return this.http.delete(`/webhooks/${id}`)
  }
}
