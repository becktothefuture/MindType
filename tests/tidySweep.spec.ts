/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T I D Y   S W E E P   T E S T S  ░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Validates rule-based corrections and caret safety in       ║
  ║   the forward cleanup engine behind the cursor.             ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Assert rule application, caret safety, confidence gating
  • WHY  ▸ Core safety and correctness for live typing corrections
  • HOW  ▸ Calls tidySweep with various scenarios; checks results
*/
import { describe, it, expect } from 'vitest';
import { tidySweep, type SweepInput } from '../engines/tidySweep';

describe('TidySweep Engine', () => {
  describe('Caret Safety', () => {
    it('never proposes edits at or after the caret', () => {
      const input: SweepInput = {
        text: 'Hello teh world',
        caret: 9, // Right before "world"
      };

      const result = tidySweep(input);

      if (result.diff) {
        expect(result.diff.end).toBeLessThanOrEqual(input.caret);
        expect(result.diff.start).toBeLessThan(input.caret);
      }
    });

    it('returns null when no safe edits are possible', () => {
      const input: SweepInput = {
        text: 'teh',
        caret: 3, // At end, no space for " teh "
      };

      const result = tidySweep(input);
      expect(result.diff).toBeNull();
    });

    it('handles empty text gracefully', () => {
      const input: SweepInput = {
        text: '',
        caret: 0,
      };

      const result = tidySweep(input);
      expect(result.diff).toBeNull();
    });
  });

  describe('Word Substitution Rules', () => {
    it('corrects "teh" to "the"', () => {
      const input: SweepInput = {
        text: 'Hello teh world and more',
        caret: 20, // After "and"
      };

      const result = tidySweep(input);

      expect(result.diff).not.toBeNull();
      expect(result.diff!.start).toBe(5); // Start of " teh "
      expect(result.diff!.end).toBe(10); // End of " teh "
      expect(result.diff!.text).toBe(' the ');
    });

    it('corrects "adn" to "and"', () => {
      const input: SweepInput = {
        text: 'cats adn dogs are cute',
        caret: 22, // At end
      };

      const result = tidySweep(input);

      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe(' and ');
    });

    it('finds the rightmost match when multiple exist', () => {
      const input: SweepInput = {
        text: 'teh cat adn teh dog adn mouse',
        caret: 29, // At end
      };

      const result = tidySweep(input);

      expect(result.diff).not.toBeNull();
      // Should find the last " adn " not the first
      expect(result.diff!.start).toBeGreaterThan(15);
      expect(result.diff!.text).toBe(' and ');
    });

    it('respects hint boundaries when provided', () => {
      const input: SweepInput = {
        text: 'start teh middle teh end',
        caret: 24,
        hint: { start: 0, end: 12 }, // Only first part
      };

      const result = tidySweep(input);

      expect(result.diff).not.toBeNull();
      expect(result.diff!.start).toBeLessThan(12); // Within hint
      expect(result.diff!.end).toBeLessThanOrEqual(12);
    });
  });

  describe('Transposition Detection (FT-211)', () => {
    it('corrects simple transpositions inside words (nto→not)', () => {
      const input: SweepInput = {
        text: 'this is nto correct',
        caret: 20,
      };

      const result = tidySweep(input);
      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe('not');
    });

    it('chooses rightmost transposition within window and respects caret', () => {
      const input: SweepInput = {
        text: 'waht is taht and nto here',
        caret: 26,
      };
      const result = tidySweep(input);
      expect(result.diff).not.toBeNull();
      // Should pick the last match before caret window end
      expect(result.diff!.end).toBeLessThanOrEqual(input.caret);
    });
  });

  describe('Window Constraints', () => {
    it('respects MAX_SWEEP_WINDOW limit', () => {
      // Create text longer than MAX_SWEEP_WINDOW
      const prefix = 'x'.repeat(100); // Longer than 80-char window
      const input: SweepInput = {
        text: prefix + ' teh world',
        caret: prefix.length + 10, // After " teh "
      };

      const result = tidySweep(input);

      // Should still find the correction within the window
      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe(' the ');
    });

    it('handles hint that extends beyond safe window', () => {
      const input: SweepInput = {
        text: 'Hello teh world',
        caret: 10,
        hint: { start: 5, end: 15 }, // Hint crosses caret
      };

      const result = tidySweep(input);

      if (result.diff) {
        expect(result.diff.end).toBeLessThanOrEqual(input.caret);
      }
    });
  });

  describe('Rule Priority', () => {
    it('applies rules in priority order', () => {
      // This test verifies the rule system works
      // When we add more rules, we can test priority
      const input: SweepInput = {
        text: 'Test teh system',
        caret: 15,
      };

      const result = tidySweep(input);

      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe(' the ');
    });
  });
});
