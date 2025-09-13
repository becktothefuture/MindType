/*╔══════════════════════════════════════════════════════════╗
  ║  ░  DIFFUSIONCONTROLLER  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Streamed diffusion of LM corrections; Context transformer with ±2 sentence look-around; Tone transformer with baseline detection and selectable tone; Confidence gating across pipeline stages; Integrate Noise → Context → Tone pipeline with staging buffer; English-only gating for full pipeline (Noise for others)
  • WHY  ▸ REQ-STREAMED-DIFFUSION, REQ-CONTEXT-TRANSFORMER, REQ-TONE-TRANSFORMER, REQ-CONFIDENCE-GATE, REQ-THREE-STAGE-PIPELINE, REQ-LANGUAGE-GATING
  • HOW  ▸ See linked contracts and guides in docs
*/

import {
  MAX_SWEEP_WINDOW,
  getMinValidationWords,
  getMaxValidationWords,
} from '../config/defaultThresholds';
import { noiseTransform } from '../engines/noiseTransformer';
import { replaceRange } from '../utils/diff';
import type { LMAdapter } from './lm/types';
import type { ActiveRegionPolicy } from './activeRegionPolicy';
import { emitActiveRegion } from '../ui/highlighter';
import { renderHighlight } from '../ui/swapRenderer';
import { createLogger } from './logger';
import { streamMerge } from './lm/mergePolicy';
import { UndoIsolation } from './undoIsolation';

export interface DiffusionState {
  text: string;
  caret: number;
  frontier: number; // leftmost index not yet validated
}

// ActiveRegionPolicy: future‑proof hook for LM integration (type in core/activeRegionPolicy.ts)
// - computeRenderRange: what to visualize (active region)
// - computeContextRange: what to provide to an LLM adapter (can span sentences/paragraphs)

