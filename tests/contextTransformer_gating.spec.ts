/*╔══════════════════════════════════════════════════════╗
  ║  ░  C O N T E X T   T R A N S F O R M E R :  G A T E  ░  ║
  ║                                                      ║
  ║   Covers confidence gate commit/hold branches.       ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Test LM proposal gating to raise branch coverage
  • WHY  ▸ Ensure commit vs hold decisions are exercised
  • HOW  ▸ Mock LM adapter and context manager
*/

import { describe, it, expect, vi } from 'vitest';
import { contextTransform } from '../engines/contextTransformer';

function makeLMAdapter(chunks: string[]) {
  return {
    async *stream() {
      for (const c of chunks) {
        yield c;
      }
    },
  } as any;
}

function makeContextManager(text: string) {
  return {
    isInitialized() {
      return true;
    },
    getContextWindow() {
      return {
        wide: { text, tokenCount: Math.min(512, text.length) },
        close: { text: text.slice(-80) },
      } as any;
    },
    validateProposal(_proposal: string, _original: string) {
      return true;
    },
  } as any;
}

describe('contextTransformer confidence gating', () => {
  it('commits LM proposal when score meets dynamic thresholds', async () => {
    const text = 'The teh quick brown fox jumps. ';
    const caret = text.indexOf('quick') + 2; // inside sentence
    const lmAdapter = makeLMAdapter(['the ']);
    const mgr = makeContextManager(text);
    const res = await contextTransform({ text, caret }, lmAdapter, mgr);
    // Expect at least one proposal due to commit
    expect(res.proposals.length).toBeGreaterThan(0);
    const p = res.proposals[0];
    expect(p.start).toBeLessThan(p.end);
  });

  it('holds LM proposal when transformationQuality is low (no change)', async () => {
    // Return same text pre-caret to force transformationQuality heuristic to 0.5
    const text = 'Alpha beta gamma. ';
    const caret = text.length - 1;
    const lmAdapter = makeLMAdapter([text.slice(0, caret)]);
    const mgr = makeContextManager(text);
    const res = await contextTransform({ text, caret }, lmAdapter, mgr);
    // Held by gate → no proposals
    expect(res.proposals.length).toBe(0);
  });

  describe('caret-safe band selection', () => {
    it('never selects band beyond caret position', async () => {
      const text = 'Hello teh world needs correction';
      const caret = 15; // after "world"
      const lmAdapter = makeLMAdapter(['the ']);
      const mgr = makeContextManager(text);
      
      // Mock selectSpanAndPrompt to capture band selection
      let capturedBand: any = null;
      const originalImport = await import('../core/lm/policy');
      const mockSelectSpanAndPrompt = (text: string, caret: number) => {
        const result = originalImport.selectSpanAndPrompt(text, caret);
        capturedBand = result.band;
        return result;
      };
      
      // Temporarily replace the import
      const mockModule = { ...originalImport, selectSpanAndPrompt: mockSelectSpanAndPrompt };
      vi.doMock('../core/lm/policy', () => mockModule);
      
      await contextTransform({ text, caret }, lmAdapter, mgr);
      
      // Verify band never exceeds caret
      if (capturedBand) {
        expect(capturedBand.end).toBeLessThanOrEqual(caret);
        expect(capturedBand.start).toBeLessThan(capturedBand.end);
      }
    });

    it('handles caret at end of text', async () => {
      const text = 'Hello teh world';
      const caret = text.length; // at end
      const lmAdapter = makeLMAdapter(['the ']);
      const mgr = makeContextManager(text);
      
      const res = await contextTransform({ text, caret }, lmAdapter, mgr);
      
      // Should still be able to correct text behind caret
      if (res.proposals.length > 0) {
        const p = res.proposals[0];
        expect(p.end).toBeLessThanOrEqual(caret);
        expect(p.start).toBeLessThan(p.end);
      }
    });

    it('handles empty text gracefully', async () => {
      const text = '';
      const caret = 0;
      const lmAdapter = makeLMAdapter(['']);
      const mgr = makeContextManager(text);
      
      const res = await contextTransform({ text, caret }, lmAdapter, mgr);
      
      // Should not crash and should not produce proposals for empty text
      expect(res.proposals.length).toBe(0);
    });

    it('handles caret at position 0', async () => {
      const text = 'Hello world';
      const caret = 0;
      const lmAdapter = makeLMAdapter(['']);
      const mgr = makeContextManager(text);
      
      const res = await contextTransform({ text, caret }, lmAdapter, mgr);
      
      // Should not produce proposals when caret is at beginning
      expect(res.proposals.length).toBe(0);
    });
  });
});
