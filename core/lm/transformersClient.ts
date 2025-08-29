/*╔══════════════════════════════════════════════════════════╗
  ║  ░  TRANSFORMERSCLIENT  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ╚══════════════════════════════════════════════════════════╝
  • WHAT ▸ On-device LM integration with graceful fallback
  • WHY  ▸ REQ-LOCAL-LM-INTEGRATION
  • HOW  ▸ See linked contracts and guides in docs
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

export async function detectCapabilities(): Promise<LMCapabilities> {
  const backend = detectBackend();
  const caps: LMCapabilities = { backend, maxContextTokens: 1024 };
  // WebGPU flag
  try {
    caps.features = { ...(caps.features ?? {}), webgpu: backend === 'webgpu' };
  } catch {}
  // WASM feature probes
  try {
    // Threads
    const threads =
      typeof (WebAssembly as unknown as Record<string, unknown>).Memory === 'function';
    // SIMD: minimal probe via feature detection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const simd = typeof (WebAssembly as any)?.validate === 'function';
    caps.features = { ...(caps.features ?? {}), wasmThreads: threads, wasmSimd: simd };
  } catch {}
  return caps;
}

export function cooldownForBackend(backend: LMCapabilities['backend']): number {
  return backend === 'webgpu' ? 120 : backend === 'wasm' ? 200 : 260;
}

export function createTransformersAdapter(runner: TokenStreamer): LMAdapter {
  let aborted = false;
  let inflight: Promise<void> | null = null;
  let resolveInflight: (() => void) | null = null;
  let lastMergeAt = 0;
  let cooldownMs = 160;
  let caps: LMCapabilities | null = null;
  let runs = 0;
  let staleDrops = 0;

  return {
    init(opts?: LMInitOptions): LMCapabilities {
      const backend = opts?.preferBackend ?? detectBackend();
      // Synchronous feature probes (best-effort)
      let wasmThreads = false;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wasmThreads = typeof (WebAssembly as any)?.Memory === 'function';
      } catch {}
      const features = {
        webgpu: backend === 'webgpu',
        wasmThreads,
        // SIMD probe omitted (browser-dependent); assume undefined
        wasmSimd: undefined as unknown as boolean | undefined,
      };
      caps = { backend, maxContextTokens: 1024, features };
      // Adjust cooldown policy by backend capability and features
      cooldownMs = cooldownForBackend(backend);
      if (backend === 'wasm' && !features.wasmThreads) cooldownMs += 80;
      return caps;
    },
    abort() {
      aborted = true;
    },
    getStats() {
      return { runs, staleDrops };
    },
    async *stream(params: LMStreamParams): AsyncIterable<string> {
      // enforce cooldown
      const now = Date.now();
      const since = now - lastMergeAt;
      if (since < cooldownMs) {
        await new Promise((r) => setTimeout(r, cooldownMs - since));
      }
      // single‑flight: mark previous as stale and request its termination
      if (inflight) staleDrops += 1;
      aborted = true;
      // Do not block on previous inflight; start fresh immediately
      aborted = false;
      runs += 1;

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
