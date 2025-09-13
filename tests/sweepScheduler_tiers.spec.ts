/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S W E E P   S C H E D U L E R   T I E R S  ░░░░░░░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Branch tests for tier-aware debounce and security gate
  • WHY  ▸ Improve branch coverage; validate anti-thrash behavior
*/
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSweepScheduler } from '../core/sweepScheduler';
import { SHORT_PAUSE_MS } from '../config/defaultThresholds';

type Monitor = {
  on: (cb: (ev: { text: string; caret: number; atMs: number }) => void) => () => void;
};

function createMonitor(): {
  monitor: Monitor;
  emit: (text: string, caret: number) => void;
} {
  let cb: ((ev: { text: string; caret: number; atMs: number }) => void) | null = null;
  return {
    monitor: {
      on: (fn) => {
        cb = fn;
        return () => {
          cb = null;
        };
      },
    },
    emit: (text, caret) => {
      cb?.({ text, caret, atMs: Date.now() });
    },
  };
}

describe('sweepScheduler tiers', () => {
  let setTimeoutSpy: any;
  const originalNavigator = global.navigator;
  const originalWasm = global.WebAssembly;

  beforeEach(() => {
    setTimeoutSpy = vi.spyOn(global, 'setTimeout');
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
    // restore globals
    // restore navigator via defineProperty to bypass getter-only
    Object.defineProperty(global as any, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    (global as any).WebAssembly = originalWasm;
  });

  it('uses base delay on WebGPU tier', () => {
    Object.defineProperty(global as any, 'navigator', {
      value: { gpu: {} } as unknown as Navigator,
      configurable: true,
    });
    const { monitor, emit } = createMonitor();
    const sch = createSweepScheduler(monitor as any, undefined, undefined, undefined);
    sch.start();
    emit('hello', 3);
    expect(setTimeoutSpy).toHaveBeenCalled();
    const delay = (setTimeoutSpy.mock.calls[0] as unknown[])[1] as number;
    expect(delay).toBe(SHORT_PAUSE_MS);
  });

  it('uses increased delay on WASM tier', () => {
    Object.defineProperty(global as any, 'navigator', {
      value: {} as unknown as Navigator,
      configurable: true,
    });
    // WebAssembly present by default in node → treat as wasm
    const { monitor, emit } = createMonitor();
    const sch = createSweepScheduler(monitor as any, undefined, undefined, undefined);
    sch.start();
    emit('hello', 3);
    const delay = (setTimeoutSpy.mock.calls[0] as unknown[])[1] as number;
    expect(delay).toBe(Math.round(SHORT_PAUSE_MS * 1.1));
  });

  it('uses largest delay on CPU tier (no wasm)', () => {
    Object.defineProperty(global as any, 'navigator', {
      value: {} as unknown as Navigator,
      configurable: true,
    });
    (global as any).WebAssembly = undefined;
    const { monitor, emit } = createMonitor();
    const sch = createSweepScheduler(monitor as any, undefined, undefined, undefined);
    sch.start();
    emit('hello', 3);
    const delay = (setTimeoutSpy.mock.calls[0] as unknown[])[1] as number;
    expect(delay).toBe(Math.round(SHORT_PAUSE_MS * 1.3));
  });

  it('does not schedule on secure contexts', () => {
    const { monitor, emit } = createMonitor();
    const sch = createSweepScheduler(
      monitor as any,
      { isSecure: () => true, isIMEComposing: () => false },
      undefined,
      undefined,
    );
    sch.start();
    emit('hello', 3);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });
});
