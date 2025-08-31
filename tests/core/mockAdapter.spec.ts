/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  M O C K   L M   A D A P T E R   —   T E S T S  ░░░░░░░░  ║
  ║                                                              ║
  ║   Verifies init caps and abort short-circuits streaming.     ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect } from 'vitest';
import { createMockLMAdapter } from '../../core/lm/mockAdapter';

describe('Mock LM Adapter', () => {
  it('returns capabilities from init', async () => {
    const a = createMockLMAdapter();
    const caps = await (a.init?.() as
      | Promise<ReturnType<NonNullable<typeof a.init>>>
      | ReturnType<NonNullable<typeof a.init>>);
    // Normalize for Promise or direct return
    const resolved = caps as unknown as { backend?: string; maxContextTokens?: number };
    expect(resolved.backend).toBe('cpu');
    expect((resolved.maxContextTokens ?? 0) > 0).toBe(true);
  });

  it('abort stops streaming after first chunk', async () => {
    const a = createMockLMAdapter();
    const chunks: string[] = [];
    let first = true;
    const text = 'hello teh world!!!'; // > 8 chars → multiple chunks
    const band = { start: 0, end: text.length };
    for await (const c of a.stream({ text, caret: text.length, band })) {
      chunks.push(c);
      if (first) {
        a.abort?.();
        first = false;
      }
    }
    // Should have yielded at least one chunk but not the full band
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('').length).toBeLessThan(text.length);
  });
});
