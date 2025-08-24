/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   P O L I C Y   B R A N C H E S   ( T E S T S )  ░░  ║
  ║                                                              ║
  ║   Exercises short/long spans, word-boundary guard, and       ║
  ║   post-processing clamps to raise branch coverage.           ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/

import { describe, it, expect } from 'vitest';
import {
  selectSpanAndPrompt,
  defaultLMBehaviorConfig,
  postProcessLMOutput,
  type LMBehaviorConfig,
} from '../core/lm/policy';

describe('LM policy branches', () => {
  it('returns null when span is shorter than minSpanChars', () => {
    const text = 'hi';
    const caret = text.length;
    const res = selectSpanAndPrompt(text, caret);
    expect(res.band).toBeNull();
    expect(res.prompt).toBeNull();
  });

  it('returns null when span exceeds maxSpanChars', () => {
    const text = 'hello world';
    const caret = text.length;
    const cfg: LMBehaviorConfig = { ...defaultLMBehaviorConfig, maxSpanChars: 1 };
    const res = selectSpanAndPrompt(text, caret, cfg);
    expect(res.band).toBeNull();
  });

  it('enforces word-boundary-at-end guard', () => {
    const text = 'abc';
    const caret = 3;
    const res = selectSpanAndPrompt(text, caret, defaultLMBehaviorConfig);
    expect(res.band).toBeNull();
  });

  it('postProcess trims quotes, first line, and clamps length', () => {
    const raw = '"hello"\nignore this line completely';
    const out = postProcessLMOutput(raw, 5);
    expect(out).toBe('hello');

    const long = 'x'.repeat(200);
    const capped = postProcessLMOutput(long, 10);
    expect(capped.length).toBeGreaterThan(0);
    expect(capped.length).toBeLessThanOrEqual(Math.max(Math.ceil(10 * 2), 24));
  });

  it('returns empty selection when band cannot be computed', () => {
    const res = selectSpanAndPrompt('', 0);
    expect(res.band).toBeNull();
    expect(res.prompt).toBeNull();
    expect(res.maxNewTokens).toBe(0);
  });

  it('allows span ending mid-word when boundary enforcement disabled', () => {
    const cfg: LMBehaviorConfig = {
      ...defaultLMBehaviorConfig,
      enforceWordBoundaryAtEnd: false,
    };
    const text = 'abc';
    const caret = 3; // at end, mid-word by default
    const res = selectSpanAndPrompt(text, caret, cfg);
    expect(res.band).not.toBeNull();
    expect(typeof res.prompt).toBe('string');
    expect(res.maxNewTokens).toBeGreaterThan(0);
  });
});
