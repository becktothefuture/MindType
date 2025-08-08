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
export const SHORT_PAUSE_MS = 300;
export const LONG_PAUSE_MS = 700;
export const MAX_SWEEP_WINDOW = 80; // chars behind caret
