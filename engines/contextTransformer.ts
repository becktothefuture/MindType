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
import {
  computeConfidence,
  applyThresholds,
  computeInputFidelity,
  computeDynamicThresholds,
} from '../core/confidenceGate';
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
  lmAdapter?: unknown,
  contextManager?: LMContextManager,
): Promise<TransformResult> {
  const { text, caret } = input;
  // Enhanced diagnostic logging for LM-501
  const diagnosticId = `ctx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[ContextTransformer] START ${diagnosticId}`, {
    textLength: text.length,
    caret,
    hasLMAdapter: !!lmAdapter,
    hasContextManager: !!contextManager,
    contextManagerInitialized: contextManager?.isInitialized(),
    timestamp: new Date().toISOString(),
  });
  const window = buildContextWindow(text, caret);

  // Gate on input fidelity (cheap heuristic on current+prev context)
  const sample = [window.previousSentences.join(' '), window.currentSentence]
    .join(' ')
    .slice(-200);
  const inputFidelity = computeInputFidelity(sample);
  console.log(`[ContextTransformer] FIDELITY_CHECK ${diagnosticId}`, {
    inputFidelity,
    threshold: CONFIDENCE_THRESHOLDS.τ_input,
    passed: inputFidelity >= CONFIDENCE_THRESHOLDS.τ_input,
    sampleLength: sample.length,
  });
  if (inputFidelity < CONFIDENCE_THRESHOLDS.τ_input) {
    console.log(`[ContextTransformer] EARLY_EXIT ${diagnosticId}`, {
      reason: 'low_input_fidelity',
    });
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
  console.log(`[ContextTransformer] LM_CHECK ${diagnosticId}`, {
    hasLMAdapter: !!lmAdapter,
    hasContextManager: !!contextManager,
    isInitialized: contextManager?.isInitialized(),
    willUseLM: !!(lmAdapter && contextManager && contextManager.isInitialized()),
    rulesProposals: proposals.length,
  });
  if (lmAdapter && contextManager && contextManager.isInitialized()) {
    try {
      const contextWindow = contextManager.getContextWindow();

      // Use close context for focused corrections
      const closeText = contextWindow.close.text;

      // Generate LM prompt with wide context awareness
      const { selectSpanAndPrompt, postProcessLMOutput } = await import(
        '../core/lm/policy'
      );
      const selection = selectSpanAndPrompt(text, caret);
      // Use original selection band for LM prompting (may extend past caret to a word boundary)
      const lmBand = selection.band;
      // Create a caret-safe band for proposal application
      const bandClamped = selection.band
        ? { start: selection.band.start, end: Math.min(selection.band.end, caret) }
        : null;
      const validBand = !!lmBand && !!bandClamped && bandClamped.start < bandClamped.end;

      if (validBand && selection.prompt && lmBand) {
        const band = bandClamped as { start: number; end: number };
        // Init LM stats container
        const g = globalThis as any;
        g.__mtLmStats = g.__mtLmStats || {
          runs: 0,
          aborted: 0,
          merges: 0,
          chunksLast: 0,
        };
        g.__mtLmStats.runs += 1;
        let chunkCount = 0;
        const startedAt = Date.now();

        console.log(`[ContextTransformer] LM_START ${diagnosticId}`, {
          caret,
          bandStart: band.start,
          bandEnd: band.end,
          bandSize: band.end - band.start,
          wideTokens: contextWindow.wide.tokenCount,
          closeLength: closeText.length,
          promptLength: selection.prompt?.length || 0,
          maxTokens: selection.maxNewTokens,
        });

        // Stream LM response
        let lmOutput = '';
        // Expose last chunks for the workbench LM panel
        (globalThis as any).__mtLastLMChunks = [] as string[];
        try {
          console.log(`[ContextTransformer] LM_STREAM_START ${diagnosticId}`, {
            streamParams: {
              textLength: text.length,
              caret,
              bandStart: lmBand.start,
              bandEnd: lmBand.end,
              promptPreview: selection.prompt?.slice(0, 100) + '...',
              wideContextLength: contextWindow.wide.text.slice(0, 2000).length,
              closeContextLength: closeText.length,
            },
          });

          for await (const chunk of lmAdapter.stream({
            text,
            caret,
            band: lmBand, // prompt with full band (may include a few post-caret chars)
            settings: {
              prompt: selection.prompt,
              maxNewTokens: selection.maxNewTokens,
              wideContext: contextWindow.wide.text.slice(0, 2000), // Truncate for performance
              closeContext: closeText,
            },
          })) {
            lmOutput += chunk;
            try {
              const arr = (globalThis as any).__mtLastLMChunks as string[];
              arr.push(String(chunk));
              if (arr.length > 20) arr.shift();
            } catch {}
            chunkCount += 1;

            // Log every 5th chunk to avoid spam but track progress
            if (chunkCount % 5 === 0 || chunkCount <= 3) {
              console.log(`[ContextTransformer] LM_CHUNK ${diagnosticId}`, {
                chunkCount,
                chunkLength: chunk.length,
                chunkPreview: chunk.slice(0, 20),
                totalOutputLength: lmOutput.length,
              });
            }
          }

          console.log(`[ContextTransformer] LM_STREAM_END ${diagnosticId}`, {
            chunkCount,
            totalOutputLength: lmOutput.length,
            outputPreview: lmOutput.slice(0, 50),
            durationMs: Date.now() - startedAt,
          });
        } catch (streamError) {
          console.error(`[ContextTransformer] LM_STREAM_ERROR ${diagnosticId}`, {
            error: streamError,
            chunkCount,
            partialOutput: lmOutput.slice(0, 100),
          });
          throw streamError;
        }

        const cleanedOutput = postProcessLMOutput(
          lmOutput.trim(),
          selection.span?.length || 0,
        );
        console.log(`[ContextTransformer] LM_POSTPROCESS ${diagnosticId}`, {
          rawLength: lmOutput.trim().length,
          cleanedLength: cleanedOutput?.length || 0,
          spanLength: selection.span?.length || 0,
        });

        // Validate proposal against wide context
        if (
          cleanedOutput &&
          selection.span &&
          contextManager.validateProposal(cleanedOutput, selection.span)
        ) {
          console.log(`[ContextTransformer] LM_VALIDATION_PASS ${diagnosticId}`, {
            original: selection.span.slice(0, 30),
            proposal: cleanedOutput.slice(0, 30),
            originalLength: selection.span.length,
            proposalLength: cleanedOutput.length,
          });

          // Apply only the pre-caret portion to preserve caret safety
          const preCaretLen = Math.min(selection.span.length, band.end - band.start);
          const preCaretText = cleanedOutput.slice(0, preCaretLen);
          // Confidence gating: compute dynamic thresholds and score
          const thresholds = computeDynamicThresholds({
            caret,
            start: band.start,
            end: band.end,
            editType: 'lm',
          });
          const originalPre = selection.span.slice(0, preCaretLen);
          // Simple heuristic: if text changes, assume high-quality fix; else low
          const transformationQuality = originalPre === preCaretText ? 0.5 : 0.95;
          // Proposal already validated against context manager → strong coherence
          const contextCoherence = 0.95;
          // Temporal decay (no decay during immediate application)
          const temporalDecay = 1.0;
          const score = computeConfidence({
            inputFidelity,
            transformationQuality,
            contextCoherence,
            temporalDecay,
          });
          const decision = applyThresholds(score, thresholds);
          console.log(`[ContextTransformer] LM_CONFIDENCE ${diagnosticId}`, {
            score,
            thresholds,
            decision,
            transformationQuality,
            contextCoherence,
            temporalDecay,
          });
          if (decision === 'commit') {
            console.log(`[ContextTransformer] LM_COMMIT ${diagnosticId}`, {
              proposalAdded: true,
              start: band.start,
              end: band.end,
              textLength: preCaretText.length,
            });
            proposals.push({ start: band.start, end: band.end, text: preCaretText });
          } else {
            console.log(`[ContextTransformer] LM_REJECT ${diagnosticId}`, {
              reason: 'confidence_gate',
              decision,
              score,
            });
          }
          // Record stats and final merge log
          g.__mtLmStats.chunksLast = chunkCount;
          g.__mtLmStats.merges = (g.__mtLmStats.merges || 0) + 1;
          console.log('[ContextTransformer] LM final merge', {
            chunkCount,
            band: selection.band,
          });
        } else {
          console.log(`[ContextTransformer] LM_VALIDATION_FAIL ${diagnosticId}`, {
            hasCleanedOutput: !!cleanedOutput,
            hasSpan: !!selection.span,
            cleanedOutputLength: cleanedOutput?.length || 0,
            spanLength: selection.span?.length || 0,
            validationPassed:
              cleanedOutput && selection.span
                ? contextManager.validateProposal(cleanedOutput, selection.span)
                : false,
          });
        }
        console.log('[ContextTransformer] LM end', { chunkCount });
        try {
          g.__mtLmMetrics = g.__mtLmMetrics || [];
          const latency = Math.max(0, Date.now() - startedAt);
          const tokens =
            g.__mtLastLMChunks && Array.isArray(g.__mtLastLMChunks)
              ? (g.__mtLastLMChunks as string[]).join('').length
              : chunkCount;
          g.__mtLmMetrics.push({
            timestamp: Date.now(),
            latency,
            tokens,
            backend: 'unknown',
          });
          // Keep last 100 entries to bound memory
          if (g.__mtLmMetrics.length > 100)
            g.__mtLmMetrics.splice(0, g.__mtLmMetrics.length - 100);
        } catch {}
      }
    } catch (error) {
      console.warn('[ContextTransformer] LM processing failed:', error);
      // Fall back to deterministic repairs only
    }
  }

  return { window, proposals };
}
