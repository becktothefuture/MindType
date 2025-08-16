/* Covers catchUp recursion branch by exceeding MAX_PER_CHUNK */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../ui/highlighter', () => ({
  renderValidationBand: vi.fn(),
  renderHighlight: vi.fn(),
}));

import { createDiffusionController } from '../core/diffusionController';

describe('DiffusionController.catchUp recursion', () => {
  it('recurses when more than chunk limit remains', async () => {
    const c = createDiffusionController();
    // Build a text with many short words so more than 20 words behind caret
    const words = new Array(50).fill('a').join(' ');
    c.update(words, words.length);
    await c.catchUp();
    const state = c.getState();
    expect(state.frontier).toBe(state.caret);
  });
});


