import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Codilo
  CODILO_CLIENT_ID: z.string().default(''),
  CODILO_CLIENT_SECRET: z.string().default(''),
  CODILO_AUTH_URL: z.string().url().default('https://auth.codilo.com.br/oauth/token'),
  CODILO_API_BASE_URL: z.string().url().default('https://api.capturaweb.com.br/v1'),
  CODILO_PUSH_BASE_URL: z.string().url().default('https://api.push.codilo.com.br/v1'),
  CODILO_TIMEOUT_MS: z.coerce.number().default(30000),

  // Escavador
  ESCAVADOR_API_KEY: z.string().default(''),
  ESCAVADOR_API_BASE_URL: z.string().url().default('https://api.escavador.com/api/v2'),
  ESCAVADOR_TIMEOUT_MS: z.coerce.number().default(30000),

  // Predictus
  PREDICTUS_USERNAME: z.string().default(''),
  PREDICTUS_PASSWORD: z.string().default(''),
  PREDICTUS_AUTH_URL: z.string().url().default('https://api.predictus.com.br/auth'),
  PREDICTUS_API_BASE_URL: z.string().url().default('https://api.predictus.com.br/predictus-api'),
  PREDICTUS_TIMEOUT_MS: z.coerce.number().default(30000),

  // Judit
  JUDIT_API_KEY: z.string().default(''),
  JUDIT_REQUESTS_URL: z.string().url().default('https://requests.prod.judit.io'),
  JUDIT_LAWSUITS_URL: z.string().url().default('https://lawsuits.production.judit.io'),
  JUDIT_TRACKING_URL: z.string().url().default('https://tracking.prod.judit.io'),
  JUDIT_TIMEOUT_MS: z.coerce.number().default(30000),
  JUDIT_CACHE_TTL_DAYS: z.coerce.number().default(7),

  // DataJud (CNJ public API — free)
  DATAJUD_API_KEY: z.string().default('cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='),
  DATAJUD_BASE_URL: z.string().url().default('https://api-publica.datajud.cnj.jus.br'),
  DATAJUD_TIMEOUT_MS: z.coerce.number().default(15000),

  // Orchestration
  PRIMARY_PROVIDER: z.enum(['codilo', 'judit', 'escavador', 'predictus', 'datajud']).default('judit'),
  ORCHESTRATION_STRATEGY: z.enum(['race', 'fallback', 'primary-only']).default('race'),
  RACE_TIMEOUT_MS: z.coerce.number().default(45000),
  POLL_INTERVAL_MS: z.coerce.number().default(5000),
  MAX_POLL_ATTEMPTS: z.coerce.number().default(60),
  ENABLE_MERGE: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(true),

  // Circuit Breaker
  CB_FAILURE_THRESHOLD: z.coerce.number().default(5),
  CB_RESET_TIMEOUT_MS: z.coerce.number().default(60000),

  // Retry
  RETRY_MAX_ATTEMPTS: z.coerce.number().default(3),
  RETRY_BASE_DELAY_MS: z.coerce.number().default(1000),
  RETRY_MAX_DELAY_MS: z.coerce.number().default(30000),

  // Webhook
  WEBHOOK_BASE_URL: z.string().default(''),
  WEBHOOK_SECRET: z.string().default(''),

  // Consumer Auth
  API_AUTH_TOKEN: z.string().default(''),
  API_ACCESS_KEY: z.string().default(''),

  // AppSheet
  APPSHEET_WEBHOOK_URL: z.string().default(''),

  // Auto-monitoring
  MONITOR_ENABLED: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  MONITOR_INTERVAL_HOURS: z.coerce.number().default(6),
  MONITOR_CPF_INTERVAL_HOURS: z.coerce.number().default(12),
  MONITOR_TRIBUNAIS: z.string().default('tjsp,tjpr,tjrj,tjmg,tjsc,trf4,trt9'),
  MONITOR_WEBHOOK_URL: z.string().default(''),
});

export type AppEnv = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env: AppEnv = parsed.data;
