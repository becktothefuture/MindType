/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   C L I E N T — S T A L E S  ░░░  ║
  ║                                                              ║
  ║   Simulates overlapping LM streams to assert stale-drops     ║
  ║   accounting and at-most-one active request semantics.       ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect } from 'vitest';
import { createTransformersAdapter } from '../core/lm/transformersClient';

function makeSlowRunner(name: string, steps: number) {
  return {
    async *generateStream() {
      for (let i = 0; i < steps; i++) {
        await new Promise((r) => setTimeout(r, 0));
        yield `${name}:${i}`;
      }
    },
  } as const;
}

describe('Transformers client stale-drops', () => {
  it('increments staleDrops when a new stream starts before the prior finishes', async () => {
    const runner = makeSlowRunner('A', 5) as unknown as {
      generateStream: (input: {
        prompt: string;
        maxNewTokens?: number;
      }) => AsyncIterable<string>;
    };
    const adapter = createTransformersAdapter(runner);
    adapter.init?.({ preferBackend: 'cpu' });

    // Start first stream but do not fully consume it
    const it1 = adapter
      .stream({ text: 'hello world', caret: 5, band: { start: 0, end: 5 } })
      [Symbol.asyncIterator]();
    await it1.next(); // consume one chunk

    // Immediately start a second stream which should mark previous as stale
    const collected: string[] = [];
    for await (const c of adapter.stream({
      text: 'other world',
      caret: 5,
      band: { start: 0, end: 5 },
    })) {
      collected.push(c);
    }

    expect(collected.length).toBeGreaterThan(0);
    const stats = adapter.getStats?.();
    expect(stats?.staleDrops ?? 0).toBeGreaterThanOrEqual(1);
    expect(stats?.runs ?? 0).toBeGreaterThanOrEqual(1);
  });
});
