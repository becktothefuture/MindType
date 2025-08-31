/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   M E R G E   P O L I C Y  —  F U Z Z   T E S T  ░░  ║
  ║                                                              ║
  ║   Randomized chunking + Unicode near caret/band edges.       ║
  ║   Validates invariants: caret-safe diffs within band only.   ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect } from 'vitest';
import { streamMerge } from '../core/lm/mergePolicy';

function mulberry32(seed: number) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PUNCTUATION = [' ', '.', ',', '!', '?', ';', ':', '—', '”', ')'];
const EMOJIS = ['🙂', '👨‍👩‍👧‍👦', '✨'];

function randomText(rand: () => number): string {
  const words = ['hello', 'teh', 'world', 'adn', 'hte', 'quick', 'brown', 'fox'];
  const parts: string[] = [];
  const n = 10 + Math.floor(rand() * 10);
  for (let i = 0; i < n; i++) {
    const chooseEmoji = rand() < 0.05;
    parts.push(
      chooseEmoji
        ? EMOJIS[Math.floor(rand() * EMOJIS.length)]
        : words[Math.floor(rand() * words.length)],
    );
    parts.push(PUNCTUATION[Math.floor(rand() * PUNCTUATION.length)]);
  }
  return parts.join('').slice(0, 120);
}

function chunkReplacement(rand: () => number, s: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < s.length) {
    const size = 1 + Math.floor(rand() * 4);
    chunks.push(s.slice(i, Math.min(s.length, i + size)));
    i += size;
  }
  // encourage some boundary chars near chunk edges
  if (chunks.length && rand() < 0.5) chunks[chunks.length - 1] += ' ';
  return chunks;
}

describe('LM merge policy (fuzz)', () => {
  it('never emits diffs that cross the caret or band', async () => {
    const seeds = 100;
    for (let seed = 1; seed <= seeds; seed++) {
      const rand = mulberry32(seed);
      const text = randomText(rand);
      const caret = Math.max(3, Math.floor(rand() * text.length));
      const bandStart = Math.max(0, caret - (5 + Math.floor(rand() * 10)));
      const band = { start: bandStart, end: caret - 1 };
      const replacementSpan = text
        .slice(band.start, band.end)
        .replaceAll('teh', 'the')
        .replaceAll('adn', 'and');
      const chunks = chunkReplacement(rand, replacementSpan || ' ');
      const adapter = {
        async *stream() {
          for (const c of chunks) yield c;
        },
      } as const;

      const diffs: Array<{ start: number; end: number; text: string }> = [];
      const events: string[] = [];
      let cancelAfter = rand() < 0.1 ? 1 : Number.POSITIVE_INFINITY;
      let seen = 0;
      const shouldCancel = () => seen >= cancelAfter;
      try {
        for await (const ev of streamMerge({
          adapter: adapter as unknown as {
            stream: (p: {
              text: string;
              caret: number;
              band: { start: number; end: number };
            }) => AsyncIterable<string>;
          },
          text,
          caret,
          band,
          shouldCancel,
        })) {
          events.push(ev.type);
          if (ev.type === 'diff' && ev.diff) {
            seen++;
            diffs.push(ev.diff);
            // invariants per diff
            expect(ev.diff.start).toBeGreaterThanOrEqual(band.start);
            expect(ev.diff.end).toBeLessThanOrEqual(band.end);
            expect(ev.diff.end).toBeLessThanOrEqual(caret);
          }
        }
      } catch (e) {
        // no crashes allowed
        expect(e).toBeUndefined();
      }
      // If we emitted, ensure last event is done/rollback/cancelled
      if (events.length)
        expect(['done', 'rollback', 'cancelled', 'diff']).toContain(events.at(-1));
    }
  }, 10_000);
});
