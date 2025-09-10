/* Auto-generated test for REQ-CONFIDENCE-GATE */
import { describe, it, expect } from 'vitest';
import {
  applyThresholds,
  computeConfidence,
  computeInputFidelity,
  clamp01,
  type ConfidenceInputs,
} from '../core/confidenceGate';
import { computeDynamicThresholds, type EditType } from '../core/confidenceGate';
import {
  setConfidenceSensitivity,
  setConfidenceThresholds,
  getConfidenceThresholds,
} from '../config/defaultThresholds';
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

  it('dynamic thresholds increase τ_commit near caret and with undo feedback', () => {
    const base = getConfidenceThresholds();
    setConfidenceSensitivity(1);
    const near = computeDynamicThresholds({
      caret: 100,
      start: 95,
      end: 99,
      editType: 'context',
    });
    const far = computeDynamicThresholds({
      caret: 200,
      start: 95,
      end: 99,
      editType: 'context',
    });
    // Near caret should be more conservative than far (higher τ_commit)
    expect(near.τ_commit).toBeGreaterThanOrEqual(base.τ_commit);
    expect(near.τ_commit).toBeGreaterThan(far.τ_commit);

    const withUndo = computeDynamicThresholds({
      caret: 200,
      start: 95,
      end: 99,
      editType: 'context',
      recentRollbackCount: 2,
      lastRollbackMsAgo: 500,
    });
    expect(withUndo.τ_commit).toBeGreaterThan(far.τ_commit);
  });

  it('dynamic thresholds respect edit type offsets (noise easier, tone stricter)', () => {
    const ctx = computeDynamicThresholds({
      caret: 200,
      start: 90,
      end: 99,
      editType: 'context',
    });
    const noise = computeDynamicThresholds({
      caret: 200,
      start: 90,
      end: 99,
      editType: 'noise',
    });
    const tone = computeDynamicThresholds({
      caret: 200,
      start: 90,
      end: 99,
      editType: 'tone',
    });
    expect(noise.τ_commit).toBeLessThanOrEqual(ctx.τ_commit);
    expect(tone.τ_commit).toBeGreaterThanOrEqual(ctx.τ_commit);
  });

  it('dynamic thresholds enforce invariants and bounds', () => {
    setConfidenceThresholds({ τ_input: 0.7, τ_commit: 0.75, τ_discard: 0.1 });
    const t = computeDynamicThresholds({ caret: 0, start: 0, end: 0, editType: 'noise' });
    expect(t.τ_discard).toBeLessThan(t.τ_input);
    expect(t.τ_input).toBeLessThanOrEqual(t.τ_commit);
    expect(t.τ_commit).toBeLessThanOrEqual(0.98);
    // restore
    setConfidenceThresholds({});
  });
});
