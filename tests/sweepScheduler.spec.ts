/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S W E E P   S C H E D U L E R   T E S T S  ░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Exercises timer wiring, event handling, and pause catchup. ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Ensure tick interval and pause timeout trigger actions
  • WHY  ▸ Cover scheduling logic and integration calls safely
  • HOW  ▸ Fake timers + mocks for diffusion and engines
*/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTypingMonitor } from '../core/typingMonitor';

// Force very short pause and extremely long typing tick to avoid interval churn
vi.mock('../config/defaultThresholds', () => ({
  SHORT_PAUSE_MS: 5,
  LONG_PAUSE_MS: 2000,
  MAX_SWEEP_WINDOW: 80,
  getTypingTickMs: () => 1_000_000,
  getMinValidationWords: () => 3,
  getMaxValidationWords: () => 8,
}));

// Import mocked timing values for use in the tests
import { SHORT_PAUSE_MS, getTypingTickMs } from '../config/defaultThresholds';

// Mock engines to observe calls after pause catch-up
vi.mock('../engines/tidySweep', () => ({
  tidySweep: vi.fn(() => ({ diff: null })),
}));
vi.mock('../engines/backfillConsistency', () => ({
  backfillConsistency: vi.fn(() => ({ diffs: [] })),
}));

// Mock DiffusionController to track tick/catchUp invocations and state
const tickOnce = vi.fn();
const catchUp = vi.fn(async () => {
  // Simulate catch-up advancing frontier to caret to finish quickly
  state.frontier = state.caret;
});
let state = { text: '', caret: 0, frontier: 0 };
const update = (text: string, caret: number) => {
  state.text = text;
  state.caret = caret;
};
const getState = () => state;

vi.mock('../core/diffusionController', () => ({
  createDiffusionController: () => ({ update, tickOnce, catchUp, getState }),
}));

// Import after mocks are in place
import { createSweepScheduler } from '../core/sweepScheduler';
import { tidySweep } from '../engines/tidySweep';
import { backfillConsistency } from '../engines/backfillConsistency';

describe('SweepScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    tickOnce.mockClear();
    catchUp.mockClear();
    (tidySweep as unknown as { mockClear?: () => void }).mockClear?.();
    (backfillConsistency as unknown as { mockClear?: () => void }).mockClear?.();
    state = { text: '', caret: 0, frontier: 0 };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts interval on typing and calls tickOnce on cadence', () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();

    // Emit an event to trigger scheduling
    monitor.emit({ text: 'Hello teh', caret: 9, atMs: Date.now() });

    // Advance just beyond one tick
    vi.advanceTimersByTime(getTypingTickMs() + 1);
    expect(tickOnce).toHaveBeenCalledTimes(1);
  });

  it('runs catchUp and engines on short pause', async () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();

    // Emit an event to schedule the pause timer
    monitor.emit({ text: 'Hello teh', caret: 9, atMs: Date.now() });

    // Trigger pause timeout and flush pending timers
    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    // Flush any microtasks queued by async callbacks
    await Promise.resolve();

    expect(catchUp).toHaveBeenCalled();
    expect(tidySweep).toHaveBeenCalled();
    expect(backfillConsistency).toHaveBeenCalled();

    scheduler.stop();
  });

  it('stops timers on stop()', () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();
    monitor.emit({ text: 'Hi', caret: 2, atMs: Date.now() });

    vi.advanceTimersByTime(getTypingTickMs() + 1);
    expect(tickOnce).toHaveBeenCalledTimes(1);

    scheduler.stop();

    // Further time should not increase tickOnce calls
    vi.advanceTimersByTime(getTypingTickMs() * 3);
    expect(tickOnce).toHaveBeenCalledTimes(1);
  });
});
