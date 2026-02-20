import type { ProcessoUnificado } from '../models/processo-unificado.js';
import type { MonitoramentoResult } from '../models/monitoramento.js';
import type { ProviderStatus } from './provider-status.js';

export type ProviderName = 'codilo' | 'judit' | 'escavador' | 'predictus' | 'datajud';

export interface SearchByCnjOptions {
  strategy?: 'race' | 'fallback' | 'primary-only';
  providers?: ProviderName[];
  enableMerge?: boolean;
  useCache?: boolean;
  cacheTtlDays?: number;
  timeout?: number;
  callbackUrl?: string;
}

export interface SearchByDocumentOptions {
  documentType: 'cpf' | 'cnpj' | 'oab' | 'name';
  documentValue: string;
  providers?: ProviderName[];
  useCache?: boolean;
  cacheTtlDays?: number;
  timeout?: number;
  callbackUrl?: string;
}

export interface MonitoringOptions {
  callbackUrl: string;
  recurrenceDays?: number;
}

export interface AsyncRequestResult {
  requestId: string;
  provider: ProviderName;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ILegalDataProvider {
  readonly name: ProviderName;

  searchByCnj(cnj: string, options?: SearchByCnjOptions): Promise<AsyncRequestResult>;
  searchByDocument(options: SearchByDocumentOptions): Promise<AsyncRequestResult>;
  pollResult(requestId: string): Promise<ProcessoUnificado | null>;
  startMonitoring(cnj: string, options: MonitoringOptions): Promise<MonitoramentoResult>;
  stopMonitoring(monitoringId: string): Promise<void>;
  getStatus(): Promise<ProviderStatus>;
  parseWebhookPayload(rawPayload: unknown): ProcessoUnificado;
}
