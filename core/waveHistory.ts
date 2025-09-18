/*╔══════════════════════════════════════════════════════╗
  ║  ░  W A V E   H I S T O R Y   T R A C K E R  ░░░░░░░  ║
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
  • WHAT ▸ Track correction waves for Cmd+Alt+Z rollback
  • WHY  ▸ v0.6 external undo with dedicated wave rollback hotkey
  • HOW  ▸ Bundle diffs per wave; preserve native Cmd+Z behavior
*/

export interface WaveDiff {
  start: number;
  end: number;
  before: string;
  after: string;
  stage: 'noise' | 'context' | 'tone';
  appliedAt: number;
}

export interface CorrectionWave {
  id: string;
  startedAt: number;
  completedAt: number;
  diffs: WaveDiff[];
  originalText: string;
  finalText: string;
}

export class WaveHistoryTracker {
  private waves: CorrectionWave[] = [];
  private currentWave: CorrectionWave | null = null;
  private maxWaves = 10; // Keep last 10 waves for memory efficiency

  /**
   * Start tracking a new correction wave
   */
  startWave(originalText: string): string {
    const waveId = `wave-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    this.currentWave = {
      id: waveId,
      startedAt: Date.now(),
      completedAt: 0,
      diffs: [],
      originalText,
      finalText: originalText,
    };
    
    return waveId;
  }

  /**
   * Add a diff to the current wave
   */
  addDiff(diff: Omit<WaveDiff, 'appliedAt'>): void {
    if (!this.currentWave) {
      console.warn('[WaveHistory] No active wave to add diff to');
      return;
    }

    this.currentWave.diffs.push({
      ...diff,
      appliedAt: Date.now(),
    });

    // Update final text state
    this.currentWave.finalText = 
      this.currentWave.finalText.slice(0, diff.start) + 
      diff.after + 
      this.currentWave.finalText.slice(diff.end);
  }

  /**
   * Complete the current wave and store it
   */
  completeWave(): CorrectionWave | null {
    if (!this.currentWave) {
      return null;
    }

    this.currentWave.completedAt = Date.now();
    
    // Only store waves that actually made changes
    if (this.currentWave.diffs.length > 0) {
      this.waves.push(this.currentWave);
      
      // Maintain max wave limit
      if (this.waves.length > this.maxWaves) {
        this.waves.shift();
      }
      
      const completedWave = this.currentWave;
      this.currentWave = null;
      return completedWave;
    } else {
      // Return null for empty waves (not stored)
      this.currentWave = null;
      return null;
    }
  }

  /**
   * Get the last completed wave for rollback
   */
  getLastWave(): CorrectionWave | null {
    return this.waves[this.waves.length - 1] || null;
  }

  /**
   * Remove and return the last wave (for rollback)
   */
  popLastWave(): CorrectionWave | null {
    return this.waves.pop() || null;
  }

  /**
   * Generate revert operations for a wave (right-to-left order)
   */
  generateRevertOps(wave: CorrectionWave): Array<{ start: number; end: number; text: string }> {
    // Sort diffs right-to-left by start position to avoid index shifts
    return [...wave.diffs]
      .sort((a, b) => b.start - a.start)
      .map(diff => ({
        start: diff.start,
        end: diff.start + diff.after.length, // Current end position
        text: diff.before, // Restore original text
      }));
  }

  /**
   * Get wave statistics for debugging
   */
  getStats(): { totalWaves: number; currentWaveActive: boolean; lastWaveSize: number } {
    const lastWave = this.getLastWave();
    return {
      totalWaves: this.waves.length,
      currentWaveActive: this.currentWave !== null,
      lastWaveSize: lastWave?.diffs.length || 0,
    };
  }

  /**
   * Clear all wave history
   */
  clear(): void {
    this.waves = [];
    this.currentWave = null;
  }
}
