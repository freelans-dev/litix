import type { WebhookEvent } from '../models/webhook-event.js';
import type { ILegalDataProvider, ProviderName } from '../providers/provider.interface.js';
import { logger } from '../utils/logger.js';

type WebhookListener = (event: WebhookEvent) => void | Promise<void>;

export class WebhookDispatcherService {
  private readonly providers: Map<ProviderName, ILegalDataProvider>;
  private readonly listeners: WebhookListener[] = [];

  constructor(providers: ILegalDataProvider[]) {
    this.providers = new Map(providers.map((p) => [p.name, p]));
  }

  onEvent(listener: WebhookListener): void {
    this.listeners.push(listener);
  }

  async handleWebhook(providerName: ProviderName, rawPayload: unknown): Promise<WebhookEvent> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    let event: WebhookEvent;

    try {
      const processo = provider.parseWebhookPayload(rawPayload);
      event = {
        provider: providerName,
        eventType: 'consultation_result',
        referenceId: processo.origem.requestId,
        processo,
        receivedAt: new Date(),
        rawPayload,
      };
    } catch (error) {
      event = {
        provider: providerName,
        eventType: 'error',
        referenceId: '',
        error: error instanceof Error ? error.message : String(error),
        receivedAt: new Date(),
        rawPayload,
      };
    }

    logger.info({ provider: providerName, eventType: event.eventType, referenceId: event.referenceId }, 'Webhook event processed');

    // Dispatch to listeners
    for (const listener of this.listeners) {
      try {
        await listener(event);
      } catch (err) {
        logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Webhook listener error');
      }
    }

    return event;
  }
}
