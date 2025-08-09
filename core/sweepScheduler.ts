/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S W E E P   S C H E D U L E R  ░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Schedules forward (tidy) and reverse (backfill) passes     ║
  ║   based on TYPING MONITOR signals and pause thresholds.      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Debounces events; triggers tidySweep/backfill passes
  • WHY  ▸ Avoids excessive compute; respects CARET dynamics
  • HOW  ▸ Subscribes to TypingMonitor; invokes engines with input
*/

import { SHORT_PAUSE_MS, TYPING_TICK_MS } from '../config/defaultThresholds';
import { tidySweep } from '../engines/tidySweep';
import { backfillConsistency } from '../engines/backfillConsistency';
import type { TypingMonitor, TypingEvent } from './typingMonitor';
import { createDiffusionController } from './diffusionController';

export interface SweepScheduler {
  start(): void;
  stop(): void;
}

export function createSweepScheduler(monitor?: TypingMonitor): SweepScheduler {
  let lastEvent: TypingEvent | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let typingInterval: ReturnType<typeof setInterval> | null = null;
  const diffusion = createDiffusionController();

  function onEvent(ev: TypingEvent) {
    lastEvent = ev;
    diffusion.update(ev.text, ev.caret);
    if (timer) clearTimeout(timer);
    // schedule pause catch-up
    timer = setTimeout(() => runSweeps(), SHORT_PAUSE_MS);
    // ensure streaming tick during active typing
    if (!typingInterval) {
      typingInterval = setInterval(() => diffusion.tickOnce(), TYPING_TICK_MS);
    }
  }

  function runSweeps() {
    if (!lastEvent) return;
    // Final catch-up of streamed diffusion on pause
    diffusion.catchUp();
    // Legacy engines can still run after catch-up
    tidySweep({ text: lastEvent.text, caret: lastEvent.caret });
    backfillConsistency({ text: lastEvent.text, caret: lastEvent.caret });
  }

  let unsubscribe: (() => void) | null = null;
  return {
    start() {
      if (!monitor) return;
      unsubscribe = monitor.on(onEvent);
    },
    stop() {
      if (unsubscribe) unsubscribe();
      if (timer) clearTimeout(timer);
      if (typingInterval) clearInterval(typingInterval);
      timer = null;
      typingInterval = null;
    },
  };
}
