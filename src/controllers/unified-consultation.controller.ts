import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { ConsultationService } from '../services/consultation.service.js';
import type { OrchestratorService } from '../services/orchestrator.service.js';
import { transformToAppSheet, type AppSheetProcesso } from '../transformers/appsheet.transformer.js';
import { dispatchToAppSheet } from '../services/appsheet-dispatcher.service.js';
import { queryHistory } from '../services/query-history.service.js';
import { env } from '../config/env.js';
import { ValidationError } from '../errors/validation.error.js';
import type { ProviderName } from '../providers/provider.interface.js';

const providerEnum = z.enum(['judit', 'codilo', 'escavador', 'predictus']);

const consultaSchema = z.object({
  tipo: z.enum(['cnj', 'cpf', 'cnpj', 'oab', 'nome']),
  valor: z.string().min(1, 'Valor is required'),
  dispatch: z.boolean().default(true),
  providers: z.array(providerEnum).optional(),
  prioridade: z.enum(['rapida', 'completa']).default('rapida'),
});

const batchSchema = z.object({
  tipo: z.enum(['cnj', 'cpf', 'cnpj', 'oab', 'nome']),
  valores: z.array(z.string().min(1)).min(1).max(50),
  dispatch: z.boolean().default(true),
  providers: z.array(providerEnum).optional(),
  prioridade: z.enum(['rapida', 'completa']).default('rapida'),
});

function mapTipoToDocType(tipo: string): 'cpf' | 'cnpj' | 'oab' | 'name' {
  if (tipo === 'nome') return 'name';
  return tipo as 'cpf' | 'cnpj' | 'oab';
}

export function createUnifiedConsultationRouter(
  consultationService: ConsultationService,
  orchestrator: OrchestratorService,
): Router {
  const router = Router();

  // POST /consulta — unified single consultation
  router.post('/consulta', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = consultaSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
          details: { errors: parsed.error.flatten().fieldErrors },
        });
      }

      const { tipo, valor, dispatch, providers, prioridade } = parsed.data;
      const startTime = Date.now();

      const orchOptions = {
        strategy: 'race' as const,
        enableMerge: prioridade === 'completa',
        providers: providers as ProviderName[] | undefined,
      };

      let result;
      if (tipo === 'cnj') {
        result = await consultationService.consultByCnj(valor, orchOptions);
      } else {
        result = await consultationService.consultByDocument({
          documentType: mapTipoToDocType(tipo),
          documentValue: valor,
          providers: orchOptions.providers,
        });
      }

      const appsheetData = transformToAppSheet(result.processo);
      const tempoMs = Date.now() - startTime;

      let dispatchStatus: 'enviado' | 'falhou' | 'desativado' = 'desativado';
      if (dispatch && env.APPSHEET_WEBHOOK_URL) {
        try {
          const dispatchResult = await dispatchToAppSheet(env.APPSHEET_WEBHOOK_URL, appsheetData);
          dispatchStatus = dispatchResult.success ? 'enviado' : 'falhou';
        } catch {
          dispatchStatus = 'falhou';
        }
      }

      queryHistory.add({
        tipo,
        valor,
        status: 'ok',
        providers: result.sources,
        tempoMs,
        dispatch: dispatchStatus,
      });

      res.json({
        success: true,
        processo: appsheetData,
        dispatch_status: dispatchStatus,
        providers_consultados: result.sources,
        tempo_ms: tempoMs,
      });
    } catch (error) {
      if (req.body?.valor) {
        queryHistory.add({
          tipo: req.body.tipo ?? 'unknown',
          valor: req.body.valor,
          status: 'erro',
          providers: [],
          tempoMs: 0,
          dispatch: 'desativado',
          erro: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      next(error);
    }
  });

  // POST /consulta/batch — batch consultation
  router.post('/consulta/batch', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = batchSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request body', {
          details: { errors: parsed.error.flatten().fieldErrors },
        });
      }

      const { tipo, valores, dispatch, providers, prioridade } = parsed.data;
      const orchOptions = {
        strategy: 'race' as const,
        enableMerge: prioridade === 'completa',
        providers: providers as ProviderName[] | undefined,
      };

      const resultados: Array<{
        valor: string;
        status: 'ok' | 'erro';
        processo?: AppSheetProcesso;
        dispatch_status?: string;
        erro?: string;
      }> = [];

      let sucesso = 0;
      let falha = 0;

      for (const valor of valores) {
        const itemStart = Date.now();
        try {
          let result;
          if (tipo === 'cnj') {
            result = await consultationService.consultByCnj(valor, orchOptions);
          } else {
            result = await consultationService.consultByDocument({
              documentType: mapTipoToDocType(tipo),
              documentValue: valor,
              providers: orchOptions.providers,
            });
          }

          const appsheetData = transformToAppSheet(result.processo);
          const tempoMs = Date.now() - itemStart;

          let dispatchStatus: 'enviado' | 'falhou' | 'desativado' = 'desativado';
          if (dispatch && env.APPSHEET_WEBHOOK_URL) {
            try {
              const dr = await dispatchToAppSheet(env.APPSHEET_WEBHOOK_URL, appsheetData);
              dispatchStatus = dr.success ? 'enviado' : 'falhou';
            } catch {
              dispatchStatus = 'falhou';
            }
          }

          queryHistory.add({
            tipo, valor, status: 'ok', providers: result.sources,
            tempoMs, dispatch: dispatchStatus,
          });

          resultados.push({ valor, status: 'ok', processo: appsheetData, dispatch_status: dispatchStatus });
          sucesso++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          queryHistory.add({
            tipo, valor, status: 'erro', providers: [], tempoMs: Date.now() - itemStart,
            dispatch: 'desativado', erro: msg,
          });
          resultados.push({ valor, status: 'erro', erro: msg });
          falha++;
        }
      }

      res.json({ total: valores.length, sucesso, falha, resultados });
    } catch (error) {
      next(error);
    }
  });

  // GET /status — system status
  router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const providerStatuses = await orchestrator.getProviderStatuses();
      const stats = queryHistory.getStats();
      const recentQueries = queryHistory.getRecent(10);

      res.json({
        status: 'online',
        uptime: stats.uptime,
        started_at: stats.startedAt,
        providers: providerStatuses,
        recent_queries: recentQueries,
        total_queries: stats.total,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
