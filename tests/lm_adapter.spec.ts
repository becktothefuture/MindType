/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   A D A P T E R   W I R I N G   T E S T S  ░░░░░░░░  ║
  ║                                                              ║
  ║   Ensures diffusion can accept optional LM without breaking. ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, vi } from 'vitest';
import { createDiffusionController } from '../core/diffusionController';
import { createMockLMAdapter } from '../core/lm/mockAdapter';

describe('LM Adapter optional wiring', () => {
  it('does not change behaviour when adapter is not provided', async () => {
    vi.mock('../ui/highlighter', () => ({
      renderValidationBand: vi.fn(),
      renderHighlight: vi.fn(),
    }));
    const d = createDiffusionController();
    d.update('Hello world test', 11);
    for (let i = 0; i < 20; i++) d.tickOnce();
    const s = d.getState();
    expect(s.frontier).toBeGreaterThanOrEqual(0);
    await d.catchUp();
    expect(d.getState().frontier).toBe(d.getState().caret);
  });

  it('accepts an adapter parameter (no-op for now)', async () => {
    const adapter = createMockLMAdapter();
    const d = createDiffusionController(undefined, adapter);
    d.update('some teh text', 13);
    d.tickOnce();
    await d.catchUp();
    // no throw, caret safety preserved
    const s = d.getState();
    expect(s.frontier).toBe(s.caret);
  });
});
