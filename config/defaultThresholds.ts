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
