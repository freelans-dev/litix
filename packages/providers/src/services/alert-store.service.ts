/**
 * In-memory circular buffer of the last N monitoring alerts.
 * Survives across monitor cycles; reset on process restart.
 */

export type AlertTipo = 'nova_movimentacao' | 'novo_processo';

export interface Alert {
  tipo: AlertTipo;
  timestamp: string;
  cnj: string;
  cliente: string;
  descricao: string;
}

const MAX_ALERTS = 50;

class AlertStore {
  private readonly items: Alert[] = [];

  push(alert: Alert): void {
    this.items.push(alert);
    if (this.items.length > MAX_ALERTS) {
      this.items.shift();
    }
  }

  getAll(): Alert[] {
    return [...this.items].reverse(); // most recent first
  }

  getCount(): number {
    return this.items.length;
  }
}

export const alertStore = new AlertStore();
