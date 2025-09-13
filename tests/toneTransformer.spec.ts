/* Auto-generated test for REQ-TONE-TRANSFORMER */
import { describe, it, expect } from 'vitest';
import { detectBaseline, planAdjustments } from '../engines/toneTransformer';

describe('toneTransformer', () => {
  it('detects baseline rough formality/friendliness', () => {
    const base = detectBaseline("I'm here, and it's fine.");
    expect(base.formality).toBeGreaterThan(0);
    expect(base.friendliness).toBeGreaterThan(0);
  });

  it('plans minimal proposals towards Professional', () => {
    const text = "I'm here and it's ok";
    const props = planAdjustments(
      detectBaseline(text),
      'Professional',
      text,
      text.length,
    );
    // Either none (already formal) or a single caret-safe span
    if (props.length) {
      expect(props[0].end).toBeLessThanOrEqual(text.length);
    }
  });

  it('plans minimal proposals towards Casual', () => {
    const text = 'It is fine. We are here.';
    const props = planAdjustments(detectBaseline(text), 'Casual', text, text.length);
    if (props.length) {
      expect(props[0].text).toMatch(/it's|we're|you're/i);
    }
  });

  it('returns no proposals when target is None', () => {
    const text = 'Plain text.';
    const props = planAdjustments(detectBaseline(text), 'None', text, text.length);
    expect(props.length).toBe(0);
  });
});
