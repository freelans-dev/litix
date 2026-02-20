import { juditConfig } from '../../config/providers.config.js';
import { logger } from '../../utils/logger.js';
import { ProviderError } from '../../errors/provider.error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import type {
  JuditCreateRequestBody,
  JuditCreateRequestResponse,
  JuditRequestStatus,
  JuditResponsesPage,
  JuditCreateTrackingBody,
  JuditTrackingResponse,
  JuditErrorResponse,
} from './judit.types.js';

export class JuditClient {
  private readonly apiKey: string;
  private readonly requestsUrl: string;
  private readonly trackingUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.apiKey = juditConfig.apiKey;
    this.requestsUrl = juditConfig.requestsUrl;
    this.trackingUrl = juditConfig.trackingUrl;
    this.timeoutMs = juditConfig.timeoutMs;
  }

  async createRequest(body: JuditCreateRequestBody): Promise<JuditCreateRequestResponse> {
    return this.post<JuditCreateRequestResponse>(`${this.requestsUrl}/requests`, body);
  }

  async getRequestStatus(requestId: string): Promise<JuditRequestStatus> {
    return this.get<JuditRequestStatus>(`${this.requestsUrl}/requests/${requestId}`);
  }

  async getResponses(requestId: string, page = 1, pageSize = 10): Promise<JuditResponsesPage> {
    const params = new URLSearchParams({
      request_id: requestId,
      response_type: 'lawsuit',
      page: String(page),
      page_size: String(pageSize),
    });
    return this.get<JuditResponsesPage>(`${this.requestsUrl}/responses?${params}`);
  }

  async createTracking(body: JuditCreateTrackingBody): Promise<JuditTrackingResponse> {
    return this.post<JuditTrackingResponse>(`${this.trackingUrl}/trackings`, body);
  }

  async deleteTracking(trackingId: string): Promise<void> {
    await this.delete(`${this.trackingUrl}/trackings/${trackingId}`);
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

  private async delete(url: string): Promise<void> {
    await this.request<unknown>(url, { method: 'DELETE' });
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      logger.debug({ url, method: init.method }, 'Judit API request');

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as JuditErrorResponse | null;
        const message = errorBody?.error?.message ?? response.statusText;

        if (response.status === 401) {
          throw new ProviderError(ErrorCode.PROVIDER_AUTH_FAILED, 'judit', `Authentication failed: ${message}`, { statusCode: 401 });
        }
        if (response.status === 429) {
          throw new ProviderError(ErrorCode.PROVIDER_RATE_LIMITED, 'judit', `Rate limited: ${message}`, { statusCode: 429 });
        }
        if (response.status >= 500) {
          throw new ProviderError(ErrorCode.PROVIDER_UNAVAILABLE, 'judit', `Server error: ${message}`, { statusCode: response.status });
        }

        throw new ProviderError(ErrorCode.PROVIDER_UNKNOWN_ERROR, 'judit', `API error ${response.status}: ${message}`, {
          statusCode: response.status,
          details: { errorBody },
        });
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderError(ErrorCode.PROVIDER_TIMEOUT, 'judit', `Request timed out after ${this.timeoutMs}ms`);
      }

      throw new ProviderError(ErrorCode.PROVIDER_UNAVAILABLE, 'judit', `Network error: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error instanceof Error ? error : undefined,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
