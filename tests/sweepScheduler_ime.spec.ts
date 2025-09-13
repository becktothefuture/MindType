/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S W E E P   S C H E D U L E R   I M E  ░░░░░░░░░░░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Branch test for IME composition guard
  • WHY  ▸ Cover isIMEComposing() branch in scheduler
*/
import { describe, it, expect, vi } from 'vitest';
import { createSweepScheduler } from '../core/sweepScheduler';

function createMonitor() {
  let cb: ((ev: { text: string; caret: number; atMs: number }) => void) | null = null;
  return {
    monitor: {
      on: (fn: typeof cb) => {
        cb = fn;
        return () => {
          cb = null;
        };
      },
    },
    emit(text: string, caret: number) {
      cb?.({ text, caret, atMs: Date.now() });
    },
  };
}

describe('sweepScheduler IME', () => {
  it('drops events when IME composition is active', () => {
    const timeoutSpy = vi.spyOn(global, 'setTimeout');
    const { monitor, emit } = createMonitor();
    const sch = createSweepScheduler(
      monitor as any,
      { isSecure: () => false, isIMEComposing: () => true },
      undefined,
      undefined,
    );
    sch.start();
    emit('abc', 3);
    expect(timeoutSpy).not.toHaveBeenCalled();
    timeoutSpy.mockRestore();
  });
});
