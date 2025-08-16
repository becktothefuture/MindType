import { describe, it, expect } from 'vitest';
import { tidySweep, type SweepInput } from '../engines/tidySweep';

describe('Whitespace Normalization (FT-214)', () => {
  it('collapses multiple spaces to single space', () => {
    const input: SweepInput = { text: 'alpha   beta', caret: 11 };
    const r = tidySweep(input);
    expect(r.diff).not.toBeNull();
    expect(r.diff!.text).toBe(' ');
  });

  it('replaces tabs between tokens with single space', () => {
    const input: SweepInput = { text: 'alpha\tbeta', caret: 10 };
    const r = tidySweep(input);
    expect(r.diff).not.toBeNull();
    expect(r.diff!.text).toBe(' ');
  });

  it('removes trailing spaces before newline', () => {
    const input: SweepInput = { text: 'line with space  \nnext', caret: 18 };
    const r = tidySweep(input);
    expect(r.diff).not.toBeNull();
    expect(r.diff!.text).toBe('');
  });
});
