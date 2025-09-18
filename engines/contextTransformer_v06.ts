/*╔══════════════════════════════════════════════════════╗
  ║  ░  C O N T E X T   T R A N S F O R M E R   V 0 6  ░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ LM-only context corrections within Active Region bounds
  • WHY  ▸ v0.6 sentence-aware coherence using single Active Region
  • HOW  ▸ Stream LM corrections for grammar/flow within AR span
*/

import type { LMAdapter } from '../core/lm/types';
import { isCaretSafe } from '../utils/grapheme';
import { computeConfidence, applyThresholds, computeInputFidelity, computeDynamicThresholds } from '../core/confidenceGate';
import { CONFIDENCE_THRESHOLDS } from '../config/defaultThresholds';

export interface ContextInput {
  text: string;
  caret: number;
  activeRegion: { start: number; end: number };
  lmAdapter?: LMAdapter;
}

export interface ContextResult {
  proposals: Array<{ start: number; end: number; text: string; confidence: number }>;
}

export async function contextTransform(input: ContextInput): Promise<ContextResult> {
  const { text, caret, activeRegion, lmAdapter } = input;

  // v0.6: Require LM adapter; no rule-based fallback
  if (!lmAdapter) {
    return { proposals: [] };
  }

  // Ensure Active Region is caret-safe
  if (!isCaretSafe(activeRegion.start, activeRegion.end, caret)) {
    return { proposals: [] };
  }

  // Extract text from Active Region
  const spanText = text.slice(activeRegion.start, activeRegion.end);
  if (spanText.length === 0) {
    return { proposals: [] };
  }

  try {
    // Compute input fidelity for confidence gating
    const inputFidelity = computeInputFidelity(spanText);
    const thresholds = computeDynamicThresholds(CONFIDENCE_THRESHOLDS);
    
    if (inputFidelity < thresholds.τ_input) {
      return { proposals: [] }; // Input quality too low
    }

    // Build context-aware prompt for sentence-level corrections
    const contextBefore = text.slice(Math.max(0, activeRegion.start - 100), activeRegion.start);
    const contextAfter = text.slice(activeRegion.end, Math.min(text.length, activeRegion.end + 100));
    
    const contextPrompt = `Improve the grammar and coherence of the following text. Return only the corrected text, no explanations:

Context before: "${contextBefore}"
Text to improve: "${spanText}"
Context after: "${contextAfter}"

Corrected text:`;

    // Stream LM correction for context/grammar within Active Region
    const chunks: string[] = [];
    for await (const chunk of lmAdapter.stream({
      text,
      caret,
      activeRegion,
      settings: {
        maxNewTokens: Math.min(64, Math.floor(spanText.length * 1.5)), // More generous for context
        deviceTier: 'wasm', // Context stage can use more resources
      },
    })) {
      chunks.push(chunk);
    }

    const correctedText = chunks.join('').trim();
    
    // Only propose if LM produced a meaningful change
    if (correctedText && correctedText !== spanText && correctedText.length > 0) {
      // Compute confidence score for the proposal
      const confidence = computeConfidence({
        inputFidelity,
        transformationQuality: correctedText.length > spanText.length * 2 ? 0.3 : 0.8,
        contextCoherence: 0.9, // Assume high coherence from context-aware LM
        temporalDecay: 1.0,
      });

      const decision = applyThresholds(confidence, thresholds);
      
      if (decision === 'commit') {
        return {
          proposals: [{
            start: activeRegion.start,
            end: activeRegion.end,
            text: correctedText,
            confidence: confidence.combined,
          }],
        };
      }
    }

    return { proposals: [] };
  } catch (error) {
    // v0.6: LM errors disable corrections rather than fallback
    console.warn('[ContextTransformer] LM error:', error);
    return { proposals: [] };
  }
}

// Legacy export for compatibility during transition
export async function contextTransformLegacy(
  input: { text: string; caret: number },
  lmAdapter?: LMAdapter,
): Promise<{ proposals: Array<{ start: number; end: number; text: string }> }> {
  // For legacy callers, assume Active Region is last 20 words behind caret
  const words = input.text.slice(0, input.caret).split(/\s+/);
  const takeWords = Math.min(20, words.length);
  const startWords = words.slice(-takeWords);
  const startText = startWords.join(' ');
  const start = Math.max(0, input.text.lastIndexOf(startText, input.caret));
  
  const result = await contextTransform({
    text: input.text,
    caret: input.caret,
    activeRegion: { start, end: input.caret },
    lmAdapter,
  });
  
  return {
    proposals: result.proposals.map(p => ({ start: p.start, end: p.end, text: p.text })),
  };
}
