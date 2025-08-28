/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   B E H A V I O R   P O L I C Y  —  M O R E   ░░░░░  ║
  ║                                                              ║
  ║   Covers early-returns and post-process branches.            ║
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

function cfg(overrides: Partial<LMBehaviorConfig> = {}): LMBehaviorConfig {
  return { ...defaultLMBehaviorConfig, ...overrides };
}

describe('LM behavior policy (additional coverage)', () => {
  it('returns null band/prompt when span shorter than minSpanChars', () => {
    const text = 'Hi';
    const caret = 2;
    const res = selectSpanAndPrompt(text, caret, cfg({ minSpanChars: 3 }));
    expect(res.band).toBeNull();
    expect(res.prompt).toBeNull();
  });

  it('returns null when span exceeds maxSpanChars', () => {
    const text = 'This is a fairly long span to exceed the cap.';
    const caret = text.length;
    const res = selectSpanAndPrompt(text, caret, cfg({ maxSpanChars: 5 }));
    expect(res.band).toBeNull();
  });

  it('returns null when enforceWordBoundaryAtEnd and span ends with word char', () => {
    const text = 'Hello world';
    const caret = text.length; // ends with 'd' (word char)
    const res = selectSpanAndPrompt(text, caret, cfg({ minSpanChars: 1 }));
    expect(res.band).toBeNull();
  });

  it('postProcessLMOutput strips quotes and clamps length', () => {
    const raw = '"Hello world this output should be clamped"';
    const processed = postProcessLMOutput(raw, 5, defaultLMBehaviorConfig);
    expect(processed.startsWith('Hello')).toBe(true);
    expect(processed.length).toBeLessThanOrEqual(Math.max(Math.ceil(5 * 2), 24));
  });
});
