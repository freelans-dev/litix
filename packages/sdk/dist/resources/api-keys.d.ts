import type { HttpClient } from '../http.js';
import type { ApiKey, ApiKeyCreate, ApiKeyCreated } from '../types.js';
export declare class ApiKeysResource {
    private http;
    constructor(http: HttpClient);
    list(): Promise<{
        data: ApiKey[];
    }>;
    create(data?: ApiKeyCreate): Promise<ApiKeyCreated>;
    update(id: string, data: {
        name?: string;
        is_active?: boolean;
    }): Promise<ApiKey>;
    revoke(id: string): Promise<void>;
}
//# sourceMappingURL=api-keys.d.ts.map