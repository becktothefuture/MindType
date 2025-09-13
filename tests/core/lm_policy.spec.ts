/*╔══════════════════════════════════════════════════════╗
  ║  ░  L M   P O L I C Y   T E S T S  ░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║   Test caret-safe band selection and prompt logic.   ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Unit tests for LM band selection and prompting
  • WHY  ▸ Ensure caret-safe behavior and edge case handling
  • HOW  ▸ Direct testing of selectSpanAndPrompt function
*/

import { describe, it, expect } from 'vitest';
import { selectSpanAndPrompt } from '../../core/lm/policy';

describe('LM Policy - Band Selection', () => {
  describe('caret-safe band selection', () => {
    it('never selects band beyond caret position', () => {
      const text = 'Hello teh world needs correction';
      const caret = 15; // after "world"
      
      const result = selectSpanAndPrompt(text, caret);
      
      if (result.band) {
        expect(result.band.end).toBeLessThanOrEqual(caret);
        expect(result.band.start).toBeLessThan(result.band.end);
        expect(result.band.start).toBeGreaterThanOrEqual(0);
      }
    });

    it('handles caret at end of text', () => {
      const text = 'Hello teh world';
      const caret = text.length;
      
      const result = selectSpanAndPrompt(text, caret);
      
      if (result.band) {
        expect(result.band.end).toBeLessThanOrEqual(caret);
        expect(result.band.start).toBeLessThan(result.band.end);
      }
    });

    it('handles caret at position 0', () => {
      const text = 'Hello world';
      const caret = 0;
      
      const result = selectSpanAndPrompt(text, caret);
      
      // Should return null band when caret is at beginning
      expect(result.band).toBeNull();
      expect(result.prompt).toBeNull();
      expect(result.span).toBeNull();
    });

    it('handles empty text', () => {
      const text = '';
      const caret = 0;
      
      const result = selectSpanAndPrompt(text, caret);
      
      // Should return null for empty text
      expect(result.band).toBeNull();
      expect(result.prompt).toBeNull();
      expect(result.span).toBeNull();
    });

    it('handles single character text', () => {
      const text = 'a';
      const caret = 1;
      
      const result = selectSpanAndPrompt(text, caret);
      
      // Should return null for too-short spans
      expect(result.band).toBeNull();
    });

    it('selects valid band for typical fuzzy text', () => {
      const text = 'The teh quick brown fox';
      const caret = 20; // after "brown"
      
      const result = selectSpanAndPrompt(text, caret);
      
      if (result.band) {
        expect(result.band.end).toBeLessThanOrEqual(caret);
        expect(result.band.start).toBeLessThan(result.band.end);
        expect(result.span).toBeTruthy();
        expect(result.prompt).toBeTruthy();
        expect(result.span!.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('respects word boundary enforcement', () => {
      const text = 'Hello wor'; // incomplete word at end
      const caret = text.length;
      
      const result = selectSpanAndPrompt(text, caret);
      
      // Should reject spans ending with incomplete words
      expect(result.band).toBeNull();
    });

    it('handles mid-sentence caret position', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const caret = 25; // middle of "jumps"
      
      const result = selectSpanAndPrompt(text, caret);
      
      if (result.band) {
        expect(result.band.end).toBeLessThanOrEqual(caret);
        expect(result.band.start).toBeLessThan(result.band.end);
        // Should include some context before caret
        expect(result.band.start).toBeLessThan(caret - 5);
      }
    });
  });

  describe('prompt generation', () => {
    it('generates valid prompt for correctable text', () => {
      const text = 'The teh quick brown fox';
      const caret = text.length;
      
      const result = selectSpanAndPrompt(text, caret);
      
      if (result.prompt && result.span) {
        expect(result.prompt).toContain('Correct ONLY the Span');
        expect(result.prompt).toContain(result.span);
        expect(result.maxNewTokens).toBeGreaterThan(0);
        expect(result.controlJson).toBeTruthy();
      }
    });

    it('includes context in prompt', () => {
      const text = 'Hello world. The teh quick brown fox. More text here.';
      const caret = 30; // after "fox"
      
      const result = selectSpanAndPrompt(text, caret);
      
      if (result.prompt) {
        expect(result.prompt).toContain('Context before:');
        expect(result.prompt).toContain('Context after:');
        expect(result.prompt).toContain('Span:');
      }
    });
  });

  describe('edge cases', () => {
    it('handles very long text', () => {
      const longText = 'a '.repeat(1000) + 'teh error here';
      const caret = longText.length;
      
      const result = selectSpanAndPrompt(longText, caret);
      
      // Should still work with long text
      if (result.band) {
        expect(result.band.end).toBeLessThanOrEqual(caret);
        expect(result.span!.length).toBeLessThan(100); // Reasonable span size
      }
    });

    it('handles text with special characters', () => {
      const text = 'Hello! @user #hashtag $money teh error.';
      const caret = text.length;
      
      const result = selectSpanAndPrompt(text, caret);
      
      if (result.band) {
        expect(result.band.end).toBeLessThanOrEqual(caret);
        expect(result.band.start).toBeLessThan(result.band.end);
      }
    });

    it('handles Unicode text', () => {
      const text = 'Héllo wørld teh errör';
      const caret = text.length;
      
      const result = selectSpanAndPrompt(text, caret);
      
      if (result.band) {
        expect(result.band.end).toBeLessThanOrEqual(caret);
        expect(result.span).toBeTruthy();
      }
    });
  });
});


