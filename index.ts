/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  M I N D T Y P E R   E N T R Y  ░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Wires TypingMonitor → SweepScheduler → Engines.            ║
  ║   Single entrypoint for bootstrapping the system.            ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Bootstraps monitoring and scheduling pipelines
  • WHY  ▸ Provides a stable API for host apps/tests
  • HOW  ▸ Imports core modules; returns handles for control
*/

import { createTypingMonitor } from "./core/typingMonitor";
import { createSweepScheduler } from "./core/sweepScheduler";

export function boot() {
  const monitor = createTypingMonitor();
  const scheduler = createSweepScheduler();
  /* ⟢ TODO: connect signals and start loop */
  return { monitor, scheduler };
}
