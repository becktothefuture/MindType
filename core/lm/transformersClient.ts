/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S . J S   C L I E N T  ░░░░░░░░░░  ║
  ║                                                              ║
  ║   Thin adapter around a token streamer to fit LMAdapter.     ║
  ║   No heavy deps here; inject a runner for tests/real impl.   ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Feature detection + adapter factory for Transformers.js
  • WHY  ▸ Keep core light; allow mocking in tests
  • HOW  ▸ Takes band-bounded text and streams tokens
*/
import type { LMAdapter, LMCapabilities, LMInitOptions, LMStreamParams } from './types';

export interface TokenStreamer {
  generateStream(input: { prompt: string; maxNewTokens?: number }): AsyncIterable<string>;
}

export function detectBackend(): LMCapabilities['backend'] {
  try {
    if (typeof navigator !== 'undefined') {
      const nav = navigator as unknown as Record<string, unknown>;
      if ('gpu' in nav) return 'webgpu';
    }
  } catch {}
  try {
    // In browsers without WebGPU but with WebAssembly (SIMD/threads optional), use WASM
    if (typeof WebAssembly !== 'undefined') return 'wasm';
  } catch {}
  return 'cpu';
}

export function createTransformersAdapter(runner: TokenStreamer): LMAdapter {
  let aborted = false;
  let inflight: Promise<void> | null = null;
  let resolveInflight: (() => void) | null = null;
  let lastMergeAt = 0;
  const COOLDOWN_MS = 160;
  let caps: LMCapabilities | null = null;

  return {
    init(opts?: LMInitOptions): LMCapabilities {
      const backend = opts?.preferBackend ?? detectBackend();
      caps = { backend, maxContextTokens: 1024 };
      return caps;
    },
    abort() {
      aborted = true;
    },
    async *stream(params: LMStreamParams): AsyncIterable<string> {
      // enforce cooldown
      const now = Date.now();
      const since = now - lastMergeAt;
      if (since < COOLDOWN_MS) {
        await new Promise((r) => setTimeout(r, COOLDOWN_MS - since));
      }
      // single‑flight: cancel previous
      aborted = true;
      await inflight?.catch(() => {});
      aborted = false;

      const { text, band } = params;
      const prompt = text.slice(band.start, band.end);
      const stream = runner.generateStream({ prompt });

      // create a completion promise resolved when this stream finishes
      inflight = new Promise<void>((resolve) => {
        resolveInflight = resolve;
      });

      try {
        for await (const chunk of stream) {
          if (aborted) return;
          yield chunk;
        }
        lastMergeAt = Date.now();
      } finally {
        resolveInflight?.();
        resolveInflight = null;
      }
    },
  };
}
