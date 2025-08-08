import { useState, useEffect } from 'react';
import init, {
  WasmPauseTimer,
  init_logger,
  get_logs,
  WasmFragmentExtractor,
  WasmStubStream,
  WasmMerger,
} from '@mindtype/core';
import './App.css';
import DebugPanel from './components/DebugPanel';

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

function App() {
  const [text, setText] = useState(
    'Hello there. Try typing a sentence and then pausing.',
  );
  const [idleMs, setIdleMs] = useState(1000);
  const [pauseTimer, setPauseTimer] = useState<WasmPauseTimer | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // 1. Initialize WASM module
  useEffect(() => {
    async function loadWasm() {
      await init();
      init_logger();
      console.log('WASM module initialized.');
      setWasmInitialized(true);
    }
    loadWasm();
  }, []);

  // 2. Create and recreate the pause timer when settings change
  useEffect(() => {
    if (wasmInitialized) {
      const timer = new WasmPauseTimer(BigInt(idleMs));
      setPauseTimer(timer);
    }
  }, [idleMs, wasmInitialized]);

  // 3. Handle text changes and user activity
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (pauseTimer) {
      pauseTimer.record_activity();
      setIsPaused(false);
    }
  };

  // 4. Core pipeline logic, triggered by pause
  useEffect(() => {
    async function runCorrection() {
      if (isPaused && wasmInitialized) {
        console.log('Correction logic triggered.');
        setIsThinking(true);
        const extractor = new WasmFragmentExtractor();
        const fragment = extractor.extract_fragment(text);

        if (fragment) {
          console.log(`Fragment found: "${fragment}"`);
          const replacementText = 'This is a corrected sentence. ';
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
          console.log('No fragment found to correct.');
        }
        // Reset pause state to prevent re-triggering
        setIsPaused(false);
        setIsThinking(false);
      }
    }
    runCorrection();
  }, [isPaused, wasmInitialized, text]);

  // 5. Poll for pause state
  useEffect(() => {
    if (!pauseTimer) return;
    const interval = setInterval(() => {
      if (pauseTimer.is_paused()) {
        setIsPaused(true);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [pauseTimer]);

  // 6. Keyboard shortcut for debug panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.metaKey && event.key === 'l') {
        setShowDebugPanel((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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
      <button className="debug-toggle" onClick={() => setShowDebugPanel((p) => !p)}>
        {showDebugPanel ? 'Hide' : 'Show'} Debug Panel (⌥⇧⌘L)
      </button>

      <h1>MindType Web Demo</h1>

      <div className="card">
        <h2>Editor</h2>
        <textarea value={text} onChange={handleTextChange} rows={10} cols={80} />
        <p>
          <i>Pause for {idleMs}ms after a sentence to trigger the correction.</i>
        </p>
        {isThinking && <p className="thinking-indicator">Thinking...</p>}
      </div>

      {showDebugPanel && (
        <DebugPanel idleMs={idleMs} onIdleMsChange={setIdleMs} logs={logs} />
      )}
    </div>
  );
}

export default App;
