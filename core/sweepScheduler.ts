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

import { SHORT_PAUSE_MS } from "../config/defaultThresholds";
import { tidySweep } from "../engines/tidySweep";
import { backfillConsistency } from "../engines/backfillConsistency";
import type { TypingMonitor, TypingEvent } from "./typingMonitor";

export interface SweepScheduler {
  start(): void;
  stop(): void;
}

export function createSweepScheduler(monitor?: TypingMonitor): SweepScheduler {
  let lastEvent: TypingEvent | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function onEvent(ev: TypingEvent) {
    lastEvent = ev;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => runSweeps(), SHORT_PAUSE_MS);
  }

  function runSweeps() {
    if (!lastEvent) return;
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
      timer = null;
    },
  };
}
