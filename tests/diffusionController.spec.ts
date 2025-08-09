/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D I F F U S I O N   C O N T R O L L E R   T E S T S  ░░  ║
  ║                                                              ║
  ║   Validates word-by-word frontier advancement and caret      ║
  ║   safety in streaming diffusion behind the cursor.          ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Assert frontier never crosses caret; word segmentation works
  • WHY  ▸ Core safety guarantee for real-time streaming
  • HOW  ▸ Calls DiffusionController with sample text; checks state
*/
import { describe, it, expect, vi } from 'vitest';
import { createDiffusionController } from '../core/diffusionController';

// Mock the UI calls since we're testing logic only
vi.mock('../ui/highlighter', () => ({
  renderValidationBand: vi.fn(),
  renderHighlight: vi.fn(),
}));

describe('DiffusionController', () => {
  it('advances frontier word by word without crossing caret', () => {
    const controller = createDiffusionController();
    controller.update('Hello world test', 11); // caret after "world"

    // Initial state
    let state = controller.getState();
    expect(state.frontier).toBe(0);
    expect(state.caret).toBe(11);

    // One tick should advance frontier to end of first word
    controller.tickOnce();
    state = controller.getState();
    expect(state.frontier).toBeGreaterThan(0);
    expect(state.frontier).toBeLessThanOrEqual(state.caret);

    // Multiple ticks should never cross caret
    controller.tickOnce();
    controller.tickOnce();
    state = controller.getState();
    expect(state.frontier).toBeLessThanOrEqual(state.caret);
  });

  it('resets frontier when caret moves backward', () => {
    const controller = createDiffusionController();
    controller.update('Hello world', 11);
    controller.tickOnce();

    let state = controller.getState();
    const initialFrontier = state.frontier;

    // Move caret backward
    controller.update('Hello world', 5);
    state = controller.getState();

    // Frontier should be clamped to not exceed new caret position
    expect(state.frontier).toBeLessThanOrEqual(5);
  });

  it('handles empty text gracefully', () => {
    const controller = createDiffusionController();
    controller.update('', 0);

    expect(() => controller.tickOnce()).not.toThrow();
    const state = controller.getState();
    expect(state.frontier).toBe(0);
    expect(state.caret).toBe(0);
  });
});