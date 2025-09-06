/*╔══════════════════════════════════════════════════════╗
  ║  ░  A U T O  T H R E S H O L D S  ░░░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Auto-generated from docs/spec YAML
  • WHY  ▸ Do not edit by hand; edit YAML instead
  • HOW  ▸ Generated via scripts/doc2code.cjs
*/

export const SHORT_PAUSE_MS = 300;
export const LONG_PAUSE_MS = 2000;
export const MAX_SWEEP_WINDOW = 80;

let typingTickMs = 75;
let minValidationWords = 5;
let maxValidationWords = 5;

// Confidence thresholds for v0.4 pipeline
type ConfidenceThresholds = {
  τ_input: number;
  τ_commit: number;
  τ_tone: number;
  τ_discard: number;
};

let CONFIDENCE_THRESHOLDS_MUT: ConfidenceThresholds = {
  // τ_input: minimum input fidelity to attempt Context stage
  τ_input: 0.65,
  // τ_commit: minimum combined score to apply any proposal
  τ_commit: 0.9,
  // τ_tone: tone proposals must also meet this
  τ_tone: 0.85,
  // τ_discard: below this, proposals are dropped
  τ_discard: 0.3,
};

export function getConfidenceThresholds(): Readonly<ConfidenceThresholds> {
  return CONFIDENCE_THRESHOLDS_MUT;
}

export function setConfidenceThresholds(partial: Partial<ConfidenceThresholds>): void {
  CONFIDENCE_THRESHOLDS_MUT = { ...CONFIDENCE_THRESHOLDS_MUT, ...partial };
}

// Back-compat named export (read-only view)
export const CONFIDENCE_THRESHOLDS = getConfidenceThresholds();

export function getTypingTickMs(): number {
  return typingTickMs;
}
export function setTypingTickMs(value: number): void {
  const clamped = Math.max(10, Math.min(500, Math.floor(value)));
  typingTickMs = clamped;
}

export function getMinValidationWords(): number {
  return minValidationWords;
}
export function getMaxValidationWords(): number {
  return maxValidationWords;
}
export function setValidationBandWords(minWords: number, maxWords: number): void {
  const min = Math.max(1, Math.min(5, Math.floor(minWords)));
  const max = Math.max(3, Math.min(12, Math.floor(maxWords)));
  minValidationWords = Math.min(min, max);
  maxValidationWords = Math.max(min, max);
}

// Confidence sensitivity (multiplier for dynamic threshold adjustments)
let confidenceSensitivity = 1; // 1 = baseline; [0.5, 2] typical safe range

export function getConfidenceSensitivity(): number {
  return confidenceSensitivity;
}

export function setConfidenceSensitivity(value: number): void {
  const clamped = Math.max(0.25, Math.min(4, Number.isFinite(value) ? value : 1));
  confidenceSensitivity = clamped;
}
