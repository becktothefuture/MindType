/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T I D Y   S W E E P   B R A N C H E S   ( T E S T S )  ░  ║
  ║                                                              ║
  ║   Covers tabs normalization and trailing space before \n.     ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/

import { describe, it, expect } from 'vitest';
import { noiseTransform } from '../engines/noiseTransformer';

describe('noiseTransform extra branches', () => {
  it('normalizes tabs between tokens to single space', () => {
    const text = 'foo\t\tbar baz';
    const caret = text.length; // caret at end
    const res = noiseTransform({ text, caret });
    expect(res.diff).not.toBeNull();
    if (res.diff) {
      const applied =
        text.slice(0, res.diff.start) + res.diff.text + text.slice(res.diff.end);
      expect(applied.includes('foo bar')).toBe(true);
    }
  });

  it('removes trailing spaces before newline', () => {
    const text = 'line with space   \nnext';
    const caret = text.length; // caret at end
    const res = noiseTransform({ text, caret });
    expect(res.diff).not.toBeNull();
    if (res.diff) {
      const applied =
        text.slice(0, res.diff.start) + res.diff.text + text.slice(res.diff.end);
      // Ensure no spaces before the newline
      expect(applied).not.toMatch(/ \n/);
    }
  });
});