// LIB_TOUCH: Using Intl.Segmenter for Unicode-aware word boundary detection
// Context7 docs: Intl.Segmenter provides granularity: 'word' for word-like segments
// The isWordLike property indicates segments that are actual words vs punctuation/spaces
export function createDiffusionController(
  policy?: ActiveRegionPolicy,
  getLMAdapter?: () => LMAdapter | null | undefined,
) {
  // Safari/older browsers: Intl.Segmenter may be missing or partial. Provide a fallback.
  let seg: Intl.Segmenter | null = null;
  try {
    seg = new Intl.Segmenter(undefined, { granularity: 'word' });
  } catch {
    seg = null;
  }
  const log = createLogger('diffusion');
  const undo = new UndoIsolation(150);

  let state: DiffusionState = { text: '', caret: 0, frontier: 0 };
  // Throttle rendering to avoid UI storms (esp. Safari). ~60fps ceiling.
  let lastRenderMs = 0;
  const MIN_RENDER_INTERVAL_MS = 16;

  function maybeRender() {
    const now = Date.now();
    if (now - lastRenderMs >= MIN_RENDER_INTERVAL_MS) {
      lastRenderMs = now;
      const renderRange = policy ? policy.computeRenderRange(state) : bandRange();
      emitActiveRegion(renderRange);
      // Emit selection snapshot for LM inspector/debug
      try {
        const { start, end } = renderRange;
        const ctxBefore = state.text.slice(Math.max(0, start - 60), start);
        const span = state.text.slice(start, end);
        const ctxAfter = state.text.slice(end, Math.min(state.text.length, end + 60));
        (globalThis as unknown as Record<string, unknown>).__mtLastLMSelection = {
          band: renderRange,
          span,
          ctxBefore,
          ctxAfter,
        };
      } catch {}
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
    log.debug('update', { caret, frontier: state.frontier, textLen: text.length });
    maybeRender();
  }

  function iterateWordSegments(slice: string): Array<{ index: number; segment: string }> {
    const out: Array<{ index: number; segment: string }> = [];
    if (seg) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const s of (seg as any).segment(slice)) {
        if ((s as { isWordLike?: boolean }).isWordLike)
          out.push({ index: s.index, segment: s.segment });
      }
      return out;
    }
    // Fallback: unicode word run matches
    const re = /[\p{L}\p{N}_]+/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(slice))) {
      out.push({ index: m.index, segment: m[0] });
    }
    return out;
  }

  function bandRange(): { start: number; end: number } {
    // Compute a range covering min..max words behind caret, starting at frontier
    const slice = state.text.slice(state.frontier, state.caret);
    const words: Array<{ start: number; end: number }> = iterateWordSegments(slice).map(
      (s) => ({
        start: state.frontier + s.index,
        end: state.frontier + s.index + s.segment.length,
      }),
    );
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
    const segments = iterateWordSegments(slice);
    for (const s of segments) {
      const start = state.frontier + s.index;
      const end = start + s.segment.length;
      if (end <= state.caret) return { start, end };
    }
    return null;
  }

  function tickOnce() {
    const r = nextWordRange();
    if (!r) return;
    const res = noiseTransform({ text: state.text, caret: state.caret, hint: r });
    if (res.diff) {
      // Do not log user text per privacy policy
      log.debug('diff', {
        start: res.diff.start,
        end: res.diff.end,
      });
      // Apply the diff to local state for consistency with host
      try {
        const updated = replaceRange(
          state.text,
          res.diff.start,
          res.diff.end,
          res.diff.text,
          state.caret,
        );
        state.text = updated;
      } catch {
        // If safety check fails, skip applying but still advance to avoid stalls
        log.warn('replaceRange failed (safety)', { caret: state.caret });
      }
      renderHighlight({ start: res.diff.start, end: res.diff.end, text: res.diff.text });
      const newEnd = res.diff.start + res.diff.text.length;
      state.frontier = Math.max(state.frontier, newEnd);
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
    // LM streaming merge (FT-232)
    try {
      const adapter = getLMAdapter?.();
      if (!adapter) return;
      const renderRange = policy ? policy.computeRenderRange(state) : bandRange();
      if (renderRange.end > state.caret) return;
      const controllerText = state.text;
      const controllerCaret = state.caret;
      const shouldCancel = () =>
        controllerText !== state.text || controllerCaret !== state.caret;
      for await (const ev of streamMerge({
        adapter,
        text: controllerText,
        caret: controllerCaret,
        band: renderRange,
        shouldCancel,
      })) {
        if (ev.type === 'diff' && ev.diff) {
          try {
            const updated = replaceRange(
              state.text,
              ev.diff.start,
              ev.diff.end,
              ev.diff.text,
              state.caret,
            );
            state.text = updated;
            renderHighlight({
              start: ev.diff.start,
              end: ev.diff.end,
              text: ev.diff.text,
            });
            state.frontier = Math.max(
              state.frontier,
              ev.diff.start + ev.diff.text.length,
            );
          } catch {}
        } else if (ev.type === 'rollback' && ev.diff) {
          try {
            const updated = replaceRange(
              state.text,
              ev.diff.start,
              ev.diff.end,
              ev.diff.text,
              state.caret,
            );
            state.text = updated;
            renderHighlight({
              start: ev.diff.start,
              end: ev.diff.end,
              text: ev.diff.text,
            });
          } catch {}
        } else if (ev.type === 'done' || ev.type === 'cancelled') {
          break;
        }
      }
      clampFrontier();
      maybeRender();
    } catch {}
  }

  function applyExternal(diff: { start: number; end: number; text: string }): boolean {
    try {
      const before = state.text.slice(diff.start, diff.end);
      const updated = replaceRange(
        state.text,
        diff.start,
        diff.end,
        diff.text,
        state.caret,
      );
      state.text = updated;
      const newEnd = diff.start + diff.text.length;
      state.frontier = Math.max(state.frontier, newEnd);
      clampFrontier();
      maybeRender();
      try {
        // Emit highlight so hosts (web demo) apply the visible replacement
        renderHighlight({ start: diff.start, end: diff.end, text: diff.text });
      } catch {}
      try {
        undo.addEdit({
          start: diff.start,
          end: newEnd,
          before,
          after: diff.text,
          appliedAt: Date.now(),
        });
      } catch {}
      return true;
    } catch {
      // Safety guards failed; ignore external diff
      return false;
    }
  }

  function rollbackLastSystemGroup(): void {
    const g = undo.popLastGroup();
    if (!g || g.edits.length === 0) return;
    for (let i = g.edits.length - 1; i >= 0; i--) {
      const e = g.edits[i];
      try {
        const updated = replaceRange(
          state.text,
          e.start,
          e.start + e.after.length,
          e.before,
          state.caret,
        );
        state.text = updated;
        state.frontier = Math.min(state.frontier, e.start);
      } catch {}
    }
    clampFrontier();
    maybeRender();
  }

  return {
    update,
    tickOnce,
    catchUp,
    getState: () => state,
    applyExternal,
    rollbackLastSystemGroup,
    getActiveRegionPolicy: () => policy,
  };
}
