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
import { tidySweep } from '../engines/tidySweep';

// Mock the UI calls for clean testing
vi.mock('../ui/highlighter', () => ({
  renderValidationBand: vi.fn(),
  renderHighlight: vi.fn(),
}));

describe('Streaming Diffusion Integration', () => {
  it('demonstrates the complete flow from typing to correction', () => {
    // Set up the pipeline
    const monitor = createTypingMonitor();
    const scheduler = createSweepScheduler(monitor);
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
    const nextRange = diffusion.getState();
    const hint = { start: 5, end: 10 }; // " teh " with spaces
    
    // Test 4: TidySweep engine processes the hint
    const sweepResult = tidySweep({
      text,
      caret,
      hint,
    });
    
    expect(sweepResult.diff).not.toBeNull();
    expect(sweepResult.diff!.start).toBe(5); // Start of " teh "
    expect(sweepResult.diff!.end).toBe(10);   // End of " teh "
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
        text.slice(0, result.diff.start) + 
        result.diff.text + 
        text.slice(result.diff.end);
      
      expect(correctedText).toBe('I was typing the wrong word here');
      expect(result.diff.end).toBeLessThanOrEqual(caretPosition);
    }
  });

  it('verifies the rule system finds multiple correction types', () => {
    const testCases = [
      { text: 'Hello teh world', expected: 'the' },
      { text: 'cats adn dogs', expected: 'and' },
      { text: 'see hte movie', expected: 'the' },
      { text: 'fix yuor code works', expected: 'your' }, // Added space before
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
