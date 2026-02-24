import type { SearchByCnjOptions, SearchByDocumentOptions } from '../providers/provider.interface.js';
import { OrchestratorService, type OrchestrationResult } from './orchestrator.service.js';
import { isValidCnj, normalizeCnj } from '../utils/cnj-validator.js';
import { ValidationError } from '../errors/validation.error.js';
import { logger } from '../utils/logger.js';

export class ConsultationService {
  constructor(private readonly orchestrator: OrchestratorService) {}

  async consultByCnj(cnj: string, options?: SearchByCnjOptions): Promise<OrchestrationResult> {
    const normalized = normalizeCnj(cnj);
    if (!normalized || !isValidCnj(normalized)) {
      throw new ValidationError(`Invalid CNJ format: ${cnj}`, { field: 'cnj' });
    }

    logger.info({ cnj: normalized }, 'Starting CNJ consultation');
    return this.orchestrator.consultByCnj(normalized, options);
  }

  async consultByDocument(options: SearchByDocumentOptions): Promise<OrchestrationResult> {
    if (!options.documentValue.trim()) {
      throw new ValidationError('Document value cannot be empty', { field: 'documentValue' });
    }

    const validTypes = ['cpf', 'cnpj', 'oab', 'name'];
    if (!validTypes.includes(options.documentType)) {
      throw new ValidationError(`Invalid document type: ${options.documentType}`, { field: 'documentType' });
    }

    logger.info({ type: options.documentType }, 'Starting document consultation');
    return this.orchestrator.consultByDocument(options);
  }
}
