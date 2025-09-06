/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O N F L I C T   R E S O L V E R   T E S T S  ░░░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Unit tests for deterministic conflict resolution
  • WHY  ▸ Ensure rules > context > tone precedence
  • HOW  ▸ Overlap scenarios and ordering checks
*/
import { describe, it, expect } from 'vitest';
import { resolveConflicts, type Proposal } from '../engines/conflictResolver';

describe('conflictResolver', () => {
  it('prefers noise over context and tone on overlap', () => {
    const proposals: Proposal[] = [
      { start: 10, end: 14, text: 'the', source: 'noise' },
      { start: 10, end: 20, text: 'the word', source: 'context' },
      { start: 12, end: 18, text: 'X', source: 'tone' },
    ];
    const resolved = resolveConflicts(proposals);
    expect(resolved).toEqual([{ start: 10, end: 14, text: 'the' }]);
  });

  it('within same source prefers longer span', () => {
    const proposals: Proposal[] = [
      { start: 5, end: 7, text: 'aa', source: 'context' },
      { start: 5, end: 10, text: 'aaaaa', source: 'context' },
    ];
    const resolved = resolveConflicts(proposals);
    expect(resolved).toEqual([{ start: 5, end: 10, text: 'aaaaa' }]);
  });

  it('keeps non-overlapping from different sources', () => {
    const proposals: Proposal[] = [
      { start: 0, end: 3, text: 'foo', source: 'noise' },
      { start: 5, end: 8, text: 'bar', source: 'context' },
      { start: 9, end: 12, text: 'baz', source: 'tone' },
    ];
    const resolved = resolveConflicts(proposals);
    expect(resolved).toEqual([
      { start: 0, end: 3, text: 'foo' },
      { start: 5, end: 8, text: 'bar' },
      { start: 9, end: 12, text: 'baz' },
    ]);
  });
});
