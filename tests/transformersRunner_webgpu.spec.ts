/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   R U N N E R   W E B G P U  ░░░░  ║
  ║                                                              ║
  ║   Covers WebGPU device mapping and remote model mode.        ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, vi } from 'vitest';
import { createQwenTokenStreamer } from '../core/lm/transformersRunner';

describe('Qwen token streamer (remote, webgpu)', () => {
  it('maps device to webgpu when backend reports webgpu', async () => {
    vi.mock('../core/lm/transformersClient', () => ({ detectBackend: () => 'webgpu' }));
    let deviceSeen: string | null = null;
    vi.doMock('@huggingface/transformers', () => ({
      pipeline: async (_t: string, _m: string, options: Record<string, unknown>) => {
        deviceSeen = String((options as { device?: string }).device ?? '');
        return Object.assign(async () => {}, { tokenizer: {} });
      },
      TextStreamer: function () {
        return {} as unknown as object;
      },
      env: {},
    }));
    const r = createQwenTokenStreamer({ localOnly: false });
    // drain once
    const it = r.generateStream({ prompt: 'x', maxNewTokens: 1 })[Symbol.asyncIterator]();
    await it.next();
    expect(deviceSeen).toBe('webgpu');
  });
});
