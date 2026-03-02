import { LitixApiError } from './errors.js'

export interface LitixConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
}

export interface RequestOptions {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

export class HttpClient {
  private baseUrl: string
  private apiKey: string
  private timeout: number

  constructor(config: LitixConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = (config.baseUrl ?? 'https://app.litix.com.br/api/v1').replace(/\/$/, '')
    this.timeout = config.timeout ?? 30_000
  }

  async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    let url = `${this.baseUrl}${path}`

    if (options?.params) {
      const qs = new URLSearchParams()
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) qs.set(key, String(value))
      }
      const query = qs.toString()
      if (query) url += `?${query}`
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!res.ok) {
      throw await LitixApiError.fromResponse(res)
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, { params })
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body })
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body })
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }
}
