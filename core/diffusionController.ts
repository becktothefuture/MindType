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
  getMinValidationWords,
  getMaxValidationWords,
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
  // Throttle rendering to avoid UI storms (esp. Safari). ~60fps ceiling.
  let lastRenderMs = 0;
  const MIN_RENDER_INTERVAL_MS = 16;

  function maybeRender() {
    const now = Date.now();
    if (now - lastRenderMs >= MIN_RENDER_INTERVAL_MS) {
      lastRenderMs = now;
      renderValidationBand(bandRange());
    }
  }

  function clampFrontier() {
    const minFrontier = Math.max(0, state.caret - MAX_SWEEP_WINDOW);
    // Keep frontier within [minFrontier, caret]
    state.frontier = Math.min(state.caret, Math.max(state.frontier, minFrontier));
  }

  function update(text: string, caret: number) {
    state.text = text;
    state.caret = caret;
    clampFrontier();
    maybeRender();
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
    const minWords = getMinValidationWords();
    const maxWords = getMaxValidationWords();
    const take = Math.min(Math.max(words.length, minWords), maxWords);
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
    maybeRender();
  }

  async function catchUp() {
    // Process in small chunks to avoid blocking the UI/event loop.
    const MAX_PER_CHUNK = 20;
    let processed = 0;
    while (state.frontier < state.caret && processed < MAX_PER_CHUNK) {
      tickOnce();
      processed += 1;
    }
    if (state.frontier < state.caret) {
      // Yield via macrotask so Safari/WebKit can render and handle input.
      await new Promise((r) => setTimeout(r, 0));
      return catchUp();
    }
  }

  return { update, tickOnce, catchUp, getState: () => state };
}
