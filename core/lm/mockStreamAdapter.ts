/*╔══════════════════════════════════════════════════════════╗
  ║  ░  MOCKSTREAMADAPTER  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ JSONL LM stream protocol (context → tone)
  • WHY  ▸ CONTRACT-LM-STREAM
  • HOW  ▸ See linked contracts and guides in docs
*/

import type { LMAdapter, LMCapabilities, LMStreamEvent, LMStreamParams } from './types';

function jline(obj: LMStreamEvent): string {
  return JSON.stringify(obj) + '\n';
}

export function createMockStreamLMAdapter(): LMAdapter {
  let aborted = false;
  return {
    init(): LMCapabilities {
      return { backend: 'cpu', maxContextTokens: 256 };
    },
    abort() { aborted = true; },
    async *stream(params: LMStreamParams): AsyncIterable<string> {
      aborted = false;
      const { text, band } = params;
      const bandText = text.slice(band.start, band.end);

      // Simple deterministic corrections for demo purposes
      const ctxFixed = bandText
        .replace(/\bteh\b/gi, (m) => (m[0] === 'T' ? 'The' : 'the'))
        .replace(/\bbrwon\b/gi, 'brown')
        .replace(/\bnto\b/gi, 'not');

      // Tone pass: "Professional" inserts a transitional adverb at start
      function applyTone(s: string, tone: 'None' | 'Casual' | 'Professional'): string {
        if (tone === 'Professional') return s.replace(/^([a-z])/, (_, c) => 'Consequently, ' + c);
        if (tone === 'Casual') return s.replace(/^([A-Z])/, (_, c) => 'Hey, ' + c.toLowerCase());
        return s;
      }

      const toneTarget = (params.settings as any)?.toneTarget ?? 'None';

      const events: LMStreamEvent[] = [
        { type: 'meta', session: 's-mock', model: 'mock-lm', version: '0.4' },
        {
          type: 'rules',
          band,
          confidence: { tau_input: 0.6, tau_commit: 0.8, tau_tone: 0.7 },
          toneTarget,
        },
        { type: 'stage', id: 'context', state: 'start' },
      ];

      // Emit a couple of small diffs (simulate token boundaries)
      const firstTeh = bandText.search(/\bteh\b/i);
      if (firstTeh >= 0) {
        events.push({ type: 'diff', stage: 'context', band, span: { start: firstTeh, end: firstTeh + 3 }, text: 'the', confidence: 0.72 });
      }
      const firstBrwon = bandText.search(/\bbrwon\b/i);
      if (firstBrwon >= 0) {
        events.push({ type: 'diff', stage: 'context', band, span: { start: firstBrwon, end: firstBrwon + 5 }, text: 'brown', confidence: 0.75 });
      }
      events.push({ type: 'commit', stage: 'context', band, text: ctxFixed, confidence: 0.86 });

      // Tone stage
      events.push({ type: 'stage', id: 'tone', state: 'start', tone: toneTarget });
      const toned = applyTone(ctxFixed, toneTarget);
      // If tone added a prefix, emit as diff of span [0,0] insert
      if (toned !== ctxFixed) {
        const insertText = toned.slice(0, toned.length - ctxFixed.length);
        events.push({ type: 'diff', stage: 'tone', band, span: { start: 0, end: 0 }, text: insertText });
      }
      events.push({ type: 'commit', stage: 'tone', band, text: toned, tone: toneTarget, confidence: 0.9 });
      events.push({ type: 'done' });

      for (const ev of events) {
        if (aborted) return;
        // Small async gap to simulate streaming
        await new Promise((r) => setTimeout(r, 0));
        yield jline(ev);
      }
    },
  };
}


