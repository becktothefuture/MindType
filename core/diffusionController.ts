/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D I F F U S I O N   C O N T R O L L E R  ░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Streams caret‑safe fixes behind the caret word‑by‑word.    ║
  ║   Advances a frontier toward the caret and updates the UI.   ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Incremental "diffusion" behind caret
  • WHY  ▸ Visible trailing stream; catch‑up on pause
  • HOW  ▸ Unicode word segmentation; never edits at/after caret
*/

import {
  MAX_SWEEP_WINDOW,
  MIN_VALIDATION_WORDS,
  MAX_VALIDATION_WORDS,
} from '../config/defaultThresholds';
import { tidySweep } from '../engines/tidySweep';
import { renderValidationBand, renderHighlight } from '../ui/highlighter';

export interface DiffusionState {
  text: string;
  caret: number;
  frontier: number; // leftmost index not yet validated
}

// LIB_TOUCH: Using Intl.Segmenter for Unicode-aware word boundary detection
// Context7 docs: Intl.Segmenter provides granularity: 'word' for word-like segments
// The isWordLike property indicates segments that are actual words vs punctuation/spaces
export function createDiffusionController() {
  const seg = new Intl.Segmenter(undefined, { granularity: 'word' });

  let state: DiffusionState = { text: '', caret: 0, frontier: 0 };

  function clampFrontier() {
    const minFrontier = Math.max(0, state.caret - MAX_SWEEP_WINDOW);
    state.frontier = Math.max(state.frontier, minFrontier);
  }

  function update(text: string, caret: number) {
    state.text = text;
    state.caret = caret;
    clampFrontier();
    renderValidationBand(bandRange());
  }

  function bandRange(): { start: number; end: number } {
    // Compute a range covering min..max words behind caret, starting at frontier
    const slice = state.text.slice(state.frontier, state.caret);
    const words: Array<{ start: number; end: number }> = [];
    for (const s of seg.segment(slice)) {
      // Cast necessary due to incomplete TypeScript DOM types for Intl.Segmenter
      // isWordLike property exists but not in TS lib DOM types yet
      if ((s as { isWordLike?: boolean }).isWordLike) {
        const start = state.frontier + s.index;
        const end = start + s.segment.length;
        words.push({ start, end });
      }
    }
    if (words.length === 0) return { start: state.frontier, end: state.caret };
    const take = Math.min(
      Math.max(words.length, MIN_VALIDATION_WORDS),
      MAX_VALIDATION_WORDS,
    );
    const start = words[Math.max(0, words.length - take)].start;
    return { start, end: state.caret };
  }

  function nextWordRange(): { start: number; end: number } | null {
    if (state.frontier >= state.caret) return null;
    const slice = state.text.slice(state.frontier, state.caret);
    for (const s of seg.segment(slice)) {
      // Cast necessary due to incomplete TypeScript DOM types for Intl.Segmenter
      if ((s as { isWordLike?: boolean }).isWordLike) {
        const start = state.frontier + s.index;
        const end = start + s.segment.length;
        if (end <= state.caret) return { start, end };
      }
    }
    return null;
  }

  function tickOnce() {
    const r = nextWordRange();
    if (!r) return;
    const res = tidySweep({ text: state.text, caret: state.caret, hint: r });
    if (res.diff) {
      renderHighlight({ start: res.diff.start, end: res.diff.end });
      state.frontier = Math.max(state.frontier, res.diff.end);
    } else {
      // Even without a replacement, consider the word validated this tick
      state.frontier = Math.max(state.frontier, r.end);
    }
    clampFrontier();
    renderValidationBand(bandRange());
  }

  async function catchUp() {
    // Run a short, fast loop until frontier reaches caret
    // Note: caller controls cadence; we spin with minimal delay here
    while (state.frontier < state.caret) {
      tickOnce();
      // small microtask yield to avoid blocking
      await Promise.resolve();
    }
  }

  return { update, tickOnce, catchUp, getState: () => state };
}
