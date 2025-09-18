/*╔══════════════════════════════════════════════════════╗
  ║  ░  C O R R E C T I O N   W A V E   V 0 . 6  ░░░░░░░  ║
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
  • WHAT ▸ Orchestrate Noise→Context→Tone wave behind caret
  • WHY  ▸ v0.6 LM-only pipeline with Correction Marker visualization
  • HOW  ▸ Sequential stages within single Active Region
*/

import type { LMAdapter } from './lm/types';
import { defaultActiveRegionPolicy } from './activeRegionPolicy';
import { noiseTransform } from '../engines/noiseTransformer';
import { contextTransform } from '../engines/contextTransformer_v06';
import { toneTransform, type ToneTarget } from '../engines/toneTransformer_v06';
import { isCaretSafe } from '../utils/grapheme';

export interface CorrectionWaveInput {
  text: string;
  caret: number;
  lmAdapter?: LMAdapter;
  toneTarget?: ToneTarget;
  burstState?: {
    lastTypingTime: number;
    burstStartTime: number;
    burstKeyCount: number;
  };
}

export interface CorrectionWaveResult {
  diffs: Array<{ start: number; end: number; text: string; stage: 'noise' | 'context' | 'tone' }>;
  activeRegion: { start: number; end: number };
}

export async function runCorrectionWave(input: CorrectionWaveInput): Promise<CorrectionWaveResult> {
  const { text, caret, lmAdapter, toneTarget = 'None', burstState } = input;
  
  // Compute Active Region with burst growth
  const state = {
    text,
    caret,
    frontier: Math.max(0, caret - 1000), // Search window
    ...burstState,
  };
  
  const activeRegion = defaultActiveRegionPolicy.computeRenderRange(state);
  
  if (!isCaretSafe(activeRegion.start, activeRegion.end, caret)) {
    return { diffs: [], activeRegion: { start: caret, end: caret } };
  }

  const diffs: Array<{ start: number; end: number; text: string; stage: 'noise' | 'context' | 'tone' }> = [];
  let currentText = text;

  try {
    // Stage 1: Noise Transformer (LM-only typo fixes)
    if (lmAdapter) {
      const noiseResult = await noiseTransform({
        text: currentText,
        caret,
        activeRegion,
        lmAdapter,
      });
      
      if (noiseResult.diff) {
        diffs.push({ ...noiseResult.diff, stage: 'noise' });
        // Apply diff to working text for next stage
        currentText = currentText.slice(0, noiseResult.diff.start) + 
                     noiseResult.diff.text + 
                     currentText.slice(noiseResult.diff.end);
      }
    }

    // Stage 2: Context Transformer (LM-only grammar/coherence)
    if (lmAdapter) {
      const contextResult = await contextTransform({
        text: currentText,
        caret,
        activeRegion,
        lmAdapter,
      });
      
      for (const proposal of contextResult.proposals) {
        if (isCaretSafe(proposal.start, proposal.end, caret)) {
          diffs.push({ 
            start: proposal.start, 
            end: proposal.end, 
            text: proposal.text, 
            stage: 'context' 
          });
          // Apply diff to working text for next stage
          currentText = currentText.slice(0, proposal.start) + 
                       proposal.text + 
                       currentText.slice(proposal.end);
        }
      }
    }

    // Stage 3: Tone Transformer (LM-only style adjustment)
    if (lmAdapter && toneTarget !== 'None') {
      const toneResult = await toneTransform({
        text: currentText,
        caret,
        activeRegion,
        toneTarget,
        lmAdapter,
      });
      
      for (const proposal of toneResult.proposals) {
        if (isCaretSafe(proposal.start, proposal.end, caret)) {
          diffs.push({ 
            start: proposal.start, 
            end: proposal.end, 
            text: proposal.text, 
            stage: 'tone' 
          });
        }
      }
    }

    return { diffs, activeRegion };
  } catch (error) {
    console.warn('[CorrectionWave] Error during wave processing:', error);
    return { diffs: [], activeRegion };
  }
}

