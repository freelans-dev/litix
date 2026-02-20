import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { ConsultationService } from '../services/consultation.service.js';
import { ValidationError } from '../errors/validation.error.js';

const cnjBodySchema = z.object({
  cnj: z.string().min(1, 'CNJ is required'),
  options: z.object({
    strategy: z.enum(['race', 'fallback', 'primary-only']).optional(),
    useCache: z.boolean().optional(),
    cacheTtlDays: z.number().optional(),
    timeout: z.number().optional(),
    callbackUrl: z.string().url().optional(),
  }).optional(),
});

const documentBodySchema = z.object({
  documentType: z.enum(['cpf', 'cnpj', 'oab', 'name']),
  documentValue: z.string().min(1, 'Document value is required'),
  options: z.object({
    useCache: z.boolean().optional(),
    cacheTtlDays: z.number().optional(),
    callbackUrl: z.string().url().optional(),
  }).optional(),
});

export function createConsultationRouter(consultationService: ConsultationService): Router {
  const router = Router();

  // Synchronous CNJ consultation
  router.post('/consulta/cnj', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = cnjBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
          details: { errors: parsed.error.flatten().fieldErrors },
        });
      }

      const { cnj, options } = parsed.data;
      const result = await consultationService.consultByCnj(cnj, options);

      res.json({
        success: true,
        data: result.processo,
        meta: {
          sources: result.sources,
          merged: result.merged,
          totalDurationMs: result.totalDurationMs,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Document-based consultation
  router.post('/consulta/documento', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = documentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
          details: { errors: parsed.error.flatten().fieldErrors },
        });
      }

      const { documentType, documentValue, options } = parsed.data;
      const result = await consultationService.consultByDocument({
        documentType,
        documentValue,
        ...options,
      });

      res.json({
        success: true,
        data: result.processo,
        meta: {
          sources: result.sources,
          merged: result.merged,
          totalDurationMs: result.totalDurationMs,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
