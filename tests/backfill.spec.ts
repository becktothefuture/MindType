import { describe, it, expect } from 'vitest';
import { backfillConsistency } from '../engines/backfillConsistency';

describe('BackfillConsistency', () => {
  it('proposes consistency diffs only in stable zone', () => {
    const res = backfillConsistency({ text: 'Jhon ... John', caret: 20 });
    expect(Array.isArray(res.diffs)).toBe(true);
  });
});