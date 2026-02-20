import { env } from './env.js';

export const codiloConfig = {
  clientId: env.CODILO_CLIENT_ID,
  clientSecret: env.CODILO_CLIENT_SECRET,
  authUrl: env.CODILO_AUTH_URL,
  apiBaseUrl: env.CODILO_API_BASE_URL,
  pushBaseUrl: env.CODILO_PUSH_BASE_URL,
  timeoutMs: env.CODILO_TIMEOUT_MS,
} as const;

export const escavadorConfig = {
  apiKey: env.ESCAVADOR_API_KEY,
  apiBaseUrl: env.ESCAVADOR_API_BASE_URL,
  timeoutMs: env.ESCAVADOR_TIMEOUT_MS,
} as const;

export const predictusConfig = {
  username: env.PREDICTUS_USERNAME,
  password: env.PREDICTUS_PASSWORD,
  authUrl: env.PREDICTUS_AUTH_URL,
  apiBaseUrl: env.PREDICTUS_API_BASE_URL,
  timeoutMs: env.PREDICTUS_TIMEOUT_MS,
} as const;

export const juditConfig = {
  apiKey: env.JUDIT_API_KEY,
  requestsUrl: env.JUDIT_REQUESTS_URL,
  lawsuitsUrl: env.JUDIT_LAWSUITS_URL,
  trackingUrl: env.JUDIT_TRACKING_URL,
  timeoutMs: env.JUDIT_TIMEOUT_MS,
  cacheTtlDays: env.JUDIT_CACHE_TTL_DAYS,
} as const;

export const datajudConfig = {
  apiKey: env.DATAJUD_API_KEY,
  baseUrl: env.DATAJUD_BASE_URL,
  timeoutMs: env.DATAJUD_TIMEOUT_MS,
} as const;

export const orchestrationConfig = {
  primaryProvider: env.PRIMARY_PROVIDER,
  strategy: env.ORCHESTRATION_STRATEGY,
  raceTimeoutMs: env.RACE_TIMEOUT_MS,
  pollIntervalMs: env.POLL_INTERVAL_MS,
  maxPollAttempts: env.MAX_POLL_ATTEMPTS,
  enableMerge: env.ENABLE_MERGE,
} as const;

export const circuitBreakerConfig = {
  failureThreshold: env.CB_FAILURE_THRESHOLD,
  resetTimeoutMs: env.CB_RESET_TIMEOUT_MS,
} as const;

export const retryConfig = {
  maxAttempts: env.RETRY_MAX_ATTEMPTS,
  baseDelayMs: env.RETRY_BASE_DELAY_MS,
  maxDelayMs: env.RETRY_MAX_DELAY_MS,
} as const;
