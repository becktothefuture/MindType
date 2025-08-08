/*  ║▓▒░  M I N D T Y P E R   E N T R Y  ░▒▓║
WHAT ▸ Wire TypingMonitor → Scheduler → Engines */

import { createTypingMonitor } from './core/typingMonitor';
import { createSweepScheduler } from './core/sweepScheduler';

export function boot() {
  const monitor = createTypingMonitor();
  const scheduler = createSweepScheduler();
  /* ⟢ TODO: connect signals and start loop */
  return { monitor, scheduler };
}