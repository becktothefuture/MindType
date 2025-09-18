/*╔══════════════════════════════════════════════════════╗
  ║  ░  W A V E   H I S T O R Y   T E S T S  ░░░░░░░░░░░  ║
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
  • WHAT ▸ Test wave history tracking and rollback functionality
  • WHY  ▸ Validate Cmd+Alt+Z rollback preserves native Cmd+Z
  • HOW  ▸ Unit tests for wave bundling, revert ops, history management
*/

import { describe, it, expect, beforeEach } from 'vitest';
import { WaveHistoryTracker } from '../core/waveHistory';

describe('Wave History Tracker', () => {
  let tracker: WaveHistoryTracker;

  beforeEach(() => {
    tracker = new WaveHistoryTracker();
  });

  describe('wave lifecycle', () => {
    it('tracks complete wave lifecycle', () => {
      const originalText = 'Hello wrold';
      const waveId = tracker.startWave(originalText);
      
      expect(waveId).toMatch(/^wave-\d+-\w+$/);
      expect(tracker.getStats().currentWaveActive).toBe(true);
      
      // Add diffs to the wave
      tracker.addDiff({
        start: 6,
        end: 11,
        before: 'wrold',
        after: 'world',
        stage: 'noise',
      });
      
      const completedWave = tracker.completeWave();
      expect(completedWave).not.toBeNull();
      expect(completedWave!.diffs).toHaveLength(1);
      expect(completedWave!.originalText).toBe('Hello wrold');
      expect(completedWave!.finalText).toBe('Hello world');
      expect(tracker.getStats().currentWaveActive).toBe(false);
    });

    it('bundles multiple stage diffs in one wave', () => {
      const originalText = 'hello wrold. this is a test';
      tracker.startWave(originalText);
      
      // Noise stage
      tracker.addDiff({
        start: 6,
        end: 11,
        before: 'wrold',
        after: 'world',
        stage: 'noise',
      });
      
      // Context stage  
      tracker.addDiff({
        start: 13,
        end: 17,
        before: 'this',
        after: 'This',
        stage: 'context',
      });
      
      const wave = tracker.completeWave();
      expect(wave!.diffs).toHaveLength(2);
      expect(wave!.diffs[0].stage).toBe('noise');
      expect(wave!.diffs[1].stage).toBe('context');
    });

    it('maintains wave history with max limit', () => {
      // Create more waves than the limit
      for (let i = 0; i < 15; i++) {
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
      
      const stats = tracker.getStats();
      expect(stats.totalWaves).toBeLessThanOrEqual(10); // Max limit enforced
      expect(stats.totalWaves).toBeGreaterThan(5); // But keeps reasonable history
    });
  });

  describe('rollback operations', () => {
    it('generates correct revert operations', () => {
      tracker.startWave('Hello wrold test');
      
      // Apply multiple diffs
      tracker.addDiff({
        start: 6,
        end: 11,
        before: 'wrold',
        after: 'world',
        stage: 'noise',
      });
      
      tracker.addDiff({
        start: 12,
        end: 16,
        before: 'test',
        after: 'Test',
        stage: 'context',
      });
      
      const wave = tracker.completeWave()!;
      const revertOps = tracker.generateRevertOps(wave);
      
      // Should be sorted right-to-left to avoid index shifts
      expect(revertOps).toHaveLength(2);
      expect(revertOps[0].start).toBeGreaterThan(revertOps[1].start);
      expect(revertOps[0].text).toBe('test'); // Restore original
      expect(revertOps[1].text).toBe('wrold'); // Restore original
    });

    it('handles empty waves gracefully', () => {
      tracker.startWave('No changes');
      const wave = tracker.completeWave();
      
      expect(wave).toBeNull(); // Empty waves not stored
      expect(tracker.getLastWave()).toBeNull();
    });

    it('provides last wave for rollback', () => {
      tracker.startWave('Test text');
      tracker.addDiff({
        start: 0,
        end: 4,
        before: 'Test',
        after: 'test',
        stage: 'noise',
      });
      tracker.completeWave();
      
      const lastWave = tracker.getLastWave();
      expect(lastWave).not.toBeNull();
      expect(lastWave!.diffs).toHaveLength(1);
      
      // Pop for rollback
      const poppedWave = tracker.popLastWave();
      expect(poppedWave).toBe(lastWave);
      expect(tracker.getLastWave()).toBeNull(); // Removed after pop
    });
  });

  describe('edge cases', () => {
    it('handles adding diff without active wave', () => {
      tracker.addDiff({
        start: 0,
        end: 4,
        before: 'test',
        after: 'TEST',
        stage: 'noise',
      });
      
      // Should not crash; no active wave to add to
      expect(tracker.getStats().currentWaveActive).toBe(false);
    });

    it('handles completing wave without starting', () => {
      const result = tracker.completeWave();
      expect(result).toBeNull();
    });

    it('tracks timing correctly', () => {
      const startTime = Date.now();
      tracker.startWave('Test');
      
      tracker.addDiff({
        start: 0,
        end: 4,
        before: 'Test',
        after: 'test',
        stage: 'noise',
      });
      
      const wave = tracker.completeWave()!;
      
      expect(wave.startedAt).toBeGreaterThanOrEqual(startTime);
      expect(wave.completedAt).toBeGreaterThanOrEqual(wave.startedAt);
      expect(wave.diffs[0].appliedAt).toBeGreaterThanOrEqual(wave.startedAt);
    });
  });
});
