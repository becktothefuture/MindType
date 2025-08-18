/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  F T - 2 0 2   I N T E G R A T I O N   H A R N E S S  ░░░  ║
  ║                                                              ║
  ║   End-to-end: typing → scheduler → diffusion → engines.      ║
  ║   Verifies caret safety, pause catch-up, band progression.   ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Simulate real typing and pause; assert full pipeline
  • WHY  ▸ Guard core UX: streamed diffusion and caret safety
  • HOW  ▸ Fake timers; mock UI renderers; observe engine calls
*/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTypingMonitor } from '../core/typingMonitor';
import { createSweepScheduler } from '../core/sweepScheduler';
import { SHORT_PAUSE_MS, getTypingTickMs } from '../config/defaultThresholds';

// Capture UI render calls (no DOM in node env)
const bandCalls: Array<{ start: number; end: number }> = [];
const highlights: Array<{ start: number; end: number }> = [];
vi.mock('../ui/highlighter', () => ({
  renderValidationBand: vi.fn((range: { start: number; end: number }) => {
    bandCalls.push(range);
  }),
  renderHighlight: vi.fn((range: { start: number; end: number }) => {
    highlights.push(range);
  }),
}));

// Spy on engines to ensure they run on pause catch-up
vi.mock('../engines/tidySweep', () => ({
  tidySweep: vi.fn(() => ({ diff: null })),
}));
vi.mock('../engines/backfillConsistency', () => ({
  backfillConsistency: vi.fn(() => ({ diffs: [] })),
}));

import { tidySweep } from '../engines/tidySweep';
import { backfillConsistency } from '../engines/backfillConsistency';

describe('FT-202 Integration Harness', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    bandCalls.length = 0;
    highlights.length = 0;
    (tidySweep as unknown as { mockClear?: () => void }).mockClear?.();
    (backfillConsistency as unknown as { mockClear?: () => void }).mockClear?.();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('streams band during typing and catches up on pause without crossing caret', async () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();

    // Simulate user typing progressively (3 keystroke snapshots)
    monitor.emit({ text: 'Hello teh', caret: 9, atMs: Date.now() });
    vi.advanceTimersByTime(getTypingTickMs() + 1);

    monitor.emit({ text: 'Hello teh w', caret: 11, atMs: Date.now() });
    vi.advanceTimersByTime(getTypingTickMs() + 1);

    monitor.emit({ text: 'Hello teh world', caret: 15, atMs: Date.now() });
    vi.advanceTimersByTime(getTypingTickMs() + 1);

    // Expect band to have rendered at least once during typing
    expect(bandCalls.length).toBeGreaterThan(0);
    const lastBandDuringTyping = bandCalls[bandCalls.length - 1];
    expect(lastBandDuringTyping.end).toBeLessThanOrEqual(15);

    // Pause → run catch-up; engines should execute
    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();

    // After pause catch-up, band end should equal caret (frontier reached caret)
    const afterPauseBand = bandCalls[bandCalls.length - 1];
    expect(afterPauseBand.end).toBe(15);

    // Engines invoked as part of pause processing
    expect(tidySweep).toHaveBeenCalled();
    expect(backfillConsistency).toHaveBeenCalled();

    // Any highlights produced must be strictly behind the caret (caret safety)
    for (const h of highlights) {
      expect(h.end).toBeLessThanOrEqual(15);
    }

    scheduler.stop();
  });
});
