/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  U N D O   I S O L A T I O N   T E S T S  ░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Verifies time-bucket grouping and pop/rollback behavior.   ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect } from 'vitest';
import { UndoIsolation } from '../core/undoIsolation';

describe('UndoIsolation', () => {
  it('groups edits into buckets by time window', () => {
    const u = new UndoIsolation(100);
    const t0 = Date.now();
    u.addEdit({ start: 0, end: 3, before: 'abc', after: 'ABC', appliedAt: t0 });
    u.addEdit({ start: 4, end: 5, before: 'd', after: 'D', appliedAt: t0 + 50 });
    // new bucket after 150ms
    u.addEdit({ start: 6, end: 7, before: 'e', after: 'E', appliedAt: t0 + 220 });
    expect(u.getGroups().length).toBe(2);
    expect(u.getGroups()[0].edits.length).toBe(2);
    expect(u.getGroups()[1].edits.length).toBe(1);
  });

  it('popLastGroup removes and returns last bucket', () => {
    const u = new UndoIsolation(100);
    const t0 = Date.now();
    u.addEdit({ start: 0, end: 3, before: 'abc', after: 'ABC', appliedAt: t0 });
    u.addEdit({ start: 6, end: 7, before: 'e', after: 'E', appliedAt: t0 + 220 });
    const g = u.popLastGroup();
    expect(g?.edits.length).toBe(1);
    expect(u.getGroups().length).toBe(1);
  });
});

