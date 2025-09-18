/*╔══════════════════════════════════════════════════════╗
  ║  ░  R O L L B A C K   H A N D L E R   V 0 . 6  ░░░░░  ║
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
  • WHAT ▸ Cmd+Alt+Z hotkey for rolling back last correction wave
  • WHY  ▸ v0.6 external undo with dedicated wave rollback
  • HOW  ▸ Global hotkey handler; preserves native Cmd+Z behavior
*/

import type { WaveHistoryTracker } from '../core/waveHistory';

export interface RollbackHandler {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
}

export function createRollbackHandler(
  waveTracker: WaveHistoryTracker,
  applyDiffs: (diffs: Array<{ start: number; end: number; text: string }>) => void
): RollbackHandler {
  let enabled = false;
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  const enable = () => {
    if (enabled) return;
    
    keydownHandler = (e: KeyboardEvent) => {
      // Cmd+Alt+Z (or Ctrl+Alt+Z on Windows/Linux)
      const isRollbackHotkey = (e.metaKey || e.ctrlKey) && e.altKey && e.key === 'z';
      
      if (isRollbackHotkey) {
        e.preventDefault();
        e.stopPropagation();
        
        // Rollback last wave
        const lastWave = waveTracker.popLastWave();
        if (lastWave) {
          const revertOps = waveTracker.generateRevertOps(lastWave);
          applyDiffs(revertOps);
          
          console.log(`[Rollback] Reverted wave ${lastWave.id} with ${lastWave.diffs.length} diffs`);
          
          // Emit custom event for UI feedback
          const event = new CustomEvent('mindtype:waveRollback', {
            detail: {
              waveId: lastWave.id,
              diffsReverted: lastWave.diffs.length,
              originalText: lastWave.originalText,
            },
          });
          document.dispatchEvent(event);
        } else {
          console.log('[Rollback] No waves to rollback');
        }
        
        return false;
      }
      
      // Let native Cmd+Z pass through unchanged
      return true;
    };
    
    document.addEventListener('keydown', keydownHandler, { capture: true });
    enabled = true;
    console.log('[Rollback] Cmd+Alt+Z handler enabled');
  };

  const disable = () => {
    if (!enabled || !keydownHandler) return;
    
    document.removeEventListener('keydown', keydownHandler, { capture: true });
    keydownHandler = null;
    enabled = false;
    console.log('[Rollback] Cmd+Alt+Z handler disabled');
  };

  const isEnabled = () => enabled;

  return { enable, disable, isEnabled };
}
