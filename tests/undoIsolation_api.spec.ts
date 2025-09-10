/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  U N D O   I S O L A T I O N   A P I   T E S T S   ░░░░  ║
  ║                                                              ║
  ║   Validates revert op generation and right-to-left ordering. ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect } from 'vitest';
import { UndoIsolation } from '../core/undoIsolation';

describe('UndoIsolation API', () => {
  it('returns right-to-left revert ops for last bucket', () => {
    const u = new UndoIsolation(150);
    const t0 = Date.now();
    u.addEdit({ start: 2, end: 4, before: 'bc', after: 'BC', appliedAt: t0 });
    u.addEdit({ start: 6, end: 7, before: 'e', after: 'E', appliedAt: t0 + 50 });
    const ops = u.peekLastGroupRevertOps();
    expect(ops).toEqual([
      { start: 6, end: 7, text: 'e' },
      { start: 2, end: 4, text: 'bc' },
    ]);
  });

  it('pops last group and returns revert ops; subsequent peek is from previous bucket', () => {
    const u = new UndoIsolation(100);
    const t0 = Date.now();
    // First bucket
    u.addEdit({ start: 0, end: 1, before: 'a', after: 'A', appliedAt: t0 });
    // Second bucket after > bucketMs
    u.addEdit({ start: 3, end: 5, before: 'de', after: 'DE', appliedAt: t0 + 250 });
    const ops = u.popLastGroupRevertOps();
    expect(ops).toEqual([{ start: 3, end: 5, text: 'de' }]);
    const peekPrev = u.peekLastGroupRevertOps();
    expect(peekPrev).toEqual([{ start: 0, end: 1, text: 'a' }]);
  });

  it('returns empty array when no groups exist', () => {
    const u = new UndoIsolation(100);
    expect(u.popLastGroupRevertOps()).toEqual([]);
    expect(u.peekLastGroupRevertOps()).toEqual([]);
  });
});
