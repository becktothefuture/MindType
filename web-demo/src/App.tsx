import { useState, useEffect, useRef } from "react";
import init, {
  WasmPauseTimer,
  init_logger,
  get_logs,
  WasmFragmentExtractor,
  WasmStubStream,
  WasmMerger,
} from "@mindtype/core";
import "./App.css";
import DebugPanel from "./components/DebugPanel";
import { SCENARIOS } from "./scenarios";
// TS pipeline imports
import { boot } from "../../index";
import { createQwenTokenStreamer } from "../../core/lm/transformersRunner";
import { createTransformersAdapter } from "../../core/lm/transformersClient";
import { selectSpanAndPrompt, postProcessLMOutput } from "../../core/lm/policy";
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
  const [useWasmDemo, setUseWasmDemo] = useState(false);
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
  const [pauseTimer, setPauseTimer] = useState<WasmPauseTimer | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lmPrompt, setLmPrompt] = useState<string>("");
  const [lmOutput, setLmOutput] = useState<string>("");
  const [lmBand, setLmBand] = useState<{ start: number; end: number } | null>(null);
  // FT-316 additions
  const [lmMode, setLmMode] = useState<'rules' | 'lm'>('lm');
  const [perfStartMs, setPerfStartMs] = useState<number | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [lmLoaded, setLmLoaded] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [backend, setBackend] = useState<string>("-");
  const [metrics, setMetrics] = useState({ prompts: 0, completes: 0, aborts: 0, staleDrops: 0, autoDegraded: false });
  const [chaseDistance, setChaseDistance] = useState<number>(24);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const runnerRef = useRef<ReturnType<typeof createQwenTokenStreamer> | null>(null);
  const lmTimerRef = useRef<number | null>(null);
  const caretRef = useRef<number>(0);
  const adapterRef = useRef<any>(null);
  const genCounterRef = useRef(0);
  const lastCompleteRef = useRef<number>(0);
  const latestBandRef = useRef<{ start: number; end: number } | null>(null);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setText(v);
    caretRef.current = e.target.selectionStart ?? v.length;
    scheduleAutoLM(v);
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

  function computeSimpleBand(textValue: string, caretIndex: number) {
    // take last ~5 word-like chunks behind caret, bounded to [0, caret)
    const left = textValue.slice(0, caretIndex);
    const parts = left.split(/(\b)/g); // keep boundaries
    let words = 0;
    let i = parts.length - 1;
    while (i >= 0 && words < 10) {
      if (/\w+/.test(parts[i])) words++;
      i--;
    }
    const start = Math.max(0, left.lastIndexOf(parts[Math.max(0, i + 1)] ?? ""));
    return { start: isNaN(start) ? Math.max(0, caretIndex - 50) : start, end: caretIndex };
  }
  async function loadLM() {
    try {
      console.info('[LM] load start', { localOnly });
      const streamer = createQwenTokenStreamer({
        localOnly,
        localModelPath: "/models/",
        wasmPaths: "/wasm/",
      });
      const adapter = createTransformersAdapter(streamer);
      pipeline.setLMAdapter(adapter as any);
      adapterRef.current = adapter as any;
      runnerRef.current = streamer;
      setLmLoaded(true);
      // Detect backend via adapter init
      const caps = (adapter as any).init?.({});
      if (caps?.backend) setBackend(String(caps.backend));
    } catch {
      console.error('[LM] load failed');
      setLmLoaded(false);
    }
  }

  function unloadLM() {
    // swap back to a noop adapter to disable LM
    pipeline.setLMAdapter({
      async *stream() {},
    } as any);
    runnerRef.current = null;
    adapterRef.current = null;
    setLmLoaded(false);
    setBackend("-");
  }

  // Ensure LM is loaded when Mode is LM (including initial mount)
  useEffect(() => {
    if (lmMode === 'lm' && !lmLoaded) {
      void loadLM();
    }
  }, [lmMode, lmLoaded]);

  function scheduleAutoLM(textValue: string) {
    if (lmTimerRef.current) window.clearTimeout(lmTimerRef.current);
    if (!(lmMode === 'lm' && lmLoaded && runnerRef.current && textareaRef.current)) {
      console.debug('[LM] skip', {
        lmMode,
        lmLoaded,
        hasRunner: !!runnerRef.current,
        hasTextarea: !!textareaRef.current,
      });
      return;
    }
    // Cancel any in-flight generation
    try { adapterRef.current?.abort?.(); } catch {}
    setMetrics((m) => ({ ...m, aborts: m.aborts + 1 }));
    const myGen = ++genCounterRef.current;
    // Trailing debounce; give user time to finish a word
    lmTimerRef.current = window.setTimeout(async () => {
      const tStart = performance.now();
      const caretIndex = caretRef.current;
      if (!runnerRef.current) return;
      let chaseCaret = caretIndex;
      if (latestBandRef.current) {
        const end = latestBandRef.current.end;
        chaseCaret = Math.max(0, Math.min(caretIndex, end + chaseDistance));
      }
      const sel = selectSpanAndPrompt(textValue, chaseCaret);
      const band = sel.band;
      const prompt = sel.prompt;
      const span = sel.span;
      const maxNewTokens = sel.maxNewTokens;
      if (!band || !prompt || !span) return;
      // Cooldown to prevent rapid consecutive merges
      if (performance.now() - lastCompleteRef.current < 400) return;
      console.info('[LM] prompt', { band, promptLength: span.length });
      setMetrics((m) => ({ ...m, prompts: m.prompts + 1 }));
      setLmBand(band);
      setLmPrompt(prompt);
      setLmOutput("");
      let acc = "";
      const bandLen = Math.max(1, band.end - band.start);
      for await (const c of runnerRef.current.generateStream({ prompt, maxNewTokens })) {
        acc += c;
        setLmOutput(acc);
        if (acc.length % 32 === 0) {
          console.debug('[LM] chunk', { length: acc.length });
        }
      }
      if (!acc) return;
      const fixed = postProcessLMOutput(acc, bandLen);
      const took = Math.round(performance.now() - tStart);
      console.info('[LM] complete', { outLength: fixed.length, ms: took });
      setMetrics((m) => ({ ...m, completes: m.completes + 1 }));
      // Ignore stale generations
      if (myGen !== genCounterRef.current) {
        console.debug('[LM] drop stale generation');
        setMetrics((m) => ({ ...m, staleDrops: m.staleDrops + 1 }));
        return;
      }
      const next = textValue.slice(0, band.start) + fixed + textValue.slice(band.end);
      const delta = fixed.length - (band.end - band.start);
      setText(next);
      lastCompleteRef.current = performance.now();
      setPerfStartMs(null);
      setLastLatencyMs(took);
      // Auto-degrade if slow repeatedly
      if (took > 5000) {
        setMetrics((m) => ({ ...m, autoDegraded: true }));
        // Optionally extend debounce/cooldown or temporarily switch to rules-only
      }
      // restore caret after React update
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        const newCaret = Math.max(0, Math.min(next.length, caretIndex + delta));
        ta.setSelectionRange(newCaret, newCaret);
        caretRef.current = newCaret;
      });
    }, 500);
  }

  function syncOverlayScroll() {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    if (!ta || !ov) return;
    ov.scrollTop = ta.scrollTop;
    ov.scrollLeft = ta.scrollLeft;
  }

  // 1. Initialize WASM module (optional demo mode)
  useEffect(() => {
    if (!useWasmDemo) return;
    async function loadWasm() {
      await init();
      init_logger();
      console.log("WASM module initialized.");
      setWasmInitialized(true);
    }
    loadWasm();
  }, [useWasmDemo]);

  // 1b. Start TS pipeline
  useEffect(() => {
    pipeline.start();
    return () => pipeline.stop();
  }, [pipeline]);

  // Console access for quick manual testing
  useEffect(() => {
    (window as any).mt = pipeline;
    return () => {
      delete (window as any).mt;
    };
  }, [pipeline]);

  // 2. Create and recreate the pause timer when settings change (WASM demo only)
  useEffect(() => {
    if (useWasmDemo && wasmInitialized) {
      const timer = new WasmPauseTimer(BigInt(idleMs));
      setPauseTimer(timer);
    }
  }, [idleMs, wasmInitialized, useWasmDemo]);

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

  // 4. WASM demo correction flow, triggered by pause (disabled by default)
  useEffect(() => {
    async function runCorrection() {
      if (useWasmDemo && isPaused && wasmInitialized) {
        console.log("Correction logic triggered.");
        setIsThinking(true);
        const extractor = new WasmFragmentExtractor();
        const fragment = extractor.extract_fragment(text);

        if (fragment) {
          console.log(`Fragment found: "${fragment}"`);
          const replacementText = "This is a corrected sentence. ";
          let stream = new WasmStubStream(replacementText);

          // For simplicity, we replace the last fragment.
          // A real implementation would be more complex.
          const fragmentIndex = text.lastIndexOf(fragment);
          if (fragmentIndex !== -1) {
            const prefix = text.substring(0, fragmentIndex);
            let merger = new WasmMerger(prefix);

            let token = await stream.next_token();
            while (token) {
              merger.apply_token(token);
              token = await stream.next_token();
            }
            setText(merger.get_result());
          }
        } else {
          console.log("No fragment found to correct.");
        }
        // Reset pause state to prevent re-triggering
        setIsPaused(false);
        setIsThinking(false);
      }
    }
    runCorrection();
  }, [isPaused, wasmInitialized, text, useWasmDemo]);

  // 5. Poll for pause state (WASM demo only)
  useEffect(() => {
    if (!useWasmDemo || !pauseTimer) return;
    const interval = setInterval(() => {
      if (pauseTimer.is_paused()) {
        setIsPaused(true);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [pauseTimer, useWasmDemo]);

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
          latestBandRef.current = { start: adjusted.start, end: adjusted.end };
        }
      };
      if (bandDelayMs > 0) setTimeout(apply, bandDelayMs);
      else apply();
    };
    const onHighlight = (e: Event) => {
      const { start, end } = (e as CustomEvent).detail as {
        start: number;
        end: number;
      };
      setLastHighlight({ start, end });
      setTimeout(() => setLastHighlight(null), 800);
      if (perfStartMs != null) {
        setLastLatencyMs(Date.now() - perfStartMs);
        setPerfStartMs(null);
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

  // 7. Log fetching for debug panel
  useEffect(() => {
    if (showDebugPanel && wasmInitialized) {
      const interval = setInterval(() => {
        const newLogs = get_logs() as LogEntry[];
        setLogs(newLogs);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showDebugPanel, wasmInitialized]);

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
        <div className="editor-wrap">
          <div className="editor-overlay" aria-hidden id="mt-overlay" ref={overlayRef} />
          <textarea
            className="editor-textarea"
            ref={textareaRef}
            value={text}
            placeholder="Type here. Pause to see live corrections."
            onChange={handleTextChange}
            onCompositionStart={() => {
              setIsIMEComposing(true);
              imeRef.current = true;
            }}
            onCompositionEnd={() => {
              setIsIMEComposing(false);
              imeRef.current = false;
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
            Type to see the validation band trail behind your cursor. Pause for {idleMs}ms to watch diffusion catch up.
          </i>
        </p>
        {isThinking && <p className="thinking-indicator">Thinking...</p>}
      </div>

      {showDebugPanel && (
        <DebugPanel idleMs={idleMs} onIdleMsChange={setIdleMs} logs={logs} lmDebug={{ prompt: lmPrompt, output: lmOutput, band: lmBand }} metrics={{ ...metrics, backend, lastLatencyMs }} />
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
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              aria-label="Mode"
              value={lmMode}
              onChange={(e) => {
                const v = e.target.value as 'rules' | 'lm';
                setLmMode(v);
                if (v === 'lm' && !lmLoaded) {
                  loadLM();
                }
              }}
            >
              <option value="rules">Rules only</option>
              <option value="lm">LM</option>
            </select>
            Mode
          </label>
          {lmMode === 'lm' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={localOnly}
                  onChange={(e) => setLocalOnly(e.target.checked)}
                />
                Local models only
              </label>
              {!lmLoaded ? (
                <button onClick={loadLM}>Load LM</button>
              ) : (
                <button onClick={unloadLM}>Unload LM</button>
              )}
              <span>Backend: {backend}</span>
            </div>
          )}
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
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={useWasmDemo}
              onChange={(e) => setUseWasmDemo(e.target.checked)}
            />
            Use WASM demo corrections (legacy)
          </label>
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
              const preset = {
                tickMs,
                minBand,
                maxBand,
                useWasmDemo,
              };
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
                if (typeof p.useWasmDemo === 'boolean') setUseWasmDemo(p.useWasmDemo);
              } catch {}
            }}
          >
            Import preset
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          <small>
            {lastLatencyMs != null ? `Last keystroke→highlight latency: ${lastLatencyMs} ms` : 'Interact to record latency'}
          </small>
        </div>
      </div>
    </div>
  );
}

export default App;
