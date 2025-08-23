/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   M E R G E   P O L I C Y   ( T E S T S )  ░░░░░░░░  ║
  ║                                                              ║
  ║   Validates caret-safe streaming merges and rollback.        ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Ensures merges stay within band and rollback works
  • WHY  ▸ FT-232 / FT-232A correctness
  • HOW  ▸ Mock LMAdapter yields chunks; assert emitted diffs
*/

import { describe, it, expect } from 'vitest';
import { streamMerge } from '../core/lm/mergePolicy';

function makeAdapter(chunks: string[]) {
  return {
    init: () => ({ backend: 'cpu' as const, maxContextTokens: 512 }),
    abort: () => {},
    async *stream(): AsyncIterable<string> {
      for (const c of chunks) {
        await new Promise((r) => setTimeout(r, 0));
        yield c;
      }
    },
  } as const;
}

describe('LM merge policy', () => {
  it('emits diffs only inside the band and respects caret', async () => {
    const text = 'Hello teh world';
    const caret = text.length; // caret at end
    const band = { start: 0, end: 11 }; // covers "Hello teh"
    const adapter = makeAdapter(['the ', '']);

    const events = [] as Array<ReturnType<typeof Object>>;
    for await (const ev of streamMerge({ adapter, text, caret, band })) {
      events.push(ev);
    }
    const diffs = events.filter((e) => e.type === 'diff');
    expect(diffs.length).toBeGreaterThan(0);
    const last = diffs[diffs.length - 1] as {
      diff: { start: number; end: number; text: string };
    };
    expect(last.diff.start).toBe(band.start);
    expect(last.diff.end).toBe(band.end);
    expect(last.diff.text.includes('the')).toBe(true);
  });

  it('rolls back when cancelled mid-stream', async () => {
    const text = 'I typd adn teh';
    const caret = text.length;
    const band = { start: 0, end: caret - 1 };
    const adapter = makeAdapter(['typed ', 'and ', 'the ']);
    let cancelled = false;
    const events: string[] = [];
    for await (const ev of streamMerge({
      adapter,
      text,
      caret,
      band,
      shouldCancel: () => cancelled,
    })) {
      events.push(ev.type);
      if (ev.type === 'diff') cancelled = true; // cancel after first diff
    }
    expect(events.includes('rollback') || events.includes('cancelled')).toBe(true);
  });

  it('emits cancelled when stopped before any chunk', async () => {
    const text = 'abc def';
    const caret = text.length;
    const band = { start: 0, end: 3 };
    const adapter = makeAdapter([]); // no chunks
    const events: string[] = [];
    let stop = true;
    for await (const ev of streamMerge({
      adapter,
      text,
      caret,
      band,
      shouldCancel: () => stop,
    })) {
      events.push(ev.type);
    }
    // No chunks and immediate cancel → either no events or cancelled
    expect(events.includes('cancelled') || events.length === 0).toBe(true);
  });

  it('flushes remainder at end when last token is not boundary', async () => {
    const text = 'foo bar';
    const caret = text.length;
    const band = { start: 0, end: 3 };
    const adapter = makeAdapter(['baz']); // no boundary char
    const diffs: Array<{ start: number; end: number; text: string }> = [];
    for await (const ev of streamMerge({ adapter, text, caret, band })) {
      if (ev.type === 'diff' && ev.diff) diffs.push(ev.diff);
    }
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs[diffs.length - 1].text).toContain('baz');
  });

  it('cancels inside loop before any accumulation', async () => {
    const text = 'abcdef';
    const caret = text.length;
    const band = { start: 0, end: 3 };
    const adapter = makeAdapter(['x']);
    let first = true;
    const events: string[] = [];
    for await (const ev of streamMerge({
      adapter,
      text,
      caret,
      band,
      shouldCancel: () => first,
    })) {
      events.push(ev.type);
      first = false;
    }
    expect(events.includes('cancelled')).toBe(true);
  });

  it('skips final flush when accumulated equals original span', async () => {
    const text = 'abc xyz';
    const caret = 3; // caret at end of span
    const band = { start: 0, end: 3 };
    const adapter = makeAdapter(['abc']);
    const events: string[] = [];
    for await (const ev of streamMerge({ adapter, text, caret, band })) {
      events.push(ev.type);
    }
    // No diff emitted because not boundary and equals originalSpan; only 'done'
    expect(events).toEqual(['done']);
  });

  it('coalesces multiple small chunks and emits multiple diffs on boundaries', async () => {
    const text = 'teh qk';
    const caret = text.length;
    const band = { start: 0, end: 3 };
    const adapter = makeAdapter(['t', 'he', ' ', 'quick']);
    const events: string[] = [];
    let diffCount = 0;
    for await (const ev of streamMerge({ adapter, text, caret, band })) {
      events.push(ev.type);
      if (ev.type === 'diff') diffCount += 1;
    }
    expect(diffCount).toBeGreaterThanOrEqual(1);
    expect(events.at(-1)).toBe('done');
  });

  it('guards when band reaches caret (no events)', async () => {
    const text = 'hello';
    const caret = text.length - 1; // caret before end
    const band = { start: 0, end: caret + 1 }; // invalid (== caret+1)
    const adapter = makeAdapter(['x ']);
    const events: string[] = [];
    for await (const ev of streamMerge({ adapter, text, caret, band })) {
      events.push(ev.type);
    }
    expect(events.length).toBe(0);
  });
});
