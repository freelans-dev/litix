import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { SchedulerService } from '../services/scheduler.service.js';
import type { MonitorService } from '../services/monitor.service.js';
import type { CpfMonitorService } from '../services/cpf-monitor.service.js';
import { alertStore } from '../services/alert-store.service.js';
import { ValidationError } from '../errors/validation.error.js';

const addCnjSchema = z.object({
  cnj: z.string().min(1, 'CNJ é obrigatório'),
  cliente: z.string().min(1, 'Cliente é obrigatório'),
});

const addDocSchema = z.object({
  tipo: z.enum(['cpf', 'cnpj']),
  valor: z.string().min(1, 'Documento é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  cliente: z.string().min(1, 'Cliente é obrigatório'),
});

export function createAutoMonitorRouter(
  scheduler: SchedulerService,
  cnjMonitor: MonitorService,
  cpfMonitor: CpfMonitorService,
): Router {
  const router = Router();

  // GET /monitor/status
  router.get('/monitor/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await scheduler.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  });

  // GET /monitor/cnj — list all CNJs
  router.get('/monitor/cnj', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await cnjMonitor.listAll();
      res.json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  });

  // POST /monitor/cnj — add CNJ to watch list
  router.post('/monitor/cnj', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = addCnjSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Body inválido', { details: { errors: parsed.error.flatten().fieldErrors } });
      }
      const entry = await cnjMonitor.addCnj(parsed.data.cnj, parsed.data.cliente);
      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /monitor/cnj/:cnj — remove CNJ
  router.delete('/monitor/cnj/:cnj', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const removed = await cnjMonitor.removeCnj(decodeURIComponent(req.params.cnj!));
      if (!removed) {
        res.status(404).json({ success: false, error: 'CNJ não encontrado na lista' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // GET /monitor/documento — list all documents
  router.get('/monitor/documento', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await cpfMonitor.listAll();
      res.json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  });

  // POST /monitor/documento — add CPF/CNPJ to watch list
  router.post('/monitor/documento', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = addDocSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Body inválido', { details: { errors: parsed.error.flatten().fieldErrors } });
      }
      const entry = await cpfMonitor.addDoc(parsed.data);
      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /monitor/documento/:valor — remove document
  router.delete('/monitor/documento/:valor', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const removed = await cpfMonitor.removeDoc(decodeURIComponent(req.params.valor!));
      if (!removed) {
        res.status(404).json({ success: false, error: 'Documento não encontrado na lista' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // GET /monitor/alertas — last 50 alerts
  router.get('/monitor/alertas', (_req: Request, res: Response) => {
    res.json({ success: true, data: alertStore.getAll() });
  });

  // POST /monitor/run — force immediate cycle
  router.post('/monitor/run', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await scheduler.runNow();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
