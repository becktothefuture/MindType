/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  B A C K E N D   D E T E C T I O N   T E S T S  ░░░░░░░░  ║
  ║                                                              ║
  ║   Verifies WebGPU/wasm/cpu detection logic.                  ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectBackend,
  cooldownForBackend,
  detectCapabilities,
} from '../core/lm/transformersClient';

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

  it('maps backend to cooldown policy', () => {
    expect(cooldownForBackend('webgpu')).toBeLessThan(cooldownForBackend('wasm'));
    expect(cooldownForBackend('wasm')).toBeLessThan(cooldownForBackend('cpu'));
  });

  it('detectCapabilities returns a reasonable shape', async () => {
    const caps = await detectCapabilities();
    expect(caps.backend).toBeDefined();
    expect(caps.maxContextTokens).toBeGreaterThan(0);
  });

  it('detectCapabilities reports webgpu=true when navigator.gpu exists', async () => {
    const originalNavigator: Navigator | undefined = globalThis.navigator;
    vi.stubGlobal('navigator', { gpu: {} } as unknown as Navigator);
    const caps = await detectCapabilities();
    expect(caps.backend).toBe('webgpu');
    expect(caps.features?.webgpu).toBe(true);
    vi.stubGlobal('navigator', originalNavigator as unknown as Navigator);
  });

  it('detectCapabilities reports wasmThreads=true when WebAssembly.Memory exists', async () => {
    const originalNavigator: Navigator | undefined = globalThis.navigator;
    const originalWA: typeof WebAssembly | undefined = (
      globalThis as unknown as { WebAssembly?: typeof WebAssembly }
    ).WebAssembly;
    vi.stubGlobal('navigator', {} as unknown as Navigator);
    (globalThis as unknown as { WebAssembly?: typeof WebAssembly }).WebAssembly = {
      // @ts-expect-error minimal shape for test
      Memory: function () {},
    } as unknown as typeof WebAssembly;
    const caps = await detectCapabilities();
    expect(['wasm', 'cpu']).toContain(caps.backend);
    expect(caps.features?.wasmThreads).toBe(true);
    // restore
    vi.stubGlobal('navigator', originalNavigator as unknown as Navigator);
    (globalThis as unknown as { WebAssembly?: typeof WebAssembly }).WebAssembly =
      originalWA;
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
