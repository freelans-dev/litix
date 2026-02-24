import { logger } from './logger.js';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenSuccessThreshold?: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureAt: Date | null;
  lastSuccessAt: Date | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private halfOpenSuccesses = 0;
  private lastFailureAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private nextRetryAt: Date | null = null;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenSuccessThreshold: number;

  constructor(config: CircuitBreakerConfig) {
    this.name = config.name;
    this.failureThreshold = config.failureThreshold;
    this.resetTimeoutMs = config.resetTimeoutMs;
    this.halfOpenSuccessThreshold = config.halfOpenSuccessThreshold ?? 1;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.nextRetryAt && Date.now() >= this.nextRetryAt.getTime()) {
        this.transitionTo('half-open');
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getState(): CircuitState {
    // Check if open circuit should transition to half-open
    if (this.state === 'open' && this.nextRetryAt && Date.now() >= this.nextRetryAt.getTime()) {
      this.transitionTo('half-open');
    }
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.halfOpenSuccesses = 0;
    this.nextRetryAt = null;
    logger.info({ circuitBreaker: this.name }, 'Circuit breaker reset');
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessAt = new Date();

    if (this.state === 'half-open') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.halfOpenSuccessThreshold) {
        this.transitionTo('closed');
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureAt = new Date();

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.failures >= this.failureThreshold) {
      this.transitionTo('open');
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === 'open') {
      this.nextRetryAt = new Date(Date.now() + this.resetTimeoutMs);
    } else if (newState === 'closed') {
      this.failures = 0;
      this.halfOpenSuccesses = 0;
      this.nextRetryAt = null;
    } else if (newState === 'half-open') {
      this.halfOpenSuccesses = 0;
    }

    logger.info({ circuitBreaker: this.name, from: oldState, to: newState }, 'Circuit breaker state transition');
  }
}
