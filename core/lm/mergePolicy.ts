/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   S T R E A M I N G   M E R G E   P O L I C Y  ░░░░  ║
  ║                                                              ║
  ║   Merges LM token streams strictly within the ACTIVE REGION. ║
  ║   Cancels on input and supports caret-entry rollback.        ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Compute diffs from streamed chunks within band only
  • WHY  ▸ Caret-safe, deterministic merging for FT-232/232A
  • HOW  ▸ Accumulate span, emit boundary-coalesced diffs; rollback safe
*/

import type { LMAdapter } from './types';
import { replaceRange } from '../../utils/diff';

export interface Band {
  start: number;
  end: number;
}

export interface MergeEvent {
  type: 'diff' | 'rollback' | 'cancelled' | 'done';
  diff?: { start: number; end: number; text: string };
}

export interface StreamingMergeOptions {
  adapter: LMAdapter;
  text: string;
  caret: number;
  band: Band; // render/context band, must be strictly < caret
  // Optional: predicate to stop merging when external input occurs
  shouldCancel?: () => boolean;
}

function isBoundaryChar(ch: string): boolean {
  return /[\s.,!?;:—"'”’)\]\}]/.test(ch);
}

/**
 * Consumes an LM stream and yields caret-safe diffs confined to the band.
 * If `shouldCancel` returns true or caret enters the band, emits a single
 * rollback event to restore the original span and stops.
 */
export async function* streamMerge(
  opts: StreamingMergeOptions,
): AsyncIterable<MergeEvent> {
  const { adapter, text, caret, band, shouldCancel } = opts;
  if (band.end > caret) {
    // Safety: never allow edits that reach the caret
    return;
  }

  const originalSpan = text.slice(band.start, band.end);
  let accum = '';

  try {
    // Early cancellation before starting
    if (shouldCancel?.()) {
      yield { type: 'cancelled' };
      return;
    }
    const stream = adapter.stream({ text, caret, band });
    for await (const chunk of stream) {
      if (shouldCancel?.()) {
        // Roll back to original span if anything was applied
        if (accum.length > 0) {
          yield {
            type: 'rollback',
            diff: {
              start: band.start,
              end: band.start + accum.length,
              text: originalSpan,
            },
          };
        } else {
          yield { type: 'cancelled' };
        }
        return;
      }

      accum += chunk;

      // Coalesce on boundaries so host applies fewer diffs
      const last = accum.length > 0 ? accum[accum.length - 1] : '';
      const isBoundary = isBoundaryChar(last);
      if (!isBoundary) continue;

      // Emit a diff from start..(start+originalSpan.length) to accumulated text
      const proposed = { start: band.start, end: band.end, text: accum };
      // Caret-safe check using shared util (throws on violations)
      try {
        replaceRange(text, proposed.start, proposed.end, proposed.text, caret);
      } catch {
        // If safety fails (should not), skip this emission
        continue;
      }
      yield { type: 'diff', diff: proposed };
    }

    // Flush remainder if any tokens were seen and not yet emitted
    if (accum.length && accum !== originalSpan) {
      const final = { start: band.start, end: band.end, text: accum };
      try {
        replaceRange(text, final.start, final.end, final.text, caret);
        yield { type: 'diff', diff: final };
      } catch {
        // ignore
      }
    }
    yield { type: 'done' };
  } finally {
    // no-op: adapter ownership of abort is external
  }
}
