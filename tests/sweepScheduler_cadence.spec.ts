/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S W E E P   S C H E D U L E R   C A D E N C E  ░░░░░░░░  ║
  ║                                                              ║
  ║   Verifies micro tick during typing and single-flight pause  ║
  ║   sweep with no overlapping runs.                            ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/defaultThresholds', () => ({
  SHORT_PAUSE_MS: 10,
  LONG_PAUSE_MS: 2000,
  MAX_SWEEP_WINDOW: 80,
  getTypingTickMs: () => 5,
  getMinValidationWords: () => 3,
  getMaxValidationWords: () => 6,
}));

const update = vi.fn((text: string, caret: number) => {
  state.text = text;
  state.caret = caret;
});
const tickOnce = vi.fn();
const catchUp = vi.fn(async () => {
  state.frontier = state.caret;
});
let state = { text: '', caret: 0, frontier: 0 } as any;
const getState = () => state;

vi.mock('../core/diffusionController', () => ({
  createDiffusionController: () => ({
    update,
    tickOnce,
    catchUp,
    getState,
    applyExternal: vi.fn(),
  }),
}));

import { createTypingMonitor } from '../core/typingMonitor';
import { createSweepScheduler } from '../core/sweepScheduler';
import { SHORT_PAUSE_MS, getTypingTickMs } from '../config/defaultThresholds';

describe('SweepScheduler cadence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    update.mockClear();
    tickOnce.mockClear();
    catchUp.mockClear();
    state = { text: '', caret: 0, frontier: 0 } as any;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires micro tick during typing and runs a single pause sweep on pause', async () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();

    // Emit typing event → should start micro tick interval
    const text = 'hello world';
    monitor.emit({ text, caret: text.length, atMs: Date.now() });

    // Advance time to trigger at least one micro tick but not the pause
    vi.advanceTimersByTime(getTypingTickMs() + 1);
    expect(tickOnce.mock.calls.length >= 1).toBe(true);

    // Emit another event to reset pause timer, then let pause elapse
    monitor.emit({ text: text + '!', caret: text.length + 1, atMs: Date.now() });
    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();

    // catchUp should have been called, but only once (single-flight)
    expect(catchUp).toHaveBeenCalled();
    const firstCallCount = catchUp.mock.calls.length;

    // Let more time pass; guard should prevent overlapping pause runs without new events
    vi.advanceTimersByTime(SHORT_PAUSE_MS + 10);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    expect(catchUp.mock.calls.length).toBe(firstCallCount);

    scheduler.stop();
  });
});
