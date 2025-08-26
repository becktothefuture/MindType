/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C A R E T   M O N I T O R   ( T E S T S )  ░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Verifies typing/pause debounce and caret-entered signals.  ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Unit tests for FT-301 acceptance
  • WHY  ▸ Ensure observable behaviour per spec
  • HOW  ▸ Simulated timestamps; no real timers needed
*/

import { describe, it, expect } from 'vitest';
import { createCaretMonitor } from '../../core/caretMonitor';

describe('caretMonitor', () => {
  it('emits typing immediately and pause after debounce', async () => {
    const cm = createCaretMonitor({ pauseMs: 400 });
    const events: Array<{ type: string; atMs: number }> = [];
    cm.on((e) => events.push({ type: e.type, atMs: e.atMs }));

    cm.update('Hello', 5, 1000);
    expect(events[0].type).toBe('typing');
    expect(events[0].atMs).toBe(1000);

    // Manually advance time by triggering another update that would cancel previous pause
    // but since we want to validate pause, we simulate timer via real setTimeout with small wait
    await new Promise((r) => setTimeout(r, 420));
    // The pause should have fired (~1400ms)
    expect(events.find((e) => e.type === 'pause')).toBeTruthy();
  });

  it('emits caret_entered_active_region when caret moves into band', () => {
    const cm = createCaretMonitor({ pauseMs: 400 });
    const events: string[] = [];
    cm.on((e) => events.push(e.type));
    cm.setActiveRegion({ start: 10, end: 20 });

    cm.update('abcdefghijABCDEFGHIJ', 9, 0); // just before
    cm.update('abcdefghijABCDEFGHIJ', 10, 1); // enters
    expect(events).toContain('caret_entered_active_region');
  });
});
