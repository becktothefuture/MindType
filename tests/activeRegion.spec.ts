/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  A C T I V E   R E G I O N   T E S T S  ░░░░░░░░░░░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Unit tests for active region data structure
  • WHY  ▸ Validate merge/split/query and caret safety
*/
import { describe, it, expect } from 'vitest';
import {
  createActiveRegion,
  updateSnapshot,
  setBand,
  addSpan,
  mergeAdjacent,
  splitSpan,
  queryNearField,
} from '../core/activeRegion';

describe('activeRegion', () => {
  it('adds spans and merges adjacent of same source', () => {
    const st = createActiveRegion('hello world', 11);
    addSpan(st, {
      start: 0,
      end: 5,
      corrected: 'hello',
      confidence: 1,
      appliedAt: 1,
      source: 'noise',
    });
    addSpan(st, {
      start: 5,
      end: 6,
      corrected: ' ',
      confidence: 1,
      appliedAt: 2,
      source: 'noise',
    });
    mergeAdjacent(st);
    expect(st.spans.length).toBe(1);
    expect(st.spans[0].start).toBe(0);
    expect(st.spans[0].end).toBe(6);
  });

  it('splits a span at a given index', () => {
    const st = createActiveRegion('abcde', 5);
    addSpan(st, {
      start: 0,
      end: 5,
      corrected: 'abcde',
      confidence: 1,
      appliedAt: 1,
      source: 'context',
    });
    const ok = splitSpan(st, 0, 2);
    expect(ok).toBe(true);
    expect(st.spans.length).toBe(2);
    expect(st.spans[0].end).toBe(2);
    expect(st.spans[1].start).toBe(2);
  });

  it('queryNearField returns band before caret with min/max words', () => {
    const st = createActiveRegion('The quick brown fox jumps', 24);
    const band = queryNearField(st, 2, 5);
    expect(band.end).toBe(24);
    expect(band.start).toBeLessThanOrEqual(24);
    expect(band.start).toBeGreaterThanOrEqual(0);
  });

  it('respects caret safety in addSpan', () => {
    const st = createActiveRegion('abcdef', 3);
    addSpan(st, {
      start: 0,
      end: 5,
      corrected: 'abcde',
      confidence: 1,
      appliedAt: 1,
      source: 'noise',
    });
    // span crosses caret → should be ignored
    expect(st.spans.length).toBe(0);
  });

  it('updates snapshot and band', () => {
    const st = createActiveRegion('', 0);
    updateSnapshot(st, 'hi', 2);
    setBand(st, 0, 2);
    expect(st.text).toBe('hi');
    expect(st.band).toEqual({ start: 0, end: 2 });
  });
});
