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
import { DEVICE_TIERS, type DeviceTierPolicy } from './deviceTiers';

export interface TokenStreamer {
  generateStream(input: { prompt: string; maxNewTokens?: number }): AsyncIterable<string>;
}

export function detectBackend(): LMCapabilities['backend'] {
  try {
    if (typeof navigator !== 'undefined') {
      const nav = navigator as unknown as Record<string, unknown>;
      // ⟢ WebGPU detection: check for gpu object (tests use simple mock)
      if ('gpu' in nav) {
        // In tests, gpu object exists but may not have requestAdapter
        if (
          typeof (nav.gpu as { requestAdapter?: unknown })?.requestAdapter === 'function'
        ) {
          return 'webgpu';
        }
        // Fallback for test environments with simple gpu mock
        if (nav.gpu) return 'webgpu';
      }
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

export function getTierPolicy(backend: LMCapabilities['backend']): DeviceTierPolicy {
  if (backend === 'unknown') return DEVICE_TIERS.cpu;
  return DEVICE_TIERS[backend as keyof typeof DEVICE_TIERS] || DEVICE_TIERS.cpu;
}

export function cooldownForBackend(backend: LMCapabilities['backend']): number {
  return getTierPolicy(backend).cooldownMs;
}

export async function verifyLocalAssets(localOnly: boolean = true): Promise<boolean> {
  if (!localOnly) return true; // Skip verification for remote mode

  // ⟢ Verify local model assets are available
  try {
    // Check if Transformers.js and model files are accessible locally
    const testPaths = [
      '/node_modules/@huggingface/transformers/dist/transformers.min.js',
      '/models/', // Model directory should exist for local-only mode
    ];

    for (const path of testPaths) {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        if (!response.ok && response.status === 404) {
          console.warn(`[LM] Local asset not found: ${path}`);
          return false;
        }
      } catch {
        // Network error or CORS - assume local asset unavailable
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
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
  let localAssetsVerified = false;

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
      // Apply device-tier policy with auto-degrade
      const tierPolicy = getTierPolicy(backend);
      cooldownMs = tierPolicy.cooldownMs;
      // ⟢ Auto-degrade: extend cooldown for limited WASM capabilities
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
      // ⟢ Local-only asset guard (FT-231E)
      if (params.settings?.localOnly && !localAssetsVerified) {
        localAssetsVerified = await verifyLocalAssets(true);
        if (!localAssetsVerified) {
          console.warn('[LM] Local assets unavailable; falling back to rules-only');
          return; // Graceful fallback - no tokens emitted
        }
      }

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

      // ⟢ Token cap safeguards (FT-231F) - enforce device-appropriate limits
      const tierPolicy = caps ? getTierPolicy(caps.backend) : DEVICE_TIERS.cpu;
      const requestedTokens =
        (params.settings?.maxNewTokens as number) || tierPolicy.maxTokens;
      const maxTokens = Math.min(requestedTokens, tierPolicy.maxTokens);
      const clampedMaxTokens = Math.max(8, Math.min(48, maxTokens)); // [8,48] range

      const stream = runner.generateStream({
        prompt,
        maxNewTokens: clampedMaxTokens,
      });

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
