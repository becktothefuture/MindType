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
    const ctrl = createDiffusionController(policy as any, () => adapter as any);
    const text = 'Hello teh world';
    ctrl.update(text, text.length);
    await ctrl.catchUp();
    expect(highlightCalls.length).toBe(0);
  });
});
