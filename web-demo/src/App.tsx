import { useState, useEffect, useRef } from "react";
import "./App.css";
import DebugPanel, { type LMDebugInfo } from "./components/DebugPanel";
import { SCENARIOS } from "./scenarios";
import { replaceRange } from "../../utils/diff";
// TS pipeline imports
import { boot } from "../../index";
import { createMockLMAdapter } from "../../core/lm/mockAdapter";
import { setLoggerConfig } from "../../core/logger";
import { createLiveRegion, type LiveRegion } from "../../ui/liveRegion";
// LM integration is driven by core pipeline (future task). Demo remains rules-only.
import {
  getTypingTickMs,
  setTypingTickMs,
  getMinValidationWords,
  getMaxValidationWords,
  setValidationBandWords,
} from "../../config/defaultThresholds";

function StatusStrip() {
  const [status, setStatus] = useState<{ statuses?: Record<string, boolean>; events?: Record<string, boolean> }>({});
  useEffect(() => {
    const on = (e: Event) => setStatus((e as CustomEvent).detail as any);
    window.addEventListener('mindtype:status', on as EventListener);
    return () => window.removeEventListener('mindtype:status', on as EventListener);
  }, []);
  const renderGroup = (title: string, keys: string[], values?: Record<string, boolean>, color = '#12d97b') => (
    <div style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.05)' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.9, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {keys.map((k) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 114 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>{k}</div>
            <div style={{ width: 12, height: 12, borderRadius: 12, marginTop: 6, background: values && values[k] ? color : 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)' }} />
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
      {renderGroup('Statuses', ['BLUR','ACTIVE_IDLE','TYPING','PASTED','SHORT_PAUSE','LONG_PAUSE','DELETE_BURST','SELECTION_ACTIVE','CARET_JUMP','IME_COMPOSING','BLOCKED'], status.statuses, '#12d97b')}
      {renderGroup('Events', ['CUT','UNDO_REDO','DROP','AUTOCORRECT','LINE_BREAK','ARROW_MOVE'], status.events, '#33b1ff')}
    </div>
  );
}

// Caret snapshot type from WASM shim
type CaretSnapshot = {
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

type MonitorStats = Partial<{
  events_processed: number;
  snapshots_emitted: number;
  deletes_seen: number;
  delete_bursts: number;
  pastes: number;
  cuts: number;
  undos_redos: number;
  caret_jumps: number;
  keystrokes: number;
  avg_inter_key_ms: number;
  eps_smoothed: number;
  wpm_smoothed: number;
  burst_len_current: number;
  burst_len_max: number;
}>;

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;")
    .replaceAll(/\u00A0/g, "&nbsp;");
}

function computeNewlineSafeRange(
  text: string,
  start: number,
  end: number,
  suppressUntilMs: number,
): { start: number; end: number } | null {
  if (Date.now() < suppressUntilMs) return null;
  const len = text.length;
  const s0 = Math.max(0, Math.min(start, len));
  const e0 = Math.max(0, Math.min(end, len));
  // Fallback when empty
  if (e0 <= s0) {
    let j = Math.max(0, s0 - 1);
    while (j > 0 && text[j] === "\n") j -= 1;
    if (text[j] === "\n") return null;
    return { start: j, end: Math.min(j + 1, len) };
  }
  let s = s0;
  let e = e0;
  const slice = text.slice(s, e);
  // If the slice contains a newline, clamp to last line segment
  const nl = slice.lastIndexOf("\n");
  if (nl !== -1) {
    s = s + nl + 1; // start just after the last newline in the slice
    if (s >= e) {
      // fallback to 1 char before the newline
      let j = Math.max(0, s - 1);
      while (j > 0 && text[j] === "\n") j -= 1;
      if (text[j] === "\n") return null;
      return { start: j, end: Math.min(j + 1, len) };
    }
  }
  // If clamped segment is newline-only/whitespace-only, fallback
  const seg = text.slice(s, e);
  if (seg === "" || /^\n+$/.test(seg)) {
    let j = Math.max(0, s - 1);
    while (j > 0 && text[j] === "\n") j -= 1;
    if (text[j] === "\n") return null;
    return { start: j, end: Math.min(j + 1, len) };
  }
  return { start: s, end: e };
}

