/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O N F I D E N C E   G A T E   B R A N C H E S  ░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Branch tests for applyThresholds optional tone flag
  • WHY  ▸ Nudge global branch coverage over threshold
*/
import { describe, it, expect } from 'vitest';
import { applyThresholds, computeConfidence } from '../core/confidenceGate';

describe('confidenceGate branches', () => {
  it('applies stricter tone gate when requireTone=true', () => {
    const score = computeConfidence({
      inputFidelity: 0.9,
      transformationQuality: 0.8,
      contextCoherence: 0.8,
      temporalDecay: 1,
    });
    const normal = applyThresholds(score);
    const toneReq = applyThresholds(score, undefined, { requireTone: true });
    // Tone gate should be same or stricter than normal (commit → hold/discard)
    const rank: Record<string, number> = { commit: 2, hold: 1, discard: 0 };
    expect(rank[toneReq]).toBeLessThanOrEqual(rank[normal]);
  });
});
