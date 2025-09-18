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

// Legacy sync export for compatibility during transition
export function noiseTransformSync(_input: { text: string; caret: number }): NoiseResult {
  // v0.6: sync version disabled; use async noiseTransform with LMAdapter
  return { diff: null };
}