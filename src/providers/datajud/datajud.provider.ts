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
import { DataJudClient } from './datajud.client.js';
import { mapDataJudToUnificado } from './datajud.mapper.js';
import { cnjToTribunalAlias, COMMON_DATAJUD_ALIASES } from './datajud.tribunal-map.js';
import { normalizeCnj } from '../../utils/cnj-validator.js';
import { logger } from '../../utils/logger.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedResult {
  processo: ProcessoUnificado;
  expiresAt: number;
}

export class DataJudProvider implements ILegalDataProvider {
  readonly name = 'datajud' as const;

  private readonly client: DataJudClient;
  private readonly resultCache = new Map<string, CachedResult>();
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;
  private consecutiveFailures = 0;
  private responseTimes: number[] = [];

  constructor() {
    this.client = new DataJudClient();
  }

  /**
   * Validates CNJ and queues it for retrieval.
   * DataJud is synchronous: the actual HTTP call happens in pollResult().
   * requestId = normalized CNJ (digits only, 20 chars).
   */
  async searchByCnj(cnj: string, _options?: SearchByCnjOptions): Promise<AsyncRequestResult> {
    const formatted = normalizeCnj(cnj);
    if (!formatted) {
      logger.warn({ cnj }, 'DataJud: invalid CNJ format');
      return { requestId: '', provider: 'datajud', status: 'failed' };
    }

    const alias = cnjToTribunalAlias(formatted);
    if (!alias) {
      logger.warn({ cnj: formatted }, 'DataJud: unknown tribunal — no alias for this CNJ');
      return { requestId: '', provider: 'datajud', status: 'failed' };
    }

    const requestId = formatted.replace(/\D/g, '');
    logger.info({ cnj: formatted, alias, requestId }, 'DataJud: CNJ queued for retrieval');

    return { requestId, provider: 'datajud', status: 'completed' };
  }

  /**
   * Retrieves process data from DataJud.
   * - If requestId is 20 digits → treat as normalized CNJ → query DataJud directly.
   * - If requestId is UUID format → retrieve from document-search cache.
   */
  async pollResult(requestId: string): Promise<ProcessoUnificado | null> {
    // Check UUID cache first (populated by searchByDocument)
    const cached = this.resultCache.get(requestId);
    if (cached) {
      if (Date.now() > cached.expiresAt) {
        this.resultCache.delete(requestId);
        return null;
      }
      this.resultCache.delete(requestId);
      return cached.processo;
    }

    // Treat as normalized CNJ (20 digits)
    if (!/^\d{20}$/.test(requestId)) {
      logger.warn({ requestId }, 'DataJud: pollResult received unknown requestId format');
      return null;
    }

    const formatted = normalizeCnj(requestId);
    if (!formatted) return null;

    const alias = cnjToTribunalAlias(formatted);
    if (!alias) {
      logger.warn({ cnj: formatted }, 'DataJud: no alias for tribunal in pollResult');
      return null;
    }

    const start = Date.now();
    try {
      const response = await this.client.search(alias, {
        query: { term: { numeroProcesso: requestId } },
        size: 1,
      });

      const hit = response.hits?.hits?.[0];
      if (!hit) {
        logger.info({ cnj: formatted, alias }, 'DataJud: process not found');
        this.recordSuccess(Date.now() - start);
        return null;
      }

      const processo = mapDataJudToUnificado(hit, requestId);
      this.recordSuccess(Date.now() - start);
      logger.info({ cnj: formatted, alias }, 'DataJud: process retrieved successfully');

      return processo;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Searches for processes by CPF or CNPJ across common tribunal aliases.
   * Stores first match in cache; use pollResult(requestId) to retrieve.
   * Only 'cpf' and 'cnpj' document types are supported.
   */
  async searchByDocument(options: SearchByDocumentOptions): Promise<AsyncRequestResult> {
    if (options.documentType !== 'cpf' && options.documentType !== 'cnpj') {
      logger.warn({ type: options.documentType }, 'DataJud: only cpf/cnpj document types supported');
      return { requestId: '', provider: 'datajud', status: 'failed' };
    }

    const doc = options.documentValue.replace(/\D/g, '');
    const requestId = randomUUID();
    const start = Date.now();

    const aliases = [...COMMON_DATAJUD_ALIASES];
    let found: ProcessoUnificado | null = null;

    for (const alias of aliases) {
      try {
        const response = await this.client.search(alias, {
          query: {
            bool: {
              should: [
                { match: { 'partes.cpfCnpj': doc } },
                { match: { 'partes.documento': doc } },
              ],
              minimum_should_match: 1,
            },
          },
          size: 1,
        });

        const hit = response.hits?.hits?.[0];
        if (hit) {
          found = mapDataJudToUnificado(hit, requestId);
          break;
        }
      } catch {
        // Continue to next alias on error
      }
    }

    if (found) {
      this.resultCache.set(requestId, {
        processo: found,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      this.recordSuccess(Date.now() - start);
      logger.info({ doc, requestId }, 'DataJud: process found by document');
      return { requestId, provider: 'datajud', status: 'completed' };
    }

    this.recordSuccess(Date.now() - start);
    return { requestId, provider: 'datajud', status: 'failed' };
  }

  async startMonitoring(_cnj: string, _options: MonitoringOptions): Promise<MonitoramentoResult> {
    throw new Error('DataJud: use the datajud-cpf-monitor-setup script for monitoring');
  }

  async stopMonitoring(_monitoringId: string): Promise<void> {
    throw new Error('DataJud: use the datajud-movement-checker script for monitoring');
  }

  /**
   * Health check: queries api_publica_tjsp with size 0.
   */
  async getStatus(): Promise<ProviderStatus> {
    const start = Date.now();
    try {
      await this.client.search('api_publica_tjsp', {
        query: { match_all: {} },
        size: 0,
      });
      this.recordSuccess(Date.now() - start);
    } catch {
      this.recordFailure();
    }

    const avgMs = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      name: 'datajud',
      healthy: this.consecutiveFailures < 3,
      circuitState: 'closed',
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      consecutiveFailures: this.consecutiveFailures,
      averageResponseMs: Math.round(avgMs),
    };
  }

  parseWebhookPayload(_rawPayload: unknown): ProcessoUnificado {
    throw new Error('DataJud não suporta webhooks');
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
