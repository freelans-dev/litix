import type { ProviderName } from '../providers/provider.interface.js';
import { AppError } from './base.error.js';
import type { ErrorCode } from './error-codes.js';

export class ProviderError extends AppError {
  readonly code: ErrorCode;
  readonly statusCode: number = 502;
  readonly provider: ProviderName;

  constructor(
    code: ErrorCode,
    provider: ProviderName,
    message: string,
    options?: { statusCode?: number; details?: Record<string, unknown>; cause?: Error },
  ) {
    super(message, options);
    this.code = code;
    this.provider = provider;
    if (options?.statusCode) this.statusCode = options.statusCode;
  }
}
