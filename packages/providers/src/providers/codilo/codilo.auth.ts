import { codiloConfig } from '../../config/providers.config.js';
import { logger } from '../../utils/logger.js';
import { ProviderError } from '../../errors/provider.error.js';
import { ErrorCode } from '../../errors/error-codes.js';
import type { CodiloAuthResponse } from './codilo.types.js';

const TOKEN_BUFFER_MS = 60_000; // Refresh 60s before expiry

export class CodiloAuthManager {
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
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  invalidateToken(): void {
    this.accessToken = null;
    this.expiresAt = null;
    logger.info({ provider: 'codilo' }, 'Token invalidated');
  }

  isTokenValid(): boolean {
    if (!this.accessToken || !this.expiresAt) return false;
    return Date.now() < this.expiresAt.getTime() - TOKEN_BUFFER_MS;
  }

  private async fetchToken(): Promise<string> {
    logger.debug({ provider: 'codilo' }, 'Fetching OAuth2 token');

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      id: codiloConfig.clientId,
      secret: codiloConfig.clientSecret,
    });

    try {
      const response = await fetch(codiloConfig.authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new ProviderError(
          ErrorCode.PROVIDER_AUTH_FAILED,
          'codilo',
          `OAuth2 token request failed with status ${response.status}`,
          { statusCode: 401 },
        );
      }

      const data = (await response.json()) as CodiloAuthResponse;
      this.accessToken = data.access_token;
      this.expiresAt = new Date(Date.now() + data.expires_in * 1000);

      logger.info({ provider: 'codilo', expiresIn: data.expires_in }, 'OAuth2 token obtained');
      return this.accessToken;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        ErrorCode.PROVIDER_AUTH_FAILED,
        'codilo',
        `Failed to obtain OAuth2 token: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }
}
