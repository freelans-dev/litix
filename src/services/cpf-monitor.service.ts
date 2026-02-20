/**
 * CPF/CNPJ Monitor Service
 *
 * Scans configured DataJud tribunal aliases for ALL processes linked to a
 * document number. Detects new CNJs not yet in the known list and dispatches
 * them to AppSheet.
 *
 * Rate limit: 3s between each alias request per document.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DataJudClient } from '../providers/datajud/datajud.client.js';
import { mapDataJudToUnificado } from '../providers/datajud/datajud.mapper.js';
import { ALL_TRIBUNAIS_ALIASES } from '../providers/datajud/datajud.all-tribunais.js';
import { normalizeCnj } from '../utils/cnj-validator.js';
import { transformToAppSheet } from '../transformers/appsheet.transformer.js';
import { dispatchToAppSheet } from './appsheet-dispatcher.service.js';
import { alertStore } from './alert-store.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const DATA_DIR = join(process.cwd(), 'data');
const DOCS_FILE = join(DATA_DIR, 'monitored-docs.json');
const RATE_LIMIT_DELAY_MS = 500;

export interface MonitoredDoc {
  tipo: 'cpf' | 'cnpj';
  valor: string;            // raw as supplied (may have mask)
  nome: string;
  cliente: string;
  cnjs_conhecidos: string[];
  ultima_verificacao: string | null;
  ativo: boolean;
}

interface MonitoredDocsFile {
  documentos: MonitoredDoc[];
}

export interface DocCycleResult {
  total: number;
  verificados: number;
  novos: number;
  erros: number;
}

export class CpfMonitorService {
  private readonly client: DataJudClient;
  private readonly tribunalAliases: string[];

  constructor() {
    this.client = new DataJudClient();
    this.tribunalAliases =
      env.MONITOR_TRIBUNAIS.trim().toLowerCase() === 'all'
        ? [...ALL_TRIBUNAIS_ALIASES]
        : buildAliases(env.MONITOR_TRIBUNAIS);
  }

  async runCycle(): Promise<DocCycleResult> {
    const data = await this.readFile();
    const ativos = data.documentos.filter((d) => d.ativo);

    let verificados = 0;
    let novos = 0;
    let erros = 0;

    for (let i = 0; i < ativos.length; i++) {
      const entry = ativos[i]!;
      try {
        const count = await this.checkDocument(entry);
        novos += count;
        verificados++;
      } catch (error) {
        erros++;
        logger.warn(
          { valor: entry.valor, error: error instanceof Error ? error.message : String(error) },
          'Monitor Doc: erro ao verificar documento',
        );
      }

      await this.writeFile(data);

      if (i < ativos.length - 1) {
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    }

    return { total: ativos.length, verificados, novos, erros };
  }

  async addDoc(entry: Omit<MonitoredDoc, 'cnjs_conhecidos' | 'ultima_verificacao' | 'ativo'>): Promise<MonitoredDoc> {
    const doc = entry.valor.replace(/\D/g, '');
    const data = await this.readFile();
    const existing = data.documentos.find((d) => d.valor.replace(/\D/g, '') === doc);

    if (existing) {
      existing.ativo = true;
      existing.nome = entry.nome;
      existing.cliente = entry.cliente;
      await this.writeFile(data);
      return existing;
    }

    const newEntry: MonitoredDoc = {
      ...entry,
      cnjs_conhecidos: [],
      ultima_verificacao: null,
      ativo: true,
    };

    data.documentos.push(newEntry);
    await this.writeFile(data);
    return newEntry;
  }

  async removeDoc(valor: string): Promise<boolean> {
    const doc = valor.replace(/\D/g, '');
    const data = await this.readFile();
    const idx = data.documentos.findIndex((d) => d.valor.replace(/\D/g, '') === doc);
    if (idx === -1) return false;
    data.documentos.splice(idx, 1);
    await this.writeFile(data);
    return true;
  }

  async listAll(): Promise<MonitoredDoc[]> {
    const data = await this.readFile();
    return data.documentos;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async checkDocument(entry: MonitoredDoc): Promise<number> {
    const doc = entry.valor.replace(/\D/g, '');
    const docStart = Date.now();
    const foundCnjs = new Set<string>();
    let docHits = 0;
    let nameHits = 0;

    // ── Pass 1: busca por CPF/CNPJ (partes.cpfCnpj + partes.documento) ──
    const total = this.tribunalAliases.length;
    for (let aliasIdx = 0; aliasIdx < total; aliasIdx++) {
      const alias = this.tribunalAliases[aliasIdx]!;
      try {
        const response = await this.client.search(alias, {
          query: {
            bool: {
              should: [
                { term: { 'partes.cpfCnpj': doc } },
                { term: { 'partes.documento': doc } },
                { match: { 'partes.cpfCnpj': doc } },
                { match: { 'partes.documento': doc } },
              ],
              minimum_should_match: 1,
            },
          },
          size: 50,
          _source: ['numeroProcesso'],
        });

        const hits = response.hits?.hits ?? [];
        for (const hit of hits) {
          const raw = hit._source?.numeroProcesso as string | undefined;
          if (raw) {
            const formatted = normalizeCnj(raw) ?? raw;
            if (!foundCnjs.has(formatted)) { foundCnjs.add(formatted); docHits++; }
          }
        }

        logger.debug(
          { progress: `${aliasIdx + 1}/${total}`, alias, hits_so_far: foundCnjs.size },
          `Varrendo ${aliasIdx + 1}/${total}: ${alias}... (${foundCnjs.size} hits)`,
        );

        await sleep(RATE_LIMIT_DELAY_MS);
      } catch {
        // Skip alias on error
      }
    }

    // ── Pass 2: fallback por nome da parte (se nada foi encontrado no Pass 1) ──
    if (foundCnjs.size === 0 && entry.nome) {
      logger.debug({ nome: entry.nome }, 'Monitor Doc: nenhum hit por documento, tentando fallback por nome');

      for (const alias of this.tribunalAliases) {
        try {
          const response = await this.client.search(alias, {
            query: {
              match_phrase: { 'partes.nome': entry.nome },
            },
            size: 50,
            _source: ['numeroProcesso'],
          });

          const hits = response.hits?.hits ?? [];
          for (const hit of hits) {
            const raw = hit._source?.numeroProcesso as string | undefined;
            if (raw) {
              const formatted = normalizeCnj(raw) ?? raw;
              if (!foundCnjs.has(formatted)) { foundCnjs.add(formatted); nameHits++; }
            }
          }

          await sleep(RATE_LIMIT_DELAY_MS);
        } catch {
          // Skip alias on error
        }
      }
    }

    const docMs = Date.now() - docStart;
    logger.info(
      {
        nome: entry.nome,
        valor: entry.valor,
        tribunais: this.tribunalAliases.length,
        encontrados: foundCnjs.size,
        via_documento: docHits,
        via_nome: nameHits,
        ms: docMs,
      },
      `Monitor Doc: varredura concluída em ${docMs}ms`,
    );

    entry.ultima_verificacao = new Date().toISOString();

    const knownSet = new Set(entry.cnjs_conhecidos.map((c) => normalizeCnj(c) ?? c));
    const newCnjs = [...foundCnjs].filter((cnj) => !knownSet.has(cnj));

    if (newCnjs.length === 0) {
      logger.debug({ valor: entry.valor, total: foundCnjs.size }, 'Monitor Doc: sem novos processos');
      return 0;
    }

    for (const cnj of newCnjs) {
      logger.warn(
        { cnj, nome: entry.nome, valor: entry.valor },
        '[ALERTA] Novo processo encontrado',
      );

      alertStore.push({
        tipo: 'novo_processo',
        cnj,
        cliente: entry.cliente,
        descricao: `Novo processo detectado para ${entry.nome} (${entry.valor})`,
        timestamp: new Date().toISOString(),
      });

      entry.cnjs_conhecidos.push(cnj);

      // Dispatch new process to AppSheet
      await this.dispatchNewProcess(cnj, entry);
    }

    return newCnjs.length;
  }

  private async dispatchNewProcess(cnj: string, entry: MonitoredDoc): Promise<void> {
    if (!env.APPSHEET_WEBHOOK_URL) return;

    try {
      // Quick DataJud fetch for this specific CNJ
      const { cnjToTribunalAlias } = await import('../providers/datajud/datajud.tribunal-map.js');
      const formatted = normalizeCnj(cnj) ?? cnj;
      const alias = cnjToTribunalAlias(formatted);
      if (!alias) return;

      const requestId = formatted.replace(/\D/g, '');
      const response = await this.client.search(alias, {
        query: { term: { numeroProcesso: requestId } },
        size: 1,
      });

      const hit = response.hits?.hits?.[0];
      if (!hit) return;

      const processo = mapDataJudToUnificado(hit, requestId);
      const appSheetData = transformToAppSheet(processo);
      (appSheetData as unknown as Record<string, unknown>)['alerta'] = 'novo_processo';
      (appSheetData as unknown as Record<string, unknown>)['cliente'] = entry.cliente;

      await dispatchToAppSheet(env.APPSHEET_WEBHOOK_URL, appSheetData);
    } catch (err) {
      logger.warn(
        { cnj, error: err instanceof Error ? err.message : String(err) },
        'Monitor Doc: falha ao despachar novo processo para AppSheet',
      );
    }
  }

  private async readFile(): Promise<MonitoredDocsFile> {
    try {
      const content = await readFile(DOCS_FILE, 'utf-8');
      return JSON.parse(content) as MonitoredDocsFile;
    } catch {
      return { documentos: [] };
    }
  }

  private async writeFile(data: MonitoredDocsFile): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DOCS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts comma-separated tribunal codes to DataJud aliases.
 * e.g. "tjsp,trf4,trt9" → ["api_publica_tjsp", "api_publica_trf4", "api_publica_trt9"]
 */
function buildAliases(tribunais: string): string[] {
  return tribunais
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .map((t) => `api_publica_${t}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
