/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O N F I G :  T H R E S H O L D S   S P E C  ░░░░░░░░░  ║
  ║                                                              ║
  ║   Covers clamp branches to lift global branch coverage.      ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect } from 'vitest';
import {
  getTypingTickMs,
  setTypingTickMs,
  getMinValidationWords,
  getMaxValidationWords,
  setValidationBandWords,
  getConfidenceSensitivity,
  setConfidenceSensitivity,
} from '../config/defaultThresholds';

describe('config/defaultThresholds clamps', () => {
  it('setTypingTickMs clamps to [10,500]', () => {
    setTypingTickMs(1);
    expect(getTypingTickMs()).toBe(10);
    setTypingTickMs(9999);
    expect(getTypingTickMs()).toBe(500);
    setTypingTickMs(75);
    expect(getTypingTickMs()).toBe(75);
  });

  it('setValidationBandWords enforces min/max and ordering', () => {
    setValidationBandWords(0, 100);
    expect(getMinValidationWords()).toBe(1);
    expect(getMaxValidationWords()).toBe(12);

    setValidationBandWords(6, 2);
    // Clamped to min≥1, max≥3, and ordered
    expect(getMinValidationWords()).toBe(3);
    expect(getMaxValidationWords()).toBe(5);

    // restore defaults for other tests
    setValidationBandWords(5, 5);
    expect(getMinValidationWords()).toBe(5);
    expect(getMaxValidationWords()).toBe(5);
  });

  it('setConfidenceSensitivity clamps to [0.1,5]', () => {
    setConfidenceSensitivity(0);
    expect(getConfidenceSensitivity()).toBeGreaterThanOrEqual(0.1);
    setConfidenceSensitivity(100);
    expect(getConfidenceSensitivity()).toBeLessThanOrEqual(5);
    setConfidenceSensitivity(1.6);
    expect(getConfidenceSensitivity()).toBeCloseTo(1.6, 5);
  });
});
