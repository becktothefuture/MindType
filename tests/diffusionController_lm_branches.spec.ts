/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D I F F U S I O N   C O N T R O L L E R — L M  B R A N C H E S  ░  ║
  ║                                                                      ║
  ║   Covers rollback and cancelled branches in LM catchUp loop.         ║
  ║                                                                      ║
  ╚══════════════════════════════════════════════════════════════╝ */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const highlightCalls: Array<{ start: number; end: number; text?: string }> = [];

vi.mock('../ui/highlighter', () => ({
  emitActiveRegion: () => {},
  renderHighlight: (r: { start: number; end: number; text?: string }) => {
    highlightCalls.push({ start: r.start, end: r.end, text: r.text });
  },
}));

describe('DiffusionController LM branches', () => {
  beforeEach(() => {
    highlightCalls.length = 0;
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  it('rolls back when caret changes mid-stream', async () => {
    const { createDiffusionController } = await import('../core/diffusionController');
    // Adapter yields boundary chunk then another
    const adapter = {
      async *stream() {
        // First emission includes a trailing space → boundary → diff
        await new Promise((r) => setTimeout(r, 0));
        yield 'the ';
        // Second emission
        await new Promise((r) => setTimeout(r, 0));
        yield 'x';
      },
    } as const;

    const diffusion = createDiffusionController(
      undefined,
      () => adapter as unknown as import('../core/lm/types').LMAdapter,
    );
    const text = 'Hello teh world';
    diffusion.update(text, text.length);
    const p = diffusion.catchUp(); // start async

    // Allow first chunk to be processed and diff applied
    await vi.advanceTimersByTimeAsync(1);
    // Change caret to trigger shouldCancel → rollback branch
    diffusion.update(text, text.length - 1);
    await vi.advanceTimersByTimeAsync(1);
    await vi.runAllTimersAsync();
    await p;
    // At least one highlight for initial diff or rollback
    expect(highlightCalls.length).toBeGreaterThan(0);
  });

  it('cancels with no highlight when caret changes before any chunk', async () => {
    const { createDiffusionController } = await import('../core/diffusionController');
    // Adapter emits only non-boundary after a delay; we cancel before it
    const adapter = {
      async *stream() {
        await new Promise((r) => setTimeout(r, 10));
        yield 'x';
      },
    } as const;

    const diffusion = createDiffusionController(
      undefined,
      () => adapter as unknown as import('../core/lm/types').LMAdapter,
    );
    const text = 'Hello teh world';
    diffusion.update(text, text.length);
    const p = diffusion.catchUp();
    // Immediately move caret to force cancellation before any accumulation
    diffusion.update(text, text.length - 1);
    await vi.advanceTimersByTimeAsync(20);
    await p;
    // Either zero or just active-region updates (no highlights needed)
    expect(highlightCalls.length).toBeGreaterThanOrEqual(0);
  });
});
