import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestLogger, authMiddleware, rateLimiter, errorHandler } from './middleware/index.js';
import { createHealthRouter, createConsultationRouter, createUnifiedConsultationRouter, createMonitoringRouter, createWebhookRouter, createUIRouter } from './controllers/index.js';
import { JuditProvider } from './providers/judit/index.js';
import { CodiloProvider } from './providers/codilo/index.js';
import { EscavadorProvider } from './providers/escavador/index.js';
import { PredictusProvider } from './providers/predictus/index.js';
import { OrchestratorService } from './services/orchestrator.service.js';
import { ConsultationService } from './services/consultation.service.js';
import { MonitoringService } from './services/monitoring.service.js';
import { WebhookDispatcherService } from './services/webhook-dispatcher.service.js';

// Initialize providers
const juditProvider = new JuditProvider();
const codiloProvider = new CodiloProvider();
const escavadorProvider = new EscavadorProvider();
const predictusProvider = new PredictusProvider();
const providers = [juditProvider, codiloProvider, escavadorProvider, predictusProvider];

// Initialize services
const orchestrator = new OrchestratorService(providers);
const consultationService = new ConsultationService(orchestrator);
const monitoringService = new MonitoringService(providers);
const webhookDispatcher = new WebhookDispatcherService(providers);

// Log webhook events
webhookDispatcher.onEvent((event) => {
  logger.info({ provider: event.provider, eventType: event.eventType, referenceId: event.referenceId }, 'Webhook event dispatched');
});

// Create Express app
const app = express();

// Global middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// UI routes (no auth — serves HTML pages)
app.use(createUIRouter());

// Health routes (no auth)
app.use(createHealthRouter(orchestrator));

// Webhook routes (validated separately)
app.use(createWebhookRouter(webhookDispatcher));

// API routes (with auth + rate limiting)
app.use('/api/v1', authMiddleware, rateLimiter, createUnifiedConsultationRouter(consultationService, orchestrator));
app.use('/api/v1', authMiddleware, rateLimiter, createConsultationRouter(consultationService));
app.use('/api/v1', authMiddleware, rateLimiter, createMonitoringRouter(monitoringService));

// Error handler (must be last)
app.use(errorHandler);

// Start server
const port = env.PORT;
app.listen(port, () => {
  logger.info({ port, env: env.NODE_ENV, strategy: env.ORCHESTRATION_STRATEGY, primaryProvider: env.PRIMARY_PROVIDER }, 'Server started');
});

export { app };
