/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   C O N T E X T   M A N A G E R   T E S T S  ░░░░░░  ║
  ║                                                              ║
  ║   Enhanced LM context manager tests for new features        ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Test enhanced LM context manager functionality
  • WHY  ▸ Verify staging buffer integration and performance metrics
  • HOW  ▸ Unit tests for new methods and validation logic
*/

import { describe, it, expect, beforeEach } from 'vitest';
import { createLMContextManager } from '../core/lm/contextManager';
import { StagingBuffer } from '../core/stagingBuffer';

describe('Enhanced LM Context Manager', () => {
  let contextManager: ReturnType<typeof createLMContextManager>;
  let stagingBuffer: StagingBuffer;

  beforeEach(async () => {
    contextManager = createLMContextManager();
    stagingBuffer = new StagingBuffer();
    await contextManager.initialize('Hello world. This is a test document.', 20);
  });

  describe('Performance Metrics', () => {
    it('tracks performance metrics correctly', () => {
      const metrics = contextManager.getPerformanceMetrics();
      
      expect(metrics.wideContextSize).toBe(37); // Length of test document
      expect(metrics.closeContextSize).toBeGreaterThan(0);
      expect(metrics.lastUpdateTime).toBeGreaterThan(0);
      expect(metrics.validationCalls).toBe(0); // No validations yet
    });

    it('increments validation calls on each validation', () => {
      contextManager.validateProposal('Hello there', 'Hello world');
      contextManager.validateProposal('Good morning', 'Hello world');
      
      const metrics = contextManager.getPerformanceMetrics();
      expect(metrics.validationCalls).toBe(2);
    });

    it('returns zero metrics when not initialized', () => {
      const uninitializedManager = createLMContextManager();
      const metrics = uninitializedManager.getPerformanceMetrics();
      
      expect(metrics.wideContextSize).toBe(0);
      expect(metrics.closeContextSize).toBe(0);
      expect(metrics.lastUpdateTime).toBe(0);
      expect(metrics.validationCalls).toBe(0);
    });
  });

  describe('Enhanced Validation with Staging Buffer', () => {
    it('validates proposals with staging buffer integration', () => {
      const result = contextManager.validateProposalWithBuffer(
        'Hello there world',
        'Hello world',
        stagingBuffer
      );
      
      expect(result).toBe(true);
    });

    it('rejects proposals that conflict with existing proposals', () => {
      // Add a conflicting proposal to the staging buffer
      stagingBuffer.add({
        id: 'test-1',
        start: 0,
        end: 10,
        text: 'Different text',
        state: 'commit'
      });

      const result = contextManager.validateProposalWithBuffer(
        'Hello there world',
        'Hello world',
        stagingBuffer
      );
      
      // Should reject due to overlap with existing proposal
      expect(result).toBe(false);
    });

    it('rejects recently suggested identical proposals', () => {
      const proposalText = 'Hello there world';
      
      // Add a recent similar proposal
      stagingBuffer.add({
        id: 'test-1',
        start: 50,
        end: 60,
        text: proposalText,
        state: 'hold'
      });

      const result = contextManager.validateProposalWithBuffer(
        proposalText,
        'Hello world',
        stagingBuffer
      );
      
      // Should reject due to recent similar proposal
      expect(result).toBe(false);
    });

    it('allows proposals when no staging buffer conflicts exist', () => {
      // Add a non-conflicting proposal
      stagingBuffer.add({
        id: 'test-1',
        start: 50,
        end: 60,
        text: 'Different text',
        state: 'commit'
      });

      const result = contextManager.validateProposalWithBuffer(
        'Hello there world',
        'Hello world',
        stagingBuffer
      );
      
      expect(result).toBe(true);
    });

    it('falls back to standard validation when no staging buffer provided', () => {
      const result = contextManager.validateProposalWithBuffer(
        'Hello there world',
        'Hello world'
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Context Updates with Performance Tracking', () => {
    it('tracks update times for wide context', () => {
      const initialMetrics = contextManager.getPerformanceMetrics();
      const initialTime = initialMetrics.lastUpdateTime;
      
      // Wait a bit to ensure time difference
      setTimeout(() => {
        contextManager.updateWideContext('Updated document content');
        
        const updatedMetrics = contextManager.getPerformanceMetrics();
        expect(updatedMetrics.lastUpdateTime).toBeGreaterThan(initialTime);
        expect(updatedMetrics.wideContextSize).toBe(24); // New content length
      }, 10);
    });

    it('tracks update times for close context', () => {
      const initialMetrics = contextManager.getPerformanceMetrics();
      const initialTime = initialMetrics.lastUpdateTime;
      
      setTimeout(() => {
        contextManager.updateCloseContext('Updated document content', 10);
        
        const updatedMetrics = contextManager.getPerformanceMetrics();
        expect(updatedMetrics.lastUpdateTime).toBeGreaterThan(initialTime);
      }, 10);
    });
  });

  describe('Edge Cases', () => {
    it('handles validation with empty staging buffer', () => {
      const emptyBuffer = new StagingBuffer();
      
      const result = contextManager.validateProposalWithBuffer(
        'Hello there world',
        'Hello world',
        emptyBuffer
      );
      
      expect(result).toBe(true);
    });

    it('handles validation with discarded proposals in buffer', () => {
      stagingBuffer.add({
        id: 'test-1',
        start: 0,
        end: 10,
        text: 'Discarded text',
        state: 'discard'
      });

      const result = contextManager.validateProposalWithBuffer(
        'Hello there world',
        'Hello world',
        stagingBuffer
      );
      
      // Should pass because discarded proposals don't conflict
      expect(result).toBe(true);
    });
  });
});
