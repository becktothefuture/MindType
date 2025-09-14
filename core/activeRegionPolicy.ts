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
  getMinValidationWords,
  getMaxValidationWords,
} from '../config/defaultThresholds';
import { defaultLMBehaviorConfig } from './lm/policy';

export interface DiffusionStateLike {
  text: string;
  caret: number;
  frontier: number;
}

export interface ActiveRegionPolicy {
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
  const startBound = state.frontier;
  const endBound = state.caret;
  if (startBound >= endBound) return { start: endBound, end: endBound };

  const words = iterateWordSegments(state.text, startBound, endBound);
  const minWords = getMinValidationWords();
  const maxWords = getMaxValidationWords();
  const take = Math.min(Math.max(words.length, minWords), maxWords);
  const start =
    words.length > 0 ? words[Math.max(0, words.length - take)].start : startBound;
  let renderStart = start;
  const lastNewline = state.text.lastIndexOf('\n', endBound - 1);
  if (lastNewline >= 0 && lastNewline >= renderStart) {
    // Prefer not to cross newline for the render range
    renderStart = Math.max(renderStart, lastNewline + 1);
  }
  return { start: renderStart, end: endBound };
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
    const render = computeRenderRangeInternal(state);
    return computeContextRangeInternal(state, render);
  },
};
