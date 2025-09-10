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

import { describe, it, expect } from 'vitest';
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
});
