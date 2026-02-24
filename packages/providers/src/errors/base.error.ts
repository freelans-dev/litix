import type { ErrorCode } from './error-codes.js';

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;
  readonly isOperational: boolean = true;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;

  constructor(message: string, options?: { details?: Record<string, unknown>; cause?: Error }) {
    super(message);
    this.name = this.constructor.name;
    this.details = options?.details;
    this.cause = options?.cause;
  }

  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}
