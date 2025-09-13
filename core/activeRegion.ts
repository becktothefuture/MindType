/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  A C T I V E   R E G I O N  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Tracks validated/unvalidated spans behind the caret.       ║
  ║   Provides merge/split/query near-field APIs.                ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Data structure and APIs for active region management
  • WHY  ▸ Enables confidence/undo systems and visual feedback
  • HOW  ▸ Unicode-aware ranges, caret-safe operations
*/

export interface RegionSpan {
  start: number;
  end: number;
  original: string;
  corrected: string;
  confidence: number; // 0..1
  appliedAt: number; // epoch ms
  source: 'noise' | 'context' | 'tone' | 'lm' | 'manual';
}

export interface ActiveRegionState {
  text: string;
  caret: number;
  // Animated/visual band behind caret (inclusive start, exclusive end)
  band: { start: number; end: number };
  // Validated spans that have been applied
  spans: RegionSpan[];
}

export function createActiveRegion(
  initialText = '',
  initialCaret = 0,
): ActiveRegionState {
  return {
    text: initialText,
    caret: initialCaret,
    band: { start: Math.max(0, initialCaret - 1), end: initialCaret },
    spans: [],
  };
}

export function updateSnapshot(
  state: ActiveRegionState,
  text: string,
  caret: number,
): void {
  state.text = text;
  state.caret = caret;
}

export function setBand(state: ActiveRegionState, start: number, end: number): void {
  state.band = { start: Math.max(0, Math.min(start, end)), end: Math.max(start, end) };
}

export function addSpan(
  state: ActiveRegionState,
  span: Omit<RegionSpan, 'original'>,
): void {
  if (span.end > state.caret) return; // caret-safe: never beyond caret
  const original = state.text.slice(span.start, span.end);
  const s: RegionSpan = { original, ...span };
  state.spans.push(s);
  mergeAdjacent(state);
}

export function mergeAdjacent(state: ActiveRegionState): void {
  if (state.spans.length <= 1) return;
  state.spans.sort((a, b) => a.start - b.start || a.end - b.end);
  const out: RegionSpan[] = [];
  for (const s of state.spans) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end && s.source === last.source) {
      // Merge overlapping/adjacent when same source; concatenate corrected text accordingly
      const merged: RegionSpan = {
        start: Math.min(last.start, s.start),
        end: Math.max(last.end, s.end),
        original: last.original + state.text.slice(last.end, s.end),
        corrected: last.corrected + s.corrected,
        confidence: Math.min(1, (last.confidence + s.confidence) / 2),
        appliedAt: Math.max(last.appliedAt, s.appliedAt),
        source: last.source,
      };
      out[out.length - 1] = merged;
    } else {
      out.push(s);
    }
  }
  state.spans = out;
}

export function splitSpan(
  state: ActiveRegionState,
  index: number,
  splitAt: number,
): boolean {
  const s = state.spans[index];
  if (!s) return false;
  if (splitAt <= s.start || splitAt >= s.end) return false;
  const leftLen = splitAt - s.start;
  const rightLen = s.end - splitAt;
  const left: RegionSpan = {
    start: s.start,
    end: splitAt,
    original: s.original.slice(0, leftLen),
    corrected: s.corrected.slice(0, leftLen),
    confidence: s.confidence,
    appliedAt: s.appliedAt,
    source: s.source,
  };
  const right: RegionSpan = {
    start: splitAt,
    end: s.end,
    original: s.original.slice(leftLen),
    corrected: s.corrected.slice(leftLen),
    confidence: s.confidence,
    appliedAt: s.appliedAt,
    source: s.source,
  };
  state.spans.splice(index, 1, left, right);
  return true;
}

export function queryNearField(
  state: ActiveRegionState,
  minWords: number,
  maxWords: number,
): { start: number; end: number } {
  const slice = state.text.slice(0, state.caret);
  // Prefer Intl.Segmenter for Unicode-aware word detection
  let words: Array<{ start: number; end: number }> = [];
  try {
    const seg = new (Intl as unknown as { Segmenter: typeof Intl.Segmenter }).Segmenter(
      undefined,
      {
        granularity: 'word',
      },
    );
    const iter = (
      seg as unknown as { segment(s: string): IterableIterator<unknown> }
    ).segment(slice) as IterableIterator<unknown>;
    for (const s of iter) {
      if ((s as { isWordLike?: boolean }).isWordLike) {
        const start = (s as { index: number }).index;
        const end = start + (s as { segment: string }).segment.length;
        words.push({ start, end });
      }
    }
  } catch {
    const re = /[\p{L}\p{N}_]+/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(slice))) {
      words.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  if (words.length === 0)
    return { start: Math.max(0, state.caret - 1), end: state.caret };
  const take = Math.min(Math.max(words.length, minWords), maxWords);
  const start = words[Math.max(0, words.length - take)].start;
  return { start, end: state.caret };
}
