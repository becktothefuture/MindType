/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C A R E T   M O N I T O R  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Emits typing/pause and caret_entered_active_region events  ║
  ║   with debounced, cancellable timing. Caret‑safe by design.  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Observe keystream and caret; emit {typing, pause, caret_entered_active_region}
  • WHY  ▸ Central, testable source of cadence/caret events for the scheduler
  • HOW  ▸ Debounced pause timer (350–600 ms configurable); inside‑band detection
*/

export type CaretMonitorEventType = 'typing' | 'pause' | 'caret_entered_active_region';

export interface ActiveRegionRange {
  start: number;
  end: number;
}

export interface CaretMonitorEvent {
  type: CaretMonitorEventType;
  atMs: number;
  caret: number;
  textLen: number;
  activeRegion?: ActiveRegionRange | null;
}

export interface CaretMonitorOptions {
  // Pause detection window; default 400 ms (spec: 350–600 ms range)
  pauseMs?: number;
}

export interface CaretMonitor {
  update(text: string, caret: number, atMs?: number): void;
  setActiveRegion(range: ActiveRegionRange | null): void;
  on(listener: (e: CaretMonitorEvent) => void): () => void;
  getState(): {
    lastTypingAtMs: number;
    scheduledPauseAtMs: number | null;
    activeRegion: ActiveRegionRange | null;
  };
}

export function createCaretMonitor(options?: CaretMonitorOptions): CaretMonitor {
  const listeners = new Set<(e: CaretMonitorEvent) => void>();
  const pauseMs = Math.max(350, Math.min(600, Math.floor(options?.pauseMs ?? 400)));

  let lastTypingAtMs = 0;
  let scheduledPauseAtMs: number | null = null;
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;
  let activeRegion: ActiveRegionRange | null = null;
  let lastCaret = 0;
  let wasInsideRegion = false;

  function emit(e: CaretMonitorEvent) {
    for (const l of listeners) l(e);
  }

  function schedulePause(now: number, caret: number, textLen: number) {
    if (pauseTimer) clearTimeout(pauseTimer);
    scheduledPauseAtMs = now + pauseMs;
    // ⟢ Debounced pause event; cancelled by subsequent update()
    pauseTimer = setTimeout(() => {
      emit({ type: 'pause', atMs: scheduledPauseAtMs!, caret, textLen, activeRegion });
      pauseTimer = null;
      scheduledPauseAtMs = null;
    }, pauseMs);
  }

  function update(text: string, caret: number, atMs?: number) {
    const now = atMs ?? Date.now();
    const textLen = text.length;

    // ⟢ Typing event (immediate)
    emit({ type: 'typing', atMs: now, caret, textLen, activeRegion });
    lastTypingAtMs = now;
    schedulePause(now, caret, textLen);

    // ⟢ Caret enters current active region (band) → signal for abort/rollback
    if (activeRegion) {
      const inside = caret >= activeRegion.start && caret <= activeRegion.end;
      if (inside && !wasInsideRegion && lastCaret !== caret) {
        emit({
          type: 'caret_entered_active_region',
          atMs: now,
          caret,
          textLen,
          activeRegion,
        });
      }
      wasInsideRegion = inside;
    } else {
      wasInsideRegion = false;
    }
    lastCaret = caret;
  }

  function setActiveRegion(range: ActiveRegionRange | null) {
    activeRegion = range;
    // Reset inside flag to require a fresh enter
    wasInsideRegion = false;
  }

  return {
    update,
    setActiveRegion,
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState() {
      return { lastTypingAtMs, scheduledPauseAtMs, activeRegion };
    },
  };
}
