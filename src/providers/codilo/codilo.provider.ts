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
import { CodiloClient } from './codilo.client.js';
import { mapCodiloToUnificado, mapCodiloWebhookToUnificado } from './codilo.mapper.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import type { CodiloWebhookPayload } from './codilo.types.js';

export class CodiloProvider implements ILegalDataProvider {
  readonly name = 'codilo' as const;
  private readonly client: CodiloClient;
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;
  private consecutiveFailures = 0;
  private responseTimes: number[] = [];

  constructor() {
    this.client = new CodiloClient();
  }

  /**
   * Autorequest creates multiple sub-requests across platforms.
   * We store all sub-request IDs joined by comma so pollResult can iterate them.
   */
  async searchByCnj(cnj: string, options?: SearchByCnjOptions): Promise<AsyncRequestResult> {
    const start = Date.now();
    try {
      const callbacks = options?.callbackUrl
        ? [{ method: 'POST' as const, url: options.callbackUrl }]
        : env.WEBHOOK_BASE_URL
          ? [{ method: 'POST' as const, url: `${env.WEBHOOK_BASE_URL}/webhooks/codilo` }]
          : undefined;

      const response = await this.client.createAutoRequest({
        key: 'cnj',
        value: cnj,
        callbacks,
      });

      // Store all sub-request IDs so we can poll each one
      const subRequestIds = response.data.requests.map((r) => r.id);
      const compositeId = subRequestIds.join(',');

      this.recordSuccess(Date.now() - start);
      logger.info({ provider: 'codilo', autoRequestId: response.data.id, subRequests: subRequestIds.length, cnj }, 'Search by CNJ initiated');

      return {
        requestId: compositeId,
        provider: 'codilo',
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
      const keyMap: Record<string, string> = { cpf: 'cpf', cnpj: 'cnpj', name: 'name', oab: 'oab' };
      const key = keyMap[options.documentType];

      if (!key) {
        throw new Error(`Unsupported document type for Codilo: ${options.documentType}`);
      }

      const callbacks = options.callbackUrl
        ? [{ method: 'POST' as const, url: options.callbackUrl }]
        : env.WEBHOOK_BASE_URL
          ? [{ method: 'POST' as const, url: `${env.WEBHOOK_BASE_URL}/webhooks/codilo` }]
          : undefined;

      const response = await this.client.createAutoRequest({
        key: key as 'cnj' | 'cpf' | 'cnpj' | 'name',
        value: options.documentValue,
        callbacks,
      });

      const subRequestIds = response.data.requests.map((r) => r.id);
      const compositeId = subRequestIds.join(',');

      this.recordSuccess(Date.now() - start);
      logger.info({ provider: 'codilo', autoRequestId: response.data.id, subRequests: subRequestIds.length, type: options.documentType }, 'Search by document initiated');

      return {
        requestId: compositeId,
        provider: 'codilo',
        status: 'pending',
      };
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Polls all sub-requests. Returns the first one that has data (status=success).
   * The requestId is a comma-separated list of sub-request IDs.
   */
  async pollResult(requestId: string): Promise<ProcessoUnificado | null> {
    const subRequestIds = requestId.split(',');

    for (const subId of subRequestIds) {
      try {
        const response = await this.client.getRequestPolling(subId);
        const status = response.requested.status;

        if (status === 'success' && response.data.length > 0) {
          logger.info({ provider: 'codilo', subRequestId: subId, platform: response.info.platform }, 'Data retrieved');
          return mapCodiloToUnificado(response.data[0]!, subId);
        }
      } catch (error) {
        logger.debug({ provider: 'codilo', subRequestId: subId, error: error instanceof Error ? error.message : String(error) }, 'Sub-request poll failed');
      }
    }

    // No sub-request has data yet
    return null;
  }

  async startMonitoring(cnj: string, options: MonitoringOptions): Promise<MonitoramentoResult> {
    const callbacks = [{ method: 'POST' as const, url: options.callbackUrl }];

    const response = await this.client.registerPush({
      cnj,
      callbacks,
    });

    return {
      id: response.id,
      cnj,
      provider: 'codilo',
      status: 'active',
      callbackUrl: options.callbackUrl,
      createdAt: new Date(response.createdAt),
      providerTrackingId: response.id,
    };
  }

  async stopMonitoring(monitoringId: string): Promise<void> {
    // Codilo uses scope deactivation, not full delete
    logger.warn({ provider: 'codilo', monitoringId }, 'To stop Codilo monitoring, use scope deactivation endpoint');
  }

  async getStatus(): Promise<ProviderStatus> {
    const avgMs = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      name: 'codilo',
      healthy: this.consecutiveFailures < 3,
      circuitState: 'closed',
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      consecutiveFailures: this.consecutiveFailures,
      averageResponseMs: Math.round(avgMs),
    };
  }

  parseWebhookPayload(rawPayload: unknown): ProcessoUnificado {
    const payload = rawPayload as CodiloWebhookPayload;
    const result = mapCodiloWebhookToUnificado(payload);
    if (!result) {
      throw new Error('Could not parse Codilo webhook payload into ProcessoUnificado');
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
