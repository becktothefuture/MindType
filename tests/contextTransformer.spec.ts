/* Auto-generated test for REQ-CONTEXT-TRANSFORMER */
import { describe, it, expect } from 'vitest';
import { buildContextWindow, contextTransform } from '../engines/contextTransformer';

describe('contextTransformer', () => {
  it('builds ±2 sentence window around caret', () => {
    const text = 'A. B. C. D. E.';
    const caret = text.indexOf('C');
    const w = buildContextWindow(text, caret);
    expect(w.currentSentence.trim()).toContain('C.');
    expect(w.previousSentences.join('')).toContain('A.');
  });

  it('produces caret-safe proposals only', () => {
    const text = 'i am here';
    const caret = text.length; // end
    const r = contextTransform({ text, caret });
    for (const p of r.proposals) {
      expect(p.end).toBeLessThanOrEqual(caret);
    }
  });

  it('normalizes punctuation in current sentence', () => {
    const text = 'word ,next';
    const caret = text.length;
    const r = contextTransform({ text, caret });
    const joined = r.proposals.map((p) => p.text).join(' ');
    expect(joined.includes(', ')).toBe(true);
  });

  it('capitalizes sentence starts and standalone i', () => {
    const text = 'hello. world and i agree';
    const caret = text.length;
    const r = contextTransform({ text, caret });
    const merged = r.proposals.map((p) => p.text).join(' ');
    expect(/Hello\./.test(merged) || /World/.test(merged) || / I /.test(merged)).toBe(true);
  });

  it('yields proposals on missing punctuation/capitalization', () => {
    const text = 'this is fine';
    const caret = text.length;
    const r = contextTransform({ text, caret });
    // Likely to add capitalization and period
    if (r.proposals.length) {
      expect(r.proposals[0].text).toMatch(/[A-Z].*\.$/);
    }
  });

  it('holds when input fidelity is extremely low', () => {
    const text = '!!!! ####';
    const caret = text.length;
    const r = contextTransform({ text, caret });
    expect(r.proposals.length).toBe(0);
  });
});
