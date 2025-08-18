/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L O G G E R   T E S T S  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Ensures level filtering and silent default behaviour.      ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Unit tests for minimal logger
  • WHY  ▸ Meet FT-123 acceptance criteria
  • HOW  ▸ Configure sink/clock; verify emissions
*/

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger, setLoggerConfig, type LogRecord } from '../core/logger';

describe('Minimal Logger', () => {
  beforeEach(() => {
    setLoggerConfig({ enabled: false, level: 'silent', sink: undefined, now: undefined });
  });

  it('does nothing when disabled (default)', () => {
    const sink = vi.fn();
    setLoggerConfig({ enabled: false, level: 'silent', sink });
    const log = createLogger('test');
    log.error('boom');
    expect(sink).not.toHaveBeenCalled();
  });

  it('emits records at or above configured level', () => {
    const records: LogRecord[] = [];
    setLoggerConfig({
      enabled: true,
      level: 'info',
      sink: (r) => records.push(r),
      now: () => 123,
    });
    const log = createLogger('ns');
    log.debug('skip');
    log.info('hello', { a: 1 });
    log.warn('careful');
    log.error('oops');
    expect(records.map((r) => r.level)).toEqual(['info', 'warn', 'error']);
    expect(records.every((r) => r.namespace === 'ns' && r.timeMs === 123)).toBe(true);
  });

  it('supports trace/debug when level permits', () => {
    const levels: Array<LogRecord['level']> = [];
    setLoggerConfig({
      enabled: true,
      level: 'trace',
      sink: (r) => {
        levels.push(r.level);
      },
    });
    const log = createLogger('ns');
    log.trace('a');
    log.debug('b');
    log.info('c');
    expect(levels).toEqual(['trace', 'debug', 'info']);
  });
});
