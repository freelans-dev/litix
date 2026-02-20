import type { ILegalDataProvider, SearchByCnjOptions, SearchByDocumentOptions, ProviderName, AsyncRequestResult } from '../providers/provider.interface.js';
import type { ProviderStatus } from '../providers/provider-status.js';
import type { ProcessoUnificado } from '../models/processo-unificado.js';
import { CircuitBreaker } from '../utils/circuit-breaker.js';
import { sleep } from '../utils/sleep.js';
import { logger } from '../utils/logger.js';
import { mergeProcessos, calculateCompleteness } from './merge.service.js';
import { ConsultationError } from '../errors/consultation.error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { orchestrationConfig, circuitBreakerConfig } from '../config/providers.config.js';

export interface OrchestrationResult {
  processo: ProcessoUnificado;
  sources: ProviderName[];
  merged: boolean;
  totalDurationMs: number;
}

export class OrchestratorService {
  private readonly providers: Map<ProviderName, ILegalDataProvider>;
  private readonly circuitBreakers: Map<ProviderName, CircuitBreaker>;
  private readonly providerOrder: ProviderName[];

  constructor(providers: ILegalDataProvider[]) {
    this.providers = new Map(providers.map((p) => [p.name, p]));
    this.circuitBreakers = new Map(
      providers.map((p) => [
        p.name,
        new CircuitBreaker({
          name: p.name,
          failureThreshold: circuitBreakerConfig.failureThreshold,
          resetTimeoutMs: circuitBreakerConfig.resetTimeoutMs,
        }),
      ]),
    );

    const primary = orchestrationConfig.primaryProvider;
    const others = providers.filter((p) => p.name !== primary).map((p) => p.name);
    this.providerOrder = [primary, ...others];
  }

  async consultByCnj(cnj: string, options?: SearchByCnjOptions): Promise<OrchestrationResult> {
    const strategy = options?.strategy ?? orchestrationConfig.strategy;

    switch (strategy) {
      case 'race':
        return this.raceStrategy(cnj, options);
      case 'fallback':
        return this.fallbackStrategy(cnj, options);
      case 'primary-only':
        return this.primaryOnlyStrategy(cnj, options);
      default:
        return this.raceStrategy(cnj, options);
    }
  }

  async consultByDocument(options: SearchByDocumentOptions): Promise<OrchestrationResult> {
    // Document search uses fallback since not all providers support it
    return this.fallbackDocumentStrategy(options);
  }

  async getProviderStatuses(): Promise<Record<ProviderName, ProviderStatus>> {
    const statuses: Record<string, ProviderStatus> = {};
    for (const [name, provider] of this.providers) {
      const status = await provider.getStatus();
      const cb = this.circuitBreakers.get(name)!;
      statuses[name] = {
        ...status,
        circuitState: cb.getState(),
      };
    }
    return statuses as Record<ProviderName, ProviderStatus>;
  }

  private async raceStrategy(cnj: string, options?: SearchByCnjOptions): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const availableProviders = this.getAvailableProviders(options?.providers);

    if (availableProviders.length === 0) {
      throw new ConsultationError(
        ErrorCode.ALL_PROVIDERS_FAILED,
        'All provider circuit breakers are open',
        { failedProviders: this.providerOrder },
      );
    }

    // Launch all providers in parallel
    const racePromises = availableProviders.map(async (provider) => {
      const cb = this.circuitBreakers.get(provider.name)!;
      try {
        return await cb.execute(() => this.executeFullFlow(provider, cnj, options));
      } catch (error) {
        logger.warn({ provider: provider.name, error: error instanceof Error ? error.message : String(error) }, 'Provider failed in race');
        return null;
      }
    });

    // Wait for all to settle, with a timeout
    const results = await Promise.race([
      Promise.allSettled(racePromises),
      sleep(orchestrationConfig.raceTimeoutMs).then(() => 'timeout' as const),
    ]);

    if (results === 'timeout') {
      // Timeout: collect what we have so far
      // The promises are still running but we won't wait
      logger.warn({ cnj, timeoutMs: orchestrationConfig.raceTimeoutMs }, 'Race timeout reached');
    }

