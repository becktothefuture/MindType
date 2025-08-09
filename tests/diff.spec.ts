/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D I F F   U T I L S   T E S T S  ░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Validates replaceRange guardrails and basic behaviour.      ║
  ║   Communicates with `utils/diff`.                             ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Ensures we never cross the CARET
  • WHY  ▸ Safety baseline for all engines
  • HOW  ▸ Calls replaceRange with valid/invalid ranges
*/
import { describe, it, expect } from 'vitest';
import { replaceRange } from '../utils/diff';

describe('replaceRange', () => {
  it('replaces a range before caret', () => {
    const res = replaceRange('hello', 0, 2, 'HE', 5);
    expect(res).toBe('HEllo');
  });
  it('throws when range crosses caret', () => {
    expect(() => replaceRange('hello', 0, 4, 'HE', 3)).toThrow();
  });
});
