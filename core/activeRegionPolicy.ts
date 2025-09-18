/*╔══════════════════════════════════════════════════════════╗
  ║  ░  ACTIVEREGIONPOLICY  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ LMAdapter streaming contract
  • WHY  ▸ CONTRACT-LM-ADAPTER
  • HOW  ▸ See linked contracts and guides in docs
*/

import {
  getActiveRegionWords,
} from '../config/defaultThresholds';
import { defaultLMBehaviorConfig } from './lm/policy';
import { alignToGraphemeBoundaries, isCaretSafe } from '../utils/grapheme';

export interface DiffusionStateLike {
  text: string;
  caret: number;
  frontier: number;
  // v0.6: burst growth tracking
  lastTypingTime?: number;
  burstStartTime?: number;
  burstKeyCount?: number;
}

export interface ActiveRegionPolicy {
  // v0.6: Single Active Region (no separate render/context ranges)
  computeRenderRange(state: DiffusionStateLike): { start: number; end: number };
  computeContextRange(state: DiffusionStateLike): { start: number; end: number };
}

// Alias exported for clarity in LM integration docs/tests
export type BandPolicy = ActiveRegionPolicy;

function iterateWordSegments(
  text: string,
  startIndex: number,
  endIndex: number,
): Array<{ start: number; end: number }> {
  const slice = text.slice(startIndex, endIndex);
  const out: Array<{ start: number; end: number }> = [];
  // Prefer Intl.Segmenter when available; fall back to unicode regex
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: 'word' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (seg as any).segment(slice)) {
      if ((s as { isWordLike?: boolean }).isWordLike) {
        out.push({
          start: startIndex + s.index,
          end: startIndex + s.index + s.segment.length,
        });
      }
    }
    return out;
  } catch {
    const re = /[\p{L}\p{N}_]+/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(slice))) {
      out.push({ start: startIndex + m.index, end: startIndex + m.index + m[0].length });
    }
    return out;
  }
}

function computeRenderRangeInternal(state: DiffusionStateLike): {
  start: number;
  end: number;
} {
  const endBound = state.caret;
  if (endBound <= 0) return { start: 0, end: 0 };

  // v0.6: Work backwards from caret to find N words regardless of frontier
  const searchStart = Math.max(0, endBound - 1000); // Reasonable search window
  const words = iterateWordSegments(state.text, searchStart, endBound);
  
  let maxWords = getActiveRegionWords();
  
  // v0.6: Burst growth logic - expand region during typing bursts
  if (state.lastTypingTime && state.burstStartTime && state.burstKeyCount) {
    const now = Date.now();
    const timeSinceLastKey = now - state.lastTypingTime;
    const burstDuration = now - state.burstStartTime;
    
    // Detect active burst: recent typing (< 200ms since last key) and sustained activity
    if (timeSinceLastKey < 200 && burstDuration > 500 && state.burstKeyCount > 5) {
      // Grow region modestly during bursts (up to 1.5x base size)
      maxWords = Math.min(Math.floor(maxWords * 1.5), 30);
    }
  }
  
  const take = Math.min(words.length, maxWords);
  const renderStart = take > 0 ? words[Math.max(0, words.length - take)].start : endBound;
  
  // Prefer not to cross newline for the render range
  const lastNewline = state.text.lastIndexOf('\n', endBound - 1);
  const finalStart = (lastNewline >= 0 && lastNewline >= renderStart) 
    ? Math.max(renderStart, lastNewline + 1) 
    : renderStart;
  
  // Ensure grapheme-safe boundaries and caret safety
  const aligned = alignToGraphemeBoundaries(state.text, finalStart, endBound);
  if (!isCaretSafe(aligned.start, aligned.end, state.caret)) {
    return { start: state.caret, end: state.caret }; // Empty range if not caret-safe
  }
  return aligned;
}

function computeContextRangeInternal(
  state: DiffusionStateLike,
  render: { start: number; end: number },
): { start: number; end: number } {
  const left = defaultLMBehaviorConfig.contextLeftChars;
  const right = defaultLMBehaviorConfig.contextRightChars;
  const start = Math.max(0, render.start - left);
  const end = Math.min(state.caret, render.end + right);
  return { start, end };
}

export const defaultActiveRegionPolicy: ActiveRegionPolicy = {
  computeRenderRange(state) {
    return computeRenderRangeInternal(state);
  },
  computeContextRange(state) {
    // v0.6: Same range for render and context (single Active Region)
    return computeRenderRangeInternal(state);
  },
};
