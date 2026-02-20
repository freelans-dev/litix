import { codiloConfig } from '../../config/providers.config.js';
import { logger } from '../../utils/logger.js';
import { ProviderError } from '../../errors/provider.error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import { CodiloAuthManager } from './codilo.auth.js';
import type {
  CodiloRequestBody,
  CodiloAutoRequestBody,
  CodiloRequestResponse,
  CodiloAutoRequestResponse,
  CodiloRequestPolling,
  CodiloPushBody,
  CodiloPushResponse,
  CodiloTribunal,
} from './codilo.types.js';

export class CodiloClient {
  private readonly auth: CodiloAuthManager;
  private readonly apiBaseUrl: string;
  private readonly pushBaseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.auth = new CodiloAuthManager();
    this.apiBaseUrl = codiloConfig.apiBaseUrl;
    this.pushBaseUrl = codiloConfig.pushBaseUrl;
    this.timeoutMs = codiloConfig.timeoutMs;
  }

  async createRequest(body: CodiloRequestBody): Promise<CodiloRequestResponse> {
    return this.post<CodiloRequestResponse>(`${this.apiBaseUrl}/request`, body);
  }

  async createAutoRequest(body: CodiloAutoRequestBody): Promise<CodiloAutoRequestResponse> {
    return this.post<CodiloAutoRequestResponse>(`${this.apiBaseUrl}/autorequest`, body);
  }

  async getRequestPolling(requestId: string): Promise<CodiloRequestPolling> {
    return this.get<CodiloRequestPolling>(`${this.apiBaseUrl}/request/${requestId}`);
  }

  async registerPush(body: CodiloPushBody): Promise<CodiloPushResponse> {
    return this.post<CodiloPushResponse>(`${this.pushBaseUrl}/processo/novo`, body);
  }

  async getAvailableCourts(): Promise<CodiloTribunal[]> {
    return this.get<CodiloTribunal[]>(`${this.apiBaseUrl}/available`);
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' });
  }

  private async request<T>(url: string, init: RequestInit, retryOnAuth = true): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const token = await this.auth.getAccessToken();

      logger.debug({ url, method: init.method }, 'Codilo API request');

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });

      if (response.status === 401 && retryOnAuth) {
        this.auth.invalidateToken();
        clearTimeout(timeout);
        return this.request<T>(url, init, false);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');

        if (response.status === 401) {
          throw new ProviderError(ErrorCode.PROVIDER_AUTH_FAILED, 'codilo', `Authentication failed: ${errorText}`, { statusCode: 401 });
        }
        if (response.status === 429) {
          throw new ProviderError(ErrorCode.PROVIDER_RATE_LIMITED, 'codilo', `Rate limited: ${errorText}`, { statusCode: 429 });
        }
        if (response.status >= 500) {
          throw new ProviderError(ErrorCode.PROVIDER_UNAVAILABLE, 'codilo', `Server error ${response.status}: ${errorText}`, { statusCode: response.status });
        }

        throw new ProviderError(ErrorCode.PROVIDER_UNKNOWN_ERROR, 'codilo', `API error ${response.status}: ${errorText}`, {
          statusCode: response.status,
        });
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderError(ErrorCode.PROVIDER_TIMEOUT, 'codilo', `Request timed out after ${this.timeoutMs}ms`);
      }

      throw new ProviderError(ErrorCode.PROVIDER_UNAVAILABLE, 'codilo', `Network error: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error instanceof Error ? error : undefined,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
