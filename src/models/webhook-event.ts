import type { ProviderName } from '../providers/provider.interface.js';
import type { ProcessoUnificado } from './processo-unificado.js';

export interface WebhookEvent {
  provider: ProviderName;
  eventType: 'consultation_result' | 'monitoring_update' | 'error';
  referenceId: string;
  processo?: ProcessoUnificado;
  error?: string;
  receivedAt: Date;
  rawPayload: unknown;
}
