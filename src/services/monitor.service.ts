/**
 * CNJ Monitor Service
 *
 * Polls DataJud for known CNJs and detects new movimentações by comparing
 * SHA-256 hashes. Dispatches to AppSheet + optional external webhook on change.
 *
 * Rate limit: 3s between each DataJud request (DataJud limit: 120 req/min).
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DataJudClient } from '../providers/datajud/datajud.client.js';
import { mapDataJudToUnificado } from '../providers/datajud/datajud.mapper.js';
import { cnjToTribunalAlias } from '../providers/datajud/datajud.tribunal-map.js';
import { normalizeCnj } from '../utils/cnj-validator.js';
import { transformToAppSheet } from '../transformers/appsheet.transformer.js';
import { dispatchToAppSheet } from './appsheet-dispatcher.service.js';
import { alertStore } from './alert-store.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { Movimentacao } from '../models/movimentacao.js';

const DATA_DIR = join(process.cwd(), 'data');
const CNJS_FILE = join(DATA_DIR, 'monitored-cnjs.json');
const RATE_LIMIT_DELAY_MS = 3000;

export interface MonitoredCnj {
  cnj: string;
  cliente: string;
  ultima_verificacao: string | null;
  ultimo_hash_movs: string | null;
  total_movs_conhecido: number;
  ativo: boolean;
}

interface MonitoredCnjsFile {
  processos: MonitoredCnj[];
}

export interface CnjCycleResult {
  total: number;
  verificados: number;
  alertas: number;
  erros: number;
}

export class MonitorService {
  private readonly client: DataJudClient;

  constructor() {
    this.client = new DataJudClient();
  }

  async runCycle(): Promise<CnjCycleResult> {
    const data = await this.readFile();
    const ativos = data.processos.filter((p) => p.ativo);

    let verificados = 0;
    let alertas = 0;
    let erros = 0;

    for (let i = 0; i < ativos.length; i++) {
      const entry = ativos[i]!;
      try {
        const hasAlert = await this.checkProcess(entry);
        if (hasAlert) alertas++;
        verificados++;
      } catch (error) {
        erros++;
        logger.warn(
          { cnj: entry.cnj, error: error instanceof Error ? error.message : String(error) },
          'Monitor CNJ: erro ao verificar processo',
        );
      }

      // Persist after each process (partial progress survives crashes)
      await this.writeFile(data);

      if (i < ativos.length - 1) {
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    }

    return { total: ativos.length, verificados, alertas, erros };
  }

  async addCnj(cnj: string, cliente: string): Promise<MonitoredCnj> {
    const formatted = normalizeCnj(cnj);
    if (!formatted) throw new Error(`CNJ inválido: ${cnj}`);

    const data = await this.readFile();
    const existing = data.processos.find((p) => normalizeCnj(p.cnj) === formatted);

    if (existing) {
      existing.ativo = true;
      existing.cliente = cliente;
      await this.writeFile(data);
      return existing;
    }

    const entry: MonitoredCnj = {
      cnj: formatted,
      cliente,
      ultima_verificacao: null,
      ultimo_hash_movs: null,
      total_movs_conhecido: 0,
      ativo: true,
    };

    data.processos.push(entry);
    await this.writeFile(data);
    return entry;
  }

  async removeCnj(cnj: string): Promise<boolean> {
    const formatted = normalizeCnj(cnj);
    const data = await this.readFile();
    const idx = data.processos.findIndex((p) => normalizeCnj(p.cnj) === formatted);
    if (idx === -1) return false;
    data.processos.splice(idx, 1);
    await this.writeFile(data);
    return true;
  }

  async listAll(): Promise<MonitoredCnj[]> {
    const data = await this.readFile();
    return data.processos;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async checkProcess(entry: MonitoredCnj): Promise<boolean> {
    const formatted = normalizeCnj(entry.cnj);
    if (!formatted) return false;

    const alias = cnjToTribunalAlias(formatted);
    if (!alias) {
      logger.warn({ cnj: formatted }, 'Monitor CNJ: tribunal não mapeado no DataJud');
      entry.ultima_verificacao = new Date().toISOString();
      return false;
    }

    const requestId = formatted.replace(/\D/g, '');
    const response = await this.client.search(alias, {
      query: { term: { numeroProcesso: requestId } },
      size: 1,
    });

    entry.ultima_verificacao = new Date().toISOString();

    const hit = response.hits?.hits?.[0];
    if (!hit) {
      logger.debug({ cnj: formatted }, 'Monitor CNJ: processo não encontrado no DataJud');
      return false;
    }

    const processo = mapDataJudToUnificado(hit, requestId);
    const movs = processo.movimentacoes ?? [];
    const currentHash = hashMovimentacoes(movs);

    if (entry.ultimo_hash_movs === null) {
      // First check — record baseline, no alert
      entry.ultimo_hash_movs = currentHash;
      entry.total_movs_conhecido = movs.length;
      logger.info({ cnj: formatted, total: movs.length }, 'Monitor CNJ: baseline registrado');
      return false;
    }

    if (currentHash === entry.ultimo_hash_movs) {
      logger.debug({ cnj: formatted }, 'Monitor CNJ: sem novidade');
      return false;
    }

    // ── New movement detected ──
    const novos = movs.length - entry.total_movs_conhecido;
    logger.warn(
      { cnj: formatted, cliente: entry.cliente, novos },
      '[ALERTA] Nova movimentação detectada',
    );

    alertStore.push({
      tipo: 'nova_movimentacao',
      cnj: formatted,
      cliente: entry.cliente,
      descricao: `${novos > 0 ? novos : 'nova'} movimentação(ões) detectada(s) (total: ${movs.length})`,
      timestamp: new Date().toISOString(),
    });

    entry.ultimo_hash_movs = currentHash;
    entry.total_movs_conhecido = movs.length;

    // Dispatch to AppSheet
    if (env.APPSHEET_WEBHOOK_URL) {
      try {
        const appSheetData = transformToAppSheet(processo);
        (appSheetData as unknown as Record<string, unknown>)['alerta'] = 'nova_movimentacao';
        (appSheetData as unknown as Record<string, unknown>)['cliente'] = entry.cliente;
        await dispatchToAppSheet(env.APPSHEET_WEBHOOK_URL, appSheetData);
      } catch (err) {
        logger.warn(
          { cnj: formatted, error: err instanceof Error ? err.message : String(err) },
          'Monitor CNJ: falha ao despachar para AppSheet',
        );
      }
    }

    // Optional external webhook (Slack, email, etc.)
    if (env.MONITOR_WEBHOOK_URL) {
      await fireExternalWebhook(env.MONITOR_WEBHOOK_URL, {
        tipo: 'nova_movimentacao',
        cnj: formatted,
        cliente: entry.cliente,
        total_movs: movs.length,
        novos,
      });
    }

    return true;
  }

  private async readFile(): Promise<MonitoredCnjsFile> {
    try {
      const content = await readFile(CNJS_FILE, 'utf-8');
      return JSON.parse(content) as MonitoredCnjsFile;
    } catch {
      return { processos: [] };
    }
  }

  private async writeFile(data: MonitoredCnjsFile): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(CNJS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashMovimentacoes(movs: Movimentacao[]): string {
  if (movs.length === 0) return 'empty';
  const keys = movs
    .map((m) => `${m.data.toISOString().slice(0, 10)}|${m.descricao.slice(0, 80).toLowerCase()}`)
    .sort();
  return createHash('sha256').update(keys.join('\n')).digest('hex');
}

async function fireExternalWebhook(url: string, body: unknown): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Best-effort — external webhook failures are non-fatal
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
