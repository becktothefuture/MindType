/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D I F F U S I O N   C O N T R O L L E R — P O L I C Y  ░  ║
  ║                                                              ║
  ║   Covers branch where renderRange.end > caret skips LM run.  ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝ */

import { describe, it, expect, vi } from 'vitest';

const highlightCalls: Array<{ start: number; end: number; text?: string }> = [];

vi.mock('../ui/highlighter', () => ({
  emitActiveRegion: () => {},
}));
vi.mock('../ui/swapRenderer', () => ({
  renderHighlight: (r: { start: number; end: number; text?: string }) => {
    highlightCalls.push({ start: r.start, end: r.end, text: r.text });
  },
}));

describe('DiffusionController policy guard', () => {
  it('skips LM when policy renderRange would cross caret', async () => {
    const { createDiffusionController } = await import('../core/diffusionController');
    const policy = {
      computeRenderRange: (s: { caret: number }) => ({ start: 0, end: s.caret + 1 }),
      computeContextRange: (s: { caret: number }) => ({ start: 0, end: s.caret + 1 }),
    } as const;
    const adapter = {
      async *stream() {
        yield 'x ';
      },
    } as const;
    const ctrl = createDiffusionController(
      policy as unknown as {
        computeRenderRange: (s: { caret: number }) => { start: number; end: number };
        computeContextRange: (s: { caret: number }) => { start: number; end: number };
      },
      () => adapter as unknown as import('../core/lm/types').LMAdapter,
    );
    const text = 'Hello teh world';
    ctrl.update(text, text.length);
    await ctrl.catchUp();
    expect(highlightCalls.length).toBe(0);
  });

  it('emits highlight when applyExternal applies a diff', async () => {
    const { createDiffusionController } = await import('../core/diffusionController');
    const ctrl = createDiffusionController();
    const initial = 'abc def';
    ctrl.update(initial, initial.length);
    const ok = (ctrl as unknown as { applyExternal: (d: { start: number; end: number; text: string }) => boolean }).applyExternal({ start: 0, end: 3, text: 'xyz' });
    expect(ok).toBe(true);
    const last = highlightCalls[highlightCalls.length - 1];
    expect(last).toBeTruthy();
    expect(last.start).toBe(0);
    expect(last.end).toBe(3);
    expect(last.text).toBe('xyz');
  });
});
