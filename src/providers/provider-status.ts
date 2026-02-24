import type { CircuitState } from '../utils/circuit-breaker.js';

export interface ProviderStatus {
  name: string;
  healthy: boolean;
  circuitState: CircuitState;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  consecutiveFailures: number;
  averageResponseMs: number;
}
