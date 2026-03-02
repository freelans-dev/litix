import type { HttpClient } from '../http.js';
import type { Client, ClientCreate, ClientUpdate, ClientListParams, PaginatedResponse, ExposureScore } from '../types.js';
export declare class ClientsResource {
    private http;
    constructor(http: HttpClient);
    list(params?: ClientListParams): Promise<PaginatedResponse<Client>>;
    get(id: string): Promise<Client>;
    create(data: ClientCreate): Promise<Client>;
    update(id: string, data: ClientUpdate): Promise<Client>;
    delete(id: string): Promise<void>;
    exposureScore(id: string, options?: {
        ai?: boolean;
    }): Promise<ExposureScore>;
}
//# sourceMappingURL=clients.d.ts.map