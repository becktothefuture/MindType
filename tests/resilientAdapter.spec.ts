import { describe, it, expect } from 'vitest';
import type { LMAdapter, LMStreamParams } from '../core/lm/types';
import { createResilientLMAdapter } from '../core/lm/resilientAdapter';

function makeAdapter(chunks: string[], firstDelayMs = 0): LMAdapter {
  return {
    async *stream(_params: LMStreamParams) {
      if (firstDelayMs > 0) {
        await new Promise((r) => setTimeout(r, firstDelayMs));
      }
      for (const c of chunks) {
        yield c;
      }
    },
  } as LMAdapter;
}

describe('createResilientLMAdapter', () => {
  it('uses primary when first chunk arrives before timeout', async () => {
    const primary = makeAdapter(['A', 'B'], 50);
    const fallback = makeAdapter(['X', 'Y']);
    const ra = createResilientLMAdapter(primary, fallback, 200);

    const out: string[] = [];
    for await (const c of ra.stream({ text: 'p', caret: 1, band: { start: 0, end: 1 } }))
      out.push(c);
    expect(out.join('')).toBe('AB');
  });

  it('falls back when primary is too slow', async () => {
    const primary = makeAdapter(['A', 'B'], 1000);
    const fallback = makeAdapter(['X', 'Y']);
    const ra = createResilientLMAdapter(primary, fallback, 100);

    const out: string[] = [];
    for await (const c of ra.stream({ text: 'p', caret: 1, band: { start: 0, end: 1 } }))
      out.push(c);
    expect(out.join('')).toBe('XY');
  });
});
