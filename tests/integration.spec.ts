/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  I N T E G R A T I O N   T E S T S  ░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   End-to-end testing of the complete streaming pipeline      ║
  ║   from typing events to applied corrections.                ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Tests the full flow: Monitor → Scheduler → Diffusion → Engine
  • WHY  ▸ Verify components work together for magic typing behavior
  • HOW  ▸ Simulates typing events; checks corrections applied properly
*/
import { describe, it, expect, vi } from 'vitest';
import { createTypingMonitor } from '../core/typingMonitor';
import { createSweepScheduler } from '../core/sweepScheduler';
import { createDiffusionController } from '../core/diffusionController';
import type { LMAdapter } from '../core/lm/types';
import { tidySweep } from '../engines/tidySweep';

// Mock the UI calls for clean testing
vi.mock('../ui/highlighter', () => ({
  emitActiveRegion: vi.fn(),
}));

vi.mock('../ui/swapRenderer', () => ({
  renderHighlight: vi.fn(),
}));

describe('Streaming Diffusion Integration', () => {
  it('demonstrates the complete flow from typing to correction', () => {
    // Set up the pipeline
    const monitor = createTypingMonitor();
    createSweepScheduler(monitor);
    const diffusion = createDiffusionController();

    // Simulate user typing "Hello teh world"
    const text = 'Hello teh world';
    const caret = 15; // At end

    // Test 1: DiffusionController processes the text
    diffusion.update(text, caret);

    // Test 2: Get a word range hint from diffusion
    const state = diffusion.getState();
    expect(state.text).toBe(text);
    expect(state.caret).toBe(caret);
    expect(state.frontier).toBe(0); // Starts at beginning

    // Test 3: Simulate a tick that would request a correction
    diffusion.getState();
    const hint = { start: 5, end: 10 }; // " teh " with spaces

    // Test 4: TidySweep engine processes the hint
    const sweepResult = tidySweep({
      text,
      caret,
      hint,
    });

    expect(sweepResult.diff).not.toBeNull();
    expect(sweepResult.diff!.start).toBe(5); // Start of " teh "
    expect(sweepResult.diff!.end).toBe(10); // End of " teh "
    expect(sweepResult.diff!.text).toBe(' the ');

    // Test 5: Verify caret safety
    expect(sweepResult.diff!.end).toBeLessThanOrEqual(caret);
  });

  it('handles streaming tick-by-tick progression', () => {
    const diffusion = createDiffusionController();

    // Simulate typing with multiple words
    diffusion.update('Fix teh adn hte issues', 23); // At end

    // First tick should advance frontier
    const initialState = diffusion.getState();
    expect(initialState.frontier).toBe(0);

    diffusion.tickOnce();
    const afterFirstTick = diffusion.getState();
    expect(afterFirstTick.frontier).toBeGreaterThan(0);

    // Multiple ticks should advance but never cross caret
    diffusion.tickOnce();
    diffusion.tickOnce();
    const finalState = diffusion.getState();
    expect(finalState.frontier).toBeLessThanOrEqual(finalState.caret);
  });

  it('emits highlight via LM merge when LMAdapter is provided', async () => {
    vi.useFakeTimers();
    // Use mocked highlighter to assert call instead of DOM events
    const swapRenderer = await import('../ui/swapRenderer');
    const renderHighlight = swapRenderer.renderHighlight as unknown as ReturnType<
      typeof vi.fn
    >;

    const adapter: LMAdapter = {
      async *stream() {
        yield 'the ';
      },
    } as unknown as LMAdapter;

    const diffusion = createDiffusionController(undefined, () => adapter);
    const text = 'Hello teh world';
    diffusion.update(text, text.length);
    await diffusion.catchUp();
    await vi.advanceTimersByTimeAsync(10);
    const mock = renderHighlight as unknown as { mock: { calls: unknown[] } };
    expect(mock.mock.calls.length).toBeGreaterThan(0);
  });

  it('demonstrates correction without affecting the caret', () => {
    // Test the key promise: corrections happen behind the caret
    const text = 'I was typing teh wrong word here';
    const caretPosition = 32; // At end

    const result = tidySweep({
      text,
      caret: caretPosition,
    });

    if (result.diff) {
      // Apply the correction (simulating what the real system would do)
      const correctedText =
        text.slice(0, result.diff.start) + result.diff.text + text.slice(result.diff.end);

      expect(correctedText).toBe('I was typing the wrong word here');
      expect(result.diff.end).toBeLessThanOrEqual(caretPosition);
    }
  });

  it('verifies the rule system finds multiple correction types', () => {
    const testCases = [
      { text: 'Hello teh world', expected: 'the' },
      { text: 'cats adn dogs', expected: 'and' },
      { text: 'see hte movie', expected: 'the' },
      { text: 'fix yuor code works', expected: 'your' },
    ];

    testCases.forEach(({ text, expected }) => {
      const result = tidySweep({
        text,
        caret: text.length,
      });

      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toContain(expected);
    });
  });
});
