import { HttpClient, type LitixConfig } from './http.js'
import { CasesResource } from './resources/cases.js'
import { ClientsResource } from './resources/clients.js'
import { AlertsResource } from './resources/alerts.js'
import { WebhooksResource } from './resources/webhooks.js'
import { TeamResource } from './resources/team.js'
import { SearchesResource } from './resources/searches.js'
import { ApiKeysResource } from './resources/api-keys.js'
import type { ProviderAnalytics } from './types.js'

export class Litix {
  readonly cases: CasesResource
  readonly clients: ClientsResource
  readonly alerts: AlertsResource
  readonly webhooks: WebhooksResource
  readonly team: TeamResource
  readonly searches: SearchesResource
  readonly apiKeys: ApiKeysResource

  private http: HttpClient

  constructor(config: LitixConfig) {
    this.http = new HttpClient(config)
    this.cases = new CasesResource(this.http)
    this.clients = new ClientsResource(this.http)
    this.alerts = new AlertsResource(this.http)
    this.webhooks = new WebhooksResource(this.http)
    this.team = new TeamResource(this.http)
    this.searches = new SearchesResource(this.http)
    this.apiKeys = new ApiKeysResource(this.http)
  }

  analytics(): Promise<ProviderAnalytics> {
    return this.http.get('/analytics/providers')
  }
}
