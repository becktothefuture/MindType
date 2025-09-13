import { describe, it, expect } from 'vitest';
import { noiseTransform, type NoiseInput } from '../engines/noiseTransformer';

describe('Whitespace Normalization (FT-214)', () => {
  it('collapses multiple spaces to single space', () => {
    const input: NoiseInput = { text: 'alpha   beta', caret: 11 };
    const r = noiseTransform(input);
    expect(r.diff).not.toBeNull();
    expect(r.diff!.text).toBe(' ');
  });

  it('replaces tabs between tokens with single space', () => {
    const input: NoiseInput = { text: 'alpha\tbeta', caret: 10 };
    const r = noiseTransform(input);
    expect(r.diff).not.toBeNull();
    expect(r.diff!.text).toBe(' ');
  });

  it('removes trailing spaces before newline', () => {
    const input: NoiseInput = { text: 'line with space  \nnext', caret: 18 };
    const r = noiseTransform(input);
    expect(r.diff).not.toBeNull();
    expect(r.diff!.text).toBe('');
  });
});
