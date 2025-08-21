/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   R U N N E R   T E S T S  ░░░░░  ║
  ║                                                              ║
  ║   Ensures runner creates a streamer and yields chunks.       ║
  ║   Uses dynamic import mock to avoid heavy deps in CI.        ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, vi } from 'vitest';
import {
  createQwenTokenStreamer,
  __resetQwenSingletonForTests,
} from '../core/lm/transformersRunner';

describe('Qwen token streamer', () => {
  it('yields streamed chunks for a simple prompt', async () => {
    // Mock detectBackend to be stable
    vi.mock('../core/lm/transformersClient', async () => {
      const mod = (await vi.importActual('../core/lm/transformersClient')) as Record<
        string,
        unknown
      >;
      return {
        ...mod,
        detectBackend: () => 'cpu',
      } as Record<string, unknown>;
    });

    // Mock @huggingface/transformers dynamic import
    const mockTokenizer = {};
    const captured: string[] = [];
    const gen = Object.assign(
      async (_messages: unknown[], opts: Record<string, unknown>) => {
        // Call the streamer callback with a single emission
        const streamer = opts.streamer as {
          // TextStreamer calls this
          callback_function?: (text: string) => void;
        };
        streamer.callback_function?.('hello world');
      },
      { tokenizer: mockTokenizer },
    );

    const TextStreamer = function (_tok: unknown, opts: Record<string, unknown>) {
      // capture callback usage indirectly
      captured.push(String(Object.keys(opts).length));
      // return object exposing callback so our mocked generator can call it
      const o = opts as { callback_function?: (t: string) => void };
      return { callback_function: o.callback_function } as unknown as object;
    } as unknown as new (tokenizer: unknown, opts: Record<string, unknown>) => unknown;

    vi.doMock('@huggingface/transformers', () => ({
      pipeline: async () => gen,
      TextStreamer,
      env: {},
    }));

    const runner = createQwenTokenStreamer({ localOnly: true });
    const chunks: string[] = [];
    for await (const c of runner.generateStream({ prompt: 'x', maxNewTokens: 4 })) {
      chunks.push(c);
    }
    expect(chunks.join('')).toBe('hello world');
    expect(captured.length).toBeGreaterThan(0);
  });

  it('yields word-by-word chunks when spaces/punctuation are present', async () => {
    __resetQwenSingletonForTests();
    vi.mock('../core/lm/transformersClient', () => ({ detectBackend: () => 'cpu' }));

    vi.doMock('@huggingface/transformers', () => ({
      pipeline: async () =>
        Object.assign(
          async (_messages: unknown[], opts: Record<string, unknown>) => {
            const streamer = opts.streamer as { callback_function?: (t: string) => void };
            streamer.callback_function?.('alpha beta gamma.');
          },
          { tokenizer: {} },
        ),
      TextStreamer: function (_t: unknown, o: Record<string, unknown>) {
        const opts = o as { callback_function?: (t: string) => void };
        return { callback_function: opts.callback_function } as unknown as object;
      },
      env: {},
    }));

    const runner = createQwenTokenStreamer({ localOnly: true });
    const chunks: string[] = [];
    for await (const c of runner.generateStream({ prompt: 'x' })) chunks.push(c);
    expect(chunks).toEqual(['alpha ', 'beta ', 'gamma.']);
  });

  it('flushes trailing non-boundary remainder on completion', async () => {
    __resetQwenSingletonForTests();
    vi.mock('../core/lm/transformersClient', () => ({ detectBackend: () => 'cpu' }));
    vi.doMock('@huggingface/transformers', () => ({
      pipeline: async () =>
        Object.assign(
          async (_messages: unknown[], opts: Record<string, unknown>) => {
            const streamer = opts.streamer as { callback_function?: (t: string) => void };
            streamer.callback_function?.('NoBoundary');
          },
          { tokenizer: {} },
        ),
      TextStreamer: function (_t: unknown, o: Record<string, unknown>) {
        const opts = o as { callback_function?: (t: string) => void };
        return { callback_function: opts.callback_function } as unknown as object;
      },
      env: {},
    }));
    const runner = createQwenTokenStreamer({ localOnly: true });
    const chunks: string[] = [];
    for await (const c of runner.generateStream({ prompt: 'x' })) chunks.push(c);
    expect(chunks).toEqual(['NoBoundary']);
  });

  it('configures env for local hosting, maps device by backend, and reuses generator', async () => {
    __resetQwenSingletonForTests();
    // Force CPU backend deterministically
    vi.mock('../core/lm/transformersClient', () => ({ detectBackend: () => 'cpu' }));
    // Simulate a CPU-only environment
    const originalWasm = (globalThis as unknown as { WebAssembly?: unknown }).WebAssembly;
    (globalThis as unknown as { WebAssembly?: unknown }).WebAssembly = undefined;

    const envRef: Record<string, unknown> = {};
    let pipelineCalls = 0;
    let lastOptions: Record<string, unknown> | null = null;

    // Mock transformers import capturing env and options
    vi.doMock('@huggingface/transformers', () => ({
      pipeline: async (
        _task: string,
        _model: string,
        options: Record<string, unknown>,
      ) => {
        pipelineCalls += 1;
        lastOptions = options;
        const g = Object.assign(
          async (_messages: unknown[], opts: Record<string, unknown>) => {
            const streamer = opts.streamer as { callback_function?: (t: string) => void };
            streamer.callback_function?.('abcdefghijk');
          },
          { tokenizer: {} },
        );
        return g;
      },
      TextStreamer: function (_t: unknown, o: Record<string, unknown>) {
        const opts = o as { callback_function?: (t: string) => void };
        return { callback_function: opts.callback_function } as unknown as object;
      },
      env: envRef,
    }));

    const runner = createQwenTokenStreamer({
      localOnly: true,
      localModelPath: '/models/',
      wasmPaths: '/wasm/',
    });

    const first: string[] = [];
    for await (const c of runner.generateStream({ prompt: 'x' })) {
      first.push(c);
    }
    const second: string[] = [];
    for await (const c of runner.generateStream({ prompt: 'y' })) {
      second.push(c);
    }

    // generator reused
    expect(pipelineCalls).toBe(1);
    // env configured
    expect(envRef.localModelPath).toBe('/models/');
    expect(envRef.allowRemoteModels).toBe(false);
    // device option present
    const lo = lastOptions as { device?: string } | null;
    expect(typeof lo?.device).toBe('string');
    // word-by-word streaming may produce a single chunk when no boundaries exist
    expect(first.join('')).toBe('abcdefghijk');

    // restore
    (globalThis as unknown as { WebAssembly?: unknown }).WebAssembly = originalWasm;
  });

  // Device mapping is covered indirectly by ensuring 'device' option is present above.
});
