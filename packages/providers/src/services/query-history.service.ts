export interface QueryHistoryEntry {
  id: number;
  tipo: string;
  valor: string;
  status: 'ok' | 'erro';
  providers: string[];
  tempoMs: number;
  dispatch: 'enviado' | 'falhou' | 'desativado';
  erro?: string;
  timestamp: string;
}

const MAX_ENTRIES = 50;
let nextId = 1;

export class QueryHistoryService {
  private entries: QueryHistoryEntry[] = [];
  private readonly startedAt: Date = new Date();

  add(entry: Omit<QueryHistoryEntry, 'id' | 'timestamp'>): QueryHistoryEntry {
    const full: QueryHistoryEntry = {
      ...entry,
      id: nextId++,
      timestamp: new Date().toISOString(),
    };
    this.entries.unshift(full);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.pop();
    }
    return full;
  }

  getRecent(limit: number = MAX_ENTRIES): QueryHistoryEntry[] {
    return this.entries.slice(0, limit);
  }

  getStats(): { total: number; uptime: string; startedAt: string } {
    const uptimeMs = Date.now() - this.startedAt.getTime();
    const hours = Math.floor(uptimeMs / 3_600_000);
    const minutes = Math.floor((uptimeMs % 3_600_000) / 60_000);
    return {
      total: nextId - 1,
      uptime: `${hours}h ${minutes}m`,
      startedAt: this.startedAt.toISOString(),
    };
  }
}

export const queryHistory = new QueryHistoryService();
