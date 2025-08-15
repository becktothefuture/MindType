/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D E F A U L T   T H R E S H O L D S   T E S T S  ░░░░░░  ║
  ║                                                              ║
  ║   Ensures getters/setters clamp and enforce invariants.      ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Validate runtime-tunable thresholds behave correctly
  • WHY  ▸ Avoid unsafe values affecting timing and band size
  • HOW  ▸ Exercise clamping paths and min≤max enforcement
*/

import { describe, it, expect } from 'vitest';
import {
  getTypingTickMs,
  setTypingTickMs,
  getMinValidationWords,
  getMaxValidationWords,
  setValidationBandWords,
} from '../config/defaultThresholds';

describe('defaultThresholds', () => {
  it('clamps typing tick within 10..500 ms', () => {
    setTypingTickMs(5);
    expect(getTypingTickMs()).toBe(10);

    setTypingTickMs(75);
    expect(getTypingTickMs()).toBe(75);

    setTypingTickMs(10000);
    expect(getTypingTickMs()).toBe(500);
  });

  it('enforces validation band word limits and ordering', () => {
    // Values beyond allowed range should be clamped
    setValidationBandWords(0, 100);
    expect(getMinValidationWords()).toBeGreaterThanOrEqual(1);
    expect(getMaxValidationWords()).toBeLessThanOrEqual(12);

    // When min > max, function should reorder to min ≤ max
    setValidationBandWords(8, 3);
    expect(getMinValidationWords()).toBeLessThanOrEqual(getMaxValidationWords());

    // In-range values should be set exactly
    setValidationBandWords(3, 8);
    expect(getMinValidationWords()).toBe(3);
    expect(getMaxValidationWords()).toBe(8);
  });
});