function App() {
  const [text, setText] = useState(
    "",
  );
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [idleMs, setIdleMs] = useState(1000);
  // Legacy WASM demo removed
  const [tickMs, setTickMs] = useState<number>(getTypingTickMs());
  const [minBand, setMinBand] = useState<number>(getMinValidationWords());
  const [maxBand, setMaxBand] = useState<number>(getMaxValidationWords());
  const [bandRange, setBandRange] = useState<{ start: number; end: number } | null>(
    null,
  );
  const [lastHighlight, setLastHighlight] = useState<
    { start: number; end: number } | null
  >(null);
  const secureRef = useRef(false);
  const imeRef = useRef(false);
  const [isSecure, setIsSecure] = useState(false);
  const [isIMEComposing, setIsIMEComposing] = useState(false);
  const [freezeBand, setFreezeBand] = useState(false);
  const [bandDelayMs, setBandDelayMs] = useState(0);
  const suppressUntilRef = useRef<number>(0);
  const [pipeline] = useState(() =>
    boot({
      security: {
        isSecure: () => secureRef.current,
        isIMEComposing: () => imeRef.current,
      },
    }),
  );
  // WASM demo removed; pause state unused in rules-only demo
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [logs] = useState<LogEntry[]>([]);
  // reserved for LM-in-core chase policy
  const [isTyping, setIsTyping] = useState(false);
  const [lmDebug, setLmDebug] = useState<LMDebugInfo | undefined>(undefined);
  const [lmEnabled, setLmEnabled] = useState(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const caretRef = useRef<number>(0);
  const typingGlowTimerRef = useRef<number | null>(null);
  const liveRegionRef = useRef<LiveRegion | null>(null);

  // Caret monitor UI state
  const [caretState, setCaretState] = useState<CaretSnapshot | null>(null);
  const [caretLog, setCaretLog] = useState<CaretSnapshot[]>([]);
  const [eps, setEps] = useState<number>(0);
  const [stats, setStats] = useState<MonitorStats | null>(null);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setText(v);
    caretRef.current = e.target.selectionStart ?? v.length;
    const caret = e.target.selectionStart ?? v.length;
    // boundary hint reserved for future LM-in-core
    // glow on key input
    setIsTyping(true);
    if (typingGlowTimerRef.current) window.clearTimeout(typingGlowTimerRef.current);
    typingGlowTimerRef.current = window.setTimeout(() => setIsTyping(false), 1200);
    // Feed the core pipeline (rules + diffusion visuals)
    pipeline.ingest(v, caret);
  }

  function syncOverlayStyles() {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    if (!ta || !ov) return;
    const cs = window.getComputedStyle(ta);
    const copyProps = [
      "fontSize",
      "fontFamily",
      "fontWeight",
      "fontStyle",
      "lineHeight",
      "letterSpacing",
      "textAlign",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius",
    ] as const;
    for (const p of copyProps) (ov.style as any)[p] = (cs as any)[p];
    ov.style.borderStyle = cs.borderStyle;
    ov.style.borderColor = "transparent";
    ov.style.width = cs.width;
    ov.style.height = cs.height;
  }

  // LM demo flow removed (handled by core in future tasks)

  // Ensure LM is loaded when Mode is LM (including initial mount)
  // no-op; LM not controlled by the demo any more

  // LM scheduling removed from demo

  function syncOverlayScroll() {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    if (!ta || !ov) return;
    ov.scrollTop = ta.scrollTop;
    ov.scrollLeft = ta.scrollLeft;
  }

  // Start TS pipeline and live region
  useEffect(() => {
    pipeline.start();
    // ⟢ Initialize screen reader live region
    liveRegionRef.current = createLiveRegion({
      id: 'mt-corrections-announcer',
      politeness: 'polite',
    });
    
    try {
      const stored = localStorage.getItem('mt.debug');
      if (stored === 'true') {
        // Enable verbose core logs
        setLoggerConfig({ enabled: true, level: 'debug' });
        console.info('[demo] debug logging enabled');
      }
    } catch {}
    return () => {
      pipeline.stop();
      liveRegionRef.current?.destroy();
    };
  }, [pipeline]);

  // Toggle LM mock adapter for demo visibility
  useEffect(() => {
    if (lmEnabled) {
      pipeline.setLMAdapter(createMockLMAdapter() as unknown as any);
    } else {
      // @ts-expect-error using noop via public API
      pipeline.setLMAdapter({ stream: async function* () {} });
    }
  }, [lmEnabled, pipeline]);

  // Console access for quick manual testing
  useEffect(() => {
    (window as any).mt = pipeline;
    (window as any).mtDebug = {
      setLMDebug: (info: LMDebugInfo) => setLmDebug(info),
    };
    const id = window.setInterval(() => {
      try {
        const sel = (globalThis as any).__mtLastLMSelection;
        if (!sel) return;
        setLmDebug({
          enabled: true,
          status: 'idle',
          band: sel.band ?? null,
          span: sel.span ?? null,
          ctxBefore: sel.ctxBefore ?? '',
          ctxAfter: sel.ctxAfter ?? '',
          prompt: sel.prompt ?? null,
          controlJson: sel.controlJson ?? '{}',
          lastChunks: (globalThis as any).__mtLastLMChunks || [],
        });
      } catch {}
    }, 250);
    return () => {
      delete (window as any).mt;
      delete (window as any).mtDebug;
      window.clearInterval(id);
    };
  }, [pipeline]);

  // WASM demo removed

  // Scenario step-through: progressively reveal scenario.raw
  useEffect(() => {
    if (!scenarioId) return;
    const s = SCENARIOS.find((x) => x.id === scenarioId);
    if (!s) return;
    const next = s.raw.slice(0, Math.min(stepIndex, s.raw.length));
    setText(next);
  }, [scenarioId, stepIndex]);

  // Suppress band briefly after Enter to avoid flicker at line breaks
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Enter") suppressUntilRef.current = Date.now() + 250;
    };
    ta.addEventListener("keydown", onKeyDown);
    return () => ta.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    syncOverlayStyles();
    syncOverlayScroll();
    const ta = textareaRef.current;
    if (!ta) return;
    const onScroll = () => syncOverlayScroll();
    ta.addEventListener("scroll", onScroll);
    const ro = new ResizeObserver(() => syncOverlayStyles());
    ro.observe(ta);
    return () => {
      ta.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  // Cleanup typing glow timer on unmount
  useEffect(() => {
    return () => {
      if (typingGlowTimerRef.current) window.clearTimeout(typingGlowTimerRef.current);
    };
  }, []);

  // WASM demo correction flow removed

  // 5b. Wire UI event listeners for visualization from TS pipeline
  useEffect(() => {
    const onActiveRegion = (e: Event) => {
      const { start, end } = (e as CustomEvent).detail as {
        start: number;
        end: number;
      };
      if (freezeBand) return; // pause updates for inspection
      const apply = () => {
        const adjusted = computeNewlineSafeRange(
          text,
          start,
          end,
          suppressUntilRef.current,
        );
        if (!adjusted) return;
        setBandRange({ start: adjusted.start, end: adjusted.end });
        const ov = overlayRef.current;
        if (ov) {
          const t = text;
          const before = escapeHtml(t.slice(0, adjusted.start));
          const band = escapeHtml(t.slice(adjusted.start, adjusted.end));
          const after = escapeHtml(t.slice(adjusted.end));
          ov.innerHTML = `${before}<span class="active-region">${band || "\u200b"}</span>${after}`;
        }
      };
      if (bandDelayMs > 0) setTimeout(apply, bandDelayMs);
      else apply();
    };
    const onMechanicalSwap = (e: Event) => {
      const { start, end, text: diffText, markerGlyph, durationMs, instant } = (e as CustomEvent).detail as {
        start: number;
        end: number;
        text: string;
        markerGlyph?: string;
        durationMs: number;
        instant: boolean;
      };
      
      // Show visual feedback (mechanical swap or instant for reduced-motion)
      setLastHighlight({ start, end });
      const clearDelay = instant ? 100 : Math.max(800, durationMs + 200);
      setTimeout(() => setLastHighlight(null), clearDelay);
      
      // Apply correction to textarea
      try {
        const caret = caretRef.current;
        const updated = replaceRange(text, start, end, diffText, caret);
        setText(updated);
        // ⟢ Critical: sync the pipeline's internal state with the corrected text
        pipeline.ingest(updated, caret);
        requestAnimationFrame(() => {
          const ta = textareaRef.current;
          if (ta) ta.setSelectionRange(caret, caret);
        });
      } catch (err) {
        console.warn('[web-demo] failed to apply swap', { start, end, diffText, err });
      }
    };
    
    const onSwapAnnouncement = (e: Event) => {
      const { message, count } = (e as CustomEvent).detail as {
        message: string;
        count: number;
      };
      // ⟢ Announce to screen readers via live region
      const announcement = `${message} (${count} correction${count === 1 ? '' : 's'})`;
      liveRegionRef.current?.announce(announcement);
      console.info(`[SR] ${announcement}`);
    };
    window.addEventListener("mindtype:activeRegion", onActiveRegion as EventListener);
    window.addEventListener("mindtype:mechanicalSwap", onMechanicalSwap as EventListener);
    window.addEventListener("mindtype:swapAnnouncement", onSwapAnnouncement as EventListener);
    // ⟢ Keep legacy highlight listener for compatibility during transition
    window.addEventListener("mindtype:highlight", onMechanicalSwap as EventListener);
    return () => {
      window.removeEventListener("mindtype:activeRegion", onActiveRegion as EventListener);
      window.removeEventListener("mindtype:mechanicalSwap", onMechanicalSwap as EventListener);
      window.removeEventListener("mindtype:swapAnnouncement", onSwapAnnouncement as EventListener);
      window.removeEventListener("mindtype:highlight", onMechanicalSwap as EventListener);
    };
  }, [text, freezeBand, bandDelayMs]);

  // 5c. Live controls for cadence and band sizing
  useEffect(() => {
    setTypingTickMs(tickMs);
  }, [tickMs]);
  useEffect(() => {
    setValidationBandWords(minBand, maxBand);
  }, [minBand, maxBand]);

  // Listen to caret monitor snapshots from the shim (if WASM is present)
  useEffect(() => {
    const onSnaps = (e: Event) => {
      const arr = (e as CustomEvent).detail as CaretSnapshot[];
      if (!arr || arr.length === 0) return;
      const last = arr[arr.length - 1];
      setCaretState(last);
      setCaretLog((prev) => {
        const next = prev.concat(arr);
        // clamp to last 100
        if (next.length > 100) next.splice(0, next.length - 100);
        // EPS over last 1000ms
        const now = Date.now();
        const recent = next.filter((s) => now - s.timestamp_ms <= 1000).length;
        setEps(recent);
        return next;
      });
      try {
        const s = (window as any).__mtStats as MonitorStats | undefined;
        if (s) setStats(s);
      } catch {}
    };
    window.addEventListener('mindtype:caretSnapshots', onSnaps as EventListener);
    return () => window.removeEventListener('mindtype:caretSnapshots', onSnaps as EventListener);
  }, []);

  // 5d. Reduced-motion default and persistence
  useEffect(() => {
    try {
      const storedTick = localStorage.getItem('mt.tickMs');
      const storedMin = localStorage.getItem('mt.minBand');
      const storedMax = localStorage.getItem('mt.maxBand');
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (storedTick) setTickMs(parseInt(storedTick, 10));
      else if (prefersReduced) setTickMs(120);
      if (storedMin) setMinBand(parseInt(storedMin, 10));
      if (storedMax) setMaxBand(parseInt(storedMax, 10));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('mt.tickMs', String(tickMs));
      localStorage.setItem('mt.minBand', String(minBand));
      localStorage.setItem('mt.maxBand', String(maxBand));
    } catch {}
  }, [tickMs, minBand, maxBand]);

  // 6. Keyboard shortcut for debug panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey &&
        event.shiftKey &&
        event.metaKey &&
        event.key === "l"
      ) {
        setShowDebugPanel((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Debug logs (WASM logger removed) — keep UI panel without logs source

  return (
    <div className="App">
      <button
        className="debug-toggle"
        onClick={() => setShowDebugPanel((p) => !p)}
      >
        {showDebugPanel ? "Hide" : "Show"} Debug Panel (⌥⇧⌘L)
      </button>

      <h1>Mind::Type Web Demo</h1>

      <div className="card">
        <h2>Editor</h2>
        {/* Caret Monitor Status */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace' }}>EPS: {eps}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {['BLUR','ACTIVE_IDLE','TYPING','PASTED'].map((k) => {
              const on = (caretState?.primary || '').toUpperCase() === k;
              const color = on ? (k === 'BLUR' ? '#999' : '#0C6') : 'rgba(255,255,255,0.18)';
              return (
                <div key={k} title={k} style={{ width: 12, height: 12, borderRadius: 12, background: color, border: '1px solid rgba(255,255,255,0.28)' }} />
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span data-testid="caret-primary" style={{ padding: '2px 6px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, fontSize: 12 }}>
              {(caretState?.primary || 'BLUR').toUpperCase()}
            </span>
            <span style={{ padding: '2px 6px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, fontSize: 12 }}>
              WPM~: {typeof stats?.wpm_smoothed === 'number' ? Math.round(stats!.wpm_smoothed) : Math.round((eps * 60) / 5)}
            </span>
            {caretState?.ime_active && (
              <span style={{ padding: '2px 6px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, fontSize: 12 }}>IME</span>
            )}
            {caretState?.blocked && (
              <span style={{ padding: '2px 6px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, fontSize: 12 }}>BLOCKED</span>
            )}
          </div>
        </div>
        {/* LED status strip */}
        <StatusStrip />
        {/* Stats panel */}
        {stats && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8, fontFamily: 'monospace', fontSize: 12 }}>
            <span>keys: {stats.keystrokes ?? 0}</span>
            <span>avg Δt: {stats.avg_inter_key_ms ? Math.round(stats.avg_inter_key_ms) : 0} ms</span>
            <span>EPS~: {stats.eps_smoothed ? stats.eps_smoothed.toFixed(2) : (eps || 0)}</span>
            <span>burst: {stats.burst_len_current ?? 0} (max {stats.burst_len_max ?? 0})</span>
            <span>deletes: {stats.deletes_seen ?? 0} / bursts {stats.delete_bursts ?? 0}</span>
            <span>pastes: {stats.pastes ?? 0}</span>
            <span>jumps: {stats.caret_jumps ?? 0}</span>
          </div>
        )}
        <div className={`editor-wrap ${isTyping ? 'typing' : ''}`}>
          <div className="editor-overlay" aria-hidden id="mt-overlay" ref={overlayRef} />
          <textarea
            className="editor-textarea"
            ref={textareaRef}
            value={text}
            placeholder="Type here. Pause to see live corrections."
            onChange={handleTextChange}
            onBlur={() => setIsTyping(false)}
            onCompositionStart={() => {
              setIsIMEComposing(true);
              imeRef.current = true;
              setIsTyping(true);
            }}
            onCompositionEnd={() => {
              setIsIMEComposing(false);
              imeRef.current = false;
              if (typingGlowTimerRef.current) window.clearTimeout(typingGlowTimerRef.current);
              typingGlowTimerRef.current = window.setTimeout(() => setIsTyping(false), 1200);
            }}
            rows={10}
            cols={80}
            data-gramm="false"
            data-lt-active="false"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
        {bandRange && (
          <div style={{ fontFamily: "monospace", marginTop: 8 }}>
            <small data-testid="active-region-label">
              Active region: [{bandRange.start}, {bandRange.end}]
            </small>
          </div>
        )}
        {lastHighlight && (
          <div style={{ fontFamily: "monospace" }}>
            <small>
              Last highlight: [{lastHighlight.start}, {lastHighlight.end}]
            </small>
          </div>
        )}
        <p>
          <i>
            Type to see the active region trail behind your cursor. The engine catches up after a short pause.
          </i>
        </p>
      </div>

      {/* Field grid + sim buttons */}
      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Input</h3>
          <input type="text" placeholder="InputText" style={{ width: "100%", padding: 8 }} />
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Textarea</h3>
          <textarea rows={6} placeholder="TextArea" style={{ width: "100%", padding: 8 }} />
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>ContentEditable</h3>
          <div contentEditable suppressContentEditableWarning style={{ minHeight: 120, padding: 8, border: "1px solid rgba(255,255,255,0.22)", borderRadius: 6 }}>
            Edit me…
          </div>
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Secure (mock)</h3>
          <input type="password" placeholder="Password" style={{ width: "100%", padding: 8 }} />
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Readonly (mock)</h3>
          <input type="text" readOnly defaultValue="Cannot edit" style={{ width: "100%", padding: 8, opacity: 0.75 }} />
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Simulate</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button onClick={() => {
              const ae = document.activeElement as any;
              const insert = "hello ";
              if (!ae) return;
              if (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement) {
                const s = ae.selectionStart ?? ae.value.length;
                const e = ae.selectionEnd ?? s;
                ae.value = ae.value.slice(0, s) + insert + ae.value.slice(e);
                const caret = s + insert.length;
                ae.setSelectionRange(caret, caret);
                ae.dispatchEvent(new InputEvent('beforeinput', { cancelable: true, bubbles: true, data: insert, inputType: 'insertText' } as any));
                ae.dispatchEvent(new InputEvent('input', { bubbles: true, data: insert, inputType: 'insertText' } as any));
                return;
              }
              if (ae instanceof HTMLElement && ae.isContentEditable) {
                const sel = window.getSelection?.();
                if (!sel) return;
                if (sel.rangeCount === 0) return;
                const r = sel.getRangeAt(0);
                r.deleteContents();
                r.insertNode(document.createTextNode(insert));
                // Move caret after inserted text
                sel.collapse(r.endContainer, (r.endContainer as Text).length || 0);
                document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
              }
            }}>Insert</button>
            <button onClick={() => navigator.clipboard?.readText().then((t) => {
              const ae = document.activeElement as any;
              if (ae && typeof ae.value === 'string') {
                const s = ae.selectionStart ?? ae.value.length;
                const e = ae.selectionEnd ?? s;
                ae.value = ae.value.slice(0, s) + t + ae.value.slice(e);
                ae.setSelectionRange(s + t.length, s + t.length);
                ae.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertFromPaste' } as any));
              }
            }).catch(() => {})}>Paste</button>
            <button onClick={() => (document.activeElement as HTMLElement | null)?.blur()}>Force blur</button>
            <button onClick={() => {
              const ae = document.activeElement as any;
              if (!ae || typeof ae.value !== 'string') return;
              const pos = (ae.selectionStart ?? ae.value.length) + 12;
              const clamped = Math.min(pos, ae.value.length);
              ae.setSelectionRange(clamped, clamped);
              ae.dispatchEvent(new Event('selectionchange', { bubbles: true }));
            }}>Caret jump</button>
            <button onClick={() => {
              const sel = window.getSelection?.();
              if (!sel) return;
              const ta = document.querySelector('textarea');
              if (!ta) return;
              (ta as HTMLTextAreaElement).focus();
              const s = (ta as HTMLTextAreaElement).selectionStart ?? 0;
              const e = Math.min(s + 5, (ta as HTMLTextAreaElement).value.length);
              (ta as HTMLTextAreaElement).setSelectionRange(s, e);
              document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
            }}>Selection toggle</button>
          </div>
        </div>
      </div>

      {/* Caret Monitor Log */}
      <div className="card" style={{ textAlign: 'left' }}>
        <h2>Caret Monitor Log (last 100)</h2>
        <div style={{ maxHeight: 240, overflow: 'auto', fontFamily: 'monospace', fontSize: 12, background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 8 }}>
          {caretLog.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No snapshots yet. Type or paste to see state changes.</div>
          ) : (
            caretLog.map((s, i) => (
              <div key={i}>
                [{new Date(s.timestamp_ms).toLocaleTimeString()}] {s.primary} • caret {s.caret}/{s.text_len} • sel {s.selection.start}-{s.selection.end}
              </div>
            ))
          )}
        </div>
      </div>

      {showDebugPanel && (
        <DebugPanel idleMs={idleMs} onIdleMsChange={setIdleMs} logs={logs} lmDebug={lmDebug} />
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Live controls</h2>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Scenario</span>
            <select
              aria-label="Scenario"
              value={scenarioId ?? ''}
              onChange={(e) => {
                const v = e.target.value || null;
                setScenarioId(v);
                setStepIndex(0);
                if (!v) setText("");
              }}
            >
              <option value="">None</option>
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </label>
          {scenarioId && (
            <>
              <button onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>Step back</button>
              <button onClick={() => setStepIndex((i) => i + 1)}>Step</button>
              <button onClick={() => {
                const s = SCENARIOS.find((x) => x.id === scenarioId);
                if (s) setText(s.corrected);
              }}>Apply corrected</button>
            </>
          )}
          {/* LM controls removed until LM-in-core lands */}
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={lmEnabled}
              onChange={(e) => setLmEnabled(e.target.checked)}
            />
            Enable LM (mock) — demo only
          </label>
          <label>
            Tick (ms): {tickMs}
            <input
              type="range"
              min={30}
              max={150}
              step={1}
              value={tickMs}
              onChange={(e) => setTickMs(parseInt(e.target.value, 10))}
            />
          </label>
          <label>
            Min band words: {minBand}
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={minBand}
              onChange={(e) =>
                setMinBand(Math.min(parseInt(e.target.value, 10), maxBand))
              }
            />
          </label>
          <label>
            Max band words: {maxBand}
            <input
              type="range"
              min={3}
              max={12}
              step={1}
              value={maxBand}
              onChange={(e) =>
                setMaxBand(Math.max(parseInt(e.target.value, 10), minBand))
              }
            />
          </label>
          {/* WASM demo toggle removed */}
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={isSecure}
              onChange={(e) => {
                setIsSecure(e.target.checked);
                secureRef.current = e.target.checked;
              }}
            />
            Secure field (disable corrections)
          </label>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            IME composing: {isIMEComposing ? "yes" : "no"}
          </span>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={freezeBand}
              onChange={(e) => setFreezeBand(e.target.checked)}
            />
            Freeze band (debug)
          </label>
          <label>
            Band delay (ms): {bandDelayMs}
            <input
              type="range"
              min={0}
              max={1000}
              step={50}
              value={bandDelayMs}
              onChange={(e) => setBandDelayMs(parseInt(e.target.value, 10))}
            />
          </label>
          <button
            onClick={() => {
              const preset = { tickMs, minBand, maxBand };
              navigator.clipboard?.writeText(JSON.stringify(preset)).catch(() => {});
            }}
          >
            Copy preset
          </button>
          <button
            onClick={() => {
              const raw = prompt('Paste preset JSON');
              if (!raw) return;
              try {
                const p = JSON.parse(raw);
                if (typeof p.tickMs === 'number') setTickMs(p.tickMs);
                if (typeof p.minBand === 'number') setMinBand(p.minBand);
                if (typeof p.maxBand === 'number') setMaxBand(p.maxBand);
                // WASM preset ignored
              } catch {}
            }}
          >
            Import preset
          </button>
        </div>
        {/* Latency metrics removed */}
      </div>
    </div>
  );
}

export default App;

