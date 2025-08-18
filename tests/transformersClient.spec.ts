/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   C L I E N T   T E S T S  ░░░░░  ║
  ║                                                              ║
  ║   Verifies streaming and abort semantics via injected runner. ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect } from 'vitest';
import { createTransformersAdapter } from '../core/lm/transformersClient';

function makeRunner(chunks: string[], delay = 0) {
  return {
    async *generateStream() {
      for (const c of chunks) {
        if (delay) await new Promise((r) => setTimeout(r, delay));
        yield c;
      }
    },
  };
}

describe('Transformers client', () => {
  it('streams chunks from runner, band-bounded', async () => {
    const adapter = createTransformersAdapter(makeRunner(['foo', 'bar']));
    adapter.init?.();
    const out: string[] = [];
    for await (const c of adapter.stream({
      text: 'abc teh def',
      caret: 11,
      band: { start: 4, end: 7 },
    })) {
      out.push(c);
    }
    expect(out.join('')).toBe('foobar');
  });

  it('supports abort()', async () => {
    const adapter = createTransformersAdapter(makeRunner(['a', 'b', 'c'], 0));
    adapter.init?.();
    const it = adapter
      .stream({ text: 'hello world', caret: 5, band: { start: 0, end: 5 } })
      [Symbol.asyncIterator]();
    const first = await it.next();
    expect(first.value).toBe('a');
    adapter.abort?.();
    const second = await it.next();
    expect(second.done).toBe(true);
  });
});
