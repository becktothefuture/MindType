import { useState, useEffect, useRef } from "react";
import "./App.css";
import DebugPanel, { type LMDebugInfo } from "./components/DebugPanel";
import { SCENARIOS } from "./scenarios";
import { replaceRange } from "../../utils/diff";
// TS pipeline imports
import { boot } from "../../index";
import { setLoggerConfig } from "../../core/logger";
// LM integration is driven by core pipeline (future task). Demo remains rules-only.
import {
  getTypingTickMs,
  setTypingTickMs,
  getMinValidationWords,
  getMaxValidationWords,
  setValidationBandWords,
} from "../../config/defaultThresholds";

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

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const caretRef = useRef<number>(0);
  const typingGlowTimerRef = useRef<number | null>(null);

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

  // Start TS pipeline
  useEffect(() => {
    pipeline.start();
    try {
      const stored = localStorage.getItem('mt.debug');
      if (stored === 'true') {
        // Enable verbose core logs
        setLoggerConfig({ enabled: true, level: 'debug' });
        console.info('[demo] debug logging enabled');
      }
    } catch {}
    return () => pipeline.stop();
  }, [pipeline]);

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
    const onBand = (e: Event) => {
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
          ov.innerHTML = `${before}<span class="band">${band || "\u200b"}</span>${after}`;
        }
      };
      if (bandDelayMs > 0) setTimeout(apply, bandDelayMs);
      else apply();
    };
    const onHighlight = (e: Event) => {
      const { start, end, text: diffText } = (e as CustomEvent).detail as {
        start: number;
        end: number;
        text?: string;
      };
      setLastHighlight({ start, end });
      setTimeout(() => setLastHighlight(null), 800);
      // Apply correction if provided (rules-only path)
      if (typeof diffText === 'string') {
        try {
          const caret = caretRef.current;
          const updated = replaceRange(text, start, end, diffText, caret);
          setText(updated);
          requestAnimationFrame(() => {
            const ta = textareaRef.current;
            if (ta) ta.setSelectionRange(caret, caret);
          });
        } catch (err) {
          console.warn('[web-demo] failed to apply diff', { start, end, diffText, err });
        }
      }
    };
    window.addEventListener("mindtyper:validationBand", onBand as EventListener);
    window.addEventListener("mindtyper:highlight", onHighlight as EventListener);
    return () => {
      window.removeEventListener(
        "mindtyper:validationBand",
        onBand as EventListener,
      );
      window.removeEventListener("mindtyper:highlight", onHighlight as EventListener);
    };
  }, [text, freezeBand, bandDelayMs]);

  // 5c. Live controls for cadence and band sizing
  useEffect(() => {
    setTypingTickMs(tickMs);
  }, [tickMs]);
  useEffect(() => {
    setValidationBandWords(minBand, maxBand);
  }, [minBand, maxBand]);

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

      <h1>MindType Web Demo</h1>

      <div className="card">
        <h2>Editor</h2>
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
            <small>
              Validation band: [{bandRange.start}, {bandRange.end}]
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
            Type to see the validation band trail behind your cursor. The engine catches up after a short pause.
          </i>
        </p>
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
