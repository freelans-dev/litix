/**
 * Scheduler Service
 *
 * Runs CNJ and CPF/CNPJ monitor cycles on configurable intervals.
 * Uses setInterval — no external cron required.
 *
 * First cycle fires 30s after start() to let the server finish booting.
 */
import { MonitorService } from './monitor.service.js';
import { CpfMonitorService } from './cpf-monitor.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface CycleStats {
  lastRun: Date | null;
  nextRun: Date | null;
  lastAlertCount: number;
  lastNewCount: number;
  totalMonitorados: number;
  running: boolean;
}

export interface SchedulerStatus {
  enabled: boolean;
  cnj_monitor: {
    enabled: boolean;
    last_run: string | null;
    next_run: string | null;
    total_monitorados: number;
    alertas_ultimo_ciclo: number;
  };
  cpf_monitor: {
    enabled: boolean;
    last_run: string | null;
    next_run: string | null;
    total_monitorados: number;
    novos_ultimo_ciclo: number;
  };
}

export class SchedulerService {
  private readonly cnjMonitor: MonitorService;
  private readonly cpfMonitor: CpfMonitorService;

  private cnjStats: CycleStats = {
    lastRun: null, nextRun: null,
    lastAlertCount: 0, lastNewCount: 0,
    totalMonitorados: 0, running: false,
  };

  private cpfStats: CycleStats = {
    lastRun: null, nextRun: null,
    lastAlertCount: 0, lastNewCount: 0,
    totalMonitorados: 0, running: false,
  };

  private cnjTimer: ReturnType<typeof setInterval> | null = null;
  private cpfTimer: ReturnType<typeof setInterval> | null = null;

  constructor(cnjMonitor: MonitorService, cpfMonitor: CpfMonitorService) {
    this.cnjMonitor = cnjMonitor;
    this.cpfMonitor = cpfMonitor;
  }

  start(): void {
    if (!env.MONITOR_ENABLED) {
      logger.info('Scheduler: monitoramento desabilitado (MONITOR_ENABLED=false)');
      return;
    }

    const cnjIntervalMs = env.MONITOR_INTERVAL_HOURS * 60 * 60 * 1000;
    const cpfIntervalMs = env.MONITOR_CPF_INTERVAL_HOURS * 60 * 60 * 1000;

    logger.info(
      { cnjHours: env.MONITOR_INTERVAL_HOURS, cpfHours: env.MONITOR_CPF_INTERVAL_HOURS },
      'Scheduler: iniciando — primeiro ciclo em 30s',
    );

    // Fire first cycle after 30s warm-up
    setTimeout(() => {
      void this.runCnjCycle();
      void this.runCpfCycle();
    }, 30_000);

    // Schedule recurring cycles
    this.cnjStats.nextRun = new Date(Date.now() + 30_000);
    this.cpfStats.nextRun = new Date(Date.now() + 30_000);

    this.cnjTimer = setInterval(() => {
      void this.runCnjCycle();
    }, cnjIntervalMs);

    this.cpfTimer = setInterval(() => {
      void this.runCpfCycle();
    }, cpfIntervalMs);
  }

  stop(): void {
    if (this.cnjTimer) clearInterval(this.cnjTimer);
    if (this.cpfTimer) clearInterval(this.cpfTimer);
    this.cnjTimer = null;
    this.cpfTimer = null;
    logger.info('Scheduler: parado');
  }

  /**
   * Force an immediate run of both cycles (used by POST /monitor/run).
   */
  async runNow(): Promise<{ cnj: Awaited<ReturnType<MonitorService['runCycle']>>; cpf: Awaited<ReturnType<CpfMonitorService['runCycle']>> }> {
    const [cnj, cpf] = await Promise.all([
      this.runCnjCycle(),
      this.runCpfCycle(),
    ]);
    return { cnj, cpf };
  }

  async getStatus(): Promise<SchedulerStatus> {
    const [cnjList, cpfList] = await Promise.all([
      this.cnjMonitor.listAll(),
      this.cpfMonitor.listAll(),
    ]);

    return {
      enabled: env.MONITOR_ENABLED,
      cnj_monitor: {
        enabled: env.MONITOR_ENABLED,
        last_run: this.cnjStats.lastRun?.toISOString() ?? null,
        next_run: this.cnjStats.nextRun?.toISOString() ?? null,
        total_monitorados: cnjList.filter((p) => p.ativo).length,
        alertas_ultimo_ciclo: this.cnjStats.lastAlertCount,
      },
      cpf_monitor: {
        enabled: env.MONITOR_ENABLED,
        last_run: this.cpfStats.lastRun?.toISOString() ?? null,
        next_run: this.cpfStats.nextRun?.toISOString() ?? null,
        total_monitorados: cpfList.filter((d) => d.ativo).length,
        novos_ultimo_ciclo: this.cpfStats.lastNewCount,
      },
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async runCnjCycle(): Promise<ReturnType<MonitorService['runCycle']>> {
    if (this.cnjStats.running) {
      logger.warn('Scheduler: ciclo CNJ ainda em execução, pulando');
      return { total: 0, verificados: 0, alertas: 0, erros: 0 };
    }

    this.cnjStats.running = true;
    this.cnjStats.lastRun = new Date();

    const cnjIntervalMs = env.MONITOR_INTERVAL_HOURS * 60 * 60 * 1000;
    this.cnjStats.nextRun = new Date(Date.now() + cnjIntervalMs);

    logger.info('Scheduler: iniciando ciclo CNJ');
    try {
      const result = await this.cnjMonitor.runCycle();
      this.cnjStats.lastAlertCount = result.alertas;
      logger.info(
        result,
        `Scheduler: ciclo CNJ concluído — ${result.verificados} verificados, ${result.alertas} com novidade`,
      );
      return result;
    } catch (error) {
      logger.error({ error }, 'Scheduler: ciclo CNJ falhou');
      return { total: 0, verificados: 0, alertas: 0, erros: 1 };
    } finally {
      this.cnjStats.running = false;
    }
  }

  private async runCpfCycle(): Promise<ReturnType<CpfMonitorService['runCycle']>> {
    if (this.cpfStats.running) {
      logger.warn('Scheduler: ciclo CPF ainda em execução, pulando');
      return { total: 0, verificados: 0, novos: 0, erros: 0 };
    }

    this.cpfStats.running = true;
    this.cpfStats.lastRun = new Date();

    const cpfIntervalMs = env.MONITOR_CPF_INTERVAL_HOURS * 60 * 60 * 1000;
    this.cpfStats.nextRun = new Date(Date.now() + cpfIntervalMs);

    logger.info('Scheduler: iniciando ciclo CPF/CNPJ');
    try {
      const result = await this.cpfMonitor.runCycle();
      this.cpfStats.lastNewCount = result.novos;
      logger.info(
        result,
        `Scheduler: ciclo CPF concluído — ${result.verificados} verificados, ${result.novos} novos processos`,
      );
      return result;
    } catch (error) {
      logger.error({ error }, 'Scheduler: ciclo CPF falhou');
      return { total: 0, verificados: 0, novos: 0, erros: 1 };
    } finally {
      this.cpfStats.running = false;
    }
  }
}
