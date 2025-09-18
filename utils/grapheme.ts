/*╔══════════════════════════════════════════════════════╗
  ║  ░  G R A P H E M E   S A F E T Y  ░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Unicode grapheme cluster boundary validation
  • WHY  ▸ Prevent splitting emoji, ZWJ sequences, combining marks
  • HOW  ▸ Use Intl.Segmenter with fallback for boundary detection
*/

/**
 * Validates that a position aligns to a grapheme cluster boundary.
 * Returns true if the position is safe for text editing.
 */
export function isGraphemeBoundary(text: string, position: number): boolean {
  if (position <= 0 || position >= text.length) return true;
  
  try {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const segments = Array.from(segmenter.segment(text));
    
    // Check if position aligns with any segment boundary
    for (const segment of segments) {
      if (segment.index === position) return true;
      if (segment.index + segment.segment.length === position) return true;
    }
    return false;
  } catch {
    // Fallback: basic check for surrogate pairs and combining marks
    const char = text[position];
    const prevChar = text[position - 1];
    
    // Don't split surrogate pairs
    if (char && /[\uDC00-\uDFFF]/.test(char)) return false;
    if (prevChar && /[\uD800-\uDBFF]/.test(prevChar)) return false;
    
    // Don't split combining marks
    if (char && /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF]/.test(char)) return false;
    
    return true;
  }
}

/**
 * Adjusts a range to align with grapheme boundaries.
 * Returns the adjusted range that is safe for text editing.
 */
export function alignToGraphemeBoundaries(
  text: string,
  start: number,
  end: number
): { start: number; end: number } {
  let safeStart = start;
  let safeEnd = end;
  
  // Adjust start to previous grapheme boundary if needed
  while (safeStart > 0 && !isGraphemeBoundary(text, safeStart)) {
    safeStart--;
  }
  
  // Adjust end to next grapheme boundary if needed
  while (safeEnd < text.length && !isGraphemeBoundary(text, safeEnd)) {
    safeEnd++;
  }
  
  return { start: safeStart, end: safeEnd };
}

/**
 * Validates that a range is caret-safe (never at or after caret position).
 */
export function isCaretSafe(start: number, end: number, caret: number): boolean {
  return end <= caret;
}

