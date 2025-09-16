/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   C O N T E X T   M A N A G E R  ░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Dual-context LM orchestration: wide + close context       ║
  ║   with validation and real-time updates.                    ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Manage wide context (full document) + close context (focused area)
  • WHY  ▸ Optimize LM accuracy with global awareness + local performance
  • HOW  ▸ Cache wide context, update close context, validate proposals
*/

import { getSentenceContextPerSide } from '../../config/defaultThresholds';
import { createLogger } from '../logger';
import type { StagingBuffer, Proposal } from '../stagingBuffer';

const log = createLogger('lm.context');

export interface LMContextWindow {
  wide: {
    text: string;
    lastUpdated: number;
    tokenCount: number;
  };
  close: {
    text: string;
    start: number;
    end: number;
    caretPosition: number;
    sentences: number;
  };
}

export interface LMContextManager {
  initialize(fullText: string, caretPosition: number): Promise<void>;
  updateWideContext(fullText: string): void;
  updateCloseContext(fullText: string, caretPosition: number): void;
  getContextWindow(): LMContextWindow;
  validateProposal(proposal: string, originalSpan: string): boolean;
  validateProposalWithBuffer(proposal: string, originalSpan: string, stagingBuffer?: StagingBuffer): boolean;
  isInitialized(): boolean;
  getPerformanceMetrics(): {
    wideContextSize: number;
    closeContextSize: number;
    lastUpdateTime: number;
    validationCalls: number;
  };
}

