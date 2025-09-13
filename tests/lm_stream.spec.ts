/*╔══════════════════════════════════════════════════════════╗
  ║  ░  L M   S T R E A M   S P E C  ░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                          ║
  ║   Unit tests for JSONL two‑pass LM mock stream.          ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  • WHAT ▸ Parse/apply events; verify stage ordering & outputs
  • WHY  ▸ Ensure lab protocol correctness and safety
  • HOW  ▸ Use createMockStreamLMAdapter on a fixed input
*/

import { describe, it, expect } from 'vitest';
import { createMockStreamLMAdapter } from '../core/lm/mockStreamAdapter';

function applyTranscript(
  text: string,
  band: { start: number; end: number },
  lines: string[],
) {
  let ctx = text.slice(band.start, band.end);
  let tone = '';
  for (const line of lines) {
    let ev: any;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.type === 'diff' && ev.stage === 'context') {
      const ls = ev.span.start;
      const le = ev.span.end;
      ctx = ctx.slice(0, ls) + ev.text + ctx.slice(le);
    } else if (ev.type === 'commit' && ev.stage === 'context') {
      ctx = ev.text;
    } else if (ev.type === 'diff' && ev.stage === 'tone') {
      const ls = ev.span.start;
      const le = ev.span.end;
      tone = (tone || ctx).slice(0, ls) + ev.text + (tone || ctx).slice(le);
    } else if (ev.type === 'commit' && ev.stage === 'tone') {
      tone = ev.text;
    }
  }
  return { contextOut: ctx, toneOut: tone || ctx };
}

describe('LM mock JSONL stream', () => {
  it('produces context then tone with expected outputs', async () => {
    // SCEN-LM-STREAM-001: CONTRACT-LM-STREAM acceptance
    const adapter = createMockStreamLMAdapter();
    const text = 'The teh brwon fox';
    const band = { start: 4, end: text.length };

    const lines: string[] = [];
    for await (const line of adapter.stream({
      text,
      caret: band.end + 1,
      band,
      settings: { toneTarget: 'Professional' },
    })) {
      lines.push(line.trim());
    }
    const { contextOut, toneOut } = applyTranscript(text, band, lines);
    expect(contextOut).toContain('the brown');
    expect(toneOut.startsWith('Consequently,')).toBe(true);
  });
});
