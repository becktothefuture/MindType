/*╔══════════════════════════════════════════════════════╗
  ║  ░  A C T I V E   R E G I O N   P O L I C Y   V 0 6  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Test v0.6 Active Region Policy: size, clamps, grapheme, caret safety
  • WHY  ▸ Validate single configurable region with burst growth
  • HOW  ▸ Unit tests for boundaries, Unicode safety, burst logic
*/

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defaultActiveRegionPolicy } from '../core/activeRegionPolicy';
import { setActiveRegionWords, getActiveRegionWords } from '../config/defaultThresholds';
import { isGraphemeBoundary, alignToGraphemeBoundaries, isCaretSafe } from '../utils/grapheme';

describe('ActiveRegionPolicy v0.6', () => {
  const originalWords = getActiveRegionWords();
  
  beforeEach(() => {
    setActiveRegionWords(20); // Reset to default
  });
  
  afterEach(() => {
    setActiveRegionWords(originalWords); // Restore
  });

  describe('configurable size and clamps', () => {
    it('uses default 20 words', () => {
      const state = {
        text: 'The quick brown fox jumps over the lazy dog and runs through the forest with great speed and agility.',
        caret: 95,
        frontier: 0,
      };
      
      const range = defaultActiveRegionPolicy.computeRenderRange(state);
      expect(range.end).toBe(95); // At caret
      
      if (range.start < range.end) {
        expect(range.start).toBeGreaterThanOrEqual(0); // Valid start
        
        // Count words in range
        const text = state.text.slice(range.start, range.end);
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        expect(wordCount).toBeLessThanOrEqual(20);
        expect(wordCount).toBeGreaterThan(0); // Should have some words
      }
    });

    it('respects size configuration changes', () => {
      setActiveRegionWords(5);
      
      const state = {
        text: 'One two three four five six seven eight nine ten eleven twelve.',
        caret: 63,
        frontier: 0,
      };
      
      const range = defaultActiveRegionPolicy.computeRenderRange(state);
      const text = state.text.slice(range.start, range.end);
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      expect(wordCount).toBeLessThanOrEqual(5);
    });

    it('clamps size to reasonable bounds', () => {
      setActiveRegionWords(100); // Too large
      expect(getActiveRegionWords()).toBe(50); // Clamped to max
      
      setActiveRegionWords(1); // Too small
      expect(getActiveRegionWords()).toBe(5); // Clamped to min
    });
  });

  describe('grapheme-safe boundaries', () => {
    it('detects grapheme boundaries correctly', () => {
      const text = 'Hello 👋🏽 world';
      expect(isGraphemeBoundary(text, 0)).toBe(true); // Start
      expect(isGraphemeBoundary(text, 6)).toBe(true); // Before emoji
      expect(isGraphemeBoundary(text, 7)).toBe(false); // Inside emoji sequence
      expect(isGraphemeBoundary(text, 10)).toBe(true); // After emoji
      expect(isGraphemeBoundary(text, text.length)).toBe(true); // End
    });

    it('aligns ranges to grapheme boundaries', () => {
      const text = 'Test 👨‍👩‍👧‍👦 family';
      const { start, end } = alignToGraphemeBoundaries(text, 6, 17); // Inside family emoji
      
      expect(isGraphemeBoundary(text, start)).toBe(true);
      expect(isGraphemeBoundary(text, end)).toBe(true);
      expect(start).toBeLessThanOrEqual(6);
      expect(end).toBeGreaterThanOrEqual(17);
    });

    it('handles combining characters safely', () => {
      const text = 'café résumé'; // é with combining accent
      const state = {
        text,
        caret: text.length,
        frontier: 0,
      };
      
      const range = defaultActiveRegionPolicy.computeRenderRange(state);
      expect(isGraphemeBoundary(text, range.start)).toBe(true);
      expect(isGraphemeBoundary(text, range.end)).toBe(true);
    });
  });

  describe('caret safety', () => {
    it('never includes caret position', () => {
      const state = {
        text: 'Never edit at caret position',
        caret: 15,
        frontier: 0,
      };
      
      const range = defaultActiveRegionPolicy.computeRenderRange(state);
      expect(isCaretSafe(range.start, range.end, state.caret)).toBe(true);
      expect(range.end).toBeLessThanOrEqual(state.caret);
    });

    it('returns empty range when not caret-safe', () => {
      const state = {
        text: 'Test',
        caret: 2,
        frontier: 0,
      };
      
      // Force a range that would cross caret
      const range = defaultActiveRegionPolicy.computeRenderRange(state);
      if (range.end > state.caret) {
        expect(range.start).toBe(state.caret);
        expect(range.end).toBe(state.caret);
      }
    });

    it('handles caret at position 0', () => {
      const state = {
        text: 'Some text',
        caret: 0,
        frontier: 0,
      };
      
      const range = defaultActiveRegionPolicy.computeRenderRange(state);
      expect(range.start).toBe(0);
      expect(range.end).toBe(0);
    });
  });

  describe('burst growth logic', () => {
    it('expands region during active typing bursts', () => {
      const now = Date.now();
      const longText = 'This is a very long sentence with many words that should definitely trigger burst growth when typing rapidly and continuously without stopping for a long time with lots of additional words to ensure we have more than twenty words available for the burst expansion logic to work correctly and demonstrate the feature properly.';
      const state = {
        text: longText,
        caret: longText.length,
        frontier: 0,
        lastTypingTime: now - 100, // Recent typing
        burstStartTime: now - 1000, // Sustained burst
        burstKeyCount: 10, // Enough keys
      };
      
      const range = defaultActiveRegionPolicy.computeRenderRange(state);
      const text = state.text.slice(range.start, range.end);
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      
      // Should be larger than base 20 words during burst
      expect(wordCount).toBeGreaterThan(20);
      expect(wordCount).toBeLessThanOrEqual(30); // But clamped
    });

    it('uses normal size when not in burst', () => {
      const now = Date.now();
      const state = {
        text: 'Normal typing without burst behavior.',
        caret: 36,
        frontier: 0,
        lastTypingTime: now - 1000, // Old typing
        burstStartTime: now - 2000,
        burstKeyCount: 3, // Not enough keys
      };
      
      const range = defaultActiveRegionPolicy.computeRenderRange(state);
      const text = state.text.slice(range.start, range.end);
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      
      // Should use normal size
      expect(wordCount).toBeLessThanOrEqual(20);
    });
  });

  describe('single Active Region (v0.6)', () => {
    it('returns same range for render and context', () => {
      const state = {
        text: 'Single Active Region for both render and context in v0.6.',
        caret: 56,
        frontier: 0,
      };
      
      const renderRange = defaultActiveRegionPolicy.computeRenderRange(state);
      const contextRange = defaultActiveRegionPolicy.computeContextRange(state);
      
      expect(renderRange.start).toBe(contextRange.start);
      expect(renderRange.end).toBe(contextRange.end);
    });
  });
});
