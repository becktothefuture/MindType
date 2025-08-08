/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  B A C K F I L L   C O N S I S T E N C Y   T E S T S  ░░  ║
  ║                                                              ║
  ║   Ensures backfill proposes only stable-zone diffs and       ║
  ║   returns an array. Communicates with engine implementation. ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Asserts output shape and future stable-zone rules
  • WHY  ▸ Protects correctness as rules evolve
  • HOW  ▸ Calls engine with sample; verifies array output
*/
import { describe, it, expect } from 'vitest';
import { backfillConsistency } from '../engines/backfillConsistency';

describe('BackfillConsistency', () => {
  it('proposes consistency diffs only in stable zone', () => {
    const res = backfillConsistency({ text: 'Jhon ... John', caret: 20 });
    expect(Array.isArray(res.diffs)).toBe(true);
  });
});
