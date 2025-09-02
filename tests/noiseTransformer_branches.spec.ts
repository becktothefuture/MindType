/* Targets branch edges inside tidySweep rules via empty hint windows */
import { describe, it, expect } from 'vitest';
import { noiseTransform, type NoiseInput } from '../engines/noiseTransformer';

describe('NoiseTransformer branch edges: empty hint window', () => {
  const base: Omit<NoiseInput, 'hint'> = { text: 'alpha beta gamma', caret: 5 };

  it('word substitution: searchStart >= searchEnd returns null', () => {
    const input: NoiseInput = { ...base, hint: { start: 5, end: 5 } };
    const r = noiseTransform(input);
    expect(r.diff).toBeNull();
  });

  it('transposition: searchStart >= searchEnd returns null', () => {
    const input: NoiseInput = { text: 'waht now', caret: 0, hint: { start: 0, end: 0 } };
    const r = noiseTransform(input);
    expect(r.diff).toBeNull();
  });

  it('punctuation: searchStart >= searchEnd returns null', () => {
    const input: NoiseInput = {
      text: 'word ,next',
      caret: 0,
      hint: { start: 0, end: 0 },
    };
    const r = noiseTransform(input);
    expect(r.diff).toBeNull();
  });

  it('capitalization: searchStart >= searchEnd returns null', () => {
    const input: NoiseInput = {
      text: 'hello. world',
      caret: 0,
      hint: { start: 0, end: 0 },
    };
    const r = noiseTransform(input);
    expect(r.diff).toBeNull();
  });
});
