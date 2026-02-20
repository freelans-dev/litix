import { AppError } from './base.error.js';
import { ErrorCode } from './error-codes.js';

export class ValidationError extends AppError {
  readonly code = ErrorCode.VALIDATION_ERROR;
  readonly statusCode: number = 400;
  readonly field?: string;

  constructor(message: string, options?: { field?: string; details?: Record<string, unknown> }) {
    super(message, { details: options?.details });
    this.field = options?.field;
  }
}
