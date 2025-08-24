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
  // Optional preflight check hook for assets
  preflightFetch?: (url: string) => Promise<boolean>;
}

/**
 * Creates a TokenStreamer backed by Transformers.js. Lazy‑loads the pipeline
 * on first use to avoid bloating initial bundles.
 */
type GeneratorFn = ((
  input: unknown,
  opts: Record<string, unknown>,
) => Promise<unknown>) & {
  tokenizer: unknown;
};

type LoadedGenerator = {
  gen: GeneratorFn;
  TextStreamer: new (tokenizer: unknown, opts: Record<string, unknown>) => unknown;
};

// ──────────────────────────────────────────────────────────────
// Singleton loader (locks to first options seen for the session)
// ──────────────────────────────────────────────────────────────
let singletonGenerator: Promise<LoadedGenerator> | null = null;
let singletonInitOptions: QwenRunnerOptions | undefined;

async function loadGeneratorSingleton(
  options?: QwenRunnerOptions,
): Promise<LoadedGenerator> {
  if (singletonGenerator) return singletonGenerator;
  singletonInitOptions = options;
  const modelId = options?.modelId ?? 'onnx-community/Qwen2.5-0.5B-Instruct';
  singletonGenerator = (async (): Promise<LoadedGenerator> => {
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

    const opts = singletonInitOptions;
    // Environment configuration for self‑hosting and fallbacks
    if (opts?.localModelPath) {
      (env as Record<string, unknown>).localModelPath = opts.localModelPath;
    }
    // Ensure exactly one of local/remote is enabled
    if (opts?.localOnly) {
      (env as Record<string, unknown>).allowLocalModels = true;
      (env as Record<string, unknown>).allowRemoteModels = false as unknown as never;
    } else {
      (env as Record<string, unknown>).allowLocalModels = false as unknown as never;
      (env as Record<string, unknown>).allowRemoteModels = true as unknown as never;
    }
    if (opts?.localOnly && opts?.wasmPaths) {
      const e = env as unknown as {
        backends?: { onnx?: { wasm?: { wasmPaths?: string } } };
      } & Record<string, unknown>;
      e.backends = e.backends ?? {};
      e.backends.onnx = e.backends.onnx ?? { wasm: {} };
      e.backends.onnx.wasm = e.backends.onnx.wasm ?? {};
      e.backends.onnx.wasm.wasmPaths = opts.wasmPaths;
    }

    const backend = detectBackend();
    const isWebGPU = backend === 'webgpu';
    const loadOptions: Record<string, unknown> = { dtype: 'q4' };
    if (isWebGPU) {
      loadOptions.device = 'webgpu';
    }

    // FT-231E: Local-only asset preflight guard
    if (opts?.localOnly) {
      const fetchFn =
        opts?.preflightFetch ??
        (async (url: string) => {
          try {
            const res = await fetch(url, { method: 'HEAD' });
            return res.ok;
          } catch {
            return false;
          }
        });
      const base = String(
        (env as Record<string, unknown>).localModelPath ?? opts?.localModelPath ?? '',
      );
      if (!base) {
        throw new Error('[LM] localOnly enabled but no localModelPath configured');
      }
      const likely = `${base.replace(/\/$/, '')}/config.json`;
      const ok = await fetchFn(likely);
      if (!ok) {
        throw new Error(
          '[LM] local assets missing; switch to rules-only or run setup:local',
        );
      }
    }

    const gen = await pipeline(
      'text-generation',
      modelId,
      loadOptions as Record<string, unknown>,
    );

    console.info('[LM] ready', {
      modelId,
      backend,
      device: isWebGPU ? 'webgpu' : undefined,
      localOnly: opts?.localOnly,
    });

    return { gen, TextStreamer } as LoadedGenerator;
  })();
  return singletonGenerator;
}

export function createQwenTokenStreamer(options?: QwenRunnerOptions): TokenStreamer {
  // Default to local-only unless explicitly disabled per session
  const localOnlyDefault = options?.localOnly ?? true;
  // Device-tier default token caps
  const backend = detectBackend();
  // FT-231F: token cap clamp by backend tier [8, 48]
  const defaultByTier = backend === 'webgpu' ? 48 : backend === 'wasm' ? 24 : 16;
  const requested = options?.maxNewTokens ?? defaultByTier;
  const maxNewTokensDefault = Math.max(8, Math.min(48, requested));

  return {
    async *generateStream(input: { prompt: string; maxNewTokens?: number }) {
      const { gen, TextStreamer } = await loadGeneratorSingleton({
        ...options,
        localOnly: localOnlyDefault,
      });

      // Simple async queue to yield chunks as they arrive (word-by-word)
      const chunks: string[] = [];
      let resolver: (() => void) | null = null;
      let closed = false;
      let accum = '';

      const boundaryRegex = /[\s.,!?;:—"'”’)\]\}]/;
      function isBoundaryChar(ch: string): boolean {
        return boundaryRegex.test(ch);
      }

      function pushChunk(s: string) {
        if (!s) return;
        chunks.push(s);
        try {
          const g = globalThis as unknown as { __mtLastLMChunks?: string[] };
          g.__mtLastLMChunks = (g.__mtLastLMChunks ?? []).concat(s).slice(-10);
        } catch {}
        if (resolver) {
          const r = resolver;
          resolver = null;
          r();
        }
      }

      function flushWords(final: boolean) {
        // Emit segments ending at a boundary char (e.g., space or punctuation)
        for (let i = 0; i < accum.length; i++) {
          if (isBoundaryChar(accum[i])) {
            const emit = accum.slice(0, i + 1);
            pushChunk(emit);
            accum = accum.slice(i + 1);
            i = -1; // restart scan on the shortened buffer
          }
        }
        if (final && accum) {
          pushChunk(accum);
          accum = '';
        }
      }

      function close() {
        closed = true;
        if (resolver) {
          const r = resolver;
          resolver = null;
          r();
        }
      }

      async function waitForChunk(): Promise<void> {
        if (chunks.length || closed) return;
        return new Promise<void>((r) => {
          resolver = r;
        });
      }

      let lastEmitAt = 0;
      const COALESCE_MS = 25;

      const streamer = new TextStreamer(gen.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text: string) => {
          accum += text;
          const now = Date.now();
          if (now - lastEmitAt >= COALESCE_MS) {
            flushWords(false);
            lastEmitAt = now;
          }
        },
      });

      try {
        await gen(input.prompt as unknown as string, {
          max_new_tokens: input.maxNewTokens ?? maxNewTokensDefault,
          do_sample: false,
          streamer,
        });
      } finally {
        // Flush any remainder and close the stream
        flushWords(true);
        close();
      }

      while (!closed || chunks.length) {
        if (chunks.length) {
          yield chunks.shift() as string;
        } else {
          await waitForChunk();
        }
      }
    },
  } satisfies TokenStreamer;
}

// Test-only helper to reset the singleton between specs
export function __resetQwenSingletonForTests() {
  singletonGenerator = null;
  singletonInitOptions = undefined;
}
