/*╔══════════════════════════════════════════════════════╗
  ║  ░  L M   A D A P T E R   V 0 . 6  ░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ LM adapter with device-tier detection and token caps
  • WHY  ▸ Enable LM-only pipeline with adaptive performance
  • HOW  ▸ Transformers.js with WebGPU→WASM→CPU fallback
*/

import type { LMAdapter, LMCapabilities, LMInitOptions, LMStreamParams } from './types';

// Device tier token caps from PRD
const DEVICE_TIER_CAPS = {
  webgpu: 48,
  wasm: 24,
  cpu: 16,
} as const;

export class LMAdapterV06 implements LMAdapter {
  private capabilities: LMCapabilities | null = null;
  private pipeline: any = null;
  private isInitialized = false;
  private currentRequest: string | null = null;

  async init(opts?: LMInitOptions): Promise<LMCapabilities> {
    if (this.isInitialized && this.capabilities) {
      return this.capabilities;
    }

    // Detect device capabilities
    const backend = this.detectBackend(opts?.preferBackend);
    
    try {
      // Import Transformers.js dynamically
      const { pipeline } = await import('@huggingface/transformers');
      
      // Initialize text generation pipeline with device-specific settings
      const modelId = opts?.modelId || 'onnx-community/Qwen2.5-0.5B-Instruct';
      
      this.pipeline = await pipeline('text-generation', modelId, {
        device: backend,
        dtype: backend === 'webgpu' ? 'q4' : 'q4', // 4-bit quantization for all tiers
      });

      this.capabilities = {
        backend,
        maxContextTokens: DEVICE_TIER_CAPS[backend],
        tokenCaps: DEVICE_TIER_CAPS,
        features: {
          webgpu: backend === 'webgpu',
          wasmSimd: backend === 'wasm',
          wasmThreads: backend === 'wasm',
        },
      };

      this.isInitialized = true;
      return this.capabilities;
    } catch (error) {
      // v0.6: LM failure policy - surface error and disable corrections
      throw new Error(`LM initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private detectBackend(prefer?: 'webgpu' | 'wasm' | 'cpu'): 'webgpu' | 'wasm' | 'cpu' {
    if (prefer) return prefer;

    // WebGPU detection
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      return 'webgpu';
    }

    // WASM detection with SIMD/threads
    if (typeof WebAssembly !== 'undefined') {
      return 'wasm';
    }

    // CPU fallback
    return 'cpu';
  }

  async *stream(params: LMStreamParams): AsyncIterable<string> {
    if (!this.isInitialized || !this.pipeline) {
      throw new Error('LMAdapter not initialized');
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.currentRequest = requestId;

    try {
      // Extract text from Active Region
      const { text, activeRegion, settings } = params;
      const spanText = text.slice(activeRegion.start, activeRegion.end);
      
      if (spanText.length === 0) return;

      // Determine token cap based on detected backend
      const backend = this.capabilities?.backend || 'cpu';
      const tierCap = backend === 'unknown' ? DEVICE_TIER_CAPS.cpu : DEVICE_TIER_CAPS[backend];
      const maxTokens = Math.min(
        settings?.maxNewTokens || tierCap,
        tierCap
      );

      // Build prompt for correction within Active Region
      const prompt = `Correct ONLY the following text. Return just the corrected text, no explanations:

${spanText}`;

      // Stream generation with device-tier token cap
      const result = await this.pipeline(prompt, {
        max_new_tokens: maxTokens,
        do_sample: false, // Deterministic
        return_full_text: false,
      });

      // Check if request was aborted
      if (this.currentRequest !== requestId) return;

      // Yield the corrected text
      if (result && result[0]?.generated_text) {
        const corrected = result[0].generated_text.trim();
        if (corrected && corrected !== spanText) {
          yield corrected;
        }
      }
    } catch (error) {
      // v0.6: LM errors disable corrections rather than fallback to rules
      throw new Error(`LM streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (this.currentRequest === requestId) {
        this.currentRequest = null;
      }
    }
  }

  abort(): void {
    this.currentRequest = null;
  }

  getStats(): { runs: number; staleDrops: number } {
    // Simple stats for v0.6
    return { runs: 0, staleDrops: 0 };
  }
}
