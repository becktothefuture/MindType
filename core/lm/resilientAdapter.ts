/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  R E S I L I E N T   L M   A D A P T E R  ░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Wraps a primary LMAdapter with a timed fallback.           ║
  ║   Uses first-chunk race to decide primary vs fallback.       ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Provide robust LM streaming with timeout fallback
  • WHY  ▸ Real model may be slow/unavailable in browser
  • HOW  ▸ Wait for first chunk else switch to fallback adapter
*/

import type { LMAdapter, LMStreamParams } from './types';
import { createLogger } from '../logger';

const log = createLogger('lm.resilient');

export function createResilientLMAdapter(
  primary: LMAdapter,
  fallback: LMAdapter,
  timeoutMs: number = 1200,
): LMAdapter {
  return {
    init: primary.init?.bind(primary),
    stream(params: LMStreamParams): AsyncIterable<string> {
      // We return an async generator that yields from either primary or fallback
      async function* gen() {
        // Helper to buffer first chunk or timeout
        const primaryStream = primary.stream(params)[Symbol.asyncIterator]();
        let decided: 'primary' | 'fallback' | null = null;
        let firstChunk: string | null = null;

        const firstChunkPromise = (async () => {
          try {
            const r = await primaryStream.next();
            if (!r.done) {
              firstChunk = String(r.value ?? '');
              decided = 'primary';
            } else {
              // primary ended without chunks; prefer fallback
              decided = 'fallback';
            }
          } catch (err) {
            decided = 'fallback';
          }
        })();

        const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));

        await Promise.race([firstChunkPromise, timeoutPromise]);

        if (decided !== 'primary') {
          log.info('fallback engaged', { timeoutMs });
          // Drain fallback entirely
          for await (const chunk of fallback.stream(params)) {
            yield chunk;
          }
          return;
        }

        // Yield first chunk, then the rest of primary
        if (firstChunk != null) {
          yield firstChunk;
        }
        for await (const chunk of {
          [Symbol.asyncIterator]() { return primaryStream; },
        } as AsyncIterable<string>) {
          yield chunk;
        }
      }
      return { [Symbol.asyncIterator]: gen } as AsyncIterable<string>;
    },
  } as LMAdapter;
}


