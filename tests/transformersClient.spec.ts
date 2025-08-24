/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   C L I E N T   T E S T S  ░░░░░  ║
  ║                                                              ║
  ║   Verifies streaming and abort semantics via injected runner. ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, vi } from 'vitest';
import { createTransformersAdapter, detectBackend } from '../core/lm/transformersClient';

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
    // consume first chunk potentially after cooldown
    const first = await it.next();
    expect(['a', 'b', 'c']).toContain(first.value as string);
    adapter.abort?.();
    const second = await it.next();
    expect(second.done).toBe(true);
  });

  it('enforces single-flight + cooldown', async () => {
    const emitted: string[] = [];
    const runner = makeRunner(['one ', 'two '], 0) as unknown as {
      generateStream: (input: {
        prompt: string;
        maxNewTokens?: number;
      }) => AsyncIterable<string>;
    };
    const adapter = createTransformersAdapter(runner);
    adapter.init?.();
    // Start a first stream and advance once to initialize inflight
    const it1 = adapter
      .stream({ text: 'X one two', caret: 9, band: { start: 2, end: 9 } })
      [Symbol.asyncIterator]();
    await it1.next();
    // Immediately start a new stream which should cancel previous
    const it2 = adapter
      .stream({ text: 'Y one two', caret: 9, band: { start: 2, end: 9 } })
      [Symbol.asyncIterator]();
    // Drain second
    let n: IteratorResult<string>;
    while (!(n = await it2.next()).done) emitted.push(n.value);
    // Depending on scheduling, 'one ' might be cancelled; ensure last chunk arrives
    expect(emitted.pop()).toBe('two ');
    const stats = adapter.getStats?.();
    // Note: first unconsumed generator may not increment runs since async generator body
    // executes on iteration; ensure at least one run and that we recorded a stale drop.
    expect(stats?.runs ?? 0).toBeGreaterThanOrEqual(1);
    expect(stats?.staleDrops ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('applies cooldown after a completed merge', async () => {
    const runner = makeRunner(['ok '], 0) as unknown as {
      generateStream: (input: {
        prompt: string;
        maxNewTokens?: number;
      }) => AsyncIterable<string>;
    };
    const adapter = createTransformersAdapter(runner);
    adapter.init?.();
    const chunks1: string[] = [];
    for await (const c of adapter.stream({
      text: 'A ok',
      caret: 4,
      band: { start: 2, end: 4 },
    }))
      chunks1.push(c);
    expect(chunks1.join('')).toBe('ok ');
    // Immediately start another stream; branch should await cooldown but still function
    const chunks2: string[] = [];
    for await (const c of adapter.stream({
      text: 'B ok',
      caret: 4,
      band: { start: 2, end: 4 },
    }))
      chunks2.push(c);
    expect(chunks2.join('')).toBe('ok ');
  });

  it('returns wasm or cpu depending on environment via detectBackend', () => {
    // webgpu present
    const originalNavigator: Navigator | undefined = globalThis.navigator;
    vi.stubGlobal('navigator', { gpu: {} } as unknown as Navigator);
    expect(detectBackend()).toBe('webgpu');
    vi.stubGlobal('navigator', originalNavigator as unknown as Navigator);

    // wasm fallback
    (globalThis as unknown as { WebAssembly?: typeof WebAssembly }).WebAssembly =
      {} as unknown as typeof WebAssembly;
    vi.stubGlobal('navigator', {} as unknown as Navigator);
    expect(detectBackend()).toBe('wasm');
  });
});
