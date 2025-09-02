/* Auto-generated test for REQ-CONFIDENCE-GATE */
import { describe, it, expect } from 'vitest';
import {
  applyThresholds,
  computeConfidence,
  computeInputFidelity,
  clamp01,
  type ConfidenceInputs,
} from '../core/confidenceGate';
import { CONFIDENCE_THRESHOLDS } from '../config/defaultThresholds';

describe('confidenceGate', () => {
  it('computes combined score with correct weights', () => {
    const inp: ConfidenceInputs = {
      inputFidelity: 1,
      transformationQuality: 0.5,
      contextCoherence: 0.5,
      temporalDecay: 0.5,
    };
    const s = computeConfidence(inp);
    // 0.3*1 + 0.4*0.5 + 0.2*0.5 + 0.1*0.5 = 0.3 + 0.2 + 0.1 + 0.05 = 0.65
    expect(Math.round(s.combined * 100)).toBe(65);
  });

  it('applies thresholds for commit/hold/discard', () => {
    const base: ConfidenceInputs = {
      inputFidelity: 0.9,
      transformationQuality: 0.95,
      contextCoherence: 0.9,
      temporalDecay: 0.9,
    };
    const strong = computeConfidence(base);
    expect(applyThresholds(strong)).toBe('commit');

    const weak = computeConfidence({ ...base, inputFidelity: 0.2 });
    expect(applyThresholds(weak)).toBe('hold'); // below τ_input → hold

    const bad = computeConfidence({
      ...base,
      inputFidelity: 0.9,
      transformationQuality: 0,
      contextCoherence: 0,
      temporalDecay: 0,
    });
    const decision = applyThresholds(bad);
    // With near-zero components, should discard below τ_discard
    expect(decision).toBe('discard');
  });

  it('requires τ_tone when tone gating is requested', () => {
    const s = computeConfidence({
      inputFidelity: 1,
      transformationQuality: CONFIDENCE_THRESHOLDS.τ_tone - 0.01,
      contextCoherence: 1,
      temporalDecay: 1,
    });
    const d = applyThresholds(s, CONFIDENCE_THRESHOLDS, { requireTone: true });
    expect(d).toBe('hold');
  });

  it('commits when tone gating and both bars are met', () => {
    const s = computeConfidence({
      inputFidelity: 1,
      transformationQuality: CONFIDENCE_THRESHOLDS.τ_tone + 0.01,
      contextCoherence: 1,
      temporalDecay: 1,
    });
    const d = applyThresholds(s, CONFIDENCE_THRESHOLDS, { requireTone: true });
    expect(d).toBe('commit');
  });

  it('holds when combined below τ_commit but above τ_discard', () => {
    const s = computeConfidence({
      inputFidelity: CONFIDENCE_THRESHOLDS.τ_input + 0.01,
      transformationQuality: 0.6,
      contextCoherence: 0.6,
      temporalDecay: 0.6,
    });
    const d = applyThresholds(s, CONFIDENCE_THRESHOLDS);
    expect(d).toBe('hold');
  });

  it('computes input fidelity from text', () => {
    expect(computeInputFidelity('hello')).toBeGreaterThan(0.9);
    expect(computeInputFidelity('!!!')).toBe(0);
    expect(computeInputFidelity('    ')).toBe(0);
  });

  it('clamp01 guards against NaN/Infinity', () => {
    expect(clamp01(NaN as unknown as number)).toBe(0);
    expect(clamp01(Infinity as unknown as number)).toBe(0);
  });
});
