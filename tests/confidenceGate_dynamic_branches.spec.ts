/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O N F I D E N C E   D Y N A M I C   B R A N C H E S  ░░  ║
  ║                                                              ║
  ║   Branch coverage focusing on dynamic thresholds and         ║
  ║   distance/undo/sensitivity edge cases.                      ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect } from 'vitest';
import {
  computeDynamicThresholds,
  computeDistanceFromCaret,
  type Thresholds,
} from '../core/confidenceGate';
import {
  setConfidenceThresholds,
  setConfidenceSensitivity,
  getConfidenceThresholds,
} from '../config/defaultThresholds';

describe('confidenceGate dynamic branches', () => {
  it('computeDistanceFromCaret handles before/inside/after and reversed ranges', () => {
    expect(computeDistanceFromCaret(5, 10, 20)).toBe(0); // caret before
    expect(computeDistanceFromCaret(15, 10, 20)).toBe(0); // caret inside
    expect(computeDistanceFromCaret(50, 10, 20)).toBe(30); // caret after
    // reversed start/end
    expect(computeDistanceFromCaret(25, 30, 10)).toBe(0); // inside after swap
    expect(computeDistanceFromCaret(40, 30, 10)).toBe(10); // after after swap (40-30)
  });

  it('adjusts τ_discard when base τ_discard ≥ τ_input', () => {
    const base: Thresholds = { τ_input: 0.5, τ_commit: 0.6, τ_tone: 0.2, τ_discard: 0.5 };
    const t = computeDynamicThresholds({ caret: 1000, start: 10, end: 20, editType: 'noise', base });
    expect(t.τ_discard).toBeLessThan(t.τ_input);
  });

  it('nudges τ_commit up when τ_input > τ_commit after adjustments', () => {
    // Force τ_input > τ_commit scenario even after boosts/offsets
    const base: Thresholds = { τ_input: 0.9, τ_commit: 0.1, τ_tone: 0.2, τ_discard: 0.1 };
    // Near caret, noise type (commit offset -0.05; input offset -0.02)
    const t = computeDynamicThresholds({ caret: 100, start: 95, end: 99, editType: 'noise', base, sensitivity: 1 });
    expect(t.τ_commit).toBeGreaterThanOrEqual(t.τ_input);
  });

  it('respects explicit sensitivity override vs config default', () => {
    // ensure config sensitivity not used when explicit provided
    setConfidenceSensitivity(0.5);
    const low = computeDynamicThresholds({ caret: 100, start: 95, end: 99, editType: 'context', sensitivity: 0.5 });
    const high = computeDynamicThresholds({ caret: 100, start: 95, end: 99, editType: 'context', sensitivity: 2 });
    expect(high.τ_commit).toBeGreaterThan(low.τ_commit);
  });

  it('undo boost decays to zero when lastRollbackMsAgo exceeds window', () => {
    const far = computeDynamicThresholds({ caret: 1000, start: 10, end: 20, editType: 'context' });
    const withOldUndo = computeDynamicThresholds({
      caret: 1000,
      start: 10,
      end: 20,
      editType: 'context',
      recentRollbackCount: 3,
      lastRollbackMsAgo: 5000, // beyond window
    });
    expect(withOldUndo.τ_commit).toBeCloseTo(far.τ_commit, 5);
  });
});


