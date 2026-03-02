export interface LitixConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
}
export interface RequestOptions {
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined>;
}
export declare class HttpClient {
    private baseUrl;
    private apiKey;
    private timeout;
    constructor(config: LitixConfig);
    request<T>(method: string, path: string, options?: RequestOptions): Promise<T>;
    get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
    patch<T>(path: string, body?: unknown): Promise<T>;
    delete<T>(path: string): Promise<T>;
}
//# sourceMappingURL=http.d.ts.map