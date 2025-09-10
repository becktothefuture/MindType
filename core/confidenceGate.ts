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

import { getConfidenceThresholds } from '../config/defaultThresholds';
import { getConfidenceSensitivity, MAX_SWEEP_WINDOW } from '../config/defaultThresholds';

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
  thresholds: Thresholds = getConfidenceThresholds(),
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

export type EditType = 'noise' | 'lm' | 'context' | 'tone';

export interface DynamicThresholdsInput {
  caret: number;
  start: number;
  end: number;
  editType: EditType;
  sensitivity?: number; // multiplier (defaults to config)
  recentRollbackCount?: number; // recent rollbacks/undos
  lastRollbackMsAgo?: number; // ms since last rollback (for decay)
  nowMs?: number; // testing hook
  base?: Thresholds; // override base thresholds (defaults from config)
}

function clamp01f(x: number): number {
  return clamp01(x);
}

function computeDistanceFromCaret(caret: number, start: number, end: number): number {
  if (!Number.isFinite(caret) || !Number.isFinite(start) || !Number.isFinite(end))
    return 0;
  if (start > end) [start, end] = [end, start];
  if (caret < start) return 0; // proposals at/after caret should not occur; treat as near
  if (caret >= start && caret <= end) return 0; // caret inside proposal → near (rollback upstream)
  return Math.max(0, caret - end);
}

function computeUndoBoost(
  count = 0,
  msAgo = Number.POSITIVE_INFINITY,
  sensitivity = 1,
): number {
  if (!count || !Number.isFinite(msAgo)) return 0;
  const windowMs = 3000;
  if (msAgo > windowMs) return 0;
  const base = 0.03; // first rollback boost
  const extra = Math.max(0, count - 1) * 0.02; // additional small boost
  const decay = 1 - Math.min(1, Math.max(0, msAgo / windowMs)); // linear decay to 0 over window
  return (base + extra) * decay * sensitivity;
}

export function computeDynamicThresholds(input: DynamicThresholdsInput): Thresholds {
  const base = input.base ?? getConfidenceThresholds();
  const sensitivity =
    Number.isFinite(input.sensitivity!) && input.sensitivity! > 0
      ? input.sensitivity!
      : getConfidenceSensitivity();

  const distance = computeDistanceFromCaret(input.caret, input.start, input.end);
  const window = Math.max(1, Math.min(MAX_SWEEP_WINDOW, MAX_SWEEP_WINDOW));
  const nearFactor = 1 - Math.min(1, distance / window); // 1 at caret, → 0 by window

  // Edit-type offsets (commit): structural typos are easier; semantic/tone stricter
  const typeOffsetCommit =
    input.editType === 'noise' ? -0.05 : input.editType === 'tone' ? 0.03 : 0;
  const typeOffsetInput = input.editType === 'noise' ? -0.02 : 0; // small ease for noise

  // Near-caret conservatism: increase thresholds near the caret (scaled by sensitivity)
  const nearBoostCommit = 0.05 * nearFactor * sensitivity;
  const nearBoostInput = 0.02 * nearFactor * sensitivity;

  // Undo/rollback feedback conservatism applied to commit threshold
  const undoBoost = computeUndoBoost(
    input.recentRollbackCount,
    input.lastRollbackMsAgo ?? Number.POSITIVE_INFINITY,
    sensitivity,
  );

  let τ_input = base.τ_input + nearBoostInput + typeOffsetInput;
  let τ_commit = base.τ_commit + nearBoostCommit + typeOffsetCommit + undoBoost;
  const τ_tone = clamp01f(base.τ_tone); // keep tone gate constant for simplicity
  let τ_discard = clamp01f(base.τ_discard);

  // Clamp and enforce invariants
  τ_input = clamp01f(τ_input);
  τ_commit = Math.min(0.98, Math.max(0, τ_commit));
  if (!(τ_discard < τ_input)) {
    τ_discard = Math.max(0, Math.min(τ_input - 0.05, τ_discard));
    if (τ_discard < 0) τ_discard = 0;
  }
  if (τ_input > τ_commit) {
    // Ensure τ_input ≤ τ_commit by nudging commit up minimally
    τ_commit = Math.min(0.98, Math.max(τ_input, τ_commit));
  }

  return { τ_input, τ_commit, τ_tone, τ_discard };
}

export { computeDistanceFromCaret };
