import { useState, useEffect } from "react";
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
// TS pipeline imports
import { boot } from "../../index";
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

function App() {
  const [text, setText] = useState(
    "Hello there. Try typing a sentence and then pausing.",
  );
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
  const [pipeline] = useState(() => boot());
  const [pauseTimer, setPauseTimer] = useState<WasmPauseTimer | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

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

  // 2. Create and recreate the pause timer when settings change (WASM demo only)
  useEffect(() => {
    if (useWasmDemo && wasmInitialized) {
      const timer = new WasmPauseTimer(BigInt(idleMs));
      setPauseTimer(timer);
    }
  }, [idleMs, wasmInitialized, useWasmDemo]);

  // 3. Handle text changes and user activity + stream to TS pipeline
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (pauseTimer) {
      pauseTimer.record_activity();
      setIsPaused(false);
    }
    // send event to pipeline
    const caret = e.target.selectionStart ?? e.target.value.length;
    pipeline.ingest(e.target.value, caret);
  };

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
      setBandRange({ start, end });
    };
    const onHighlight = (e: Event) => {
      const { start, end } = (e as CustomEvent).detail as {
        start: number;
        end: number;
      };
      setLastHighlight({ start, end });
      // brief fade-out
      setTimeout(() => setLastHighlight(null), 800);
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
  }, []);

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

      <div className="card" style={{ position: "relative" }}>
        <h2>Editor</h2>
        <textarea
          value={text}
          onChange={handleTextChange}
          onSelect={(e) => {
            const target = e.target as HTMLTextAreaElement;
            pipeline.ingest(target.value, target.selectionStart ?? target.value.length);
          }}
          rows={10}
          cols={80}
        />
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
        <DebugPanel idleMs={idleMs} onIdleMsChange={setIdleMs} logs={logs} />
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Live controls</h2>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
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
        </div>
      </div>
    </div>
  );
}

export default App;
