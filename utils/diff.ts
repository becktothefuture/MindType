/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D I F F   U T I L S  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Helpers for safe text replacement operations that never    ║
  ║   cross the CARET. Consumed by engines and tests.            ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Provides replaceRange with guardrails
  • WHY  ▸ Centralises safety to reduce duplicated checks
  • HOW  ▸ Pure functions; no I/O; imported by engines/tests
*/

export function replaceRange(
  original: string,
  start: number,
  end: number,
  text: string,
  caret: number,
): string {
  if (start < 0 || end < start || end > original.length) {
    throw new Error('Invalid range');
  }
  if (end > caret) {
    throw new Error('Range crosses caret');
  }
  return original.slice(0, start) + text + original.slice(end);
}
