import { predictusConfig } from '../../config/providers.config.js';
import { logger } from '../../utils/logger.js';
import { ProviderError } from '../../errors/provider.error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import type { PredictusAuthResponse } from './predictus.types.js';

const TOKEN_BUFFER_MS = 60_000; // Refresh 60s before expiry

export class PredictusAuthManager {
  private accessToken: string | null = null;
  private expiresAt: Date | null = null;
  private refreshPromise: Promise<string> | null = null;

  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.accessToken!;
    }

    // Coalesce concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  invalidateToken(): void {
    this.accessToken = null;
    this.expiresAt = null;
    logger.info({ provider: 'predictus' }, 'Token invalidated');
  }

  isTokenValid(): boolean {
    if (!this.accessToken || !this.expiresAt) return false;
    return Date.now() < this.expiresAt.getTime() - TOKEN_BUFFER_MS;
  }

  private async fetchToken(): Promise<string> {
    logger.debug({ provider: 'predictus' }, 'Fetching JWT token');

    try {
      const response = await fetch(predictusConfig.authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: predictusConfig.username,
          password: predictusConfig.password,
        }),
      });

      if (!response.ok) {
        throw new ProviderError(
          ErrorCode.PROVIDER_AUTH_FAILED,
          'predictus',
          `JWT auth failed with status ${response.status}`,
          { statusCode: 401 },
        );
      }

      const data = (await response.json()) as PredictusAuthResponse;
      this.accessToken = data.accessToken;
      this.expiresAt = new Date(Date.now() + data.expiresIn * 1000);

      logger.info({ provider: 'predictus', expiresIn: data.expiresIn }, 'JWT token obtained');
      return this.accessToken;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        ErrorCode.PROVIDER_AUTH_FAILED,
        'predictus',
        `Failed to obtain JWT token: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }
}
