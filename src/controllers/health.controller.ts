import { Router, type Request, type Response } from 'express';
import type { OrchestratorService } from '../services/orchestrator.service.js';

export function createHealthRouter(orchestrator: OrchestratorService): Router {
  const router = Router();

  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const statuses = await orchestrator.getProviderStatuses();
      const allHealthy = Object.values(statuses).every((s) => s.healthy);

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        providers: statuses,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.get('/health/providers', async (_req: Request, res: Response) => {
    try {
      const statuses = await orchestrator.getProviderStatuses();
      res.json(statuses);
    } catch (error) {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  });

  return router;
}
