/*╔══════════════════════════════════════════════════════════╗
  ║  ░  CONTEXTTRANSFORMER  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Context transformer with ±2 sentence look-around
  • WHY  ▸ REQ-CONTEXT-TRANSFORMER
  • HOW  ▸ See linked contracts and guides in docs
*/

import { CONFIDENCE_THRESHOLDS } from '../config/defaultThresholds';
import type { LMContextManager } from '../core/lm/contextManager';

export interface ContextWindow {
  currentSentence: string;
  previousSentences: string[]; // up to 2 (S-1 weight 1.0, S-2 weight 0.5)
  nextSentences: string[]; // lookahead gate (not editing after caret)
}

export interface TransformInput {
  text: string;
  caret: number;
}

export interface ProposalDiff {
  start: number;
  end: number;
  text: string;
}

export interface TransformResult {
  window: ContextWindow;
  proposals: ProposalDiff[]; // caret-safe proposals only
}

function splitSentences(doc: string): Array<{ start: number; end: number }> {
  // Simple sentence segmentation by punctuation; ensures end ≤ caret before edits
  const out: Array<{ start: number; end: number }> = [];
  let start = 0;
  for (let i = 0; i < doc.length; i++) {
    const ch = doc[i];
    if (ch === '.' || ch === '!' || ch === '?') {
      // include trailing space
      let end = i + 1;
      while (end < doc.length && doc[end] === ' ') end++;
      out.push({ start, end });
      start = end;
    }
  }
  if (start < doc.length) out.push({ start, end: doc.length });
  return out;
}

function sentenceAtCaret(
  bounds: Array<{ start: number; end: number }>,
  caret: number,
): number {
  let idx = bounds.length - 1;
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i];
    // Use half-open interval: [start, end) so caret at next start belongs to that next sentence
    if (b.start <= caret && caret < b.end) return i;
    if (caret < b.start) return Math.max(0, i - 1);
  }
  return idx;
}

export function buildContextWindow(text: string, caret: number): ContextWindow {
  const sent = splitSentences(text);
  const idx = sentenceAtCaret(sent, caret);
  const cur = sent[idx] ?? { start: 0, end: caret };
  const prev1 = sent[idx - 1];
  const prev2 = sent[idx - 2];
  const next1 = sent[idx + 1];
  const next2 = sent[idx + 2];
  return {
    currentSentence: text.slice(cur.start, cur.end),
    previousSentences: [prev1, prev2]
      .filter(Boolean)
      .map((b) => text.slice(b.start, b.end)),
    nextSentences: [next1, next2].filter(Boolean).map((b) => text.slice(b.start, b.end)),
  };
}

function deterministicRepairs(span: string): { span: string; changed: boolean } {
  let out = span;
  let changed = false;
  // Minimal grammar repairs suitable for Context stage
  // 1) Capitalize first letter after sentence boundary if lowercase
  out = out.replace(/(^|[.!?]\s+)([a-z])/g, (_m, p1, p2) => {
    changed = changed || p2 !== p2.toUpperCase();
    return `${p1}${p2.toUpperCase()}`;
  });
  // 2) Add period if sentence-like and missing terminal punctuation
  if (/\w[\w\s,'”\)\]]+$/.test(out) && !/[.!?]\s*$/.test(out)) {
    out = out.trimEnd() + '.';
    changed = true;
  }
  return { span: out, changed };
}

export async function contextTransform(
  input: TransformInput, 
  lmAdapter?: any,
  contextManager?: LMContextManager
): Promise<TransformResult> {
  const { text, caret } = input;
  const window = buildContextWindow(text, caret);

  // Gate on input fidelity (cheap heuristic on current+prev context)
  const sample = [window.previousSentences.join(' '), window.currentSentence]
    .join(' ')
    .slice(-200);
  const nonSpace = sample.replace(/\s+/g, '');
  const inputFidelity =
    nonSpace.length === 0
      ? 0
      : (nonSpace.match(/[\p{L}\p{N}]/gu) || []).length / nonSpace.length;
  if (inputFidelity < CONFIDENCE_THRESHOLDS.τ_input) {
    return { window, proposals: [] };
  }

  // Only operate strictly before the caret
  const curStart = text.lastIndexOf(window.currentSentence);
  const curEnd = curStart + window.currentSentence.length;
  const safeEnd = Math.min(curEnd, caret);
  const curSpan = text.slice(curStart, safeEnd);
  const { span: repaired, changed } = deterministicRepairs(curSpan);

  const proposals: ProposalDiff[] = [];
  if (changed) {
    proposals.push({ start: curStart, end: safeEnd, text: repaired });
  }
  // Punctuation normalization within current sentence
  const normalizePunct = (s: string): string => {
    let out = s;
    out = out.replace(/\s+([,.])/g, '$1');
    out = out.replace(/([,.])(\S)/g, '$1 $2');
    // Em dash spacing unify
    out = out.replace(/\s?—\s?/g, ' — ');
    return out;
  };
  const punctNorm = normalizePunct(curSpan);
  if (punctNorm !== curSpan) {
    proposals.push({ start: curStart, end: safeEnd, text: punctNorm });
  }
  // Capitalization: sentence start and standalone 'i'
  let capSpan = curSpan.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_m, p1, p2) => `${p1}${p2.toUpperCase()}`,
  );
  capSpan = capSpan.replace(/(?<=^|\s)i(?=\s|$)/g, 'I');
  if (capSpan !== curSpan) {
    proposals.push({ start: curStart, end: safeEnd, text: capSpan });
  }

  // LM-based corrections using dual-context approach
  if (lmAdapter && contextManager && contextManager.isInitialized()) {
    try {
      const contextWindow = contextManager.getContextWindow();
      
      // Use close context for focused corrections
      const closeText = contextWindow.close.text;
      
      // Generate LM prompt with wide context awareness
      const { selectSpanAndPrompt, postProcessLMOutput } = await import('../core/lm/policy');
      const selection = selectSpanAndPrompt(text, caret);
      
      if (selection.band && selection.prompt) {
        console.log('[ContextTransformer] LM processing with dual-context:', {
          wideTokens: contextWindow.wide.tokenCount,
          closeLength: closeText.length,
          bandSize: selection.band.end - selection.band.start
        });

        // Stream LM response
        let lmOutput = '';
        for await (const chunk of lmAdapter.stream({
          text,
          caret,
          band: selection.band,
          settings: { 
            prompt: selection.prompt, 
            maxNewTokens: selection.maxNewTokens,
            wideContext: contextWindow.wide.text.slice(0, 2000), // Truncate for performance
            closeContext: closeText
          }
        })) {
          lmOutput += chunk;
        }

        const cleanedOutput = postProcessLMOutput(lmOutput.trim(), selection.span?.length || 0);
        
        // Validate proposal against wide context
        if (cleanedOutput && selection.span && contextManager.validateProposal(cleanedOutput, selection.span)) {
          console.log('[ContextTransformer] LM proposal validated:', {
            original: selection.span.slice(0, 30),
            proposal: cleanedOutput.slice(0, 30)
          });
          
          proposals.push({
            start: selection.band.start,
            end: selection.band.end,
            text: cleanedOutput
          });
        } else {
          console.log('[ContextTransformer] LM proposal rejected by validation');
        }
      }
    } catch (error) {
      console.warn('[ContextTransformer] LM processing failed:', error);
      // Fall back to deterministic repairs only
    }
  }

  return { window, proposals };
}
