/* Covers sweep scheduler runSweeps try/catch branch when diffusion.catchUp throws */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/defaultThresholds', () => ({
  SHORT_PAUSE_MS: 5,
  LONG_PAUSE_MS: 2000,
  MAX_SWEEP_WINDOW: 80,
  getTypingTickMs: () => 1_000_000,
  getMinValidationWords: () => 3,
  getMaxValidationWords: () => 8,
}));

// Mock engines to assert they still run after catchUp throws
vi.mock('../engines/noiseTransformer', () => ({
  noiseTransform: vi.fn(() => ({ diff: null })),
}));
vi.mock('../engines/backfillConsistency', () => ({
  backfillConsistency: vi.fn(() => ({ diffs: [] })),
}));

const tickOnce = vi.fn();
const catchUp = vi.fn(async () => {
  throw new Error('catchUp failed');
});
let state = { text: '', caret: 5, frontier: 0 };
const update = (text: string, caret: number) => {
  state.text = text;
  state.caret = caret;
};
const getState = () => state;
vi.mock('../core/diffusionController', () => ({
  createDiffusionController: () => ({ update, tickOnce, catchUp, getState }),
}));

import { createTypingMonitor } from '../core/typingMonitor';
import { createSweepScheduler } from '../core/sweepScheduler';
import { noiseTransform } from '../engines/noiseTransformer';
import { backfillConsistency } from '../engines/backfillConsistency';
import { SHORT_PAUSE_MS } from '../config/defaultThresholds';

describe('SweepScheduler catchUp error branch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (noiseTransform as unknown as { mockClear?: () => void }).mockClear?.();
    (backfillConsistency as unknown as { mockClear?: () => void }).mockClear?.();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('swallows catchUp error and continues with engines', async () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();
    monitor.emit({ text: 'abc def', caret: 7, atMs: Date.now() });

    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();

    expect(noiseTransform).toHaveBeenCalled();
    expect(backfillConsistency).toHaveBeenCalled();
  });
});
