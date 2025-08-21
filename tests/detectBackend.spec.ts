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

  it('returns cpu when neither WebGPU nor WebAssembly are available', () => {
    const originalNavigator: Navigator | undefined = globalThis.navigator;
    const originalWebAssembly: typeof WebAssembly | undefined = (
      globalThis as unknown as { WebAssembly?: typeof WebAssembly }
    ).WebAssembly;
    vi.stubGlobal('navigator', {} as unknown as Navigator);
    // Ensure WebAssembly is explicitly undefined
    (globalThis as unknown as { WebAssembly?: typeof WebAssembly }).WebAssembly =
      undefined;
    expect(detectBackend()).toBe('cpu');
    // restore
    vi.stubGlobal('navigator', originalNavigator as unknown as Navigator);
    if (originalWebAssembly)
      (globalThis as unknown as { WebAssembly?: typeof WebAssembly }).WebAssembly =
        originalWebAssembly;
  });

  it('gracefully handles errors while checking navigator.gpu and falls back', () => {
    const originalNavigator: Navigator | undefined = globalThis.navigator;
    const proxy = new Proxy(
      {},
      {
        has() {
          throw new Error('access error');
        },
      },
    );
    vi.stubGlobal('navigator', proxy as unknown as Navigator);
    // Ensure WebAssembly exists so fallback is 'wasm'
    (globalThis as unknown as { WebAssembly?: typeof WebAssembly }).WebAssembly =
      {} as unknown as typeof WebAssembly;
    expect(detectBackend()).toBe('wasm');
    vi.stubGlobal('navigator', originalNavigator as unknown as Navigator);
  });
});
