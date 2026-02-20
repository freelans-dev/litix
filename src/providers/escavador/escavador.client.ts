import { escavadorConfig } from '../../config/providers.config.js';
import { logger } from '../../utils/logger.js';
import { ProviderError } from '../../errors/provider.error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import type {
  EscavadorProcesso,
  EscavadorMovimentacoesResponse,
  EscavadorEnvolvidoResponse,
  EscavadorAdvogadoResponse,
  EscavadorMonitoramentoBody,
  EscavadorMonitoramentoResponse,
} from './escavador.types.js';

export class EscavadorClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.apiKey = escavadorConfig.apiKey;
    this.baseUrl = escavadorConfig.apiBaseUrl;
    this.timeoutMs = escavadorConfig.timeoutMs;
  }

  async getProcessByCnj(cnj: string): Promise<EscavadorProcesso> {
    return this.get<EscavadorProcesso>(`${this.baseUrl}/processos/numero_cnj/${encodeURIComponent(cnj)}`);
  }

  async getMovimentacoes(cnj: string, cursorUrl?: string): Promise<EscavadorMovimentacoesResponse> {
    const url = cursorUrl ?? `${this.baseUrl}/processos/numero_cnj/${encodeURIComponent(cnj)}/movimentacoes`;
    return this.get<EscavadorMovimentacoesResponse>(url);
  }

  async getProcessosByDocumento(cpfCnpj: string): Promise<EscavadorEnvolvidoResponse> {
    const params = new URLSearchParams({ cpf_cnpj: cpfCnpj });
    return this.get<EscavadorEnvolvidoResponse>(`${this.baseUrl}/envolvido/processos?${params}`);
  }

  async getProcessosByOab(numero: string, estado: string): Promise<EscavadorAdvogadoResponse> {
    const params = new URLSearchParams({ oab_numero: numero, oab_estado: estado });
    return this.get<EscavadorAdvogadoResponse>(`${this.baseUrl}/advogado/processos?${params}`);
  }

  async createMonitoramento(body: EscavadorMonitoramentoBody): Promise<EscavadorMonitoramentoResponse> {
    // Monitoring uses V1 endpoint
    const v1Base = this.baseUrl.replace('/api/v2', '/api/v1');
    return this.post<EscavadorMonitoramentoResponse>(`${v1Base}/monitoramento-tribunal`, body);
  }

  async deleteMonitoramento(id: number): Promise<void> {
    const v1Base = this.baseUrl.replace('/api/v2', '/api/v1');
    await this.request<unknown>(`${v1Base}/monitoramentos-tribunal/${id}`, { method: 'DELETE' });
  }

  private async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' });
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      logger.debug({ url, method: init.method }, 'Escavador API request');

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');

        if (response.status === 401) {
          throw new ProviderError(ErrorCode.PROVIDER_AUTH_FAILED, 'escavador', `Authentication failed: ${errorText}`, { statusCode: 401 });
        }
        if (response.status === 402) {
          throw new ProviderError(ErrorCode.PROVIDER_UNAVAILABLE, 'escavador', `Insufficient credits: ${errorText}`, { statusCode: 402 });
        }
        if (response.status === 429) {
          throw new ProviderError(ErrorCode.PROVIDER_RATE_LIMITED, 'escavador', `Rate limited: ${errorText}`, { statusCode: 429 });
        }
        if (response.status >= 500) {
          throw new ProviderError(ErrorCode.PROVIDER_UNAVAILABLE, 'escavador', `Server error ${response.status}: ${errorText}`, { statusCode: response.status });
        }

        throw new ProviderError(ErrorCode.PROVIDER_UNKNOWN_ERROR, 'escavador', `API error ${response.status}: ${errorText}`, {
          statusCode: response.status,
        });
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ProviderError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderError(ErrorCode.PROVIDER_TIMEOUT, 'escavador', `Request timed out after ${this.timeoutMs}ms`);
      }

      throw new ProviderError(ErrorCode.PROVIDER_UNAVAILABLE, 'escavador', `Network error: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error instanceof Error ? error : undefined,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
