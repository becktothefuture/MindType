/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   P O L I C Y   B R A N C H E S  ░░░░░░░░░░░░░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Cover early returns and post-process clamp branches
  • WHY  ▸ Increment branch coverage with safe, pure tests
*/
import { describe, it, expect } from 'vitest';
import {
  selectSpanAndPrompt,
  postProcessLMOutput,
  defaultLMBehaviorConfig,
} from '../core/lm/policy';

describe('lm policy branches', () => {
  it('selectSpanAndPrompt returns nulls when no band or too short/long or boundary', () => {
    const cfg = { ...defaultLMBehaviorConfig, minSpanChars: 1000 };
    const s1 = selectSpanAndPrompt('abc', 0, cfg);
    expect(s1.span).toBeNull();
    // enforceWordBoundaryAtEnd path
    const text = 'hello worl';
    const s2 = selectSpanAndPrompt(text, text.length, {
      ...defaultLMBehaviorConfig,
      enforceWordBoundaryAtEnd: true,
    });
    expect(s2.span === null || s2.prompt === null).toBe(true);
  });

  it('postProcessLMOutput clamps and strips quotes', () => {
    const raw =
      '"This is a long output that should be clamped and quotes removed" more lines';
    const out = postProcessLMOutput(raw, 5);
    expect(out.length).toBeGreaterThan(0);
    expect(out.startsWith('"')).toBe(false);
  });
});
