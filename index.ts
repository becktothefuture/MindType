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

import { createTypingMonitor, type TypingEvent } from './core/typingMonitor';
import { createSweepScheduler } from './core/sweepScheduler';
import { createDefaultSecurityContext, type SecurityContext } from './core/security';
import type { LMAdapter } from './core/lm/types';

// Minimal LM adapter stub to stabilise the public API. Will be wired in FT-230+.
export function createNoopLMAdapter(): LMAdapter {
  async function* empty() {
    // no-op stream
  }
  return { stream: () => empty() } as LMAdapter;
}

export function boot(options?: { security?: SecurityContext }) {
  const monitor = createTypingMonitor();
  const security = options?.security ?? createDefaultSecurityContext();
  // LM adapter can be injected later; pass getter to scheduler/controller
  let lmAdapter: LMAdapter = createNoopLMAdapter();
  const scheduler = createSweepScheduler(
    monitor,
    security,
    () => lmAdapter as unknown as any,
  );

  // lmAdapter declared above

  function start() {
    scheduler.start();
  }

  function stop() {
    scheduler.stop();
  }

  function ingest(text: string, caret: number, atMs: number = Date.now()) {
    const ev: TypingEvent = { text, caret, atMs };
    monitor.emit(ev);
  }

  function setLMAdapter(adapter: LMAdapter) {
    lmAdapter = adapter;
  }

  return {
    // controls
    start,
    stop,
    ingest,
    setLMAdapter,
    getLMAdapter: () => lmAdapter,
    // exposed handles for advanced hosts/tests
    monitor,
    scheduler,
    security,
  };
}
