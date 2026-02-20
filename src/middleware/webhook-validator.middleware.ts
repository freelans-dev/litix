import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Basic webhook validation. Can be extended with signature verification per provider.
 */
export function webhookValidator(req: Request, res: Response, next: NextFunction): void {
  // If a webhook secret is configured, validate it
  if (env.WEBHOOK_SECRET) {
    const signature = req.headers['x-webhook-signature'] as string | undefined;
    if (!signature || signature !== env.WEBHOOK_SECRET) {
      logger.warn({ ip: req.ip }, 'Webhook rejected: invalid signature');
      res.status(401).json({ error: { code: 'WEBHOOK_INVALID_SIGNATURE', message: 'Invalid webhook signature' } });
      return;
    }
  }

  next();
}
