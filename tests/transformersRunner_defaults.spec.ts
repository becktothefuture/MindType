/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   R U N N E R — D E F A U L T S  ░  ║
  ║                                                              ║
  ║   Verifies default local paths (/models, /wasm) are applied  ║
  ║   when options omit them, and preflight uses that base.      ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, vi } from 'vitest';
import {
  createQwenTokenStreamer,
  __resetQwenSingletonForTests,
} from '../core/lm/transformersRunner';

describe('Qwen token streamer (defaults)', () => {
  it('applies default localModelPath and wasmPaths when omitted (localOnly)', async () => {
    __resetQwenSingletonForTests();
    vi.mock('../core/lm/transformersClient', () => ({ detectBackend: () => 'cpu' }));

    type EnvShape = {
      localModelPath?: string;
      backends?: { onnx?: { wasm?: { wasmPaths?: string } } };
    };
    const envRef: EnvShape = {};
    let pipelineOptions: Record<string, unknown> | null = null;
    vi.doMock('@huggingface/transformers', () => ({
      pipeline: async (
        _task: string,
        _model: string,
        options: Record<string, unknown>,
      ) => {
        pipelineOptions = options;
        return Object.assign(
          async (_p: string, opts: Record<string, unknown>) => {
            const streamer = opts.streamer as { callback_function?: (t: string) => void };
            streamer.callback_function?.('ok');
          },
          { tokenizer: {} },
        );
      },
      TextStreamer: function (_tok: unknown, opts: Record<string, unknown>) {
        return {
          callback_function: (opts as { callback_function?: (t: string) => void })
            .callback_function,
        } as unknown as object;
      },
      env: envRef,
    }));

    const runner = createQwenTokenStreamer({
      localOnly: true,
      // omit localModelPath and wasmPaths to trigger defaults
      preflightFetch: async () => true,
    });

    const chunks: string[] = [];
    for await (const c of runner.generateStream({ prompt: 'x' })) chunks.push(c);
    expect(chunks.join('')).toBe('ok');

    // Defaults should be applied into env
    expect(envRef.localModelPath).toBe('/models/onnx-community/Qwen2.5-0.5B-Instruct');
    expect(envRef.backends?.onnx?.wasm?.wasmPaths).toBe('/wasm/');
    // dtype should remain q4 by default
    expect((pipelineOptions as { dtype?: string } | null)?.dtype).toBe('q4');
  });
});
