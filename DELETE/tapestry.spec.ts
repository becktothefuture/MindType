/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T A P E S T R Y   ( T E S T S )  ░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Covers add/query/coalesce behaviours and ordering.         ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/

import { describe, it, expect } from 'vitest';
import { Tapestry } from '../core/tapestry';

describe('Tapestry', () => {
  it('adds spans, queries near index, and coalesces adjacent', () => {
    const t = new Tapestry();
    // Case 1: non-coalescing runs
    t.add({
      start: 0,
      end: 5,
      original: 'Hello',
      corrected: 'Hello',
      confidence: 1,
      appliedAt: 1,
    });
    t.add({
      start: 5,
      end: 6,
      original: ' ',
      corrected: ' ',
      confidence: 1,
      appliedAt: 2,
    });
    t.add({
      start: 6,
      end: 9,
      original: 'teh',
      corrected: 'the',
      confidence: 0.9,
      appliedAt: 3,
    });
    const near = t.queryNear(6, 10);
    expect(near.length).toBeGreaterThan(0);

    t.coalesce();
    expect(t.all().length).toBe(3); // no coalesce across non-matching boundary

    // Case 2: Add a pair that should coalesce: corrected of left === original of right
    t.add({
      start: 9,
      end: 12,
      original: 'the',
      corrected: 'the',
      confidence: 1,
      appliedAt: 4,
    });
    t.coalesce();
    const all2 = t.all();
    expect(all2.some((s) => s.start === 6 && s.end === 12)).toBe(true);
    // Query near boundary to exercise branch paths
    const q = t.queryNear(11, 0);
    expect(Array.isArray(q)).toBe(true);
  });
});
