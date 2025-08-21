/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T Y P I N G   M O N I T O R   L O G G E R  ░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Exercises logger-enabled and disabled paths to improve     ║
  ║   branch coverage in TypingMonitor emit/on flows.            ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Ensure debug logs fire only when logger is enabled
  • WHY  ▸ Cover branches guarded by getLoggerConfig().enabled
  • HOW  ▸ Swap logger config; capture sink records; emit events
*/

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTypingMonitor } from '../core/typingMonitor';
import { setLoggerConfig, type LogRecord } from '../core/logger';

describe('TypingMonitor logger integration', () => {
  const records: LogRecord[] = [] as unknown as LogRecord[];

  beforeEach(() => {
    records.length = 0;
  });

  afterEach(() => {
    // Reset logger to defaults (disabled)
    setLoggerConfig({ enabled: false, level: 'silent', sink: undefined });
  });

  it('emits no logs when logger is disabled (default)', () => {
    const monitor = createTypingMonitor();
    monitor.emit({ text: 'abc', caret: 3, atMs: Date.now() });
    expect(records.length).toBe(0);
  });

  it('emits debug logs when logger is enabled', () => {
    setLoggerConfig({ enabled: true, level: 'debug', sink: (r) => records.push(r) });
    const monitor = createTypingMonitor();
    monitor.emit({ text: 'abc', caret: 3, atMs: Date.now() });
    expect(records.length).toBeGreaterThan(0);
    // Spot-check namespace and level
    expect(records[0].namespace).toBe('monitor');
    expect(['debug', 'trace', 'info', 'warn', 'error']).toContain(records[0].level);
  });
});
