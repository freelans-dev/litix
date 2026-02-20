import { predictusConfig } from '../../config/providers.config.js';
import { logger } from '../../utils/logger.js';
import { ProviderError } from '../../errors/provider.error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import { PredictusAuthManager } from './predictus.auth.js';
import type {
  PredictusBuscaCnjBody,
  PredictusBuscaCpfBody,
  PredictusBuscaOabBody,
  PredictusProcesso,
} from './predictus.types.js';

export class PredictusClient {
  private readonly auth: PredictusAuthManager;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.auth = new PredictusAuthManager();
    this.baseUrl = predictusConfig.apiBaseUrl;
    this.timeoutMs = predictusConfig.timeoutMs;
  }

  async buscarPorCnj(body: PredictusBuscaCnjBody): Promise<PredictusProcesso[]> {
    return this.post<PredictusProcesso[]>(`${this.baseUrl}/processos/judiciais/buscarPorNumeroCNJ`, body);
  }

  async buscarPorCpfParte(body: PredictusBuscaCpfBody): Promise<PredictusProcesso[]> {
    return this.post<PredictusProcesso[]>(`${this.baseUrl}/processos/judiciais/buscarPorCPFParte`, body);
  }

  async buscarPorOab(body: PredictusBuscaOabBody): Promise<PredictusProcesso[]> {
    return this.post<PredictusProcesso[]>(`${this.baseUrl}/processos/judiciais/buscarPorOAB`, body);
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async request<T>(url: string, init: RequestInit, retryOnAuth = true): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const token = await this.auth.getAccessToken();

      logger.debug({ url, method: init.method }, 'Predictus API request');

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });

      // Auto-retry on 401 (token may have expired)
      if (response.status === 401 && retryOnAuth) {
        this.auth.invalidateToken();
        clearTimeout(timeout);
        return this.request<T>(url, init, false);
      }

      if (response.status === 204) {
        return [] as unknown as T;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');

        if (response.status === 401) {
          throw new ProviderError(ErrorCode.PROVIDER_AUTH_FAILED, 'predictus', `Authentication failed: ${errorText}`, { statusCode: 401 });
        }
        if (response.status === 429) {
          throw new ProviderError(ErrorCode.PROVIDER_RATE_LIMITED, 'predictus', `Rate limited: ${errorText}`, { statusCode: 429 });
        }
        if (response.status >= 500) {
          throw new ProviderError(ErrorCode.PROVIDER_UNAVAILABLE, 'predictus', `Server error ${response.status}: ${errorText}`, { statusCode: response.status });
        }

        throw new ProviderError(ErrorCode.PROVIDER_UNKNOWN_ERROR, 'predictus', `API error ${response.status}: ${errorText}`, {
          statusCode: response.status,
        });
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderError(ErrorCode.PROVIDER_TIMEOUT, 'predictus', `Request timed out after ${this.timeoutMs}ms`);
      }

      throw new ProviderError(ErrorCode.PROVIDER_UNAVAILABLE, 'predictus', `Network error: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error instanceof Error ? error : undefined,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
