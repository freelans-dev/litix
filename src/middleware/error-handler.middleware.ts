import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/base.error.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn({ code: err.code, message: err.message, details: err.details }, 'Application error');
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
