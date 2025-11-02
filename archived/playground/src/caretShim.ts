/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C A R E T   S H I M   ( W E B  ↔  W A S M )  ░░░░░░░░░░  ║
  ║                                                              ║
  ║   Thin DOM event bridge to Rust Caret Monitor v2.            ║
  ║   Normalizes events and batches snapshots on rAF.            ║
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
  • WHAT ▸ Attaches DOM events, forwards to WASM CaretMonitor
  • WHY  ▸ Cross‑platform state with minimal JS logic
  • HOW  ▸ Dynamic import of wasm pkg; listeners map to EventKind
*/

import { isSecureElement } from "../../ui/securityDetection";

type WasmModule = any;

export type CaretSnapshot = {
  primary: string;
  input_modality: string;
  field_kind: string;
  selection: { collapsed: boolean; start: number; end: number };
  ime_active: boolean;
  blocked: boolean;
  caret: number;
  text_len: number;
  device_tier: string;
  timestamp_ms: number;
};

export type CaretShim = {
  detach(): void;
  onSnapshot(cb: (snaps: CaretSnapshot[]) => void): void;
  setThresholds(t: Partial<{
    short_pause_ms: number;
    long_pause_ms: number;
    decay_ms: number;
    jump_threshold_chars: number;
    delete_burst_window_ms: number;
    delete_burst_min: number;
  }>): void;
};

function nowMs(): number {
  return Date.now();
}

function getActiveEditable(): HTMLInputElement | HTMLTextAreaElement | HTMLElement | null {
  const ae = (document as Document | any).activeElement as Element | null;
  if (!ae) return null;
  if (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement) return ae;
  if (ae instanceof HTMLElement && ae.isContentEditable) return ae;
  return null;
}

function readSelection(el: Element | null): { collapsed: boolean; start: number; end: number } {
  if (!el) return { collapsed: true, start: 0, end: 0 };
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = (el.selectionStart ?? 0) | 0;
    const end = (el.selectionEnd ?? start) | 0;
    return { collapsed: start === end, start, end };
  }
  if (el instanceof HTMLElement && el.isContentEditable) {
    const sel = (el.ownerDocument || document).getSelection();
    if (!sel || sel.rangeCount === 0) return { collapsed: true, start: 0, end: 0 };
    const r = sel.getRangeAt(0);
    // Compute offsets relative to the element by walking text nodes
    // This is a linear scan, but fine for small demos.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let start = 0;
    let end = 0;
    let foundStart = false;
    let foundEnd = false;
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!foundStart && node === r.startContainer) {
        start = offset + r.startOffset;
        foundStart = true;
      }
      if (!foundEnd && node === r.endContainer) {
        end = offset + r.endOffset;
        foundEnd = true;
      }
      offset += node.data.length;
      if (foundStart && foundEnd) break;
    }
    if (!foundStart) start = 0;
    if (!foundEnd) end = start;
    const collapsed = start === end;
    return { collapsed, start, end };
  }
  return { collapsed: true, start: 0, end: 0 };
}

function fieldKindFor(el: Element | null): string {
  if (!el) return "OTHER";
  if (el instanceof HTMLInputElement) {
    if (el.type.toLowerCase() === "password") return "PASSWORD";
    return "INPUT_TEXT";
  }
  if (el instanceof HTMLTextAreaElement) return "TEXT_AREA";
  if (el instanceof HTMLElement && el.isContentEditable) return "CONTENT_EDITABLE";
  return "OTHER";
}

function computeCaret(el: Element | null, sel: { start: number; end: number }): { caret: number; text_len: number } {
  if (!el) return { caret: 0, text_len: 0 };
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const text = el.value || "";
    return { caret: sel.start, text_len: text.length };
  }
  if (el instanceof HTMLElement && el.isContentEditable) {
    const text = (el.textContent || "");
    return { caret: Math.min(sel.start, text.length), text_len: text.length };
  }
  return { caret: 0, text_len: 0 };
}

function modalityFor(ev: Event): string {
  if (ev.type.startsWith("composition")) return "IME";
  if (ev.type === "paste") return "PASTE";
  if (ev.type === "drop") return "DROP";
  if (ev.type === "keydown") return "KEYBOARD";
  return "UNKNOWN";
}

function eventKindFor(ev: Event): string {
  switch (ev.type) {
    case "focusin": return "FOCUS_IN";
    case "focusout": return "FOCUS_OUT";
    case "selectionchange": return "SELECTION_CHANGE";
    case "keydown": return "KEY_DOWN";
    case "beforeinput": return "BEFORE_INPUT";
    case "input": return "INPUT";
    case "compositionstart": return "COMPOSITION_START";
    case "compositionupdate": return "COMPOSITION_UPDATE";
    case "compositionend": return "COMPOSITION_END";
    case "paste": return "PASTE";
    case "cut": return "CUT";
    case "drop": return "DROP";
    case "pointerdown": return "POINTER_DOWN";
    default: return "INPUT";
  }
}

