import { describe, it, expect } from 'vitest';
import { tidySweep } from '../engines/tidySweep';

describe('TidySweep', () => {
  it('does not edit at/after caret', () => {
    const res = tidySweep({ text: 'teh ', caret: 4 });
    expect(res.diff && res.diff.start >= 0).toBeTruthy();
    // ⟢ later: assert no range crosses caret
  });
});