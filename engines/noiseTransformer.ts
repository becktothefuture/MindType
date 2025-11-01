/*╔══════════════════════════════════════════════════════════╗
  ║  ░  NOISETRANSFORMER  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ╚══════════════════════════════════════════════════════════╝
  • WHAT ▸ Speed enhancement mode for 180+ WPM typing; Support for all seven revolutionary usage scenarios
  • WHY  ▸ REQ-VELOCITY-MODE, REQ-SEVEN-SCENARIOS
  • HOW  ▸ See linked contracts and guides in docs
*/

import type { LMAdapter } from '../core/lm/types';
import { isCaretSafe } from '../utils/grapheme';

export interface NoiseInput {
  text: string;
  caret: number;
  activeRegion: { start: number; end: number };
  lmAdapter?: LMAdapter;
}

export interface NoiseResult {
  diff: { start: number; end: number; text: string } | null;
}

export async function noiseTransform(input: NoiseInput): Promise<NoiseResult> {
  const { text, caret, activeRegion, lmAdapter } = input;

  // v0.6: Require LM adapter; no rule-based fallback
  if (!lmAdapter) {
    return { diff: null };
  }

  // Ensure Active Region is caret-safe
  if (!isCaretSafe(activeRegion.start, activeRegion.end, caret)) {
    return { diff: null };
  }

  // Extract text from Active Region
  const spanText = text.slice(activeRegion.start, activeRegion.end);
  if (spanText.length === 0) {
    return { diff: null };
  }

  try {
    // Stream LM correction for the Active Region span
    const chunks: string[] = [];
    for await (const chunk of lmAdapter.stream({
      text,
      caret,
      activeRegion,
      settings: {
        maxNewTokens: Math.min(32, Math.floor(spanText.length * 1.2)), // Conservative for noise fixes
        deviceTier: 'cpu', // Start conservative; device detection happens in adapter
      },
    })) {
      chunks.push(chunk);
    }

    const correctedText = chunks.join('').trim();
    
    // Only apply if LM produced a meaningful change
    if (correctedText && correctedText !== spanText && correctedText.length > 0) {
      return {
        diff: {
          start: activeRegion.start,
          end: activeRegion.end,
          text: correctedText,
        },
      };
    }

    return { diff: null };
  } catch (error) {
    // v0.6: LM errors disable corrections rather than fallback
    console.warn('[NoiseTransformer] LM error:', error);
    return { diff: null };
  }
}

/**
 * Deterministic noise fallback (PDF requirement: deterministic-first)
 * Handles common typos, spacing, and casing without requiring LM
 */
function applyDeterministicFixes(word: string): string {
  // Common typo patterns (orthography)
  const typoMap: Record<string, string> = {
    'teh': 'the',
    'recieve': 'receive',
    'seperate': 'separate',
    'occured': 'occurred',
    'accomodate': 'accommodate',
    'definately': 'definitely',
    'acheive': 'achieve',
  };
  
  const lower = word.toLowerCase();
  if (typoMap[lower]) {
    // Preserve casing
    if (word[0] === word[0]?.toUpperCase()) {
      return typoMap[lower][0]?.toUpperCase() + typoMap[lower].slice(1);
    }
    return typoMap[lower];
  }
  
  // Transposition fixes (common adjacent swaps)
  // "hte" -> "the", "adn" -> "and"
  if (lower === 'hte') return word[0] === 'H' ? 'The' : 'the';
  if (lower === 'adn') return word[0] === 'A' ? 'And' : 'and';
  
  return word; // No fix needed
}

/**
 * Legacy sync export for streaming tick (deterministic-first per PDF)
 * Returns deterministic fixes for immediate application during typing
 */
export function noiseTransformSync(input: { text: string; caret: number }): NoiseResult {
  const { text, caret } = input;
  
  // Only process text behind caret
  if (caret <= 0 || caret > text.length) {
    return { diff: null };
  }
  
  // Extract word immediately behind caret (last word in Active Region)
  const beforeCaret = text.slice(Math.max(0, caret - 100), caret);
  const wordMatch = beforeCaret.match(/[\p{L}\p{N}_]+$/u);
  
  if (!wordMatch) {
    return { diff: null };
  }
  
  const wordStart = caret - wordMatch[0].length;
  const wordEnd = caret;
  const originalWord = text.slice(wordStart, wordEnd);
  const fixedWord = applyDeterministicFixes(originalWord);
  
  // Only return diff if fix was applied
  if (fixedWord !== originalWord) {
    return {
      diff: {
        start: wordStart,
        end: wordEnd,
        text: fixedWord,
      },
    };
  }
  
  return { diff: null };
}