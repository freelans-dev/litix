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
import { PredictusClient } from './predictus.client.js';
import { mapPredictusToUnificado } from './predictus.mapper.js';
import { logger } from '../../utils/logger.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedResult {
  processo: ProcessoUnificado;
  expiresAt: number;
}

export class PredictusProvider implements ILegalDataProvider {
  readonly name = 'predictus' as const;
  private readonly client: PredictusClient;
  private readonly resultCache = new Map<string, CachedResult>();
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;
  private consecutiveFailures = 0;
  private responseTimes: number[] = [];

  constructor() {
    this.client = new PredictusClient();
  }

  async searchByCnj(cnj: string, _options?: SearchByCnjOptions): Promise<AsyncRequestResult> {
    const start = Date.now();
    try {
      // Predictus expects 20-digit NPU (no formatting)
      const npu = cnj.replace(/\D/g, '');

      const processos = await this.client.buscarPorCnj({ numeroProcessoUnico: npu });

      const requestId = randomUUID();

      if (processos.length > 0) {
        const unificado = mapPredictusToUnificado(processos[0]!, requestId);
        this.resultCache.set(requestId, {
          processo: unificado,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        this.cleanExpiredCache();
      }

      this.recordSuccess(Date.now() - start);
      logger.info({ provider: 'predictus', requestId, cnj, results: processos.length }, 'Search by CNJ completed');

      return {
        requestId,
        provider: 'predictus',
        status: processos.length > 0 ? 'completed' : 'failed',
      };
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async searchByDocument(options: SearchByDocumentOptions): Promise<AsyncRequestResult> {
    const start = Date.now();
    try {
      let processos: Awaited<ReturnType<PredictusClient['buscarPorCnj']>> = [];
      const requestId = randomUUID();

      if (options.documentType === 'cpf') {
        processos = await this.client.buscarPorCpfParte({
          cpf: options.documentValue.replace(/\D/g, ''),
        });
      } else if (options.documentType === 'cnpj') {
        processos = await this.client.buscarPorCpfParte({
          cnpj: options.documentValue.replace(/\D/g, ''),
        });
      } else if (options.documentType === 'oab') {
        const parts = options.documentValue.split('/');
        const numero = parseInt(parts[0]!, 10);
        const uf = parts[1] ?? '';
        processos = await this.client.buscarPorOab({ oab: { numero, uf } });
      }

      if (processos.length > 0) {
        const unificado = mapPredictusToUnificado(processos[0]!, requestId);
        this.resultCache.set(requestId, {
          processo: unificado,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }

      this.recordSuccess(Date.now() - start);
      return {
        requestId,
        provider: 'predictus',
        status: processos.length > 0 ? 'completed' : 'failed',
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

    this.resultCache.delete(requestId);
    return cached.processo;
  }

  async startMonitoring(_cnj: string, _options: MonitoringOptions): Promise<MonitoramentoResult> {
    throw new Error('Predictus API does not support process monitoring');
  }

  async stopMonitoring(_monitoringId: string): Promise<void> {
    throw new Error('Predictus API does not support process monitoring');
  }

  async getStatus(): Promise<ProviderStatus> {
    const avgMs = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      name: 'predictus',
      healthy: this.consecutiveFailures < 3,
      circuitState: 'closed',
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      consecutiveFailures: this.consecutiveFailures,
      averageResponseMs: Math.round(avgMs),
    };
  }

  parseWebhookPayload(_rawPayload: unknown): ProcessoUnificado {
    throw new Error('Predictus API does not support webhooks');
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
