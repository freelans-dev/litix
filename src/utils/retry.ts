import { sleep } from './sleep.js';
import { logger } from './logger.js';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Jitter factor 0-1. E.g. 0.25 = +/- 25%. */
  jitterFactor?: number;
  /** Error types that should NOT be retried. */
  nonRetryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, jitterFactor = 0.25, nonRetryableErrors = [] } = config;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (nonRetryableErrors.includes(lastError.name)) {
        throw lastError;
      }

      if (attempt === maxAttempts) break;

      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = exponentialDelay * jitterFactor * (Math.random() * 2 - 1);
      const delayMs = Math.min(exponentialDelay + jitter, maxDelayMs);

      logger.warn({ attempt, maxAttempts, delayMs, error: lastError.message }, 'Retrying after failure');
      config.onRetry?.(attempt, lastError, delayMs);

      await sleep(delayMs);
    }
  }

  throw lastError!;
}
