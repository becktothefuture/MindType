/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   C L I E N T   T E S T S  ░░░░░  ║
  ║                                                              ║
  ║   Verifies streaming and abort semantics via injected runner. ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, vi } from 'vitest';
import { createTransformersAdapter, detectBackend } from '../core/lm/transformersClient';
import { cooldownForBackend } from '../core/lm/transformersClient';
import type { LMCapabilities } from '../core/lm/types';

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

  it('respects backend-specific cooldown (webgpu faster than cpu)', async () => {
    vi.useFakeTimers();
    // runner yields a single chunk immediately
    const runner = makeRunner(['x']) as unknown as {
      generateStream: (input: {
        prompt: string;
        maxNewTokens?: number;
      }) => AsyncIterable<string>;
    };

    // CPU backend
    const cpuAdapter = createTransformersAdapter(runner);
    cpuAdapter.init?.({ preferBackend: 'cpu' });
    // complete one run to set lastMergeAt
    for await (const _ of cpuAdapter.stream({
      text: 'ab',
      caret: 2,
      band: { start: 0, end: 2 },
    })) {
      void _;
    }
    let got = false;
    (async () => {
      for await (const _ of cpuAdapter.stream({
        text: 'cd',
        caret: 2,
        band: { start: 0, end: 2 },
      })) {
        void _;
        got = true;
        break;
      }
    })();
    // Should not yield until cooldown elapses (>= 260ms for cpu)
    await vi.advanceTimersByTimeAsync(200);
    expect(got).toBe(false);
    await vi.advanceTimersByTimeAsync(80);
    expect(got).toBe(true);

    // WEBGPU backend
    const gpuAdapter = createTransformersAdapter(runner);
    gpuAdapter.init?.({ preferBackend: 'webgpu' });
    for await (const _ of gpuAdapter.stream({
      text: 'ab',
      caret: 2,
      band: { start: 0, end: 2 },
    })) {
      void _;
    }
    let gotGpu = false;
    (async () => {
      for await (const _ of gpuAdapter.stream({
        text: 'cd',
        caret: 2,
        band: { start: 0, end: 2 },
      })) {
        void _;
        gotGpu = true;
        break;
      }
    })();
    await vi.advanceTimersByTimeAsync(100);
    expect(gotGpu).toBe(false);
    await vi.advanceTimersByTimeAsync(30); // total 130ms >= 120ms webgpu
    expect(gotGpu).toBe(true);

    vi.useRealTimers();
  });

  it('increases cooldown on wasm when threads are not available', async () => {
    vi.useFakeTimers();
    const originalWA: typeof WebAssembly | undefined = (
      globalThis as unknown as { WebAssembly?: typeof WebAssembly }
    ).WebAssembly;
    // Stub WebAssembly to lack Memory so wasmThreads=false
    (globalThis as unknown as { WebAssembly?: typeof WebAssembly }).WebAssembly =
      {} as unknown as typeof WebAssembly;
    const runner = makeRunner(['x']) as unknown as {
      generateStream: (input: {
        prompt: string;
        maxNewTokens?: number;
      }) => AsyncIterable<string>;
    };
    const adapter = createTransformersAdapter(runner);
    adapter.init?.({ preferBackend: 'wasm' });
    // Simulate a completed run to set lastMergeAt
    for await (const _ of adapter.stream({
      text: 'ab',
      caret: 2,
      band: { start: 0, end: 2 },
    })) {
      void _;
    }
    let yielded = false;
    (async () => {
      for await (const _ of adapter.stream({
        text: 'cd',
        caret: 2,
        band: { start: 0, end: 2 },
      })) {
        void _;
        yielded = true;
        break;
      }
    })();
    // Base wasm cooldown
    await vi.advanceTimersByTimeAsync(cooldownForBackend('wasm') - 10);
    expect(yielded).toBe(false);
    // After base cooldown, since our init set wasmThreads false by default probing, it adds 80ms
    await vi.advanceTimersByTimeAsync(90);
    expect(yielded).toBe(true);
    vi.useRealTimers();
    // restore
    (globalThis as unknown as { WebAssembly?: typeof WebAssembly }).WebAssembly =
      originalWA;
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

    // cpu fallback when WebAssembly missing
    (globalThis as unknown as { WebAssembly?: typeof WebAssembly }).WebAssembly =
      undefined as unknown as typeof WebAssembly;
    expect(detectBackend()).toBe('cpu');
  });

  it('init sets webgpu feature true (no wasm flags) when preferBackend=webgpu', () => {
    const runner = makeRunner(['x']) as unknown as {
      generateStream: (input: {
        prompt: string;
        maxNewTokens?: number;
      }) => AsyncIterable<string>;
    };
    const adapter = createTransformersAdapter(runner);
    const caps = adapter.init?.({ preferBackend: 'webgpu' }) as LMCapabilities;
    expect(caps?.backend).toBe('webgpu');
    expect(caps?.features?.webgpu).toBe(true);
    expect(caps?.features?.wasmThreads ?? false).toBe(false);
  });

  it('init sets cpu baseline when preferBackend=cpu', () => {
    const runner = makeRunner(['x']) as unknown as {
      generateStream: (input: {
        prompt: string;
        maxNewTokens?: number;
      }) => AsyncIterable<string>;
    };
    const adapter = createTransformersAdapter(runner);
    const caps = adapter.init?.({ preferBackend: 'cpu' }) as LMCapabilities;
    expect(caps?.backend).toBe('cpu');
    expect(caps?.features?.webgpu ?? false).toBe(false);
  });

  it('cpu cooldown enforcement blocks until base delay elapses', async () => {
    vi.useFakeTimers();
    const runner = makeRunner(['x']) as unknown as {
      generateStream: (input: {
        prompt: string;
        maxNewTokens?: number;
      }) => AsyncIterable<string>;
    };
    const adapter = createTransformersAdapter(runner);
    adapter.init?.({ preferBackend: 'cpu' });
    // First run to set lastMergeAt
    for await (const _ of adapter.stream({
      text: 'ab',
      caret: 2,
      band: { start: 0, end: 2 },
    })) {
      void _;
    }
    let yielded = false;
    (async () => {
      for await (const _ of adapter.stream({
        text: 'cd',
        caret: 2,
        band: { start: 0, end: 2 },
      })) {
        void _;
        yielded = true;
        break;
      }
    })();
    await vi.advanceTimersByTimeAsync(200);
    expect(yielded).toBe(false);
    await vi.advanceTimersByTimeAsync(70); // 200+70 >= 260 base cpu cooldown
    expect(yielded).toBe(true);
    vi.useRealTimers();
  });
});
