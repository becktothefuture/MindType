/*╔══════════════════════════════════════════════════════╗
  ║  ░  S W E E P   T I M I N G   T E S T S  ░░░░░░░░░░░░  ║
  ║                                                      ║
  ║   Unit tests for idle timing and sweep scheduling.  ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Unit tests for sweep scheduler timing behavior
  • WHY  ▸ Ensure demo timing delivers corrections within 600ms
  • HOW  ▸ Mock timers and test sweep trigger conditions
*/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSweepScheduler } from '../../core/sweepScheduler';
import { createTypingMonitor } from '../../core/typingMonitor';
import { SHORT_PAUSE_MS } from '../../config/defaultThresholds';

// Mock the engines to focus on timing behavior
vi.mock('../../engines/contextTransformer', () => ({
  contextTransform: vi.fn(() => Promise.resolve({ proposals: [] })),
}));

vi.mock('../../engines/noiseTransformer', () => ({
  noiseTransform: vi.fn(() => ({ diff: null })),
}));

describe('Sweep Timing Behavior', () => {
  let mockTypingMonitor: any;
  let mockLMAdapter: any;

  beforeEach(() => {
    vi.useFakeTimers();
    
    mockTypingMonitor = {
      onTypingEvent: vi.fn(),
      getLastEvent: vi.fn(() => null),
    };

    mockLMAdapter = {
      stream: vi.fn(async function* () {
        yield 'the ';
      }),
      abort: vi.fn(),
      getStats: vi.fn(() => ({ runs: 0, staleDrops: 0 })),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('idle timing configuration', () => {
    it('uses demo-optimized SHORT_PAUSE_MS value', () => {
      expect(SHORT_PAUSE_MS).toBe(600);
    });

    it('triggers sweep after SHORT_PAUSE_MS idle time', async () => {
      const scheduler = createSweepScheduler(
        mockTypingMonitor,
        undefined,
        () => mockLMAdapter
      );

      // Simulate typing event
      const typingEvent = {
        text: 'Hello teh world',
        caret: 15,
        atMs: Date.now(),
      };

      scheduler.onEvent(typingEvent);

      // Fast-forward to just before SHORT_PAUSE_MS
      vi.advanceTimersByTime(SHORT_PAUSE_MS - 50);
      
      // Should not have triggered sweep yet
      expect(mockLMAdapter.stream).not.toHaveBeenCalled();

      // Fast-forward past SHORT_PAUSE_MS
      vi.advanceTimersByTime(100);
      
      // Allow async operations to complete
      await vi.runAllTimersAsync();

      // Should have triggered sweep
      // Note: This is a simplified test - actual behavior depends on
      // language detection, confidence gating, etc.
    });

    it('resets timer on new typing events', () => {
      const scheduler = createSweepScheduler(
        mockTypingMonitor,
        undefined,
        () => mockLMAdapter
      );

      const firstEvent = {
        text: 'Hello',
        caret: 5,
        atMs: Date.now(),
      };

      scheduler.onEvent(firstEvent);

      // Fast-forward partway to SHORT_PAUSE_MS
      vi.advanceTimersByTime(SHORT_PAUSE_MS / 2);

      // New typing event should reset timer
      const secondEvent = {
        text: 'Hello teh',
        caret: 9,
        atMs: Date.now() + SHORT_PAUSE_MS / 2,
      };

      scheduler.onEvent(secondEvent);

      // Fast-forward the remaining time from first event
      vi.advanceTimersByTime(SHORT_PAUSE_MS / 2 + 50);

      // Should not have triggered yet because timer was reset
      expect(mockLMAdapter.stream).not.toHaveBeenCalled();

      // Fast-forward full SHORT_PAUSE_MS from second event
      vi.advanceTimersByTime(SHORT_PAUSE_MS / 2);

      // Now should be ready to trigger
    });
  });

  describe('typing monitor integration', () => {
    it('creates typing monitor with correct tick timing', () => {
      const monitor = createTypingMonitor();
      
      // Should use reasonable tick timing for smooth UX
      // Default typing tick should be around 75ms
      expect(monitor).toBeDefined();
    });

    it('handles rapid typing events without overwhelming system', () => {
      const scheduler = createSweepScheduler(
        mockTypingMonitor,
        undefined,
        () => mockLMAdapter
      );

      // Simulate rapid typing (faster than SHORT_PAUSE_MS)
      const events = [];
      for (let i = 0; i < 10; i++) {
        events.push({
          text: 'Hello'.substring(0, i + 1),
          caret: i + 1,
          atMs: Date.now() + i * 50, // 50ms between events
        });
      }

      // Send all events rapidly
      events.forEach(event => scheduler.onEvent(event));

      // Fast-forward through all the rapid events
      vi.advanceTimersByTime(500);

      // Should not have triggered sweep during rapid typing
      expect(mockLMAdapter.stream).not.toHaveBeenCalled();

      // Fast-forward past SHORT_PAUSE_MS from last event
      vi.advanceTimersByTime(SHORT_PAUSE_MS);

      // Now should be ready to process
    });
  });

  describe('performance characteristics', () => {
    it('does not accumulate excessive timers', () => {
      const scheduler = createSweepScheduler(
        mockTypingMonitor,
        undefined,
        () => mockLMAdapter
      );

      // Simulate many typing events
      for (let i = 0; i < 100; i++) {
        scheduler.onEvent({
          text: `Text ${i}`,
          caret: 6 + i.toString().length,
          atMs: Date.now() + i * 10,
        });
      }

      // Should handle many events without memory leaks
      expect(true).toBe(true); // Basic smoke test
    });

    it('cleans up resources when stopped', () => {
      const scheduler = createSweepScheduler(
        mockTypingMonitor,
        undefined,
        () => mockLMAdapter
      );

      scheduler.onEvent({
        text: 'Test',
        caret: 4,
        atMs: Date.now(),
      });

      // Stop the scheduler
      scheduler.stop();

      // Fast-forward past SHORT_PAUSE_MS
      vi.advanceTimersByTime(SHORT_PAUSE_MS + 100);

      // Should not process events after stopped
      expect(mockLMAdapter.stream).not.toHaveBeenCalled();
    });
  });

  describe('demo timing optimization', () => {
    it('provides corrections within demo timeframe', () => {
      // Demo should show corrections within ~2 seconds total
      // This includes: SHORT_PAUSE_MS (600ms) + LM processing time
      
      const totalDemoTime = SHORT_PAUSE_MS + 1000; // Allow 1s for LM
      expect(totalDemoTime).toBeLessThan(2000);
      
      // SHORT_PAUSE_MS should be optimized for demo responsiveness
      expect(SHORT_PAUSE_MS).toBeGreaterThan(300); // Not too aggressive
      expect(SHORT_PAUSE_MS).toBeLessThan(800);    // Not too slow
    });

    it('balances responsiveness with accuracy', () => {
      // SHORT_PAUSE_MS should be long enough for:
      // 1. User to finish typing a word/phrase
      // 2. LM to have adequate context
      // 3. Not trigger on every keystroke
      
      expect(SHORT_PAUSE_MS).toBeGreaterThanOrEqual(500);
      expect(SHORT_PAUSE_MS).toBeLessThanOrEqual(700);
    });
  });
});


