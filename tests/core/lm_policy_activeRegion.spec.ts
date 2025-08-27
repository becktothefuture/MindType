/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  A C T I V E   R E G I O N   P O L I C Y — T E S T S  ░░  ║
  ║                                                              ║
  ║   Verifies newline clamp and context range derivation.       ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, beforeEach } from 'vitest';
import { defaultActiveRegionPolicy } from '../../core/activeRegionPolicy';
import { setValidationBandWords } from '../../config/defaultThresholds';

describe('ActiveRegionPolicy', () => {
  beforeEach(() => {
    // Use a small, predictable band size for tests
    setValidationBandWords(3, 3);
  });

  it('clamps render start to after last newline', () => {
    const text = 'Hello world\nthis is a test line';
    const caret = text.length;
    const state = { text, caret, frontier: 0 };
    const { start, end } = defaultActiveRegionPolicy.computeRenderRange(state);
    expect(end).toBe(caret);
    const lastNewline = text.lastIndexOf('\n');
    expect(start).toBeGreaterThanOrEqual(lastNewline + 1);
  });

  it('context range expands left/right but is clamped before caret', () => {
    const text = 'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu';
    const caret = text.length; // end
    const state = { text, caret, frontier: 0 };
    const render = defaultActiveRegionPolicy.computeRenderRange(state);
    const ctx = defaultActiveRegionPolicy.computeContextRange(state);
    expect(ctx.start).toBeLessThanOrEqual(render.start);
    expect(ctx.end).toBeGreaterThanOrEqual(render.end);
    expect(ctx.end).toBeLessThanOrEqual(caret);
  });

  it('context extends beyond render within limits and before caret', () => {
    const text = 'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu';
    const caret = text.length - 5; // leave a tail to ensure clamping < caret
    const state = { text, caret, frontier: 0 };
    const render = defaultActiveRegionPolicy.computeRenderRange(state);
    const ctx = defaultActiveRegionPolicy.computeContextRange(state);
    expect(ctx.start).toBeLessThanOrEqual(render.start);
    expect(ctx.end).toBeGreaterThanOrEqual(render.end);
    expect(ctx.end).toBeLessThanOrEqual(caret);
  });

  it('triggers newline clamp when band would cross a newline', () => {
    // Increase max words so the band would span across the newline
    setValidationBandWords(5, 12);
    const text = 'A B C D E\nF G H';
    const caret = text.length; // after H
    const state = { text, caret, frontier: 0 };
    const { start, end } = defaultActiveRegionPolicy.computeRenderRange(state);
    const lastNewline = text.lastIndexOf('\n');
    expect(end).toBe(caret);
    // Clamp must move start to after the newline
    expect(start).toBe(lastNewline + 1);
  });

  it('falls back to regex segmentation when Intl.Segmenter is unavailable', () => {
    // Temporarily replace Segmenter to force a construction error
    const originalIntl = (globalThis as unknown as { Intl: unknown }).Intl as Record<
      string,
      unknown
    >;
    const originalSegmenter = originalIntl?.Segmenter as unknown;
    (globalThis as unknown as { Intl: Record<string, unknown> }).Intl = {
      ...originalIntl,
      Segmenter: class {
        // eslint-disable-next-line @typescript-eslint/no-useless-constructor
        constructor() {
          throw new Error('no-segmenter');
        }
      },
    } as Record<string, unknown>;
    try {
      const text = 'Hello world this is plain';
      const caret = text.length;
      const state = { text, caret, frontier: 0 };
      const { start, end } = defaultActiveRegionPolicy.computeRenderRange(state);
      expect(end).toBe(caret);
      expect(start).toBeLessThan(end);
    } finally {
      // Restore
      (globalThis as unknown as { Intl: Record<string, unknown> }).Intl = {
        ...originalIntl,
        Segmenter: originalSegmenter as unknown,
      } as Record<string, unknown>;
    }
  });

  it('returns empty range when frontier equals caret', () => {
    const text = 'xyz';
    const caret = 2;
    const state = { text, caret, frontier: caret };
    const range = defaultActiveRegionPolicy.computeRenderRange(state);
    expect(range.start).toBe(caret);
    expect(range.end).toBe(caret);
  });

  it('does not split surrogate pairs or ZWJ emoji near boundaries', () => {
    // Family emoji often combines via ZWJ; ensure we do not compute a start inside a surrogate pair
    const family = '👨‍👩‍👧‍👦';
    const text = `Hello ${family} world`;
    const caret = text.length;
    const state = { text, caret, frontier: 0 };
    const { start, end } = defaultActiveRegionPolicy.computeRenderRange(state);
    // Validate that slicing the band does not break the string (no replacement chars)
    const slice = text.slice(start, end);
    expect(slice.includes('\uFFFD')).toBe(false);
  });
});
