import { LitixApiError } from './errors.js';
export class HttpClient {
    baseUrl;
    apiKey;
    timeout;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseUrl = (config.baseUrl ?? 'https://app.litix.com.br/api/v1').replace(/\/$/, '');
        this.timeout = config.timeout ?? 30_000;
    }
    async request(method, path, options) {
        let url = `${this.baseUrl}${path}`;
        if (options?.params) {
            const qs = new URLSearchParams();
            for (const [key, value] of Object.entries(options.params)) {
                if (value !== undefined)
                    qs.set(key, String(value));
            }
            const query = qs.toString();
            if (query)
                url += `?${query}`;
        }
        const res = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: options?.body ? JSON.stringify(options.body) : undefined,
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!res.ok) {
            throw await LitixApiError.fromResponse(res);
        }
        if (res.status === 204)
            return undefined;
        return res.json();
    }
    get(path, params) {
        return this.request('GET', path, { params });
    }
    post(path, body) {
        return this.request('POST', path, { body });
    }
    patch(path, body) {
        return this.request('PATCH', path, { body });
    }
    delete(path) {
        return this.request('DELETE', path);
    }
}
//# sourceMappingURL=http.js.map