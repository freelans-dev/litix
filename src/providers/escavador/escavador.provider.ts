import { randomUUID } from 'node:crypto';
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
import { EscavadorClient } from './escavador.client.js';
import { mapEscavadorToUnificado } from './escavador.mapper.js';
import { logger } from '../../utils/logger.js';
import type { EscavadorCallbackPayload, EscavadorMovimentacao } from './escavador.types.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedResult {
  processo: ProcessoUnificado;
  expiresAt: number;
}

export class EscavadorProvider implements ILegalDataProvider {
  readonly name = 'escavador' as const;
  private readonly client: EscavadorClient;
  private readonly resultCache = new Map<string, CachedResult>();
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;
  private consecutiveFailures = 0;
  private responseTimes: number[] = [];

  constructor() {
    this.client = new EscavadorClient();
  }

  async searchByCnj(cnj: string, _options?: SearchByCnjOptions): Promise<AsyncRequestResult> {
    const start = Date.now();
    try {
      // Escavador is synchronous — fetch data now and cache it
      const processo = await this.client.getProcessByCnj(cnj);

      // Fetch movimentações (first page)
      let movimentacoes: EscavadorMovimentacao[] = [];
      try {
        const movsResponse = await this.client.getMovimentacoes(cnj);
        movimentacoes = movsResponse.items;
      } catch {
        logger.debug({ provider: 'escavador', cnj }, 'Failed to fetch movimentações, continuing without');
      }

      const requestId = randomUUID();
      const unificado = mapEscavadorToUnificado(processo, movimentacoes, requestId);

      this.resultCache.set(requestId, {
        processo: unificado,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      this.cleanExpiredCache();

      this.recordSuccess(Date.now() - start);
      logger.info({ provider: 'escavador', requestId, cnj, fontes: processo.fontes.length }, 'Search by CNJ completed');

      return {
        requestId,
        provider: 'escavador',
        status: 'completed',
      };
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async searchByDocument(options: SearchByDocumentOptions): Promise<AsyncRequestResult> {
    const start = Date.now();
    try {
      let firstProcesso: ProcessoUnificado | null = null;
      const requestId = randomUUID();

      if (options.documentType === 'cpf' || options.documentType === 'cnpj') {
        const response = await this.client.getProcessosByDocumento(options.documentValue);
        if (response.items.length > 0) {
          firstProcesso = mapEscavadorToUnificado(response.items[0]!, [], requestId);
        }
      } else if (options.documentType === 'oab') {
        // OAB format expected: "12345/SP" or just "12345"
        const parts = options.documentValue.split('/');
        const numero = parts[0]!;
        const estado = parts[1] ?? '';
        const response = await this.client.getProcessosByOab(numero, estado);
        if (response.items.length > 0) {
          firstProcesso = mapEscavadorToUnificado(response.items[0]!, [], requestId);
        }
      }

      if (firstProcesso) {
        this.resultCache.set(requestId, {
          processo: firstProcesso,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }

      this.recordSuccess(Date.now() - start);
      return {
        requestId,
        provider: 'escavador',
        status: firstProcesso ? 'completed' : 'failed',
      };
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async pollResult(requestId: string): Promise<ProcessoUnificado | null> {
    const cached = this.resultCache.get(requestId);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.resultCache.delete(requestId);
      return null;
    }

    // Return and remove from cache (single consumption)
    this.resultCache.delete(requestId);
    return cached.processo;
  }

  async startMonitoring(cnj: string, options: MonitoringOptions): Promise<MonitoramentoResult> {
    const response = await this.client.createMonitoramento({
      tipo: 'UNICO',
      valor: cnj,
      frequencia: 'DIARIA',
    });

    return {
      id: String(response.id),
      cnj,
      provider: 'escavador',
      status: 'active',
      callbackUrl: options.callbackUrl,
      createdAt: new Date(response.criado_em),
      providerTrackingId: String(response.id),
    };
  }

  async stopMonitoring(monitoringId: string): Promise<void> {
    await this.client.deleteMonitoramento(parseInt(monitoringId, 10));
  }

  async getStatus(): Promise<ProviderStatus> {
    const avgMs = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      name: 'escavador',
      healthy: this.consecutiveFailures < 3,
      circuitState: 'closed',
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      consecutiveFailures: this.consecutiveFailures,
      averageResponseMs: Math.round(avgMs),
    };
  }

  parseWebhookPayload(rawPayload: unknown): ProcessoUnificado {
    const payload = rawPayload as EscavadorCallbackPayload;
    // Escavador callbacks don't include full process data — need to re-fetch
    throw new Error(`Escavador webhook received (event: ${payload.evento}), but full re-fetch required. Item ID: ${payload.item_id}`);
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

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.resultCache) {
      if (now > entry.expiresAt) this.resultCache.delete(key);
    }
  }
}
