/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T Y P I N G   M O N I T O R  ░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Observes keystrokes and emits timestamped events to        ║
  ║   downstream schedulers/engines. Host apps subscribe here.   ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Provides a minimal observable API for typing events
  • WHY  ▸ Decouples input capture from processing
  • HOW  ▸ Notifies SweepScheduler; consumed by engines indirectly
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

export function createTypingMonitor(): TypingMonitor {
  const listeners = new Set<(event: TypingEvent) => void>();
  return {
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event) {
      for (const listener of listeners) listener(event);
    },
  };
}
