import type { HttpClient } from '../http.js';
import type { WebhookEndpoint, WebhookCreate, WebhookUpdate } from '../types.js';
export declare class WebhooksResource {
    private http;
    constructor(http: HttpClient);
    list(): Promise<{
        data: WebhookEndpoint[];
    }>;
    create(data: WebhookCreate): Promise<WebhookEndpoint>;
    update(id: string, data: WebhookUpdate): Promise<WebhookEndpoint>;
    delete(id: string): Promise<void>;
}
//# sourceMappingURL=webhooks.d.ts.map