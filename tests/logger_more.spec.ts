/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L O G G E R   B R A N C H   C O V E R A G E  ░░░░░░░░░░  ║
  ║                                                              ║
  ║   Covers default sink, silent level, and sink error path.    ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Additional tests to meet coverage thresholds
  • WHY  ▸ FT-123 acceptance: logger fully guarded
  • HOW  ▸ Spy on console; simulate throwing sink
*/

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger, setLoggerConfig, getLoggerConfig } from '../core/logger';

describe('Logger coverage', () => {
  beforeEach(() => {
    setLoggerConfig({ enabled: false, level: 'silent', sink: undefined, now: undefined });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses default sink and maps to console.error/warn/log', () => {
    const spyErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spyLog = vi
      .spyOn(console, 'log')
      .mockImplementation((..._args: unknown[]) => {});
    setLoggerConfig({ enabled: true, level: 'trace' });
    const log = createLogger('ns');
    log.error('e', { x: 1 });
    log.warn('w');
    log.info('i');
    expect(spyErr).toHaveBeenCalled();
    expect(spyWarn).toHaveBeenCalled();
    expect(spyLog).toHaveBeenCalled();
  });

  it('emits nothing when level is silent even if enabled', () => {
    const sink = vi.fn();
    setLoggerConfig({ enabled: true, level: 'silent', sink });
    const log = createLogger('ns');
    log.error('x');
    expect(sink).not.toHaveBeenCalled();
  });

  it('swallows sink errors without throwing', () => {
    setLoggerConfig({
      enabled: true,
      level: 'debug',
      sink: () => {
        throw new Error('bad sink');
      },
    });
    const log = createLogger('ns');
    expect(() => log.error('e')).not.toThrow();
  });

  it('exposes and returns logger config', () => {
    setLoggerConfig({ enabled: true, level: 'info' });
    const cfg = getLoggerConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.level).toBe('info');
  });
});
