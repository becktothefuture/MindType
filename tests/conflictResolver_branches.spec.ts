/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O N F L I C T   R E S O L V E R   B R A N C H E S  ░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Branch coverage for edge overlaps and ordering
  • WHY  ▸ Raise branch coverage over global threshold
*/
import { describe, it, expect } from 'vitest';
import { resolveConflicts, type Proposal } from '../engines/conflictResolver';

describe('conflictResolver branches', () => {
  it('handles equal-precedence different sources by default order', () => {
    const p: Proposal[] = [
      { start: 0, end: 5, text: 'AAAAA', source: 'context' },
      { start: 0, end: 5, text: 'BBBBB', source: 'tone' },
    ];
    const r = resolveConflicts(p);
    expect(r).toEqual([{ start: 0, end: 5, text: 'AAAAA' }]);
  });

  it('keeps sorted application order by start/end after selection', () => {
    const p: Proposal[] = [
      { start: 10, end: 12, text: 'b', source: 'context' },
      { start: 0, end: 2, text: 'a', source: 'context' },
    ];
    const r = resolveConflicts(p);
    expect(r[0].start).toBeLessThan(r[1].start);
  });
});
