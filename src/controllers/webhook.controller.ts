import { Router, type Request, type Response, type NextFunction } from 'express';
import type { WebhookDispatcherService } from '../services/webhook-dispatcher.service.js';
import { webhookValidator } from '../middleware/webhook-validator.middleware.js';
import { logger } from '../utils/logger.js';

export function createWebhookRouter(webhookDispatcher: WebhookDispatcherService): Router {
  const router = Router();

  // Codilo webhook receiver
  router.post('/webhooks/codilo', webhookValidator, async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug({ provider: 'codilo' }, 'Webhook received');
      const event = await webhookDispatcher.handleWebhook('codilo', req.body);
      res.json({ received: true, eventType: event.eventType });
    } catch (error) {
      next(error);
    }
  });

  // Judit webhook receiver
  router.post('/webhooks/judit', webhookValidator, async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug({ provider: 'judit' }, 'Webhook received');
      const event = await webhookDispatcher.handleWebhook('judit', req.body);
      res.json({ received: true, eventType: event.eventType });
    } catch (error) {
      next(error);
    }
  });

  // Escavador webhook receiver
  router.post('/webhooks/escavador', webhookValidator, async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.debug({ provider: 'escavador' }, 'Webhook received');
      const event = await webhookDispatcher.handleWebhook('escavador', req.body);
      res.json({ received: true, eventType: event.eventType });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
