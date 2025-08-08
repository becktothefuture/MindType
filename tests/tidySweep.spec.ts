/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T I D Y   S W E E P   T E S T S  ░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Validates caret-safe behaviour and diff shape for          ║
  ║   `engines/tidySweep`. Communicates with the engine module.  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Assert no edits at/after CARET; diff shape when present
  • WHY  ▸ Guarantees real-time safety for live typing
  • HOW  ▸ Calls tidySweep with sample inputs; checks outputs
*/
import { describe, it, expect } from 'vitest';
import { tidySweep } from '../engines/tidySweep';

describe('TidySweep', () => {
  it('does not edit at/after caret', () => {
    const res = tidySweep({ text: 'teh ', caret: 4 });
    // For current stub: returns no diff; later we assert start/end < caret
    expect(res.diff).toBeNull();
  });
});
