import { datajudConfig } from '../../config/providers.config.js';
import { logger } from '../../utils/logger.js';
import { ProviderError } from '../../errors/provider.error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import type { DataJudQuery, DataJudSearchResponse } from './datajud.types.js';

export class DataJudClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = datajudConfig.baseUrl;
    this.timeoutMs = datajudConfig.timeoutMs;
    this.apiKey = datajudConfig.apiKey;
  }

  /**
   * POST /{alias}/_search — Elasticsearch search on a tribunal index.
   * @param alias DataJud index alias, e.g. 'api_publica_tjsp'
   * @param query Elasticsearch query body
   */
  async search(alias: string, query: DataJudQuery): Promise<DataJudSearchResponse> {
    const url = `${this.baseUrl}/${alias}/_search`;
    return this.request<DataJudSearchResponse>(url, {
      method: 'POST',
      body: JSON.stringify(query),
    });
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      logger.debug({ url, method: init.method }, 'DataJud API request');

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `APIKey ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');

        if (response.status === 429) {
          throw new ProviderError(
            ErrorCode.PROVIDER_RATE_LIMITED,
            'datajud',
            `Rate limited: ${errorText}`,
            { statusCode: 429 },
          );
        }
        if (response.status >= 500) {
          throw new ProviderError(
            ErrorCode.PROVIDER_UNAVAILABLE,
            'datajud',
            `Server error ${response.status}: ${errorText}`,
            { statusCode: response.status },
          );
        }

        throw new ProviderError(
          ErrorCode.PROVIDER_UNKNOWN_ERROR,
          'datajud',
          `API error ${response.status}: ${errorText}`,
          { statusCode: response.status },
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderError(
          ErrorCode.PROVIDER_TIMEOUT,
          'datajud',
          `Request timed out after ${this.timeoutMs}ms`,
        );
      }

      throw new ProviderError(
        ErrorCode.PROVIDER_UNAVAILABLE,
        'datajud',
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
