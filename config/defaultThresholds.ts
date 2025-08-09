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
export const SHORT_PAUSE_MS = 500; // aligned with plan/docs
export const LONG_PAUSE_MS = 2000; // aligned with plan/docs
export const MAX_SWEEP_WINDOW = 80; // chars behind caret

// ⟢ Streaming cadence while typing (advances diffusion frontier)
export const TYPING_TICK_MS = 75; // 60–90 ms sweet spot

// ⟢ Word-by-word diffusion band sizing (Unicode words)
export const MIN_VALIDATION_WORDS = 3;
export const MAX_VALIDATION_WORDS = 8;
