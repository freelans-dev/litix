import type {
  ILegalDataProvider,
  AsyncRequestResult,
  SearchByCnjOptions,
  SearchByDocumentOptions,
  MonitoringOptions,
} from '../provider.interface.js';
import type { ProviderStatus } from '../provider-status.js';
import type { ProcessoUnificado } from '../../models/processo-unificado.js';
import type { MonitoramentoResult } from '../../models/monitoramento.js';
import { JuditClient } from './judit.client.js';
import { mapJuditToUnificado, mapJuditWebhookToUnificado } from './judit.mapper.js';
import { juditConfig } from '../../config/providers.config.js';
import { logger } from '../../utils/logger.js';
import type { JuditWebhookPayload } from './judit.types.js';

export class JuditProvider implements ILegalDataProvider {
  readonly name = 'judit' as const;
  private readonly client: JuditClient;
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;
  private consecutiveFailures = 0;
  private responseTimes: number[] = [];

  constructor() {
    this.client = new JuditClient();
  }

  async searchByCnj(cnj: string, options?: SearchByCnjOptions): Promise<AsyncRequestResult> {
    const start = Date.now();
    try {
      const response = await this.client.createRequest({
        search: {
          search_type: 'lawsuit_cnj',
          search_key: cnj,
          response_type: 'lawsuit',
          cache_ttl_in_days: options?.cacheTtlDays ?? juditConfig.cacheTtlDays,
        },
        callback_url: options?.callbackUrl,
      });

      this.recordSuccess(Date.now() - start);
      logger.info({ provider: 'judit', requestId: response.request_id, cnj }, 'Search by CNJ initiated');

      return {
        requestId: response.request_id,
        provider: 'judit',
        status: 'pending',
      };
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async searchByDocument(options: SearchByDocumentOptions): Promise<AsyncRequestResult> {
    const start = Date.now();
    try {
      const searchTypeMap: Record<string, string> = {
        cpf: 'cpf',
        cnpj: 'cnpj',
        oab: 'oab',
        name: 'name',
      };

      const response = await this.client.createRequest({
        search: {
          search_type: searchTypeMap[options.documentType] as 'cpf' | 'cnpj' | 'oab' | 'name',
          search_key: options.documentValue,
          response_type: 'lawsuit',
          cache_ttl_in_days: options.cacheTtlDays ?? juditConfig.cacheTtlDays,
        },
        callback_url: options.callbackUrl,
      });

      this.recordSuccess(Date.now() - start);
      logger.info({ provider: 'judit', requestId: response.request_id, type: options.documentType }, 'Search by document initiated');

      return {
        requestId: response.request_id,
        provider: 'judit',
        status: 'pending',
      };
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async pollResult(requestId: string): Promise<ProcessoUnificado | null> {
    const status = await this.client.getRequestStatus(requestId);

    if (status.status === 'completed') {
      const responsesPage = await this.client.getResponses(requestId);

      if (responsesPage.page_data.length > 0) {
        const firstResponse = responsesPage.page_data[0];
        if (firstResponse?.response_data) {
          return mapJuditToUnificado(firstResponse.response_data, requestId);
        }
      }
      return null;
    }

    if (status.status === 'failed' || status.status === 'cancelled') {
      logger.warn({ provider: 'judit', requestId, status: status.status }, 'Request failed or cancelled');
      return null;
    }

    // Still pending/processing
    return null;
  }

  async startMonitoring(cnj: string, options: MonitoringOptions): Promise<MonitoramentoResult> {
    const response = await this.client.createTracking({
      search: {
        search_type: 'lawsuit_cnj',
        search_key: cnj,
        response_type: 'lawsuit',
      },
      recurrence: options.recurrenceDays ?? 1,
    });

    return {
      id: response.tracking_id,
      cnj,
      provider: 'judit',
      status: 'active',
      callbackUrl: options.callbackUrl,
      recurrenceDays: response.recurrence,
      createdAt: new Date(response.created_at),
      providerTrackingId: response.tracking_id,
    };
  }

  async stopMonitoring(monitoringId: string): Promise<void> {
    await this.client.deleteTracking(monitoringId);
  }

  async getStatus(): Promise<ProviderStatus> {
    const avgMs = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      name: 'judit',
      healthy: this.consecutiveFailures < 3,
      circuitState: 'closed',
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      consecutiveFailures: this.consecutiveFailures,
      averageResponseMs: Math.round(avgMs),
    };
  }

  parseWebhookPayload(rawPayload: unknown): ProcessoUnificado {
    const payload = rawPayload as JuditWebhookPayload;
    const result = mapJuditWebhookToUnificado(payload);
    if (!result) {
      throw new Error('Could not parse Judit webhook payload into ProcessoUnificado');
    }
    return result;
  }

  private recordSuccess(responseTimeMs: number): void {
    this.lastSuccessAt = new Date();
    this.consecutiveFailures = 0;
    this.responseTimes.push(responseTimeMs);
    if (this.responseTimes.length > 100) this.responseTimes.shift();
  }

  private recordFailure(): void {
    this.lastFailureAt = new Date();
    this.consecutiveFailures++;
  }
}
