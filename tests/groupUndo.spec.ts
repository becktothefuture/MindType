/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  G R O U P   U N D O   ( I D E N T I T Y )   T E S T  ░░  ║
  ║                                                              ║
  ║   Ensures current groupUndo implementation is a no-op.       ║
  ║   Tapestry/LM evolutions must not pass through grouping.     ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/

import { describe, it, expect } from 'vitest';
import { groupUndo } from '../ui/groupUndo';

describe('groupUndo identity', () => {
  it('returns the same items without mutation', () => {
    const diffs = [
      { start: 0, end: 3, text: 'foo' },
      { start: 4, end: 7, text: 'bar' },
    ];
    const snap = JSON.parse(JSON.stringify(diffs));
    const out = groupUndo(diffs);
    expect(out).toEqual(diffs);
    expect(diffs).toEqual(snap);
  });
});
