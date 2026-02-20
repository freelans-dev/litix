import type { ILegalDataProvider, MonitoringOptions, ProviderName } from '../providers/provider.interface.js';
import type { MonitoramentoResult } from '../models/monitoramento.js';
import { isValidCnj, normalizeCnj } from '../utils/cnj-validator.js';
import { ValidationError } from '../errors/validation.error.js';
import { ConsultationError } from '../errors/consultation.error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { logger } from '../utils/logger.js';

export class MonitoringService {
  private readonly providers: Map<ProviderName, ILegalDataProvider>;

  constructor(providers: ILegalDataProvider[]) {
    this.providers = new Map(providers.map((p) => [p.name, p]));
  }

  async startMonitoring(
    cnj: string,
    options: MonitoringOptions,
    preferredProvider?: ProviderName,
  ): Promise<MonitoramentoResult> {
    const normalized = normalizeCnj(cnj);
    if (!normalized || !isValidCnj(normalized)) {
      throw new ValidationError(`Invalid CNJ format: ${cnj}`, { field: 'cnj' });
    }

    // Try preferred provider first, then fallback to others
    const orderedProviders = preferredProvider
      ? [preferredProvider, ...Array.from(this.providers.keys()).filter((n) => n !== preferredProvider)]
      : Array.from(this.providers.keys());

    const errors: Array<{ provider: ProviderName; error: string }> = [];

    for (const providerName of orderedProviders) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        const result = await provider.startMonitoring(normalized, options);
        logger.info({ provider: providerName, trackingId: result.id, cnj: normalized }, 'Monitoring started');
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ provider: providerName, error: message });
        logger.warn({ provider: providerName, error: message }, 'Failed to start monitoring');
      }
    }

    throw new ConsultationError(
      ErrorCode.ALL_PROVIDERS_FAILED,
      'Failed to start monitoring on any provider',
      { details: { errors } },
    );
  }

  async stopMonitoring(monitoringId: string, provider: ProviderName): Promise<void> {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new ValidationError(`Unknown provider: ${provider}`, { field: 'provider' });
    }

    await providerInstance.stopMonitoring(monitoringId);
    logger.info({ provider, monitoringId }, 'Monitoring stopped');
  }
}
