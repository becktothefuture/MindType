/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   B E H A V I O R   P O L I C Y  ░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Single place to define span selection, prompting,          ║
  ║   and post-processing rules for caret‑safe diffusion.        ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Centralized config + helpers for LM-driven corrections
  • WHY  ▸ Consistency across hosts; easy to tune thresholds
  • HOW  ▸ Select span near caret, build context-aware prompt,   
            and sanitize LM output before merging                
*/

export interface LMBehaviorConfig {
  minSpanChars: number;
  maxSpanChars: number;
  contextLeftChars: number;
  contextRightChars: number;
  enforceWordBoundaryAtEnd: boolean;
  maxTokensFactor: number; // ~multiple of span length
  maxTokensCap: number;
}

export const defaultLMBehaviorConfig: LMBehaviorConfig = {
  minSpanChars: 3,
  maxSpanChars: 80,
  contextLeftChars: 60,
  contextRightChars: 60,
  enforceWordBoundaryAtEnd: true,
  maxTokensFactor: 1.1,
  maxTokensCap: 32,
};

export interface SpanAndPrompt {
  band: { start: number; end: number } | null;
  prompt: string | null;
  span: string | null;
  maxNewTokens: number;
}

export function selectSpanAndPrompt(
  text: string,
  caret: number,
  cfg: LMBehaviorConfig = defaultLMBehaviorConfig,
): SpanAndPrompt {
  const band = computeSimpleBand(text, caret);
  if (!band) return { band: null, prompt: null, span: null, maxNewTokens: 0 };
  const span = text.slice(band.start, band.end);
  if (span.length < cfg.minSpanChars)
    return { band: null, prompt: null, span: null, maxNewTokens: 0 };
  if (span.length > cfg.maxSpanChars)
    return { band: null, prompt: null, span: null, maxNewTokens: 0 };
  if (cfg.enforceWordBoundaryAtEnd && /\w$/.test(span)) {
    return { band: null, prompt: null, span: null, maxNewTokens: 0 };
  }
  const ctxLeft = Math.max(0, band.start - cfg.contextLeftChars);
  const ctxRight = Math.min(text.length, band.end + cfg.contextRightChars);
  const ctxBefore = text.slice(ctxLeft, band.start);
  const ctxAfter = text.slice(band.end, ctxRight);
  const instruction =
    'Correct ONLY the Span. Do not add explanations or extra words. Return just the corrected Span.';
  const prompt = `${instruction}\nContext before: «${ctxBefore}»\nSpan: «${span}»\nContext after: «${ctxAfter}»`;
  const maxNewTokens = Math.min(
    Math.ceil(span.length * cfg.maxTokensFactor) + 6,
    cfg.maxTokensCap,
  );
  return { band, prompt, span, maxNewTokens };
}

export function postProcessLMOutput(
  raw: string,
  bandLength: number,
  _cfg: LMBehaviorConfig = defaultLMBehaviorConfig,
): string {
  if (!raw) return '';
  let fixed = raw.split(/\r?\n/)[0] ?? raw;
  fixed = fixed.replace(/^["'`]+|["'`]+$/g, '').trim();
  const cap = Math.max(Math.ceil(bandLength * 2), 24);
  if (fixed.length > cap) fixed = fixed.slice(0, cap);
  return fixed;
}

function computeSimpleBand(
  text: string,
  caretIndex: number,
): { start: number; end: number } | null {
  const left = text.slice(0, caretIndex);
  const parts = left.split(/(\b)/g);
  let words = 0;
  let i = parts.length - 1;
  while (i >= 0 && words < 10) {
    if (/\w+/.test(parts[i])) words++;
    i--;
  }
  const start = Math.max(0, left.lastIndexOf(parts[Math.max(0, i + 1)] ?? ''));
  return { start: isNaN(start) ? Math.max(0, caretIndex - 50) : start, end: caretIndex };
}
