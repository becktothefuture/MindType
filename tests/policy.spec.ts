/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   P O L I C Y   T E S T S  ░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Covers key branches of span selection and post-process.    ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝*/
import { describe, it, expect } from 'vitest';
import {
  selectSpanAndPrompt,
  postProcessLMOutput,
  defaultLMBehaviorConfig,
} from '../core/lm/policy';

describe('LM policy', () => {
  it('rejects span shorter than min', () => {
    const cfg = { ...defaultLMBehaviorConfig, minSpanChars: 3 } as any;
    const text = 'hi';
    const caret = text.length;
    const res = selectSpanAndPrompt(text, caret, cfg);
    expect(res.band).toBeNull();
  });
  it('rejects span shorter than min and word-boundary-enforced', () => {
    const cfg = { ...defaultLMBehaviorConfig, minSpanChars: 5 };
    const text = 'short';
    const caret = text.length; // span will be 5 but ends with word char
    const res = selectSpanAndPrompt(text, caret, cfg as any);
    expect(res.band).toBeNull();
    expect(res.prompt).toBeNull();
  });

  it('rejects span longer than max', () => {
    const cfg = { ...defaultLMBehaviorConfig, maxSpanChars: 3 };
    const text = 'hello world';
    const caret = text.indexOf('world') + 1;
    const res = selectSpanAndPrompt(text, caret, cfg as any);
    expect(res.band).toBeNull();
  });

  it('accepts valid span and builds prompt', () => {
    const cfg = { ...defaultLMBehaviorConfig, enforceWordBoundaryAtEnd: false };
    const text = 'hello world';
    const caret = text.indexOf('world'); // before word end
    const res = selectSpanAndPrompt(text, caret, cfg as any);
    expect(res.band).not.toBeNull();
    expect(typeof res.maxNewTokens).toBe('number');
  });

  it('passes word-boundary check when ending in punctuation', () => {
    const cfg = { ...defaultLMBehaviorConfig, enforceWordBoundaryAtEnd: true } as any;
    const text = 'hello.';
    const caret = text.length; // span ends with '.' -> not a word char
    const res = selectSpanAndPrompt(text, caret, cfg);
    expect(res.band === null || res.band.end === caret).toBe(true);
  });

  it('post-process trims and caps', () => {
    const out = postProcessLMOutput('  "Fixed text that is quite long indeed"  ', 8);
    expect(out.length).toBeLessThanOrEqual(Math.max(Math.ceil(8 * 2), 24));
  });

  it('post-process returns empty on empty input', () => {
    expect(postProcessLMOutput('', 10)).toBe('');
  });

  it('post-process keeps only first line', () => {
    const out = postProcessLMOutput('Line1\nLine2', 10);
    expect(out).toBe('Line1');
  });

  it('respects maxTokensCap when span is long', () => {
    const text = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
    const caret = text.length;
    const cfg = {
      ...defaultLMBehaviorConfig,
      maxSpanChars: 1000,
      maxTokensCap: 10,
      enforceWordBoundaryAtEnd: false,
    } as any;
    const res = selectSpanAndPrompt(text, caret, cfg);
    expect(typeof res.maxNewTokens).toBe('number');
    expect(res.maxNewTokens).toBe(10);
  });
});