export function createLMContextManager(): LMContextManager {
  let contextWindow: LMContextWindow | null = null;
  let initialized = false;
  let validationCalls = 0;
  let lastUpdateTime = 0;

  function estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  function extractSentenceContext(
    text: string,
    caretPosition: number,
  ): {
    text: string;
    start: number;
    end: number;
    sentences: number;
  } {
    const sentencesPerSide = getSentenceContextPerSide();

    // Use Intl.Segmenter for proper sentence boundaries
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    const segments = Array.from(segmenter.segment(text));

    // Find the sentence containing the caret
    let caretSentenceIndex = -1;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (
        caretPosition >= segment.index &&
        caretPosition <= segment.index + segment.segment.length
      ) {
        caretSentenceIndex = i;
        break;
      }
    }

    if (caretSentenceIndex === -1) {
      // Fallback: use character-based context
      const start = Math.max(0, caretPosition - 150);
      const end = Math.min(text.length, caretPosition + 150);
      return {
        text: text.slice(start, end),
        start,
        end,
        sentences: 0,
      };
    }

    // Extract sentences around the caret sentence
    const startSentence = Math.max(0, caretSentenceIndex - sentencesPerSide);
    const endSentence = Math.min(
      segments.length - 1,
      caretSentenceIndex + sentencesPerSide,
    );

    const startIndex = segments[startSentence].index;
    const endSegment = segments[endSentence];
    const endIndex = endSegment.index + endSegment.segment.length;

    // Clamp close context strictly behind caret for caret safety
    const clampedEnd = Math.min(endIndex, caretPosition);
    return {
      text: text.slice(startIndex, clampedEnd),
      start: startIndex,
      end: clampedEnd,
      sentences: endSentence - startSentence + 1,
    };
  }

  return {
    async initialize(fullText: string, caretPosition: number): Promise<void> {
      log.info('[ContextManager] Initializing with full document', {
        textLength: fullText.length,
        caretPosition,
        estimatedTokens: estimateTokenCount(fullText),
      });

      const closeContext = extractSentenceContext(fullText, caretPosition);

      contextWindow = {
        wide: {
          text: fullText,
          lastUpdated: Date.now(),
          tokenCount: estimateTokenCount(fullText),
        },
        close: {
          ...closeContext,
          caretPosition,
        },
      };

      initialized = true;
      lastUpdateTime = Date.now();
      log.info('[ContextManager] Initialization complete', {
        wideTokens: contextWindow.wide.tokenCount,
        closeSentences: contextWindow.close.sentences,
        closeLength: contextWindow.close.text.length,
      });
    },

    updateWideContext(fullText: string): void {
      if (!contextWindow) return;

      // Performance optimization: only update if text has changed significantly
      if (fullText !== contextWindow.wide.text) {
        const now = Date.now();
        log.debug('[ContextManager] Updating wide context', {
          oldLength: contextWindow.wide.text.length,
          newLength: fullText.length,
          timeSinceLastUpdate: now - contextWindow.wide.lastUpdated,
        });

        contextWindow.wide = {
          text: fullText,
          lastUpdated: now,
          tokenCount: estimateTokenCount(fullText),
        };
        lastUpdateTime = now;
      }
    },

    updateCloseContext(fullText: string, caretPosition: number): void {
      if (!contextWindow) return;

      const closeContext = extractSentenceContext(fullText, caretPosition);
      const now = Date.now();

      log.debug('[ContextManager] Updating close context', {
        caretPosition,
        sentences: closeContext.sentences,
        contextLength: closeContext.text.length,
      });

      // Preserve last updated close context if new extraction is identical;
      // otherwise update to reflect caret move.
      if (
        contextWindow.close.start !== closeContext.start ||
        contextWindow.close.end !== closeContext.end ||
        contextWindow.close.text !== closeContext.text
      ) {
        contextWindow.close = {
          ...closeContext,
          caretPosition,
        };
        lastUpdateTime = now;
      } else {
        contextWindow.close.caretPosition = caretPosition;
      }
    },

    getContextWindow(): LMContextWindow {
      if (!contextWindow) {
        throw new Error('Context manager not initialized');
      }
      return { ...contextWindow };
    },

    validateProposal(proposal: string, originalSpan: string): boolean {
      validationCalls++;
      if (!contextWindow) return false;
      if (typeof proposal !== 'string' || typeof originalSpan !== 'string') return false;
      if (proposal.length === 0 || originalSpan.length === 0) return false;

      // Basic validation: proposal should be different from original
      if (proposal.trim() === originalSpan.trim()) {
        log.debug('[ContextManager] Proposal rejected: identical to original');
        return false;
      }

      // Length validation: proposal shouldn't be drastically longer
      const lengthRatio = proposal.length / Math.max(originalSpan.length, 1);
      if (lengthRatio > 3) {
        log.debug('[ContextManager] Proposal rejected: too long', { lengthRatio });
        return false;
      }

      // Context coherence: proposal should fit within wide context theme
      // This is a simplified check - could be enhanced with semantic analysis
      const wideText = contextWindow.wide.text.toLowerCase();
      const proposalWords = proposal.toLowerCase().split(/\s+/);
      const contextWords = wideText.split(/\s+/);

      // Check if proposal words are contextually appropriate
      let contextualWords = 0;
      for (const word of proposalWords) {
        if (word.length > 2 && contextWords.includes(word)) {
          contextualWords++;
        }
      }

      const contextualRatio = contextualWords / Math.max(proposalWords.length, 1);
      const isContextual = contextualRatio > 0.1 || proposalWords.length <= 3;

      if (!isContextual) {
        log.debug('[ContextManager] Proposal rejected: not contextual', {
          contextualRatio,
        });
        return false;
      }

      log.debug('[ContextManager] Proposal validated', {
        lengthRatio,
        contextualRatio,
        proposal: proposal.slice(0, 50),
      });
      return true;
    },

    validateProposalWithBuffer(proposal: string, originalSpan: string, stagingBuffer?: StagingBuffer): boolean {
      // First run standard validation
      if (!this.validateProposal(proposal, originalSpan)) {
        return false;
      }

      // Enhanced validation with staging buffer context
      if (stagingBuffer && contextWindow) {
        const existingProposals = stagingBuffer.list();
        
        // Check for conflicting proposals in the buffer
        for (const existing of existingProposals) {
          if (existing.state === 'commit' || existing.state === 'hold') {
            // Check if proposals overlap or conflict
            const proposalStart = contextWindow.close.start;
            const proposalEnd = contextWindow.close.end;
            
            if (!(proposalEnd <= existing.start || proposalStart >= existing.end)) {
              log.debug('[ContextManager] Proposal rejected: conflicts with existing proposal', {
                existingId: existing.id,
                existingRange: [existing.start, existing.end],
                proposalRange: [proposalStart, proposalEnd],
              });
              return false;
            }
          }
        }

        // Check for repetitive patterns (avoid suggesting the same fix repeatedly)
        const recentSimilar = existingProposals.filter(p => 
          p.text.toLowerCase().trim() === proposal.toLowerCase().trim() &&
          Date.now() - p.createdAt < 5000 // Within last 5 seconds
        );
        
        if (recentSimilar.length > 0) {
          log.debug('[ContextManager] Proposal rejected: recently suggested', {
            similarCount: recentSimilar.length,
          });
          return false;
        }
      }

      return true;
    },

    isInitialized(): boolean {
      return initialized;
    },

    getPerformanceMetrics(): {
      wideContextSize: number;
      closeContextSize: number;
      lastUpdateTime: number;
      validationCalls: number;
    } {
      if (!contextWindow) {
        return {
          wideContextSize: 0,
          closeContextSize: 0,
          lastUpdateTime: 0,
          validationCalls,
        };
      }

      return {
        wideContextSize: contextWindow.wide.text.length,
        closeContextSize: contextWindow.close.text.length,
        lastUpdateTime,
        validationCalls,
      };
    },
  };
}
