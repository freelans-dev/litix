import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { MonitoringService } from '../services/monitoring.service.js';
import { ValidationError } from '../errors/validation.error.js';

const createMonitoringSchema = z.object({
  cnj: z.string().min(1, 'CNJ is required'),
  callbackUrl: z.string().url('Valid callback URL is required'),
  recurrenceDays: z.number().min(1).optional(),
  provider: z.enum(['codilo', 'judit']).optional(),
});

const stopMonitoringSchema = z.object({
  provider: z.enum(['codilo', 'judit']),
});

export function createMonitoringRouter(monitoringService: MonitoringService): Router {
  const router = Router();

  // Start monitoring
  router.post('/monitoramento', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createMonitoringSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
          details: { errors: parsed.error.flatten().fieldErrors },
        });
      }

      const { cnj, callbackUrl, recurrenceDays, provider } = parsed.data;
      const result = await monitoringService.startMonitoring(
        cnj,
        { callbackUrl, recurrenceDays },
        provider,
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  // Stop monitoring
  router.delete('/monitoramento/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = stopMonitoringSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Query parameter "provider" is required (codilo or judit)', {
          details: { errors: parsed.error.flatten().fieldErrors },
        });
      }

      await monitoringService.stopMonitoring(req.params.id!, parsed.data.provider);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
