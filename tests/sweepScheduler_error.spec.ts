/* Covers sweep scheduler interval try/catch branch when diffusion.tickOnce throws */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/defaultThresholds', () => ({
  SHORT_PAUSE_MS: 10,
  LONG_PAUSE_MS: 2000,
  MAX_SWEEP_WINDOW: 80,
  getTypingTickMs: () => 5,
  getMinValidationWords: () => 3,
  getMaxValidationWords: () => 8,
}));

const tickOnce = vi.fn(() => {
  throw new Error('boom');
});
const catchUp = vi.fn();
const update = vi.fn();
const getState = () => ({ text: '', caret: 0, frontier: 0 });
vi.mock('../core/diffusionController', () => ({
  createDiffusionController: () => ({ update, tickOnce, catchUp, getState }),
}));

import { createTypingMonitor } from '../core/typingMonitor';
import { createSweepScheduler } from '../core/sweepScheduler';

describe('SweepScheduler error branch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    tickOnce.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears intervals when diffusion.tickOnce throws', () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();
    monitor.emit({ text: 'abc def', caret: 7, atMs: Date.now() });

    // First interval tick triggers error and clears intervals
    vi.advanceTimersByTime(6);
    expect(tickOnce).toHaveBeenCalledTimes(1);

    // Further time should not call tickOnce again
    vi.advanceTimersByTime(50);
    expect(tickOnce).toHaveBeenCalledTimes(1);
  });
});


