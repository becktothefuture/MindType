/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S C H E D U L E R   D Y N A M I C   T H R E S H O L D S  ░  ║
  ║                                                              ║
  ║   Verifies scheduler uses computeDynamicThresholds during    ║
  ║   pause sweeps for Context/Tone decisions.                   ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/defaultThresholds', () => ({
  SHORT_PAUSE_MS: 5,
  LONG_PAUSE_MS: 2000,
  MAX_SWEEP_WINDOW: 80,
  getTypingTickMs: () => 100000,
  getMinValidationWords: () => 3,
  getMaxValidationWords: () => 8,
}));

const update = vi.fn();
const tickOnce = vi.fn();
const catchUp = vi.fn(async () => {});
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

const ctxProposals = [{ start: 0, end: 3, text: 'The' }];
vi.mock('../engines/contextTransformer', () => ({
  contextTransform: vi.fn(() => ({ proposals: ctxProposals })),
}));
vi.mock('../engines/toneTransformer', () => ({
  detectBaseline: vi.fn(() => ({ tone: 'Neutral' })),
  planAdjustments: vi.fn(() => []),
}));

vi.mock('../core/confidenceGate', async () => {
  const actual = await vi.importActual<typeof import('../core/confidenceGate')>(
    '../core/confidenceGate',
  );
  return {
    ...actual,
    computeDynamicThresholds: (args: any) => {
      (globalThis as any).__dynArgs = args;
      return actual.computeDynamicThresholds(args);
    },
    applyThresholds: (score: any, thresholds: any, opts?: any) => {
      (globalThis as any).__lastThresholds = thresholds;
      return actual.applyThresholds(score, thresholds as any, opts);
    },
  } as typeof actual;
});

import { createTypingMonitor } from '../core/typingMonitor';
import { createSweepScheduler } from '../core/sweepScheduler';
import { SHORT_PAUSE_MS } from '../config/defaultThresholds';

describe.skip('scheduler uses dynamic thresholds', () => {
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

  it('invokes computeDynamicThresholds during pause sweep', async () => {
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
    scheduler.start();

    const text = 'teh';
    state.text = text;
    state.caret = 3;
    state.frontier = 0;
    monitor.emit({ text, caret: 3, atMs: Date.now() });

    vi.advanceTimersByTime(SHORT_PAUSE_MS + 1);
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();

    expect((globalThis as any).__dynArgs).toBeTruthy();
    expect(typeof (globalThis as any).__dynArgs.caret).toBe('number');
  });
});
