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
  // ⟢ Guard: never allow edits that reach or cross the caret
  if (end > caret) {
    throw new Error('Range crosses caret');
  }
  // ⟢ Guard: ensure indices are not in the middle of a UTF-16 surrogate pair
  const isHigh = (code: number) => code >= 0xd800 && code <= 0xdbff;
  const isLow = (code: number) => code >= 0xdc00 && code <= 0xdfff;

  const isBoundary = (s: string, index: number): boolean => {
    // At start or end of string always a boundary
    if (index <= 0 || index >= s.length) return true;
    const prev = s.charCodeAt(index - 1);
    const curr = s.charCodeAt(index);
    // It's NOT a boundary only when splitting a surrogate pair: high | low
    return !(isHigh(prev) && isLow(curr));
  };

  if (!isBoundary(original, start) || !isBoundary(original, end)) {
    throw new Error('Range splits surrogate pair');
  }
  if (!isBoundary(original, caret)) {
    throw new Error('Caret inside surrogate pair');
  }

  return original.slice(0, start) + text + original.slice(end);
}
