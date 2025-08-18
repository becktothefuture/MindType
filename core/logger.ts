/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  M I N I M A L   L O G G E R  ░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Lightweight, zero-dep logger with levels & namespaces.     ║
  ║   Disabled by default; safe to call in hot paths.            ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Tiny logger modeled after common best practices
  • WHY  ▸ Observability without pulling heavy deps
  • HOW  ▸ Global config + per-namespace creators; no-ops when off
*/

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

const levelWeight: Record<Exclude<LogLevel, 'silent'>, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

export interface LogRecord {
  timeMs: number;
  level: Exclude<LogLevel, 'silent'>;
  namespace: string;
  message: string;
  data?: unknown;
}

export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel; // 'silent' disables all
  sink?: (record: LogRecord) => void; // default writes to console
  now?: () => number; // injectable clock for tests
}

let globalConfig: LoggerConfig = {
  enabled: false,
  level: 'silent',
};

export function setLoggerConfig(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

export function getLoggerConfig(): LoggerConfig {
  return globalConfig;
}

export interface Logger {
  trace: (message: string, data?: unknown) => void;
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

function shouldLog(level: Exclude<LogLevel, 'silent'>, cfg: LoggerConfig): boolean {
  if (!cfg.enabled) return false;
  if (cfg.level === 'silent') return false;
  // If cfg.level is e.g. 'info', allow info/warn/error
  const threshold =
    levelWeight[(cfg.level as Exclude<LogLevel, 'silent'>) || 'error'] ?? 50;
  return levelWeight[level] >= threshold;
}

function defaultSink(record: LogRecord): void {
  const { level, namespace, message, data } = record;
  const line = `[${namespace}] ${message}`;
  // Map to console methods; fall back to console.log
  const method: 'error' | 'warn' | 'log' =
    level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  (console[method] as (msg?: unknown, ...optionalParams: unknown[]) => void)(
    line,
    data ?? '',
  );
}

export function createLogger(namespace: string): Logger {
  function emit(
    level: Exclude<LogLevel, 'silent'>,
    message: string,
    data?: unknown,
  ): void {
    const cfg = globalConfig;
    if (!shouldLog(level, cfg)) return;
    const now = cfg.now ?? Date.now;
    const record: LogRecord = {
      timeMs: now(),
      level,
      namespace,
      message,
      data,
    };
    const sink = cfg.sink ?? defaultSink;
    try {
      sink(record);
    } catch {
      // Swallow sink errors to avoid breaking hot paths
    }
  }

  return {
    trace: (m, d) => emit('trace', m, d),
    debug: (m, d) => emit('debug', m, d),
    info: (m, d) => emit('info', m, d),
    warn: (m, d) => emit('warn', m, d),
    error: (m, d) => emit('error', m, d),
  };
}
