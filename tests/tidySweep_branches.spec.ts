/* Targets branch edges inside tidySweep rules via empty hint windows */
import { describe, it, expect } from 'vitest';
import { tidySweep, type SweepInput } from '../engines/tidySweep';

describe('TidySweep branch edges: empty hint window', () => {
  const base: Omit<SweepInput, 'hint'> = { text: 'alpha beta gamma', caret: 5 };

  it('word substitution: searchStart >= searchEnd returns null', () => {
    const input: SweepInput = { ...base, hint: { start: 5, end: 5 } };
    const r = tidySweep(input);
    expect(r.diff).toBeNull();
  });

  it('transposition: searchStart >= searchEnd returns null', () => {
    const input: SweepInput = { text: 'waht now', caret: 0, hint: { start: 0, end: 0 } };
    const r = tidySweep(input);
    expect(r.diff).toBeNull();
  });

  it('punctuation: searchStart >= searchEnd returns null', () => {
    const input: SweepInput = {
      text: 'word ,next',
      caret: 0,
      hint: { start: 0, end: 0 },
    };
    const r = tidySweep(input);
    expect(r.diff).toBeNull();
  });

  it('capitalization: searchStart >= searchEnd returns null', () => {
    const input: SweepInput = {
      text: 'hello. world',
      caret: 0,
      hint: { start: 0, end: 0 },
    };
    const r = tidySweep(input);
    expect(r.diff).toBeNull();
  });
});
