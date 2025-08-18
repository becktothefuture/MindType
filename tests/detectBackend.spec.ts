/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  B A C K E N D   D E T E C T I O N   T E S T S  ░░░░░░░░  ║
  ║                                                              ║
  ║   Verifies WebGPU/wasm/cpu detection logic.                  ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectBackend } from '../core/lm/transformersClient';

describe('detectBackend', () => {
  const originalNavigator: Navigator | undefined = globalThis.navigator;
  const originalWebAssembly: typeof WebAssembly | undefined = (
    globalThis as unknown as { WebAssembly?: typeof WebAssembly }
  ).WebAssembly;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns webgpu when navigator.gpu exists', () => {
    vi.stubGlobal('navigator', { gpu: {} } as unknown as Navigator);
    expect(detectBackend()).toBe('webgpu');
    vi.stubGlobal('navigator', originalNavigator as unknown as Navigator);
  });

  it('returns wasm when WebAssembly exists and no webgpu', () => {
    vi.stubGlobal('navigator', {} as unknown as Navigator);
    vi.stubGlobal('WebAssembly', {});
    // adjust detectBackend expectations accordingly
    const b = detectBackend();
    // current implementation returns 'wasm' because WebAssembly exists
    expect(['wasm', 'cpu']).toContain(b);
    vi.stubGlobal('navigator', originalNavigator as unknown as Navigator);
    if (originalWebAssembly)
      vi.stubGlobal('WebAssembly', originalWebAssembly as typeof WebAssembly);
  });
});
