/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D I F F U S I O N   C O N T R O L L E R   B R A N C H E S  ║
  ║                                                              ║
  ║   Covers fallback paths (no Intl.Segmenter) and error paths  ║
  ║   (replaceRange failure) to lift branch coverage.            ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Exercise iterate fallback and try/catch on apply
  • WHY  ▸ Increase branch coverage in diffusion controller
  • HOW  ▸ Mock globals and deps; assert calls and state advances
*/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Capture UI events
const activeRegionCalls: Array<{ start: number; end: number }> = [];
const highlightCalls: Array<{ start: number; end: number; text?: string }> = [];

vi.mock('../ui/highlighter', () => ({
  emitActiveRegion: (r: { start: number; end: number }) => {
    activeRegionCalls.push({ start: r.start, end: r.end });
  },
}));

vi.mock('../ui/swapRenderer', () => ({
  renderHighlight: (r: { start: number; end: number; text?: string }) => {
    highlightCalls.push({ start: r.start, end: r.end, text: r.text });
  },
}));

describe('DiffusionController branches', () => {
  beforeEach(() => {
    activeRegionCalls.length = 0;
    highlightCalls.length = 0;
    vi.resetModules();
  });

  afterEach(() => {
    // Restore Segmenter if we changed it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const I = (globalThis as any).Intl as { Segmenter?: unknown } | undefined;
    if (I && '__mtSavedSegmenter' in I) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (I as any).Segmenter = (I as any).__mtSavedSegmenter;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (I as any).__mtSavedSegmenter;
    }
  });

  it('falls back when Intl.Segmenter is unavailable', async () => {
    // Force Intl.Segmenter constructor to throw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const I = (globalThis as any).Intl as { Segmenter?: unknown } | undefined;
    if (I) {
      // Save original and install throwing ctor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (I as any).__mtSavedSegmenter = (I as any).Segmenter;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (I as any).Segmenter = function ThrowingSegmenter(this: unknown): never {
        throw new Error('no Segmenter');
      } as unknown as typeof Intl.Segmenter;
    }

    const { createDiffusionController } = await import('../core/diffusionController');
    const ctrl = createDiffusionController();

    // Enough words to compute a band
    const text = 'one two three four five six';
    const caret = text.length;
    ctrl.update(text, caret);

    expect(activeRegionCalls.length).toBeGreaterThan(0);
    const last = activeRegionCalls[activeRegionCalls.length - 1];
    expect(last.end).toBe(caret);
  });

  it('continues when replaceRange throws and still advances frontier', async () => {
    // Mock replaceRange to throw
    vi.doMock('../utils/diff', () => ({
      replaceRange: () => {
        throw new Error('boom');
      },
    }));

    // Mock noiseTransform to return a diff so we hit the try/catch path
    vi.doMock('../engines/noiseTransformer', () => ({
      noiseTransform: () => ({ diff: { start: 0, end: 3, text: 'the' } }),
    }));

    const { createDiffusionController } = await import('../core/diffusionController');
    const ctrl = createDiffusionController();

    const text = 'teh is here';
    const caret = text.indexOf(' ') + 1; // caret after the first word
    ctrl.update(text, caret);

    // tick once to process the diff
    ctrl.tickOnce();

    // Highlight should be rendered even if replaceRange failed
    expect(highlightCalls.length).toBeGreaterThan(0);
    // Frontier should have advanced at least past the replacement end
    const state = ctrl.getState();
    expect(state.frontier).toBeGreaterThanOrEqual(3);
  });
});
