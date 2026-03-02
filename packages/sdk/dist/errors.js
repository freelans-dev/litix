export class LitixApiError extends Error {
    status;
    body;
    constructor(status, message, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = 'LitixApiError';
    }
    get isRateLimited() { return this.status === 429; }
    get isUnauthorized() { return this.status === 401; }
    get isForbidden() { return this.status === 403; }
    get isNotFound() { return this.status === 404; }
    get isPlanLimitExceeded() { return this.status === 402; }
    get isValidationError() { return this.status === 422; }
    get isConflict() { return this.status === 409; }
    static async fromResponse(res) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        const message = body.error ?? body.message ?? `HTTP ${res.status}`;
        return new LitixApiError(res.status, message, body);
    }
}
//# sourceMappingURL=errors.js.map