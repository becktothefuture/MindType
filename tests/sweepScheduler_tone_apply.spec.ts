/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S W E E P   S C H E D U L E R   T O N E   A P P L Y  ░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Cover tone branch with commit decision and application
  • WHY  ▸ Increase branch coverage in scheduler tone path
*/
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSweepScheduler } from '../core/sweepScheduler';

vi.mock('../config/defaultThresholds', () => ({
  SHORT_PAUSE_MS: 5,
  LONG_PAUSE_MS: 2000,
  MAX_SWEEP_WINDOW: 80,
  getTypingTickMs: () => 10,
  getMinValidationWords: () => 2,
  getMaxValidationWords: () => 3,
}));

const applyExternal = vi.fn();
vi.mock('../core/diffusionController', () => ({
  createDiffusionController: () => ({
    update: vi.fn(),
    tickOnce: vi.fn(),
    catchUp: vi.fn(async () => {}),
    getState: () => ({ text: 'Hello world.', caret: 12, frontier: 6 }),
    applyExternal,
  }),
}));

vi.mock('../engines/toneTransformer', () => ({
  detectBaseline: () => ({ formality: 0.0, friendliness: 0.0 }),
  planAdjustments: (_baseline: any, _target: any, text: string, caret: number) => {
    // Propose replacing the first word
    return [{ start: 0, end: Math.min(5, caret), text: 'Howdy' }];
  },
}));

// Force resolver to return a concrete diff so applyExternal is called deterministically
vi.mock('../engines/conflictResolver', () => ({
  resolveConflicts: () => [{ start: 0, end: 5, text: 'Howdy' }],
}));

vi.mock('../core/confidenceGate', () => ({
  computeConfidence: () => ({
    inputFidelity: 1,
    transformationQuality: 1,
    contextCoherence: 1,
    temporalDecay: 1,
    combined: 1,
  }),
  applyThresholds: () => 'commit',
  computeInputFidelity: () => 1,
}));

describe('sweepScheduler tone apply path', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    applyExternal.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies tone proposal when toneEnabled=true and decision=commit', async () => {
    const monitor = {
      on: (fn: (e: { text: string; caret: number; atMs: number }) => void) => {
        fn({ text: 'Hello world.', caret: 12, atMs: Date.now() });
        return () => {};
      },
    } as any;
    const sch = createSweepScheduler(monitor, undefined, undefined, {
      toneEnabled: true,
      toneTarget: 'Professional',
    });
    sch.start();
    // allow pause to trigger runSweeps and flush async tasks
    vi.advanceTimersByTime(6);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    expect(applyExternal).toHaveBeenCalled();
  });
});
