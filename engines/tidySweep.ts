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
          if (!best || absStart > best.start) {
            best = { start: absStart, end: absEnd, text: rep };
          }
        }
      }
    }

    return { diff: best };
  },
};

// Registry of all rules, ordered by priority
const RULES: SweepRule[] = [
  transpositionRule,
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
