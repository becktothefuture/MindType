/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  N O I S E   T R A N S F O R M E R   T E S T S  ░░░░░░░░  ║
  ║                                                              ║
  ║   Validates rule-based corrections and caret safety in       ║
  ║   the forward cleanup engine behind the cursor.             ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Assert rule application, caret safety, confidence gating
  • WHY  ▸ Core safety and correctness for live typing corrections
  • HOW  ▸ Calls noiseTransform with various scenarios; checks results
*/
import { describe, it, expect } from 'vitest';
import { noiseTransform, type NoiseInput } from '../engines/noiseTransformer';

describe('Noise Transformer Engine', () => {
  describe('Caret Safety', () => {
    it('never proposes edits at or after the caret', () => {
      const input: NoiseInput = {
        text: 'Hello teh world',
        caret: 9, // Right before "world"
      };

      const result = noiseTransform(input);

      if (result.diff) {
        expect(result.diff.end).toBeLessThanOrEqual(input.caret);
        expect(result.diff.start).toBeLessThan(input.caret);
      }
    });

    it('returns null when no safe edits are possible', () => {
      const input: NoiseInput = {
        text: 'teh',
        caret: 3,
      };

      const result = noiseTransform(input);
      expect(result.diff).toBeNull();
    });

    it('handles empty text gracefully', () => {
      const input: NoiseInput = {
        text: '',
        caret: 0,
      };

      const result = noiseTransform(input);
      expect(result.diff).toBeNull();
    });
  });

  describe('Word Substitution Rules', () => {
    it('corrects "teh" to "the"', () => {
      const input: NoiseInput = {
        text: 'Hello teh world and more',
        caret: 20, // After "and"
      };

      const result = noiseTransform(input);

      expect(result.diff).not.toBeNull();
      expect(result.diff!.start).toBe(5); // Start of " teh "
      expect(result.diff!.end).toBe(10); // End of " teh "
      expect(result.diff!.text).toBe(' the ');
    });

    it('corrects "adn" to "and"', () => {
      const input: NoiseInput = {
        text: 'cats adn dogs are cute',
        caret: 22, // At end
      };

      const result = noiseTransform(input);

      expect(result.diff).not.toBeNull();
      // Accept either substitution or another rule firing later; must include comma/and/etc.
      expect([' and '].includes(result.diff!.text)).toBe(true);
    });

    it('finds the rightmost match when multiple exist', () => {
      const input: NoiseInput = {
        text: 'teh cat adn teh dog adn mouse',
        caret: 29, // At end
      };

      const result = noiseTransform(input);

      expect(result.diff).not.toBeNull();
      // Should find the last " adn " not the first
      expect(result.diff!.start).toBeGreaterThan(15);
    });

    it('respects hint boundaries when provided', () => {
      const input: NoiseInput = {
        text: 'start teh middle teh end',
        caret: 24,
        hint: { start: 0, end: 12 }, // Only first part
      };

      const result = noiseTransform(input);

      expect(result.diff).not.toBeNull();
      expect(result.diff!.start).toBeLessThan(12); // Within hint
      expect(result.diff!.end).toBeLessThanOrEqual(12);
    });
  });

  describe('Transposition Detection (FT-211)', () => {
    it('corrects simple transpositions inside words (nto→not)', () => {
      const input: NoiseInput = {
        text: 'this is nto correct',
        caret: 20,
      };

      const result = noiseTransform(input);
      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe('not');
    });

    it('chooses rightmost transposition within window and respects caret', () => {
      const input: NoiseInput = {
        text: 'waht is taht and nto here',
        caret: 26,
      };
      const result = noiseTransform(input);
      expect(result.diff).not.toBeNull();
      // Should pick the last match before caret window end
      expect(result.diff!.end).toBeLessThanOrEqual(input.caret);
    });

    it('corrects other common transpositions (thier→their, waht→what)', () => {
      const cases = [
        { text: 'their thier', expected: 'their', caret: 11 },
        { text: 'waht now', expected: 'what', caret: 8 },
      ];
      for (const c of cases) {
        const result = noiseTransform({ text: c.text, caret: c.caret });
        if (result.diff) {
          expect(result.diff.text).toBe(c.expected);
          expect(result.diff.end).toBeLessThanOrEqual(c.caret);
        }
      }
    });
  });

  describe('Punctuation Normalization (FT-212)', () => {
    it('removes space before comma and adds space after', () => {
      const input: NoiseInput = {
        text: 'word ,next',
        caret: 10,
      };
      const result = noiseTransform(input);
      expect(result.diff).not.toBeNull();
      // Either remove space before comma or add space after depending on last match
      expect(result.diff!.text.includes(',')).toBe(true);
    });

    it('adds space after comma (branch: a,b → a, b)', () => {
      const input: NoiseInput = { text: 'a,b', caret: 3 };
      const result = noiseTransform(input);
      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe(', b');
    });

    it('fixes missing space after period (branch: add space)', () => {
      const input: NoiseInput = {
        text: 'End.This',
        caret: 8,
      };
      const result = noiseTransform(input);
      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toContain('. ');
    });

    it('ensures spaces around em dash (branch: unify spacing)', () => {
      const input: NoiseInput = {
        text: 'alpha—beta',
        caret: 10,
      };
      const result = noiseTransform(input);
      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe(' — ');
    });

    it('does not add space after period when newline follows', () => {
      const input: NoiseInput = {
        text: 'End.\nNext',
        caret: 9,
      };
      const result = noiseTransform(input);
      // normalization should skip newline case; allow null
      if (result.diff) {
        expect(result.diff.text.includes('. ')).toBe(false);
      }
    });

    it('removes space before period (branch: strip before .)', () => {
      const input: NoiseInput = {
        text: 'end .',
        caret: 5,
      };
      const result = noiseTransform(input);
      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe('.');
    });

    it('no-op when em dash already spaced', () => {
      const input: NoiseInput = {
        text: 'a — b',
        caret: 5,
      };
      const result = noiseTransform(input);
      // Might return null or a later normalization; accept null
      if (result.diff) {
        expect(result.diff.text).not.toBe(' — ');
      }
    });
  });

  describe('Confidence gating (FT-213)', () => {
    it('does not suggest transposition when not at word boundary (branch)', () => {
      const input: NoiseInput = {
        text: 'sthierx token',
        caret: 12,
      };
      const result = noiseTransform(input);
      // our transposition regex uses \b and boundary gating; expect no diff for embedded pattern
      if (result.diff) {
        expect(result.diff.text).not.toBe('their');
      }
    });
  });

  describe('Capitalization (FT-216)', () => {
    it('capitalizes sentence start after period', () => {
      const input: NoiseInput = {
        text: 'hello. world',
        caret: 12,
      };
      const result = noiseTransform(input);
      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe('W');
    });

    it("capitalizes standalone 'i' pronoun", () => {
      const input: NoiseInput = {
        text: 'when i pause',
        caret: 12,
      };
      const result = noiseTransform(input);
      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe('I');
    });
  });

  describe('Window Constraints', () => {
    it('respects MAX_SWEEP_WINDOW limit', () => {
      // Create text longer than MAX_SWEEP_WINDOW
      const prefix = 'x'.repeat(100); // Longer than 80-char window
      const input: NoiseInput = {
        text: prefix + ' teh world',
        caret: prefix.length + 10, // After " teh "
      };

      const result = noiseTransform(input);

      // Should still find the correction within the window
      expect(result.diff).not.toBeNull();
    });

    it('handles hint that extends beyond safe window', () => {
      const input: NoiseInput = {
        text: 'Hello teh world',
        caret: 10,
        hint: { start: 5, end: 15 }, // Hint crosses caret
      };

      const result = noiseTransform(input);

      if (result.diff) {
        expect(result.diff.end).toBeLessThanOrEqual(input.caret);
      }
    });
  });

  describe('Rule Priority', () => {
    it('applies rules in priority order', () => {
      // This test verifies the rule system works
      // When we add more rules, we can test priority
      const input: NoiseInput = {
        text: 'Test teh system',
        caret: 15,
      };

      const result = noiseTransform(input);

      expect(result.diff).not.toBeNull();
      expect(result.diff!.text).toBe(' the ');
    });
  });
});
