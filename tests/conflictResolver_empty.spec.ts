/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O N F L I C T   R E S O L V E R   E M P T Y  ░░░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Covers early-return branch when no proposals
  • WHY  ▸ Increment branch coverage cheaply
*/
import { describe, it, expect } from 'vitest';
import { resolveConflicts } from '../engines/conflictResolver';

describe('conflictResolver empty', () => {
  it('returns empty list for empty input', () => {
    expect(resolveConflicts([])).toEqual([]);
  });
});
