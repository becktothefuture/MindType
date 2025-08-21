/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D E F A U L T   T H R E S H O L D S  ░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Central timing & window parameters for engines/UI.         ║
  ║   Tuned per environment; consumed across modules.            ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Exposes pause thresholds and sweep window size
  • WHY  ▸ Harmonises behaviour across engines/UX
  • HOW  ▸ Imported by engines and UI helpers
*/
export const SHORT_PAUSE_MS = 300; // perceptual rhythm default per principles
export const LONG_PAUSE_MS = 2000; // aligned with plan/docs
export const MAX_SWEEP_WINDOW = 80; // chars behind caret

// Mutable runtime-configurable thresholds (with safe defaults)
let typingTickMs = 75; // 60–90 ms sweet spot
let minValidationWords = 5;
let maxValidationWords = 5;

// Accessors to support live tuning (demo controls)
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
  // enforce min ≤ max
  minValidationWords = Math.min(min, max);
  maxValidationWords = Math.max(min, max);
}
