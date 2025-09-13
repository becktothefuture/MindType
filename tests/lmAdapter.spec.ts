/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   A D A P T E R   C O N F O R M A N C E   ░░░░░░░░░  ║
  ║                                                              ║
  ║   Adapter streams tokens, supports single‑flight, and abort. ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect } from 'vitest';
import {
  createTransformersAdapter,
  type TokenStreamer,
} from '../core/lm/transformersClient';

function makeStreamer(chunks: string[], delayMs = 0): TokenStreamer {
  return {
    async *generateStream(): AsyncIterable<string> {
      for (const c of chunks) {
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
        yield c;
      }
    },
  };
}

describe('LMAdapter (transformersClient)', () => {
  it('streams chunks from runner', async () => {
    const adapter = createTransformersAdapter(makeStreamer(['Hello', ' ', 'World']));
    const out: string[] = [];
    for await (const t of adapter.stream({
      text: 'abc',
      caret: 3,
      band: { start: 0, end: 3 },
    })) {
      out.push(t);
    }
    expect(out.join('')).toBe('Hello World');
  });

  it('increments staleDrops when a second stream starts (single‑flight)', async () => {
    const adapter = createTransformersAdapter(makeStreamer(['A', 'B'], 1));
    // Start and advance first stream one step to initialize inflight
    const it1 = adapter
      .stream({ text: 'abc', caret: 3, band: { start: 0, end: 3 } })
      [Symbol.asyncIterator]();
    await it1.next();
    // Now start and consume a second stream, which should mark previous as stale
    const s2 = adapter.stream({ text: 'abcd', caret: 4, band: { start: 0, end: 4 } });
    const got: string[] = [];
    for await (const t of s2) got.push(t);
    const stats = adapter.getStats?.();
    expect(stats && stats.runs).toBeGreaterThanOrEqual(1);
    expect(stats && stats.staleDrops).toBeGreaterThanOrEqual(1);
    // Finish first iterator if anything remains
    for await (const _ of { [Symbol.asyncIterator]: () => it1 } as any) {
      void _;
    }
  });

  it('abort() stops further emission', async () => {
    const adapter = createTransformersAdapter(makeStreamer(['one', 'two', 'three'], 0));
    const out: string[] = [];
    const it = adapter
      .stream({ text: 'abc', caret: 3, band: { start: 0, end: 3 } })
      [Symbol.asyncIterator]();
    const r1 = await it.next();
    if (!r1.done) out.push(r1.value);
    adapter.abort?.();
    const r2 = await it.next();
    expect(r2.done).toBe(true);
    expect(out.join('')).toBe('one');
  });
});
