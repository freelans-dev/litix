import { HttpClient } from './http.js';
import { CasesResource } from './resources/cases.js';
import { ClientsResource } from './resources/clients.js';
import { AlertsResource } from './resources/alerts.js';
import { WebhooksResource } from './resources/webhooks.js';
import { TeamResource } from './resources/team.js';
import { SearchesResource } from './resources/searches.js';
import { ApiKeysResource } from './resources/api-keys.js';
export class Litix {
    cases;
    clients;
    alerts;
    webhooks;
    team;
    searches;
    apiKeys;
    http;
    constructor(config) {
        this.http = new HttpClient(config);
        this.cases = new CasesResource(this.http);
        this.clients = new ClientsResource(this.http);
        this.alerts = new AlertsResource(this.http);
        this.webhooks = new WebhooksResource(this.http);
        this.team = new TeamResource(this.http);
        this.searches = new SearchesResource(this.http);
        this.apiKeys = new ApiKeysResource(this.http);
    }
    analytics() {
        return this.http.get('/analytics/providers');
    }
}
//# sourceMappingURL=client.js.map