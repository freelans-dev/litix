export class LitixApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'LitixApiError'
  }

  get isRateLimited() { return this.status === 429 }
  get isUnauthorized() { return this.status === 401 }
  get isForbidden() { return this.status === 403 }
  get isNotFound() { return this.status === 404 }
  get isPlanLimitExceeded() { return this.status === 402 }
  get isValidationError() { return this.status === 422 }
  get isConflict() { return this.status === 409 }

  static async fromResponse(res: Response): Promise<LitixApiError> {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const message = body.error ?? body.message ?? `HTTP ${res.status}`
    return new LitixApiError(res.status, message, body)
  }
}
