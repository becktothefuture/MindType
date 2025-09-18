/*╔══════════════════════════════════════════════════════╗
  ║  ░  T O N E   T R A N S F O R M E R   V 0 . 6  ░░░░░  ║
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
  • WHAT ▸ LM-only tone adjustment with default None and τ_tone gating
  • WHY  ▸ v0.6 optional style adjustment within Active Region
  • HOW  ▸ Stream LM tone corrections only when explicitly enabled
*/

import type { LMAdapter } from '../core/lm/types';
import { isCaretSafe } from '../utils/grapheme';
import { computeConfidence, applyThresholds } from '../core/confidenceGate';
import { CONFIDENCE_THRESHOLDS } from '../config/defaultThresholds';

export type ToneTarget = 'None' | 'Casual' | 'Professional';

export interface ToneInput {
  text: string;
  caret: number;
  activeRegion: { start: number; end: number };
  toneTarget: ToneTarget;
  lmAdapter?: LMAdapter;
}

export interface ToneResult {
  proposals: Array<{ start: number; end: number; text: string; confidence: number }>;
}

export async function toneTransform(input: ToneInput): Promise<ToneResult> {
  const { text, caret, activeRegion, toneTarget, lmAdapter } = input;

  // v0.6: Default None - no tone adjustment unless explicitly set
  if (toneTarget === 'None') {
    return { proposals: [] };
  }

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
    // Build tone adjustment prompt
    const tonePrompt = `Adjust the following text to ${toneTarget.toLowerCase()} tone while preserving meaning. Return only the adjusted text, no explanations:

Original: "${spanText}"
Target tone: ${toneTarget}

Adjusted text:`;

    // Stream LM tone adjustment within Active Region
    const chunks: string[] = [];
    for await (const chunk of lmAdapter.stream({
      text,
      caret,
      activeRegion,
      settings: {
        maxNewTokens: Math.min(96, Math.floor(spanText.length * 2)), // Generous for tone adjustments
        deviceTier: 'webgpu', // Tone stage can use best resources
      },
    })) {
      chunks.push(chunk);
    }

    const adjustedText = chunks.join('').trim();
    
    // Only propose if LM produced a meaningful change
    if (adjustedText && adjustedText !== spanText && adjustedText.length > 0) {
      // Compute confidence score with τ_tone gating
      const confidence = computeConfidence({
        inputFidelity: 0.9, // Assume good input for tone stage
        transformationQuality: 0.8, // Tone changes are generally good
        contextCoherence: 0.9,
        temporalDecay: 1.0,
      });

      const thresholds = { ...CONFIDENCE_THRESHOLDS, τ_tone: CONFIDENCE_THRESHOLDS.τ_tone };
      const decision = applyThresholds(confidence, thresholds);
      
      // v0.6: Tone must pass both τ_tone and τ_commit gates
      if (decision === 'commit' && confidence.combined >= thresholds.τ_tone) {
        return {
          proposals: [{
            start: activeRegion.start,
            end: activeRegion.end,
            text: adjustedText,
            confidence: confidence.combined,
          }],
        };
      }
    }

    return { proposals: [] };
  } catch (error) {
    // v0.6: LM errors disable corrections rather than fallback
    console.warn('[ToneTransformer] LM error:', error);
    return { proposals: [] };
  }
}

// Legacy export for compatibility during transition
export async function toneTransformLegacy(
  input: { text: string; caret: number; toneTarget?: ToneTarget },
  lmAdapter?: LMAdapter,
): Promise<{ proposals: Array<{ start: number; end: number; text: string }> }> {
  // For legacy callers, assume Active Region is last 20 words behind caret
  const words = input.text.slice(0, input.caret).split(/\s+/);
  const takeWords = Math.min(20, words.length);
  const startWords = words.slice(-takeWords);
  const startText = startWords.join(' ');
  const start = Math.max(0, input.text.lastIndexOf(startText, input.caret));
  
  const result = await toneTransform({
    text: input.text,
    caret: input.caret,
    activeRegion: { start, end: input.caret },
    toneTarget: input.toneTarget || 'None',
    lmAdapter,
  });
  
  return {
    proposals: result.proposals.map(p => ({ start: p.start, end: p.end, text: p.text })),
  };
}
