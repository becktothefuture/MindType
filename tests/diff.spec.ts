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
  it('throws on invalid ranges', () => {
    expect(() => replaceRange('abc', -1, 1, 'X', 3)).toThrow();
    expect(() => replaceRange('abc', 2, 1, 'X', 3)).toThrow();
    expect(() => replaceRange('abc', 0, 4, 'X', 5)).toThrow();
  });
  it('does not split surrogate pairs at boundaries', () => {
    // U+1F600 GRINNING FACE 😀 is surrogate pair in UTF-16
    const face = '😀';
    const text = `hi ${face} there`;
    // Indexes: h(0)i(1) (2)😀(3,4) (5)t(6)...
    // Try to replace inside the surrogate pair → should throw
    const startInside = 4; // low surrogate index
    const endInside = 4;
    expect(() => replaceRange(text, startInside, endInside, 'X', text.length)).toThrow();

    // Replace the entire emoji safely
    const start = 3;
    const end = 5; // span both surrogates
    const out = replaceRange(text, start, end, '🙂', text.length);
    expect(out).toBe('hi 🙂 there');
  });
  it('throws if caret is inside a surrogate pair', () => {
    const face = '😀';
    const text = `a${face}b`;
    // caret between surrogates (not a valid logical position, but we guard)
    const caretInside = 2; // index at low surrogate
    expect(() => replaceRange(text, 0, 1, 'A', caretInside)).toThrow();
  });
});
