/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T I D Y   S W E E P   E N G I N E  ░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Forward cleanup (<80 chars) with caret-safe diffs.         ║
  ║   Works on the live TYPING ZONE just behind the caret.       ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Computes minimal DIFF proposals behind the caret
  • WHY  ▸ Keeps text clean in real time without crossing CARET
  • HOW  ▸ Receives keystream from TypingMonitor; returns one diff
*/

import { MAX_SWEEP_WINDOW } from '../config/defaultThresholds';

export interface SweepInput {
  text: string;
  caret: number;
  // Optional hint constraining the proposed edit to a word range
  hint?: { start: number; end: number };
}

export interface SweepResult {
  diff: { start: number; end: number; text: string } | null;
}

// Rule interface for individual correction rules
export interface SweepRule {
  name: string;
  priority: number; // Lower number = higher priority
  apply(input: SweepInput): SweepResult;
}

// ⟢ Future: Confidence threshold for applying corrections
// const CONFIDENCE_THRESHOLD = 0.7;

// Basic rule: Simple word substitutions (space-delimited for safety)
const wordSubstitutionRule: SweepRule = {
  name: 'word-substitution',
  priority: 1,
  apply(input: SweepInput): SweepResult {
    const { text, caret, hint } = input;

    // Define safe editing window (never at/after caret)
    const windowStart = Math.max(0, caret - MAX_SWEEP_WINDOW);
    const windowEnd = caret;

    // If hint provided, constrain to hint boundaries
    const searchStart = hint ? Math.max(windowStart, hint.start) : windowStart;
    const searchEnd = hint ? Math.min(windowEnd, hint.end) : windowEnd;

    if (searchStart >= searchEnd) return { diff: null };

    const searchText = text.slice(searchStart, searchEnd);

    // Simple substitution map - expandable
    const substitutions = {
      ' teh ': ' the ',
      ' adn ': ' and ',
      ' hte ': ' the ',
      ' yuor ': ' your ',
      ' recieve ': ' receive ',
    };

    // Find the last (rightmost) match in the window
    let bestMatch: { pattern: string; replacement: string; index: number } | null = null;

    for (const [pattern, replacement] of Object.entries(substitutions)) {
      const index = searchText.lastIndexOf(pattern);
      if (index !== -1) {
        if (!bestMatch || index > bestMatch.index) {
          bestMatch = { pattern, replacement, index };
        }
      }
    }

    if (bestMatch) {
      const absoluteStart = searchStart + bestMatch.index;
      const absoluteEnd = absoluteStart + bestMatch.pattern.length;

      // Double-check we're not crossing the caret (safety)
      if (absoluteEnd <= caret) {
        return {
          diff: {
            start: absoluteStart,
            end: absoluteEnd,
            text: bestMatch.replacement,
          },
        };
      }
    }

    return { diff: null };
  },
};

const MIN_CONFIDENCE = 0.8;

function isWordBoundary(char: string | undefined): boolean {
  return !char || /[^\p{L}\p{N}_]/u.test(char);
}

// Transposition detection rule: detects common letter swaps inside words
const transpositionRule: SweepRule = {
  name: 'transposition-detection',
  priority: 0,
  apply(input: SweepInput): SweepResult {
    const { text, caret, hint } = input;

    const windowStart = Math.max(0, caret - MAX_SWEEP_WINDOW);
    const windowEnd = caret;
    const searchStart = hint ? Math.max(windowStart, hint.start) : windowStart;
    const searchEnd = hint ? Math.min(windowEnd, hint.end) : windowEnd;
    if (searchStart >= searchEnd) return { diff: null };

    const searchText = text.slice(searchStart, searchEnd);

    // Common transposition patterns (word-internal) with replacements
    const patterns: Array<{
      regex: RegExp;
      replacement: (m: RegExpExecArray) => string;
    }> = [
      { regex: /\bnto\b/g, replacement: () => 'not' },
      { regex: /\btaht\b/g, replacement: () => 'that' },
      { regex: /\bwaht\b/g, replacement: () => 'what' },
      { regex: /\bthier\b/g, replacement: () => 'their' },
    ];

    let best: { start: number; end: number; text: string } | null = null;

    for (const { regex, replacement } of patterns) {
      let match: RegExpExecArray | null;
      regex.lastIndex = 0;
      while ((match = regex.exec(searchText)) !== null) {
        const absStart = searchStart + match.index;
        const absEnd = absStart + match[0].length;
        if (absEnd <= caret) {
          const rep = replacement(match);
          // Confidence gating: require word boundaries around the token
          const left = text[absStart - 1];
          const right = text[absEnd];
          const confidence = isWordBoundary(left) && isWordBoundary(right) ? 1 : 0.5;
          if (confidence >= MIN_CONFIDENCE) {
            if (!best || absStart > best.start) {
              best = { start: absStart, end: absEnd, text: rep };
            }
          }
        }
      }
    }

    return { diff: best };
  },
};

