/*╔══════════════════════════════════════════════════════╗
  ║  ░  R O L L B A C K   H A N D L E R   T E S T S  ░░░  ║
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
  • WHAT ▸ Test Cmd+Alt+Z rollback while preserving native Cmd+Z
  • WHY  ▸ Validate hotkey behavior and event handling
  • HOW  ▸ Mock keyboard events; test wave rollback vs native undo
*/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRollbackHandler } from '../ui/rollbackHandler';
import { WaveHistoryTracker } from '../core/waveHistory';

// Mock DOM for testing
Object.defineProperty(global, 'document', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(global, 'CustomEvent', {
  value: class MockCustomEvent {
    constructor(public type: string, public init?: any) {}
  },
  writable: true,
});

describe('Rollback Handler', () => {
  let tracker: WaveHistoryTracker;
  let handler: ReturnType<typeof createRollbackHandler>;
  let mockApplyDiffs: any;
  let mockAddEventListener: any;
  let mockRemoveEventListener: any;

  beforeEach(() => {
    tracker = new WaveHistoryTracker();
    mockApplyDiffs = vi.fn();
    mockAddEventListener = vi.fn();
    mockRemoveEventListener = vi.fn();
    
    // Mock document methods
    (global.document.addEventListener as any) = mockAddEventListener;
    (global.document.removeEventListener as any) = mockRemoveEventListener;
    
    handler = createRollbackHandler(tracker, mockApplyDiffs);
  });

  afterEach(() => {
    if (handler.isEnabled()) {
      handler.disable();
    }
    vi.clearAllMocks();
  });

  describe('hotkey registration', () => {
    it('registers keydown listener when enabled', () => {
      handler.enable();
      
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        { capture: true }
      );
      expect(handler.isEnabled()).toBe(true);
    });

    it('removes listener when disabled', () => {
      handler.enable();
      handler.disable();
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        { capture: true }
      );
      expect(handler.isEnabled()).toBe(false);
    });

    it('prevents double registration', () => {
      handler.enable();
      handler.enable(); // Second call should be no-op
      
      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('hotkey behavior', () => {
    it('intercepts Cmd+Alt+Z for wave rollback', () => {
      // Setup wave history
      tracker.startWave('Hello wrold');
      tracker.addDiff({
        start: 6,
        end: 11,
        before: 'wrold',
        after: 'world',
        stage: 'noise',
      });
      tracker.completeWave();
      
      handler.enable();
      
      // Get the registered handler
      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      
      // Simulate Cmd+Alt+Z
      const mockEvent = {
        metaKey: true,
        altKey: true,
        key: 'z',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };
      
      const result = keydownHandler(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockApplyDiffs).toHaveBeenCalledWith([
        { start: 6, end: 11, text: 'wrold' } // Revert operation
      ]);
      expect(result).toBe(false);
    });

    it('lets native Cmd+Z pass through', () => {
      handler.enable();
      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      
      // Simulate Cmd+Z (no Alt key)
      const mockEvent = {
        metaKey: true,
        altKey: false,
        key: 'z',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };
      
      const result = keydownHandler(mockEvent);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
      expect(mockApplyDiffs).not.toHaveBeenCalled();
      expect(result).toBe(true); // Let it pass through
    });

    it('handles Ctrl+Alt+Z on Windows/Linux', () => {
      // Setup wave
      tracker.startWave('Test');
      tracker.addDiff({
        start: 0,
        end: 4,
        before: 'Test',
        after: 'test',
        stage: 'context',
      });
      tracker.completeWave();
      
      handler.enable();
      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      
      // Simulate Ctrl+Alt+Z
      const mockEvent = {
        metaKey: false,
        ctrlKey: true,
        altKey: true,
        key: 'z',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };
      
      keydownHandler(mockEvent);
      
      expect(mockApplyDiffs).toHaveBeenCalled();
    });

    it('handles no waves to rollback gracefully', () => {
      handler.enable();
      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      
      // Simulate Cmd+Alt+Z with no waves
      const mockEvent = {
        metaKey: true,
        altKey: true,
        key: 'z',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };
      
      keydownHandler(mockEvent);
      
      expect(mockApplyDiffs).not.toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled(); // Still prevent default
    });
  });

  describe('integration with wave tracker', () => {
    it('pops waves from tracker on rollback', () => {
      // Setup multiple waves
      for (let i = 0; i < 3; i++) {
        tracker.startWave(`text ${i}`);
        tracker.addDiff({
          start: 0,
          end: 4,
          before: 'text',
          after: 'TEXT',
          stage: 'noise',
        });
        tracker.completeWave();
      }
      
      expect(tracker.getStats().totalWaves).toBe(3);
      
      handler.enable();
      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      
      // Rollback once
      keydownHandler({
        metaKey: true,
        altKey: true,
        key: 'z',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      });
      
      expect(tracker.getStats().totalWaves).toBe(2); // One wave removed
    });

    it('emits custom event on successful rollback', () => {
      const mockDispatchEvent = vi.fn();
      (global.document.dispatchEvent as any) = mockDispatchEvent;
      
      tracker.startWave('Test wave');
      tracker.addDiff({
        start: 0,
        end: 4,
        before: 'Test',
        after: 'test',
        stage: 'noise',
      });
      const wave = tracker.completeWave()!;
      
      handler.enable();
      const keydownHandler = mockAddEventListener.mock.calls[0][1];
      
      keydownHandler({
        metaKey: true,
        altKey: true,
        key: 'z',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      });
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.any(Object) // MockCustomEvent structure
      );
      
      // Verify the event details
      const eventCall = mockDispatchEvent.mock.calls[0][0];
      expect(eventCall.type).toBe('mindtype:waveRollback');
      expect(eventCall.init.detail.waveId).toBe(wave.id);
      expect(eventCall.init.detail.diffsReverted).toBe(1);
      expect(eventCall.init.detail.originalText).toBe('Test wave');
    });
  });
});
