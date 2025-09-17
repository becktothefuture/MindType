/*╔══════════════════════════════════════════════════════════╗
  ║  ░  TYPINGMONITOR  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ╚══════════════════════════════════════════════════════════╝
  • WHAT ▸ Muscle memory training through burst-pause-correct cycles
  • WHY  ▸ REQ-BURST-PAUSE-CORRECT
  • HOW  ▸ See linked contracts and guides in docs
*/

export interface TypingEvent {
  text: string;
  caret: number;
  atMs: number;
}

export interface TypingMonitor {
  on(listener: (event: TypingEvent) => void): () => void;
  emit(event: TypingEvent): void;
}

import { createLogger, getLoggerConfig } from './logger';

export function createTypingMonitor(): TypingMonitor {
  // Optional debug logger
  let log: import('./logger').Logger | null = null;
  try {
    if (getLoggerConfig().enabled) log = createLogger('monitor');
  } catch {}
  const listeners = new Set<(event: TypingEvent) => void>();
  return {
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event) {
      log?.debug('emit', {
        caret: event.caret,
        textLen: event.text.length,
        atMs: event.atMs,
      });
      for (const listener of listeners) listener(event);
    },
  };
}
