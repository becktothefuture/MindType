/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  A C T I V E   R E G I O N   B R A N C H E S  ░░░░░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Branch coverage for activeRegion utilities
  • WHY  ▸ Exercise Intl.Segmenter fallback and guards
*/
import { describe, it, expect } from 'vitest';
import {
  createActiveRegion,
  setBand,
  splitSpan,
  queryNearField,
  addSpan,
} from '../core/activeRegion';

describe('activeRegion branches', () => {
  it('setBand normalizes inverted ranges', () => {
    const st = createActiveRegion('abc', 3);
    setBand(st, 5, 2);
    expect(st.band.start).toBe(2);
    expect(st.band.end).toBe(5);
  });

  it('splitSpan returns false for invalid indices and positions', () => {
    const st = createActiveRegion('abc', 3);
    // no spans added yet
    expect(splitSpan(st, 0, 1)).toBe(false);
    // add a span then try out-of-bounds split
    addSpan(st, {
      start: 0,
      end: 3,
      corrected: 'abc',
      confidence: 1,
      appliedAt: 0,
      source: 'noise',
    });
    expect(splitSpan(st, 0, 0)).toBe(false);
    expect(splitSpan(st, 0, 3)).toBe(false);
  });

  it('queryNearField uses fallback when Intl.Segmenter unavailable', () => {
    const st = createActiveRegion('The quick brown fox', 19);
    // Temporarily remove Segmenter to hit fallback path
    const original = (globalThis as any).Intl?.Segmenter;
    try {
      if ((globalThis as any).Intl) (globalThis as any).Intl.Segmenter = undefined;
      const band = queryNearField(st, 1, 3);
      expect(band.end).toBe(19);
      expect(band.start).toBeLessThan(19);
    } finally {
      if ((globalThis as any).Intl) (globalThis as any).Intl.Segmenter = original;
    }
  });
});
