import type { ProviderName } from '../providers/provider.interface.js';

export interface MonitoramentoResult {
  id: string;
  cnj: string;
  provider: ProviderName;
  status: 'active' | 'paused' | 'stopped' | 'error';
  callbackUrl: string;
  recurrenceDays?: number;
  createdAt: Date;
  providerTrackingId: string;
}
