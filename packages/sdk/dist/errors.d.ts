export declare class LitixApiError extends Error {
    readonly status: number;
    readonly body?: Record<string, unknown> | undefined;
    constructor(status: number, message: string, body?: Record<string, unknown> | undefined);
    get isRateLimited(): boolean;
    get isUnauthorized(): boolean;
    get isForbidden(): boolean;
    get isNotFound(): boolean;
    get isPlanLimitExceeded(): boolean;
    get isValidationError(): boolean;
    get isConflict(): boolean;
    static fromResponse(res: Response): Promise<LitixApiError>;
}
//# sourceMappingURL=errors.d.ts.map