async function createTSShim(root?: Document | HTMLElement): Promise<CaretShim> {
  let onSnaps: ((snaps: CaretSnapshot[]) => void) | null = null;
  let lastTyping = 0;
  let pastedUntil = 0;
  let cutUntil = 0;
  let dropUntil = 0;
  let undoUntil = 0;
  let autocorrectUntil = 0;
  let ime = false;
  let blocked = false;
  let lastPrimary = 'BLUR';
  let lastCaret = 0;
  let lastDeleteMs = 0;
  let deleteCountWindow = 0;
  let caretJumpUntil = 0;
  let lineBreakUntil = 0;
  let arrowMoveUntil = 0;
  const jumpThreshold = 6; // chars
  const deleteWindowMs = 250;

  const target: any = root || document;

  function snapshot(primary: string): CaretSnapshot {
    const active = getActiveEditable();
    const sel = readSelection(active);
    const { caret, text_len } = computeCaret(active, sel);
    blocked = isSecureElement(active);
    return {
      primary,
      input_modality: 'UNKNOWN',
      field_kind: fieldKindFor(active),
      selection: sel,
      ime_active: ime,
      blocked,
      caret,
      text_len,
      device_tier: 'WASM',
      timestamp_ms: Date.now(),
    };
  }

  function computePrimary(): string {
    const active = getActiveEditable();
    const sel = readSelection(active);
    const now = Date.now();
    if (!active) return 'BLUR';
    if (sel && !sel.collapsed && sel.end > sel.start) return 'SELECTION_ACTIVE';
    if (now <= pastedUntil) return 'PASTED';
    if (now <= caretJumpUntil) return 'CARET_JUMP';
    const dt = now - lastTyping;
    if (dt <= 150) return 'TYPING';
    if (dt >= 2000) return 'LONG_PAUSE';
    if (dt >= 300) return 'SHORT_PAUSE';
    return 'ACTIVE_IDLE';
  }

  function emitIfChanged() {
    const primary = computePrimary();
    if (primary !== lastPrimary) {
      lastPrimary = primary;
      const s = snapshot(primary);
      if (onSnaps) onSnaps([s]);
      try {
        const ev = new CustomEvent('mindtype:caretSnapshots', { detail: [s] });
        window.dispatchEvent(ev);
      } catch {}
    }
    // Emit status map (LEDs)
    try {
      const active = getActiveEditable();
      const sel = readSelection(active);
      const now = Date.now();
      const statuses = {
        BLUR: !active,
        ACTIVE_IDLE: lastPrimary === 'ACTIVE_IDLE',
        TYPING: lastPrimary === 'TYPING',
        PASTED: now <= pastedUntil,
        SHORT_PAUSE: lastPrimary === 'SHORT_PAUSE',
        LONG_PAUSE: lastPrimary === 'LONG_PAUSE',
        DELETE_BURST: deleteCountWindow >= 3 && (now - lastDeleteMs) <= deleteWindowMs,
        SELECTION_ACTIVE: !!sel && !sel.collapsed && sel.end > sel.start,
        CARET_JUMP: now <= caretJumpUntil,
        IME_COMPOSING: ime,
        BLOCKED: blocked,
      } as Record<string, boolean>;
      const events = {
        CUT: now <= cutUntil,
        UNDO_REDO: now <= undoUntil,
        DROP: now <= dropUntil,
        AUTOCORRECT: now <= autocorrectUntil,
        LINE_BREAK: now <= lineBreakUntil,
        ARROW_MOVE: now <= arrowMoveUntil,
      } as Record<string, boolean>;
      const ev2 = new CustomEvent('mindtype:status', { detail: { statuses, events } });
      window.dispatchEvent(ev2);
    } catch {}
  }

  const types = [
    'focusin','focusout','selectionchange','keydown','beforeinput','input','compositionstart','compositionend','paste','cut','drop'
  ];
  const handler = (ev: Event) => {
    if (ev.type === 'compositionstart') ime = true;
    if (ev.type === 'compositionend') ime = false;
    if (ev.type === 'paste') pastedUntil = Date.now() + 500;
    if (ev.type === 'cut') cutUntil = Date.now() + 500;
    if (ev.type === 'drop') dropUntil = Date.now() + 500;
    if (ev.type === 'beforeinput') {
      const it = (ev as any).inputType as string | undefined;
      if (it === 'historyUndo' || it === 'historyRedo') undoUntil = Date.now() + 500;
      if (it === 'insertReplacementText') autocorrectUntil = Date.now() + 800;
      if (it === 'insertParagraph') lineBreakUntil = Date.now() + 500;
      if (it && it.startsWith('delete')) {
        const now = Date.now();
        if (now - lastDeleteMs <= deleteWindowMs) deleteCountWindow += 1; else deleteCountWindow = 1;
        lastDeleteMs = now;
      }
      lastTyping = Date.now();
    }
    if (ev.type === 'keydown') {
      const e = ev as KeyboardEvent;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const now = Date.now();
        if (now - lastDeleteMs <= deleteWindowMs) deleteCountWindow += 1; else deleteCountWindow = 1;
        lastDeleteMs = now;
      }
      if (e.key.startsWith('Arrow')) {
        // caret jump detection via next rAF compare
        const active = getActiveEditable();
        const sel = readSelection(active);
        const nowCaret = computeCaret(active, sel).caret;
        if (Math.abs(nowCaret - lastCaret) >= jumpThreshold) caretJumpUntil = Date.now() + 300;
        arrowMoveUntil = Date.now() + 300;
      }
      if (e.key === 'Enter') lineBreakUntil = Date.now() + 500;
    }
    if (ev.type === 'selectionchange') {
      const active = getActiveEditable();
      const sel = readSelection(active);
      const nowCaret = computeCaret(active, sel).caret;
      if (Math.abs(nowCaret - lastCaret) >= jumpThreshold) caretJumpUntil = Date.now() + 300;
      lastCaret = nowCaret;
    }
    emitIfChanged();
  };
  types.forEach((t) => target.addEventListener(t, handler, true));

  let alive = true;
  function loop() { if (!alive) return; emitIfChanged(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  return {
    detach() { alive = false; types.forEach((t) => target.removeEventListener(t, handler, true)); },
    onSnapshot(cb) { onSnaps = cb; },
    setThresholds() {},
  };
}

export async function createCaretShim(root?: Document | HTMLElement): Promise<CaretShim | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  let mod: WasmModule | null = null;
  try {
    // Dynamic import of wasm pkg. Path is relative to web-demo in monorepo.
    mod = await import("../../bindings/wasm/pkg/core_rs.js");
    if (mod && mod.default) await mod.default();
  } catch {
    // If WASM package not present (tests), provide a TS fallback shim
    return createTSShim(root);
  }

  let monitor: any;
  try {
    monitor = new mod!.WasmCaretMonitor();
  } catch {
    // Older pkg without CaretMonitor → TS fallback shim
    return createTSShim(root);
  }
  let rafPending = false;
  let onSnaps: ((snaps: CaretSnapshot[]) => void) | null = null;

  function flush() {
    rafPending = false;
    monitor.flush();
  }

  monitor.on_snapshot((arr: CaretSnapshot[]) => {
    if (onSnaps) onSnaps(arr);
    // Also dispatch a DOM event for consumers not directly wired to the shim
    try {
      const ev = new CustomEvent('mindtype:caretSnapshots', { detail: arr });
      window.dispatchEvent(ev);
      // Wire stats directly from WASM monitor if available
      try {
        const s = monitor.get_stats?.();
        if (s) (window as any).__mtStats = s;
      } catch {}
    } catch {}
  });

  function scheduleFlush() {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(flush);
    }
  }

  // Continuously flush to emit phase transitions even without new events
  let rafKeepAlive = true;
  function loop() {
    if (!rafKeepAlive) return;
    scheduleFlush();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function handle(ev: Event) {
    const active = getActiveEditable();
    const sel = readSelection(active);
    const { caret, text_len } = computeCaret(active, sel);
    const blocked = isSecureElement(active);
    const ime_active = (ev.type.startsWith("composition"));
    const input = (ev as any).inputType as (string | undefined);

    monitor.update({
      kind: eventKindFor(ev),
      timestamp_ms: nowMs(),
      caret,
      text_len,
      selection: sel,
      input_modality: modalityFor(ev),
      field_kind: fieldKindFor(active),
      ime_active,
      blocked,
      input_type: input ?? null,
    });
    scheduleFlush();
  }

  const target: any = root || document;
  const types = [
    "focusin","focusout","selectionchange","keydown","beforeinput","input",
    "compositionstart","compositionupdate","compositionend","paste","cut","drop","pointerdown"
  ];
  types.forEach((t) => target.addEventListener(t, handle, true));
  const onVisibility = () => {
    const kind = document.visibilityState === 'hidden' ? 'VISIBILITY_HIDDEN' : 'VISIBILITY_VISIBLE';
    monitor.update({
      kind,
      timestamp_ms: nowMs(),
      caret: 0,
      text_len: 0,
      selection: { collapsed: true, start: 0, end: 0 },
      input_modality: 'UNKNOWN',
      field_kind: 'OTHER',
      ime_active: false,
      blocked: false,
      input_type: null,
    });
    scheduleFlush();
  };
  document.addEventListener('visibilitychange', onVisibility, true);

  return {
    detach() {
      types.forEach((t) => target.removeEventListener(t, handle, true));
      document.removeEventListener('visibilitychange', onVisibility, true);
      rafKeepAlive = false;
    },
    onSnapshot(cb: (snaps: CaretSnapshot[]) => void) {
      onSnaps = cb;
    },
    setThresholds(partial) {
      // Read current and merge
      const cur = monitor.get_thresholds();
      const next = { ...cur, ...partial };
      monitor.set_thresholds(next);
    },
  };
}