    // Collect successful results
    const settled = results === 'timeout' ? [] : results;
    const successes: ProcessoUnificado[] = [];
    const sourceNames: ProviderName[] = [];

    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value) {
        successes.push(result.value);
        sourceNames.push(result.value.origem.provider);
      }
    }

    if (successes.length === 0) {
      // Try fallback if race produced no results
      return this.fallbackStrategy(cnj, options);
    }

    if (successes.length >= 2 && (options?.enableMerge ?? orchestrationConfig.enableMerge)) {
      const merged = mergeProcessos(successes[0]!, successes[1]!);
      return {
        processo: merged,
        sources: sourceNames,
        merged: true,
        totalDurationMs: Date.now() - startTime,
      };
    }

    return {
      processo: successes[0]!,
      sources: [sourceNames[0]!],
      merged: false,
      totalDurationMs: Date.now() - startTime,
    };
  }

  private async fallbackStrategy(cnj: string, options?: SearchByCnjOptions): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const failedProviders: ProviderName[] = [];
    const order = options?.providers
      ? this.providerOrder.filter((n) => options.providers!.includes(n))
      : this.providerOrder;

    for (const providerName of order) {
      const provider = this.providers.get(providerName);
      const cb = this.circuitBreakers.get(providerName);
      if (!provider || !cb) continue;

      if (cb.getState() === 'open') {
        failedProviders.push(providerName);
        continue;
      }

      try {
        const result = await cb.execute(() => this.executeFullFlow(provider, cnj, options));
        if (result) {
          return {
            processo: result,
            sources: [providerName],
            merged: false,
            totalDurationMs: Date.now() - startTime,
          };
        }
      } catch (error) {
        failedProviders.push(providerName);
        logger.warn({ provider: providerName, error: error instanceof Error ? error.message : String(error) }, 'Provider failed in fallback');
      }
    }

    throw new ConsultationError(
      ErrorCode.ALL_PROVIDERS_FAILED,
      'All providers failed to return data',
      { failedProviders },
    );
  }

  private async primaryOnlyStrategy(cnj: string, options?: SearchByCnjOptions): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const primaryName = this.providerOrder[0]!;
    const provider = this.providers.get(primaryName)!;
    const cb = this.circuitBreakers.get(primaryName)!;

    const result = await cb.execute(() => this.executeFullFlow(provider, cnj, options));
    if (!result) {
      throw new ConsultationError(ErrorCode.CNJ_NOT_FOUND, 'Process not found', { failedProviders: [primaryName] });
    }

    return {
      processo: result,
      sources: [primaryName],
      merged: false,
      totalDurationMs: Date.now() - startTime,
    };
  }

  private async fallbackDocumentStrategy(options: SearchByDocumentOptions): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const failedProviders: ProviderName[] = [];
    const order = options.providers
      ? this.providerOrder.filter((n) => options.providers!.includes(n))
      : this.providerOrder;

    for (const providerName of order) {
      const provider = this.providers.get(providerName);
      const cb = this.circuitBreakers.get(providerName);
      if (!provider || !cb) continue;

      if (cb.getState() === 'open') {
        failedProviders.push(providerName);
        continue;
      }

      try {
        const asyncResult = await cb.execute(() => provider.searchByDocument(options));
        const result = await this.pollUntilComplete(provider, asyncResult);
        if (result) {
          return {
            processo: result,
            sources: [providerName],
            merged: false,
            totalDurationMs: Date.now() - startTime,
          };
        }
      } catch (error) {
        failedProviders.push(providerName);
        logger.warn({ provider: providerName, error: error instanceof Error ? error.message : String(error) }, 'Provider failed for document search');
      }
    }

    throw new ConsultationError(
      ErrorCode.ALL_PROVIDERS_FAILED,
      'No provider could fulfill document search',
      { failedProviders },
    );
  }

  private async executeFullFlow(
    provider: ILegalDataProvider,
    cnj: string,
    options?: SearchByCnjOptions,
  ): Promise<ProcessoUnificado | null> {
    const asyncResult = await provider.searchByCnj(cnj, options);
    return this.pollUntilComplete(provider, asyncResult);
  }

  private async pollUntilComplete(
    provider: ILegalDataProvider,
    asyncResult: AsyncRequestResult,
  ): Promise<ProcessoUnificado | null> {
    const { pollIntervalMs, maxPollAttempts } = orchestrationConfig;

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      await sleep(pollIntervalMs);

      const result = await provider.pollResult(asyncResult.requestId);
      if (result) {
        result.completenessScore = calculateCompleteness(result);
        return result;
      }
    }

    logger.warn({
      provider: provider.name,
      requestId: asyncResult.requestId,
      maxPollAttempts,
    }, 'Polling timeout - max attempts reached');

    return null;
  }

  private getAvailableProviders(providerFilter?: ProviderName[]): ILegalDataProvider[] {
    return this.providerOrder
      .filter((name) => {
        if (providerFilter && !providerFilter.includes(name)) return false;
        const cb = this.circuitBreakers.get(name);
        return cb && cb.getState() !== 'open';
      })
      .map((name) => this.providers.get(name)!)
      .filter(Boolean);
  }
}
