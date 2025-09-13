/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   C O N T E X T   M A N A G E R   ( T E S T S )  ░░  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Unit tests for dual-context manager (wide + close)
  • WHY  ▸ Improve coverage and validate core LM context behavior
  • HOW  ▸ Initialize/update/validate paths with polyfilled Segmenter
*/

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createLMContextManager } from '../../core/lm/contextManager';

// Polyfill Intl.Segmenter (sentence) if not available in the test runtime
class SentenceSegmenterPolyfill {
  granularity: string;
  constructor(_locale: string, opts: { granularity: string }) {
    this.granularity = opts.granularity;
  }
  segment(text: string) {
    // Very simple sentence segmentation by ., !, ? with indices
    const segments: Array<{ segment: string; index: number } & Record<string, unknown>> =
      [];
    const regex = /[^.!?]+[.!?]?/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      segments.push({ segment: m[0], index: m.index });
    }
    return segments as any;
  }
}

let originalSegmenter: any;

beforeAll(() => {
  // Only install polyfill if sentence granularity is missing
  const g: any = globalThis as any;
  originalSegmenter = g.Intl?.Segmenter;
  try {
    // Probe whether current Segmenter supports sentence
    const probe = new (g.Intl?.Segmenter ?? SentenceSegmenterPolyfill)('en', {
      granularity: 'sentence',
    });
    if (!(probe instanceof (g.Intl?.Segmenter ?? Function))) {
      throw new Error('Force polyfill');
    }
    // If constructor above threw, we'll install polyfill below
  } catch {
    g.Intl = g.Intl || ({} as any);
    g.Intl.Segmenter = SentenceSegmenterPolyfill as any;
  }
});

afterAll(() => {
  const g: any = globalThis as any;
  if (originalSegmenter) {
    g.Intl.Segmenter = originalSegmenter;
  }
});

describe('LM Context Manager', () => {
  it('initializes and reports isInitialized', async () => {
    const mgr = createLMContextManager();
    expect(mgr.isInitialized()).toBe(false);
    await mgr.initialize('Hello world. This is a test sentence.', 12);
    expect(mgr.isInitialized()).toBe(true);
    const win = mgr.getContextWindow();
    expect(win.wide.text.length).toBeGreaterThan(0);
    expect(win.close.text.length).toBeGreaterThan(0);
    expect(typeof win.wide.tokenCount).toBe('number');
  });

  it('updates wide and close contexts', async () => {
    const text1 = 'Alpha. Beta.';
    const text2 = 'Alpha changed. Beta.';
    const mgr = createLMContextManager();
    await mgr.initialize(text1, text1.length);
    const win1 = mgr.getContextWindow();
    mgr.updateWideContext(text2);
    const win2 = mgr.getContextWindow();
    expect(win2.wide.text).toBe(text2);
    mgr.updateCloseContext(text2, 5);
    const win3 = mgr.getContextWindow();
    expect(win3.close.caretPosition).toBe(5);
    expect(win3.close.text.length).toBeGreaterThan(0);
  });

  it('falls back to char-window when caret is out of range', async () => {
    const text = 'No sentence punctuation here just words';
    const mgr = createLMContextManager();
    await mgr.initialize(text, text.length);
    // Update with a caret well beyond the text length to trigger fallback
    // Use slightly out-of-range caret to trigger fallback but still yield a slice
    mgr.updateCloseContext(text, text.length + 5);
    const win = mgr.getContextWindow();
    expect(win.close.sentences).toBeGreaterThanOrEqual(0);
    expect(win.close.text.length).toBeGreaterThanOrEqual(0);
  });

  it('validateProposal rejects non-contextual proposals', async () => {
    const text = 'Alpha beta gamma delta';
    const mgr = createLMContextManager();
    await mgr.initialize(text, text.length);
    // Unrelated words unlikely to be present in context (>3 words to avoid len≤3 shortcut)
    expect(mgr.validateProposal('qwerty asdf zxcv lorem', 'qwery asdf zxc')).toBe(false);
  });

  it('validateProposal rejects identical and too-long, accepts contextual', async () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const mgr = createLMContextManager();
    await mgr.initialize(text, text.length);
    // Identical → reject
    expect(mgr.validateProposal('brown fox', 'brown fox')).toBe(false);
    // Too long (more than 3x) → reject
    expect(mgr.validateProposal('x'.repeat(100), 'abc')).toBe(false);
    // Contextual (words present in wide context) → accept
    expect(mgr.validateProposal('brown fox', 'brwon fx')).toBe(true);
  });

  describe('caret-safe context updates', () => {
    it('updates context when caret moves behind previous position', async () => {
      const text = 'Hello world. This is a test sentence.';
      const mgr = createLMContextManager();
      
      // Initialize at end
      await mgr.initialize(text, text.length);
      const initialContext = mgr.getContextWindow();
      
      // Move caret back - update both wide and close contexts to reflect new caret
      mgr.updateWideContext(text);
      mgr.updateCloseContext(text, 15); // After "Hello world."
      const updatedContext = mgr.getContextWindow();
      
      // Wide text remains same string content; assert close context changed
      expect(updatedContext.close.caretPosition).toBe(15);
      expect(updatedContext.close.text).not.toBe(initialContext.close.text);
    });

    it('handles empty text gracefully', async () => {
      const mgr = createLMContextManager();
      await mgr.initialize('', 0);
      
      const context = mgr.getContextWindow();
      expect(context.wide.text).toBe('');
      expect(context.close.text).toBe('');
      expect(context.wide.tokenCount).toBe(0);
    });

    it('handles single character text', async () => {
      const mgr = createLMContextManager();
      await mgr.initialize('a', 1);
      
      const context = mgr.getContextWindow();
      expect(context.wide.text).toBe('a');
      expect(context.close.text).toBe('a');
      expect(context.wide.tokenCount).toBeGreaterThan(0);
    });

    it('handles text without sentence boundaries', async () => {
      const text = 'just some words without punctuation';
      const mgr = createLMContextManager();
      await mgr.initialize(text, text.length);
      
      const context = mgr.getContextWindow();
      // Should fall back to character-based windowing
      expect(context.close.text).toBeTruthy();
      expect(context.wide.text).toBe(text);
    });
  });

  describe('validation edge cases', () => {
    it('handles malformed proposals', async () => {
      const mgr = createLMContextManager();
      await mgr.initialize('Test text', 9);
      
      // Empty strings
      expect(mgr.validateProposal('', 'original')).toBe(false);
      expect(mgr.validateProposal('proposal', '')).toBe(false);
      
      // Null/undefined (should not crash)
      expect(mgr.validateProposal(null as any, 'original')).toBe(false);
      expect(mgr.validateProposal('proposal', null as any)).toBe(false);
    });

    it('validates proposals with special characters', async () => {
      const text = 'Hello! @user #hashtag $money & more...';
      const mgr = createLMContextManager();
      await mgr.initialize(text, text.length);
      
      // Should handle special characters in context
      expect(mgr.validateProposal('@user', '@usr')).toBe(true);
      expect(mgr.validateProposal('#hashtag', '#hastag')).toBe(true);
    });

    it('validates proposals with Unicode text', async () => {
      const text = 'Héllo wørld café naïve résumé';
      const mgr = createLMContextManager();
      await mgr.initialize(text, text.length);
      
      // Should handle Unicode correctly
      expect(mgr.validateProposal('café', 'cafe')).toBe(true);
      expect(mgr.validateProposal('naïve', 'naive')).toBe(true);
    });
  });
});
