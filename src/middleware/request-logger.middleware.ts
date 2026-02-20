import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'node:crypto';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const start = Date.now();

  // Attach requestId to the request for downstream use
  (req as unknown as Record<string, unknown>).requestId = requestId;

  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
    }, 'Request completed');
  });

  next();
}
