/*╔══════════════════════════════════════════════════════╗
  ║  ░  L M   A D A P T E R   V 0 . 6   T E S T S  ░░░░░  ║
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
  • WHAT ▸ Test LMAdapter v0.6: device-tier detection, token caps, single-flight
  • WHY  ▸ Validate LM-only pipeline with adaptive performance
  • HOW  ▸ Mock Transformers.js pipeline; test device detection and streaming
*/

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LMAdapterV06 } from '../core/lm/adapter_v06';

// Mock Transformers.js
const mockPipelineFactory = vi.fn();
vi.mock('@huggingface/transformers', () => ({
  pipeline: mockPipelineFactory,
}));

describe('LMAdapter v0.6', () => {
  let adapter: LMAdapterV06;
  let mockPipeline: any;

  beforeEach(() => {
    adapter = new LMAdapterV06();
    mockPipeline = vi.fn();
    
    // Reset mock
    mockPipelineFactory.mockResolvedValue(mockPipeline);
  });

  describe('device-tier detection', () => {
    it('detects WebGPU when available', async () => {
      // Mock WebGPU availability
      Object.defineProperty(global, 'navigator', {
        value: { gpu: {} },
        writable: true,
      });

      const capabilities = await adapter.init();
      
      expect(capabilities.backend).toBe('webgpu');
      expect(capabilities.tokenCaps.webgpu).toBe(48);
      expect(capabilities.tokenCaps.wasm).toBe(24);
      expect(capabilities.tokenCaps.cpu).toBe(16);
      expect(capabilities.features?.webgpu).toBe(true);
    });

    it('falls back to WASM when WebGPU unavailable', async () => {
      // Mock WebAssembly availability
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      Object.defineProperty(global, 'WebAssembly', {
        value: {},
        writable: true,
      });

      const capabilities = await adapter.init();
      
      expect(capabilities.backend).toBe('wasm');
      expect(capabilities.maxContextTokens).toBe(24);
    });

    it('uses CPU as final fallback', async () => {
      // Mock no advanced capabilities
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      Object.defineProperty(global, 'WebAssembly', {
        value: undefined,
        writable: true,
      });

      const capabilities = await adapter.init();
      
      expect(capabilities.backend).toBe('cpu');
      expect(capabilities.maxContextTokens).toBe(16);
    });

    it('respects backend preference', async () => {
      const capabilities = await adapter.init({ preferBackend: 'cpu' });
      
      expect(capabilities.backend).toBe('cpu');
    });
  });

  describe('initialization and error handling', () => {
    it('throws error when Transformers.js fails to load', async () => {
      mockPipelineFactory.mockRejectedValue(new Error('Model not found'));

      await expect(adapter.init()).rejects.toThrow('LM initialization failed: Model not found');
    });

    it('returns cached capabilities on subsequent init calls', async () => {
      const first = await adapter.init();
      const second = await adapter.init();
      
      expect(first).toBe(second); // Same object reference
    });
  });

  describe('streaming with token caps', () => {
    beforeEach(async () => {
      mockPipeline.mockResolvedValue([{ generated_text: 'corrected text' }]);
      await adapter.init();
    });

    it('streams corrected text within Active Region', async () => {
      const params = {
        text: 'Hello teh world',
        caret: 15,
        activeRegion: { start: 6, end: 9 }, // "teh"
        settings: {},
      };

      const chunks: string[] = [];
      for await (const chunk of adapter.stream(params)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['corrected text']);
      expect(mockPipeline).toHaveBeenCalledWith(
        expect.stringContaining('teh'),
        expect.objectContaining({
          max_new_tokens: expect.any(Number),
          do_sample: false,
          return_full_text: false,
        })
      );
    });

    it('respects device-tier token caps', async () => {
      const params = {
        text: 'Test text',
        caret: 9,
        activeRegion: { start: 0, end: 9 },
        settings: { maxNewTokens: 100 }, // Request more than cap
      };

      for await (const _ of adapter.stream(params)) {
        // Just consume the stream
      }

      // Should clamp to device tier cap (16 for CPU default in test env)
      expect(mockPipeline).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          max_new_tokens: 16, // Clamped to CPU cap (no WebGPU in test)
        })
      );
    });

    it('handles empty Active Region gracefully', async () => {
      const params = {
        text: 'Test',
        caret: 4,
        activeRegion: { start: 4, end: 4 }, // Empty range
        settings: {},
      };

      const chunks: string[] = [];
      for await (const chunk of adapter.stream(params)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([]); // No output for empty region
    });

    it('implements single-flight behavior', async () => {
      const params = {
        text: 'Test text',
        caret: 9,
        activeRegion: { start: 0, end: 9 },
        settings: {},
      };

      // Test abort functionality
      adapter.abort();
      
      const chunks: string[] = [];
      for await (const chunk of adapter.stream(params)) {
        chunks.push(chunk);
      }

      // Should complete normally (abort was before stream)
      expect(chunks).toEqual(['corrected text']);
    });
  });

  describe('error handling', () => {
    it('throws when streaming without initialization', async () => {
      const uninitializedAdapter = new LMAdapterV06();
      const params = {
        text: 'Test',
        caret: 4,
        activeRegion: { start: 0, end: 4 },
        settings: {},
      };

      await expect(async () => {
        for await (const _ of uninitializedAdapter.stream(params)) {
          // Should throw before yielding
        }
      }).rejects.toThrow('LMAdapter not initialized');
    });

    it('throws when pipeline fails during streaming', async () => {
      await adapter.init();
      mockPipeline.mockRejectedValue(new Error('Generation failed'));

      const params = {
        text: 'Test',
        caret: 4,
        activeRegion: { start: 0, end: 4 },
        settings: {},
      };

      await expect(async () => {
        for await (const _ of adapter.stream(params)) {
          // Should throw
        }
      }).rejects.toThrow('LM streaming failed: Generation failed');
    });
  });

  describe('abort functionality', () => {
    it('can abort ongoing requests', async () => {
      await adapter.init();
      
      const params = {
        text: 'Test text',
        caret: 9,
        activeRegion: { start: 0, end: 9 },
        settings: {},
      };

      const stream = adapter.stream(params);
      adapter.abort(); // Abort immediately
      
      const chunks: string[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([]); // Should yield nothing after abort
    });
  });
});
