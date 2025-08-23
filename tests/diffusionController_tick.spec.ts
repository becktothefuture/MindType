/* Covers tickOnce early-return branch when no next word range is available */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../ui/highlighter', () => ({
  emitActiveRegion: vi.fn(),
  renderHighlight: vi.fn(),
}));

import { createDiffusionController } from '../core/diffusionController';

describe('DiffusionController.tickOnce early return', () => {
  it('returns early when frontier >= caret (no next word)', () => {
    const c = createDiffusionController();
    c.update('abc', 0);
    const before = c.getState().frontier;
    expect(() => c.tickOnce()).not.toThrow();
    const after = c.getState().frontier;
    expect(after).toBe(before);
  });
});
