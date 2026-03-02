import type { HttpClient } from '../http.js';
import type { Alert, AlertListParams, PaginatedResponse } from '../types.js';
export declare class AlertsResource {
    private http;
    constructor(http: HttpClient);
    list(params?: AlertListParams): Promise<PaginatedResponse<Alert>>;
    markAllRead(): Promise<{
        updated: number;
    }>;
    markRead(id: string, isRead?: boolean): Promise<Alert>;
}
//# sourceMappingURL=alerts.d.ts.map