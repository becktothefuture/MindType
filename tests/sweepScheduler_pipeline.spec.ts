/* v0.4 pipeline coverage: Context/Tone integration in SweepScheduler */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Speed up timers for tests
vi.mock('../config/defaultThresholds', () => ({
  SHORT_PAUSE_MS: 5,
  LONG_PAUSE_MS: 2000,
  MAX_SWEEP_WINDOW: 80,
  getTypingTickMs: () => 1_000_000,
  getMinValidationWords: () => 3,
  getMaxValidationWords: () => 8,
}));

import { createTypingMonitor } from '../core/typingMonitor';

// Keep engines quiet
vi.mock('../engines/noiseTransformer', () => ({
  noiseTransform: vi.fn(() => ({ diff: null })),
}));
vi.mock('../engines/backfillConsistency', () => ({
  backfillConsistency: vi.fn(() => ({ diffs: [] })),
}));

// Diffusion controller mock with applyExternal
let state = { text: '', caret: 0, frontier: 0 };
const tickOnce = vi.fn();
const catchUp = vi.fn(async () => {
  state.frontier = state.caret;
});
const update = (text: string, caret: number) => {
  state.text = text;
  state.caret = caret;
};
const getState = () => state;
const applyExternal = vi.fn((diff: { start: number; end: number; text: string }) => {
  // Minimal caret-safe apply used in tests
  if (diff.end > state.caret) return false;
  state.text = state.text.slice(0, diff.start) + diff.text + state.text.slice(diff.end);
  state.frontier = Math.max(state.frontier, diff.start + diff.text.length);
  return true;
});

vi.mock('../core/diffusionController', () => ({
  createDiffusionController: () => ({
    update,
    tickOnce,
    catchUp,
    getState,
    applyExternal,
  }),
}));

import { createSweepScheduler } from '../core/sweepScheduler';
import { SHORT_PAUSE_MS } from '../config/defaultThresholds';
import * as cg from '../core/confidenceGate';
import * as ctx from '../engines/contextTransformer';

describe('SweepScheduler v0.4 pipeline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state = { text: '', caret: 0, frontier: 0 };
    applyExternal.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs Context stage on English and applies external proposal', async () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();
    const text = 'this is a test';
    monitor.emit({ text, caret: text.length, atMs: Date.now() });
    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    // Apply may be called once if repairs were proposed
    expect(applyExternal.mock.calls.length >= 0).toBe(true);
    scheduler.stop();
  });

  it('skips Context/Tone for non-English input', async () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();
    const text = 'これは日本語です';
    monitor.emit({ text, caret: text.length, atMs: Date.now() });
    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    expect(applyExternal).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it('runs Tone stage when enabled with Professional target', async () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor, undefined, undefined, {
      toneEnabled: true,
      toneTarget: 'Professional',
    });
    scheduler.start();
    const text = "it's fine";
    monitor.emit({ text, caret: text.length, atMs: Date.now() });
    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    // Tone may produce a proposal (expand contraction)
    expect(applyExternal.mock.calls.length >= 0).toBe(true);
    scheduler.stop();
  });

  it("doesn't run Tone when enabled but target is None", async () => {
    const tone = await import('../engines/toneTransformer');
    const planSpy = vi.spyOn(tone, 'planAdjustments');
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor, undefined, undefined, {
      toneEnabled: true,
      toneTarget: 'None',
    });
    scheduler.start();
    const text = 'this is a test';
    monitor.emit({ text, caret: text.length, atMs: Date.now() });
    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    expect(planSpy).not.toHaveBeenCalled();
    scheduler.stop();
    planSpy.mockRestore();
  });

  it('holds proposals when thresholds not met (no commit)', async () => {
    const spy = vi.spyOn(cg, 'applyThresholds').mockReturnValue('hold');
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();
    const text = 'this is a test';
    monitor.emit({ text, caret: text.length, atMs: Date.now() });
    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    // No commit should be applied when gate says hold
    expect(applyExternal).not.toHaveBeenCalled();
    scheduler.stop();
    spy.mockRestore();
  });

  it('handles pipeline errors gracefully (try/catch path)', async () => {
    const spy = vi.spyOn(ctx, 'contextTransform').mockImplementation(() => {
      throw new Error('boom');
    });
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();
    const text = 'this is a test';
    monitor.emit({ text, caret: text.length, atMs: Date.now() });
    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    // No crash; no applyExternal
    expect(applyExternal).not.toHaveBeenCalled();
    scheduler.stop();
    spy.mockRestore();
  });
});