// Punctuation normalization rule: spacing around commas, periods, em dashes, quotes
const punctuationNormalizationRule: SweepRule = {
  name: 'punctuation-normalization',
  priority: 0,
  apply(input: SweepInput): SweepResult {
    const { text, caret, hint } = input;
    const windowStart = Math.max(0, caret - MAX_SWEEP_WINDOW);
    const windowEnd = caret;
    const searchStart = hint ? Math.max(windowStart, hint.start) : windowStart;
    const searchEnd = hint ? Math.min(windowEnd, hint.end) : windowEnd;
    if (searchStart >= searchEnd) return { diff: null };

    // Look for last offending pattern inside the search window
    const searchText = text.slice(searchStart, searchEnd);
    type Candidate = { start: number; end: number; text: string };
    let best: Candidate | null = null;

    const push = (absStart: number, absEnd: number, replacement: string) => {
      if (absEnd > caret) return;
      // Deterministic normalization → high confidence
      const confidence = 1;
      if (confidence < MIN_CONFIDENCE) return;
      if (!best || absStart > best.start)
        best = { start: absStart, end: absEnd, text: replacement };
    };

    // 1) Space before comma/period → remove
    // e.g., "word ,next" => "word, next"
    {
      const regex = /\s+([,\.])/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(searchText))) {
        const localStart = m.index;
        const localEnd = m.index + m[0].length;
        const absStart = searchStart + localStart;
        const absEnd = searchStart + localEnd;
        push(absStart, absEnd, m[1]);
      }
    }

    // 2) Missing space after comma/period (unless end of line) → add one
    {
      const regex = /([,\.])(\S)/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(searchText))) {
        // skip if next is newline
        if (m[2] === '\n') continue;
        const localStart = m.index;
        const localEnd = m.index + m[0].length;
        const absStart = searchStart + localStart;
        const absEnd = searchStart + localEnd;
        push(absStart, absEnd, `${m[1]} ${m[2]}`);
      }
    }

    // 3) Em dash spacing: ensure spaces around — ("word—next" → "word — next")
    {
      const regex = /\s?—\s?/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(searchText))) {
        // Skip if already exactly ' — '
        if (m[0] === ' — ') continue;
        const absStart = searchStart + m.index;
        const absEnd = absStart + m[0].length;
        push(absStart, absEnd, ' — ');
      }
    }

    return { diff: best };
  },
};

// Capitalization rules: sentence-start capitalization; standalone 'i' pronoun → 'I'
const capitalizationRule: SweepRule = {
  name: 'capitalization',
  priority: 1,
  apply(input: SweepInput): SweepResult {
    const { text, caret, hint } = input;
    const windowStart = Math.max(0, caret - MAX_SWEEP_WINDOW);
    const windowEnd = caret;
    const searchStart = hint ? Math.max(windowStart, hint.start) : windowStart;
    const searchEnd = hint ? Math.min(windowEnd, hint.end) : windowEnd;
    if (searchStart >= searchEnd) return { diff: null };

    const searchText = text.slice(searchStart, searchEnd);
    type Candidate = { start: number; end: number; text: string };
    let best: Candidate | null = null;

    const push = (absStart: number, absEnd: number, replacement: string) => {
      if (absEnd > caret) return;
      if (!best || absStart > best.start)
        best = { start: absStart, end: absEnd, text: replacement };
    };

    // 1) Sentence-start capitalization (only after . ! ? followed by spaces; avoid start-of-text to reduce noise)
    {
      const regex = /([\.\!\?]\s+)([a-z])/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(searchText))) {
        const localStart = m.index + m[1].length;
        const absStart = searchStart + localStart;
        const absEnd = absStart + 1;
        const upper = m[2].toUpperCase();
        push(absStart, absEnd, upper);
      }
    }

    // 2) Standalone pronoun 'i' (space/i/space or start/end boundaries)
    {
      const regex = /(?<=^|\s)i(?=\s|$)/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(searchText))) {
        const absStart = searchStart + m.index;
        const absEnd = absStart + 1;
        push(absStart, absEnd, 'I');
      }
    }

    return { diff: best };
  },
};

// Registry of all rules, ordered by priority
const RULES: SweepRule[] = [
  transpositionRule,
  punctuationNormalizationRule,
  capitalizationRule,
  wordSubstitutionRule,
  // ⟢ Future rules will be added here
];

export function tidySweep(input: SweepInput): SweepResult {
  const { text, caret } = input;

  // Safety check: never edit at or after the caret
  if (!text || caret <= 0) {
    return { diff: null };
  }

  // Apply rules in priority order, return first match
  for (const rule of RULES) {
    const result = rule.apply(input);
    if (result.diff) {
      // Additional safety: ensure diff doesn't cross caret
      if (result.diff.end <= caret) {
        return result;
      }
    }
  }

  return { diff: null };
}
