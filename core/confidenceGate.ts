/*╔══════════════════════════════════════════════════════════╗
  ║  ░  CONFIDENCEGATE  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ╚══════════════════════════════════════════════════════════╝
  • WHAT ▸ Confidence gating across pipeline stages
  • WHY  ▸ REQ-CONFIDENCE-GATE
  • HOW  ▸ See linked contracts and guides in docs
*/

import { CONFIDENCE_THRESHOLDS } from '../config/defaultThresholds';

export interface ConfidenceInputs {
  inputFidelity: number; // [0,1]
  transformationQuality: number; // [0,1]
  contextCoherence: number; // [0,1]
  temporalDecay: number; // [0,1]
}

export interface ConfidenceScore extends ConfidenceInputs {
  combined: number; // weighted sum
}

export type GateDecision = 'hold' | 'commit' | 'discard';

const WEIGHTS = {
  inputFidelity: 0.3,
  transformationQuality: 0.4,
  contextCoherence: 0.2,
  temporalDecay: 0.1,
} as const;

export function clamp01(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function computeInputFidelity(sample: string): number {
  // Heuristic: ratio of letters/digits to total non-space chars, capped [0,1]
  const cleaned = sample.replace(/\s+/g, '');
  if (cleaned.length === 0) return 0;
  const good = (cleaned.match(/[\p{L}\p{N}]/gu) || []).length;
  return clamp01(good / cleaned.length);
}

export function computeConfidence(inputs: ConfidenceInputs): ConfidenceScore {
  const a = clamp01(inputs.inputFidelity);
  const b = clamp01(inputs.transformationQuality);
  const c = clamp01(inputs.contextCoherence);
  const d = clamp01(inputs.temporalDecay);
  const combined =
    a * WEIGHTS.inputFidelity +
    b * WEIGHTS.transformationQuality +
    c * WEIGHTS.contextCoherence +
    d * WEIGHTS.temporalDecay;
  return {
    inputFidelity: a,
    transformationQuality: b,
    contextCoherence: c,
    temporalDecay: d,
    combined,
  };
}

export interface Thresholds {
  τ_input: number;
  τ_commit: number;
  τ_tone: number;
  τ_discard: number;
}

export function applyThresholds(
  score: ConfidenceScore,
  thresholds: Thresholds = CONFIDENCE_THRESHOLDS,
  opts?: { requireTone?: boolean },
): GateDecision {
  // If the raw input isn't good enough, hold (don’t proceed to deeper stages)
  if (score.inputFidelity < thresholds.τ_input) return 'hold';
  // If very low combined, discard
  if (score.combined < thresholds.τ_discard) return 'discard';
  // If tone is required for this decision, enforce both tone and commit bars
  if (opts?.requireTone) {
    if (
      score.combined >= thresholds.τ_commit &&
      score.transformationQuality >= thresholds.τ_tone
    ) {
      return 'commit';
    }
    return 'hold';
  }
  // Otherwise, commit only on combined meeting commit threshold
  if (score.combined >= thresholds.τ_commit) return 'commit';
  return 'hold';
}
