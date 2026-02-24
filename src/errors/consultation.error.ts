import type { ProviderName } from '../providers/provider.interface.js';
import { AppError } from './base.error.js';
import type { ErrorCode } from './error-codes.js';

export class ConsultationError extends AppError {
  readonly code: ErrorCode;
  readonly statusCode: number = 503;
  readonly failedProviders?: ProviderName[];

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      failedProviders?: ProviderName[];
      details?: Record<string, unknown>;
      cause?: Error;
    },
  ) {
    super(message, options);
    this.code = code;
    this.failedProviders = options?.failedProviders;
    if (options?.statusCode) this.statusCode = options.statusCode;
  }
}
