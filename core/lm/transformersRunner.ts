/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   R U N N E R  ░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   WebGPU‑first Qwen runner with WASM/CPU fallbacks.          ║
  ║   Streams tokens using TextStreamer to fit TokenStreamer.    ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Create a token streamer powered by Transformers.js
  • WHY  ▸ Provide a real LM source for FT‑231 without merge yet
  • HOW  ▸ pipeline('text-generation') + TextStreamer callbacks
*/

import type { TokenStreamer } from './transformersClient';
import { detectBackend } from './transformersClient';

export interface QwenRunnerOptions {
  modelId?: string;
  maxNewTokens?: number;
  // When true, set env.allowRemoteModels=false to require local hosting
  localOnly?: boolean;
  // Set a base path for locally hosted models, e.g. '/models/' (served by host)
  localModelPath?: string;
  // Optional path for WASM binaries when falling back
  wasmPaths?: string;
}

/**
 * Creates a TokenStreamer backed by Transformers.js. Lazy‑loads the pipeline
 * on first use to avoid bloating initial bundles.
 */
type GeneratorFn = ((
  messages: unknown[],
  opts: Record<string, unknown>,
) => Promise<unknown>) & {
  tokenizer: unknown;
};

type LoadedGenerator = {
  gen: GeneratorFn;
  TextStreamer: new (tokenizer: unknown, opts: Record<string, unknown>) => unknown;
};

export function createQwenTokenStreamer(options?: QwenRunnerOptions): TokenStreamer {
  let generatorPromise: Promise<LoadedGenerator> | null = null;
  const modelId = options?.modelId ?? 'onnx-community/Qwen2.5-0.5B-Instruct';
  const maxNewTokensDefault = options?.maxNewTokens ?? 64;

  async function loadGenerator() {
    if (generatorPromise) return generatorPromise;
    generatorPromise = (async (): Promise<LoadedGenerator> => {
      // Dynamic import keeps core decoupled from heavy deps
      const { pipeline, TextStreamer, env } = (await import(
        '@huggingface/transformers'
      )) as unknown as {
        pipeline: (
          task: string,
          model: string,
          options: Record<string, unknown>,
        ) => Promise<GeneratorFn>;
        TextStreamer: new (tokenizer: unknown, opts: Record<string, unknown>) => unknown;
        env: Record<string, unknown>;
      };

      // Environment configuration for self‑hosting and fallbacks
      if (options?.localModelPath) {
        (env as Record<string, unknown>).localModelPath = options.localModelPath;
      }
      // Ensure exactly one of local/remote is enabled
      if (options?.localOnly) {
        (env as Record<string, unknown>).allowLocalModels = true;
        (env as Record<string, unknown>).allowRemoteModels = false as unknown as never;
      } else {
        (env as Record<string, unknown>).allowLocalModels = false as unknown as never;
        (env as Record<string, unknown>).allowRemoteModels = true as unknown as never;
      }
      if (options?.localOnly && options?.wasmPaths) {
        const e = env as unknown as {
          backends?: { onnx?: { wasm?: { wasmPaths?: string } } };
        } & Record<string, unknown>;
        e.backends = e.backends ?? {};
        e.backends.onnx = e.backends.onnx ?? { wasm: {} };
        e.backends.onnx.wasm = e.backends.onnx.wasm ?? {};
        e.backends.onnx.wasm.wasmPaths = options.wasmPaths;
      }

      const backend = detectBackend();
      const device =
        backend === 'webgpu' ? 'webgpu' : backend === 'wasm' ? 'wasm' : 'cpu';

      const gen = await pipeline('text-generation', modelId, {
        dtype: 'q4',
        device,
      } as Record<string, unknown>);

      try {
        // eslint-disable-next-line no-console
        console.info('[LM] ready', {
          modelId,
          backend,
          device,
          localOnly: options?.localOnly,
        });
      } catch {}

      return { gen, TextStreamer } as LoadedGenerator;
    })();
    return generatorPromise;
  }

  return {
    async *generateStream(input: { prompt: string; maxNewTokens?: number }) {
      const { gen, TextStreamer } = await loadGenerator();
      let buffer = '';

      const streamer = new TextStreamer(gen.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          buffer += text;
        },
      });

      const messages = [
        { role: 'system', content: 'You correct grammar and clarity of text.' },
        { role: 'user', content: input.prompt },
      ];

      await gen(messages as unknown[], {
        max_new_tokens: input.maxNewTokens ?? maxNewTokensDefault,
        do_sample: false,
        streamer,
      });

      // Flush as streaming chunks (~8 chars) to simulate token cadence
      const CHUNK = 8;
      for (let i = 0; i < buffer.length; i += CHUNK) {
        yield buffer.slice(i, i + CHUNK);
      }
    },
  } satisfies TokenStreamer;
}
