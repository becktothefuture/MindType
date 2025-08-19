/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   R U N N E R   R E M O T E  ░░░  ║
  ║                                                              ║
  ║   Covers remote-model branch and WASM device mapping.        ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, vi } from 'vitest';
import { createQwenTokenStreamer } from '../core/lm/transformersRunner';

describe('Qwen token streamer (remote)', () => {
  it('enables remote models path and maps device to wasm when backend reports wasm', async () => {
    // Force WASM backend
    vi.mock('../core/lm/transformersClient', () => ({ detectBackend: () => 'wasm' }));

    const envRef: Record<string, unknown> = {};
    // Minimal generator that uses the callback once
    vi.doMock('@huggingface/transformers', () => ({
      pipeline: async (_task: string, _model: string, _opts: Record<string, unknown>) => {
        const g = Object.assign(
          async (_messages: unknown[], options: Record<string, unknown>) => {
            const streamer = options.streamer as {
              callback_function?: (t: string) => void;
            };
            streamer.callback_function?.('wasm-remote');
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

    // localOnly false path (remote enabled)
    const runner = createQwenTokenStreamer({ localOnly: false });
    const chunks: string[] = [];
    for await (const c of runner.generateStream({ prompt: 'hi' })) chunks.push(c);

    expect(chunks.join('')).toBe('wasm-remote');
    // env toggles - remote allowed, local disabled
    expect(envRef.allowRemoteModels).toBe(true);
    expect(envRef.allowLocalModels).toBe(false);
  });
});
