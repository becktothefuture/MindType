/*╔══════════════════════════════════════════════════════╗
  ║  ░  C O N F I D E N C E   G A T I N G   T E S T S  ░░  ║
  ║                                                      ║
  ║   Unit tests for confidence thresholds and gating.  ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Unit tests for confidence system and thresholds
  • WHY  ▸ Ensure tuned thresholds work correctly for demo
  • HOW  ▸ Test confidence computation and threshold application
*/

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  computeConfidence,
  applyThresholds,
  computeDynamicThresholds,
  type ConfidenceInputs,
} from '../../core/confidenceGate';
import {
  getConfidenceThresholds,
  setConfidenceThresholds,
  SHORT_PAUSE_MS,
  type ConfidenceThresholds,
} from '../../config/defaultThresholds';

describe('Confidence Gating System', () => {
  let originalThresholds: ConfidenceThresholds;

  beforeEach(() => {
    // Save original thresholds
    originalThresholds = { ...getConfidenceThresholds() };
  });

  afterEach(() => {
    // Restore original thresholds
    setConfidenceThresholds(originalThresholds);
  });

  describe('confidence computation', () => {
    it('computes high confidence for clear improvements', () => {
      const inputs: ConfidenceInputs = {
        inputFidelity: 0.8,
        transformationQuality: 0.95,
        contextCoherence: 0.9,
        temporalDecay: 1.0,
      };

      const score = computeConfidence(inputs);
      expect(score).toBeGreaterThan(0.8);
    });

    it('computes low confidence for poor inputs', () => {
      const inputs: ConfidenceInputs = {
        inputFidelity: 0.3,
        transformationQuality: 0.2,
        contextCoherence: 0.4,
        temporalDecay: 0.5,
      };

      const score = computeConfidence(inputs);
      expect(score).toBeLessThan(0.5);
    });

    it('handles edge case inputs gracefully', () => {
      const inputs: ConfidenceInputs = {
        inputFidelity: 0,
        transformationQuality: 0,
        contextCoherence: 0,
        temporalDecay: 0,
      };

      const score = computeConfidence(inputs);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('threshold application', () => {
    it('commits proposals above τ_commit threshold', () => {
      // Use demo-tuned thresholds (τ_commit = 0.80)
      setConfidenceThresholds({ τ_commit: 0.80 });
      
      const highScore = 0.85;
      const dynamicThresholds = { commit: 0.80, discard: 0.3 };
      
      const decision = applyThresholds(highScore, dynamicThresholds);
      expect(decision).toBe('commit');
    });

    it('holds proposals below τ_commit threshold', () => {
      setConfidenceThresholds({ τ_commit: 0.80 });
      
      const lowScore = 0.75;
      const dynamicThresholds = { commit: 0.80, discard: 0.3 };
      
      const decision = applyThresholds(lowScore, dynamicThresholds);
      expect(decision).toBe('hold');
    });

    it('discards proposals below τ_discard threshold', () => {
      setConfidenceThresholds({ τ_discard: 0.3 });
      
      const veryLowScore = 0.2;
      const dynamicThresholds = { commit: 0.80, discard: 0.3 };
      
      const decision = applyThresholds(veryLowScore, dynamicThresholds);
      expect(decision).toBe('discard');
    });
  });

  describe('dynamic thresholds', () => {
    it('adjusts thresholds based on edit position', () => {
      const closeToCaretEdit = {
        caret: 100,
        start: 95,
        end: 100,
        editType: 'context' as const,
      };

      const farFromCaretEdit = {
        caret: 100,
        start: 10,
        end: 20,
        editType: 'context' as const,
      };

      const closeThresholds = computeDynamicThresholds(closeToCaretEdit);
      const farThresholds = computeDynamicThresholds(farFromCaretEdit);

      // Closer edits should have higher thresholds (more conservative)
      expect(closeThresholds.commit).toBeGreaterThanOrEqual(farThresholds.commit);
    });

    it('differentiates between edit types', () => {
      const editParams = {
        caret: 50,
        start: 40,
        end: 45,
      };

      const contextThresholds = computeDynamicThresholds({ 
        ...editParams, 
        editType: 'context' as const 
      });
      const noiseThresholds = computeDynamicThresholds({ 
        ...editParams, 
        editType: 'noise' as const 
      });

      // Different edit types should have different threshold adjustments
      expect(contextThresholds.commit).not.toBe(noiseThresholds.commit);
    });
  });

  describe('demo-tuned thresholds', () => {
    it('uses lowered τ_input for more correction attempts', () => {
      const thresholds = getConfidenceThresholds();
      
      // Demo should have lowered τ_input from 0.65 to 0.55
      expect(thresholds.τ_input).toBe(0.55);
    });

    it('uses lowered τ_commit for more visible corrections', () => {
      const thresholds = getConfidenceThresholds();
      
      // Demo should have lowered τ_commit from 0.90 to 0.80
      expect(thresholds.τ_commit).toBe(0.80);
    });

    it('maintains reasonable τ_discard threshold', () => {
      const thresholds = getConfidenceThresholds();
      
      // τ_discard should remain at 0.3 to filter very poor proposals
      expect(thresholds.τ_discard).toBe(0.3);
    });
  });

  describe('idle timing configuration', () => {
    it('uses demo-optimized SHORT_PAUSE_MS', () => {
      // Demo should use 600ms for better responsiveness
      expect(SHORT_PAUSE_MS).toBe(600);
    });

    it('allows corrections within reasonable time window', () => {
      // Simulate timing-based decision
      const startTime = Date.now();
      
      // SHORT_PAUSE_MS should be long enough for LM processing
      // but short enough for good UX
      expect(SHORT_PAUSE_MS).toBeGreaterThan(300); // Not too fast
      expect(SHORT_PAUSE_MS).toBeLessThan(1000);   // Not too slow
    });
  });

  describe('integration scenarios', () => {
    it('processes fuzzy text corrections end-to-end', () => {
      // Simulate processing "teh" → "the" correction
      const inputs: ConfidenceInputs = {
        inputFidelity: 0.8,        // Good input quality
        transformationQuality: 0.9, // Clear improvement
        contextCoherence: 0.85,    // Makes sense in context
        temporalDecay: 1.0,        // Recent edit
      };

      const score = computeConfidence(inputs);
      const dynamicThresholds = computeDynamicThresholds({
        caret: 20,
        start: 4,
        end: 7,
        editType: 'context',
      });

      const decision = applyThresholds(score, dynamicThresholds);
      
      // Should commit this clear improvement
      expect(decision).toBe('commit');
      expect(score).toBeGreaterThan(0.8);
    });

    it('rejects low-quality proposals appropriately', () => {
      // Simulate poor correction attempt
      const inputs: ConfidenceInputs = {
        inputFidelity: 0.4,        // Poor input
        transformationQuality: 0.3, // Questionable change
        contextCoherence: 0.5,     // Doesn't fit well
        temporalDecay: 0.7,        // Somewhat stale
      };

      const score = computeConfidence(inputs);
      const dynamicThresholds = computeDynamicThresholds({
        caret: 50,
        start: 45,
        end: 50,
        editType: 'context',
      });

      const decision = applyThresholds(score, dynamicThresholds);
      
      // Should not commit poor corrections
      expect(decision).not.toBe('commit');
      expect(score).toBeLessThan(0.7);
    });
  });
});


