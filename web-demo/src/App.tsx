/*╔══════════════════════════════════════════════════════════╗
  ║  ░  APP.TSX  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                    ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ╚══════════════════════════════════════════════════════════╝
  • WHAT ▸ Web demo tone controls and thresholds
  • WHY  ▸ REQ-TONE-CONTROLS-UI
  • HOW  ▸ See linked contracts and guides in docs
*/
import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { SCENARIOS } from "./scenarios";
import { replaceRange } from "../../utils/diff";
import { boot } from "../../index";
import { createWorkerLMAdapter } from "../../core/lm/workerAdapter";
import { createLMContextManager, type LMContextManager } from "../../core/lm/contextManager";
import { createLiveRegion, type LiveRegion } from "../../ui/liveRegion";
import { setSwapConfig, emitSwap } from "../../ui/swapRenderer";
import { setLoggerConfig } from "../../core/logger";
import {
  getTypingTickMs,
  getMinValidationWords,
  getMaxValidationWords,
  getConfidenceThresholds,
  getConfidenceSensitivity,
  setTypingTickMs,
  setMinValidationWords,
  setMaxValidationWords,
  setConfidenceThresholds,
  setConfidenceSensitivity,
} from "../../config/defaultThresholds";
import type { CaretSnapshot, MindTyperPipeline } from "../../index";

// LM Types
type LMHealth = {
  status: 'healthy' | 'error' | 'unknown';
  lastError?: string;
  workerActive: boolean;
};

type LMMetric = {
  timestamp: number;
  latency: number;
  tokensGenerated: number;
};

type LMDebugInfo = {
  backend: string;
  modelPath: string;
  initialized: boolean;
  controlJson: string;
  lastChunks: string[];
};

function App() {
  // Core state
  const [text, setText] = useState("");
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [tickMs, setTickMs] = useState<number>(getTypingTickMs());
  const [minBand] = useState<number>(getMinValidationWords());
  const [maxBand, setMaxBand] = useState<number>(getMaxValidationWords());
  const [bandRange, setBandRange] = useState<{ start: number; end: number } | null>(null);
  const [lastHighlight, setLastHighlight] = useState<{ start: number; end: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // LM state
  const [lmEnabled, setLmEnabled] = useState(true);
  const [lmHealth, setLmHealth] = useState<LMHealth>({ status: 'unknown', workerActive: false });
  const [lmMetrics, setLmMetrics] = useState<LMMetric[]>([]);
  const [lmDebug, setLmDebug] = useState<LMDebugInfo | undefined>(undefined);
  const [lmContextInitialized, setLmContextInitialized] = useState(false);
  
  // Tone state
  const [toneEnabled, setToneEnabled] = useState<boolean>(false);
  const [toneTarget, setToneTarget] = useState<'None' | 'Casual' | 'Professional'>('None');
  
  // Confidence thresholds
  const [tauInput, setTauInput] = useState<number>(getConfidenceThresholds().τ_input);
  const [tauCommit, setTauCommit] = useState<number>(Math.min(getConfidenceThresholds().τ_commit, 0.8));
  const [tauTone] = useState<number>(getConfidenceThresholds().τ_tone);
  const [sensitivity, setSensitivity] = useState<number>(Math.max(getConfidenceSensitivity(), 1.6));
  
  // UI state
  const [showMarkers, setShowMarkers] = useState<boolean>(false);
  const [caretState, setCaretState] = useState<CaretSnapshot | null>(null);
  const [eps, setEps] = useState<number>(0);
  const [stats, setStats] = useState<any>(null);
  const [ignoreGating, setIgnoreGating] = useState<boolean>(true);
  const [diagnosticMode, setDiagnosticMode] = useState<boolean>(false);
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<'diagnostics' | 'lm' | 'logs'>('diagnostics');
  
  // Preview buffers
  const [previewBuffer, setPreviewBuffer] = useState<string>("");
  const [previewNoise, setPreviewNoise] = useState<string>("");
  const [previewContext, setPreviewContext] = useState<string>("");
  const [previewTone, setPreviewTone] = useState<string>("");
  
  // Logs
  const [logs, setLogs] = useState<Array<{ ts: number; type: string; msg: string }>>([]);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pipelineRef = useRef<MindTyperPipeline | null>(null);
  const lmAdapterRef = useRef<ReturnType<typeof createWorkerLMAdapter> | null>(null);
  const lmContextManagerRef = useRef<LMContextManager | null>(null);
  const liveRegionRef = useRef<LiveRegion | null>(null);
  const caretRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const pausedBySelectionRef = useRef<boolean>(false);
  const pausedByBlurRef = useRef<boolean>(false);
  
  // Derived state
  const pausedBySelectionOrBlur = pausedBySelectionRef.current || pausedByBlurRef.current;
  const [blockedBanner, setBlockedBanner] = useState<string>('');

  // ⟢ Initialize pipeline
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    // Create live region
    const lr = createLiveRegion();
    liveRegionRef.current = lr;
    
    // Configure logging
    setLoggerConfig({
      logLevel: diagnosticMode ? 'debug' : 'warn',
      onLog: (level, message) => {
        setLogs(prev => [...prev.slice(-100), { ts: Date.now(), type: level, msg: message }]);
      }
    });

    // Initialize LM adapter
    const adapter = createWorkerLMAdapter({
      modelPath: '/models/onnx-community/Qwen2.5-0.5B-Instruct',
      tokenizerPath: '/models/onnx-community/Qwen2.5-0.5B-Instruct',
      backend: 'webgpu',
      onHealthChange: (health) => {
        setLmHealth({
          status: health.healthy ? 'healthy' : 'error',
          lastError: health.error,
          workerActive: health.workerActive
        });
      },
      onMetric: (metric) => {
        setLmMetrics(prev => [...prev.slice(-50), metric]);
      },
      onDebugInfo: (info) => {
        setLmDebug(info);
      }
    });
    lmAdapterRef.current = adapter;

    // Initialize LM context manager
    const contextManager = createLMContextManager();
    lmContextManagerRef.current = contextManager;
    (globalThis as any).__mtContextManager = contextManager;

    // Boot pipeline
    const pipeline = boot({
      target: ta,
      getLMAdapter: lmEnabled ? () => adapter : undefined,
      liveRegion: lr,
      onHighlight: (start: number, end: number) => {
        setLastHighlight({ start, end });
        setBandRange({ start, end });
      },
      onCaretSnapshot: (snapshot: CaretSnapshot) => {
        setCaretState(snapshot);
        caretRef.current = snapshot.caret;
      },
      onEpsilonUpdate: (e: number) => setEps(e),
      onStatsUpdate: (s: any) => setStats(s),
    });
    
    pipelineRef.current = pipeline;

    return () => {
      pipeline.destroy();
      adapter.destroy();
      lr.destroy();
      (globalThis as any).__mtContextManager = undefined;
    };
  }, [lmEnabled, diagnosticMode]);

  // ⟢ Update configuration
  useEffect(() => {
    setTypingTickMs(tickMs);
  }, [tickMs]);

  useEffect(() => {
    setMaxValidationWords(maxBand);
  }, [maxBand]);

  useEffect(() => {
    setConfidenceThresholds({
      τ_input: tauInput,
      τ_commit: tauCommit,
      τ_tone: tauTone,
    });
  }, [tauInput, tauCommit, tauTone]);

  useEffect(() => {
    setConfidenceSensitivity(sensitivity);
  }, [sensitivity]);

  // ⟢ Swap renderer config
  useEffect(() => {
    setSwapConfig({ showMarkers });
  }, [showMarkers]);

  // ⟢ Handle text changes
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    caretRef.current = e.target.selectionStart || 0;
    
    // Reset typing state
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 1000);
  }, []);

  // ⟢ Handle textarea focus (LM context initialization)
  const handleTextareaFocus = useCallback(() => {
    if (lmContextManagerRef.current && !lmContextInitialized) {
      console.log('[App] Initializing LM context on focus');
      lmContextManagerRef.current.initializeContext(text, caretRef.current);
      setLmContextInitialized(true);
    }
  }, [text, lmContextInitialized]);

  // ⟢ Apply corrections from events
  const applyFromEvent = useCallback((detail: { start: number; end: number; text: string }) => {
    const ta = textareaRef.current;
    if (!ta) return;
    
    try {
      const newText = replaceRange(ta.value, detail.start, detail.end, detail.text);
      setText(newText);
      ta.value = newText;
      
      // Preserve caret position
      ta.setSelectionRange(caretRef.current, caretRef.current);
      
      // Re-ingest
      pipelineRef.current?.ingest(newText, caretRef.current);
    } catch (err) {
      console.error('[App] Failed to apply correction:', err);
    }
  }, []);

  // ⟢ Event listeners
  useEffect(() => {
    const onHighlight = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.start != null && detail?.end != null && detail?.text != null) {
        applyFromEvent(detail);
      }
    };

    const onMechanicalSwap = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.start != null && detail?.end != null && detail?.text != null) {
        applyFromEvent(detail);
      }
    };

    const onMindtypeBlocked = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setBlockedBanner(detail?.reason || 'Blocked');
      setTimeout(() => setBlockedBanner(''), 3000);
    };

    document.addEventListener('mindtype:highlight', onHighlight);
    document.addEventListener('mindtype:mechanicalSwap', onMechanicalSwap);
    document.addEventListener('mindtype:blocked', onMindtypeBlocked);

    return () => {
      document.removeEventListener('mindtype:highlight', onHighlight);
      document.removeEventListener('mindtype:mechanicalSwap', onMechanicalSwap);
      document.removeEventListener('mindtype:blocked', onMindtypeBlocked);
    };
  }, [applyFromEvent]);

  // ⟢ Selection/blur handling
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const handleSelectionChange = () => {
      const hasSelection = ta.selectionStart !== ta.selectionEnd;
      pausedBySelectionRef.current = hasSelection;
    };

    const handleFocus = () => {
      pausedByBlurRef.current = false;
    };

    const handleBlur = () => {
      pausedByBlurRef.current = true;
    };

    ta.addEventListener('select', handleSelectionChange);
    ta.addEventListener('focus', handleFocus);
    ta.addEventListener('blur', handleBlur);

    return () => {
      ta.removeEventListener('select', handleSelectionChange);
      ta.removeEventListener('focus', handleFocus);
      ta.removeEventListener('blur', handleBlur);
    };
  }, []);

  // ⟢ Preview generation
  useEffect(() => {
    if (!bandRange || !pipelineRef.current) return;
    
    const updatePreviews = () => {
      try {
        const sample = text.slice(bandRange.start, bandRange.end);
        setPreviewBuffer(sample);
        
        // Generate previews for each transformer
        const n = pipelineRef.current!.engines.noise.transform({ text: sample, caret: 0 });
        setPreviewNoise(n.text === sample ? '' : n.text);
        
        const c = pipelineRef.current!.engines.context.transform({ text: sample, caret: 0 });
        setPreviewContext(c.text === sample ? '' : c.text);
        
        const t = toneEnabled && toneTarget !== 'None' 
          ? pipelineRef.current!.engines.tone.transform({ text: sample, caret: 0, target: toneTarget.toLowerCase() as any })
          : { text: sample };
        setPreviewTone(t.text === sample ? '' : t.text);
      } catch {}
    };
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updatePreviews);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, bandRange, toneEnabled, toneTarget]);

  // ⟢ Scenario handling
  const loadScenario = useCallback((id: string) => {
    const scenario = SCENARIOS.find(s => s.id === id);
    if (!scenario) return;
    
    setScenarioId(id);
    setStepIndex(0);
    setText(scenario.steps[0].text);
    
    const ta = textareaRef.current;
    if (ta) {
      ta.value = scenario.steps[0].text;
      const caret = scenario.steps[0].caretAfter || scenario.steps[0].text.length;
      ta.setSelectionRange(caret, caret);
      caretRef.current = caret;
      pipelineRef.current?.ingest(scenario.steps[0].text, caret);
    }
  }, []);

  const nextScenarioStep = useCallback(() => {
    if (!scenarioId) return;
    
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    const nextIdx = stepIndex + 1;
    if (nextIdx >= scenario.steps.length) {
      setScenarioId(null);
      setStepIndex(0);
      return;
    }
    
    setStepIndex(nextIdx);
    const step = scenario.steps[nextIdx];
    setText(step.text);
    
    const ta = textareaRef.current;
    if (ta) {
      ta.value = step.text;
      const caret = step.caretAfter || step.text.length;
      ta.setSelectionRange(caret, caret);
      caretRef.current = caret;
      pipelineRef.current?.ingest(step.text, caret);
    }
  }, [scenarioId, stepIndex]);

  // ⟢ LM Lab presets
  const applyLMLabPreset = useCallback((preset: string) => {
    const presets: Record<string, string> = {
      typo: "Hello wrold! This is a simple tpyo test.",
      context: "The cat sat on the mat. The cta was very happy.",
      grammar: "She don't know nothing about that issue yesterday.",
      mixed: "I cant beleive its already Wendesday. Time flys when your having fun!",
    };
    
    const presetText = presets[preset];
    if (!presetText) return;
    
    setText(presetText);
    const ta = textareaRef.current;
    if (ta) {
      ta.value = presetText;
      const caret = presetText.length;
      ta.setSelectionRange(caret, caret);
      caretRef.current = caret;
      pipelineRef.current?.ingest(presetText, caret);
    }
  }, []);

  return (
    <div className="App">
      {/* Pause banner */}
      {pausedBySelectionOrBlur && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000,
          background: 'rgba(20,20,20,0.85)', color: '#fff', padding: '0.5rem 0.75rem',
          borderRadius: 6, fontSize: 12
        }}>
          Corrections paused: selection/blur
        </div>
      )}
      
      {/* Blocked banner */}
      {blockedBanner && (
        <div role="alert" style={{
          position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 1000,
          background: '#f44', color: '#fff', padding: '0.5rem 0.75rem',
          borderRadius: 6, fontSize: 12
        }}>
          {blockedBanner}
        </div>
      )}

      <div style={{ 
        height: '100vh', 
        padding: '8px', 
        background: '#0b0f12',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: 'rgba(245, 246, 248, 0.92)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '1.8em', fontWeight: '600' }}>Mind::Type Web Demo</h1>
        </div>

        {/* Main Layout Grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1fr',
          gridTemplateRows: 'auto 1fr auto',
          gap: '8px',
          height: 'calc(100vh - 60px)'
        }}>
          {/* LEFT PANEL - Scenarios & Presets */}
          <div style={{ 
            gridColumn: '1', 
            gridRow: '1 / 4',
            background: 'rgba(20, 24, 28, 0.4)',
            borderRadius: '8px',
            padding: '12px',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#0c8' }}>Scenarios</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => loadScenario(s.id)}
                  style={{
                    padding: '6px 8px',
                    background: scenarioId === s.id ? '#0c8' : 'rgba(255,255,255,0.1)',
                    color: scenarioId === s.id ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75em',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {s.name}
                </button>
              ))}
              {scenarioId && (
                <button
                  onClick={nextScenarioStep}
                  style={{
                    padding: '6px 8px',
                    background: '#f90',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75em',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  Next Step ({stepIndex + 1}/{SCENARIOS.find(s => s.id === scenarioId)?.steps.length || 0})
                </button>
              )}
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#0c8' }}>LM Lab Presets</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button onClick={() => applyLMLabPreset('typo')} style={{
                padding: '6px 8px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75em',
                cursor: 'pointer',
                textAlign: 'left'
              }}>
                Simple Typos
              </button>
              <button onClick={() => applyLMLabPreset('context')} style={{
                padding: '6px 8px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75em',
                cursor: 'pointer',
                textAlign: 'left'
              }}>
                Context Errors
              </button>
              <button onClick={() => applyLMLabPreset('grammar')} style={{
                padding: '6px 8px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75em',
                cursor: 'pointer',
                textAlign: 'left'
              }}>
                Grammar Issues
              </button>
              <button onClick={() => applyLMLabPreset('mixed')} style={{
                padding: '6px 8px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75em',
                cursor: 'pointer',
                textAlign: 'left'
              }}>
                Mixed Errors
              </button>
            </div>
          </div>

          {/* CENTER - Main Textarea */}
          <div style={{ 
            gridColumn: '2', 
            gridRow: '1 / 3',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onFocus={handleTextareaFocus}
              placeholder="Start typing to see corrections..."
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '16px',
                lineHeight: '1.6',
                background: 'rgba(20, 24, 28, 0.6)',
                color: 'rgba(245, 246, 248, 0.92)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                resize: 'none',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            />
          </div>

          {/* RIGHT PANEL - Controls */}
          <div style={{ 
            gridColumn: '3', 
            gridRow: '1 / 4',
            background: 'rgba(20, 24, 28, 0.4)',
            borderRadius: '8px',
            padding: '12px',
            overflow: 'auto'
          }}>
            {/* Core Controls */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#0c8' }}>Core Controls</h3>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.8em' }}>
                <input
                  type="checkbox"
                  checked={diagnosticMode}
                  onChange={(e) => setDiagnosticMode(e.target.checked)}
                />
                Diagnostic mode
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.8em' }}>
                <input
                  type="checkbox"
                  checked={lmEnabled}
                  onChange={(e) => setLmEnabled(e.target.checked)}
                />
                Enable LM
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.8em' }}>
                <input
                  type="checkbox"
                  checked={showMarkers}
                  onChange={(e) => setShowMarkers(e.target.checked)}
                />
                Show markers
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.8em' }}>
                <input
                  type="checkbox"
                  checked={ignoreGating}
                  onChange={(e) => setIgnoreGating(e.target.checked)}
                />
                Ignore gating
              </label>
            </div>

            {/* Timing Controls */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#0c8' }}>Timing</h3>
              
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8em' }}>
                Tick: {tickMs}ms
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={tickMs}
                  onChange={(e) => setTickMs(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8em' }}>
                Max band: {maxBand} words
                <input
                  type="range"
                  min={minBand}
                  max="50"
                  step="1"
                  value={maxBand}
                  onChange={(e) => setMaxBand(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            {/* Confidence Controls */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#0c8' }}>Confidence</h3>
              
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8em' }}>
                τ_input: {tauInput.toFixed(2)}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={tauInput}
                  onChange={(e) => setTauInput(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8em' }}>
                τ_commit: {tauCommit.toFixed(2)}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={tauCommit}
                  onChange={(e) => setTauCommit(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8em' }}>
                Sensitivity: {sensitivity.toFixed(2)}
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            {/* Tone Controls */}
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#0c8' }}>Tone</h3>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.8em' }}>
                <input
                  type="checkbox"
                  checked={toneEnabled}
                  onChange={(e) => setToneEnabled(e.target.checked)}
                />
                Enable tone
              </label>

              {toneEnabled && (
                <select
                  value={toneTarget}
                  onChange={(e) => setToneTarget(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    fontSize: '0.8em'
                  }}
                >
                  <option value="None">None</option>
                  <option value="Casual">Casual</option>
                  <option value="Professional">Professional</option>
                </select>
              )}
            </div>
          </div>

          {/* STATUS INDICATORS - Top Center */}
          <div style={{ 
            gridColumn: '2', 
            gridRow: '3',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75em',
            color: '#888',
            padding: '4px'
          }}>
            <span>Caret: {caretState?.caret ?? 0}</span>
            <span>•</span>
            <span>Band: {bandRange ? `${bandRange.start}–${bandRange.end}` : 'none'}</span>
            <span>•</span>
            <span>ε: {eps.toFixed(3)}</span>
            <span>•</span>
            <span>{isTyping ? '⌨️ Typing' : '✓ Idle'}</span>
            {stats && (
              <>
                <span>•</span>
                <span>Δt: {stats.avg_inter_key_ms ? Math.round(stats.avg_inter_key_ms) : 0}ms</span>
              </>
            )}
          </div>

          {/* BOTTOM PANEL - Workbench */}
          <div style={{ 
            gridColumn: '1 / 4', 
            background: 'rgba(20, 24, 28, 0.4)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '200px'
          }}>
            {/* Workbench Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => setActiveWorkbenchTab('diagnostics')}
                style={{
                  padding: '4px 12px',
                  background: activeWorkbenchTab === 'diagnostics' ? '#0c8' : 'rgba(255,255,255,0.1)',
                  color: activeWorkbenchTab === 'diagnostics' ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75em',
                  cursor: 'pointer'
                }}
              >
                Diagnostics
              </button>
              <button
                onClick={() => setActiveWorkbenchTab('lm')}
                style={{
                  padding: '4px 12px',
                  background: activeWorkbenchTab === 'lm' ? '#0c8' : 'rgba(255,255,255,0.1)',
                  color: activeWorkbenchTab === 'lm' ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75em',
                  cursor: 'pointer'
                }}
              >
                LM Status
              </button>
              <button
                onClick={() => setActiveWorkbenchTab('logs')}
                style={{
                  padding: '4px 12px',
                  background: activeWorkbenchTab === 'logs' ? '#0c8' : 'rgba(255,255,255,0.1)',
                  color: activeWorkbenchTab === 'logs' ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75em',
                  cursor: 'pointer'
                }}
              >
                Logs
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeWorkbenchTab === 'diagnostics' && (
                <div style={{ fontSize: '0.75em', fontFamily: 'monospace' }}>
                  {previewBuffer && (
                    <>
                      <div style={{ color: '#888', marginBottom: '4px' }}>Band sample:</div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px', marginBottom: '8px' }}>
                        {previewBuffer}
                      </div>
                      {previewNoise && (
                        <>
                          <div style={{ color: '#f90', marginBottom: '4px' }}>Noise correction:</div>
                          <div style={{ background: 'rgba(255,153,0,0.1)', padding: '4px', borderRadius: '4px', marginBottom: '8px' }}>
                            {previewNoise}
                          </div>
                        </>
                      )}
                      {previewContext && (
                        <>
                          <div style={{ color: '#0c8', marginBottom: '4px' }}>Context correction:</div>
                          <div style={{ background: 'rgba(0,204,136,0.1)', padding: '4px', borderRadius: '4px', marginBottom: '8px' }}>
                            {previewContext}
                          </div>
                        </>
                      )}
                      {previewTone && (
                        <>
                          <div style={{ color: '#f0f', marginBottom: '4px' }}>Tone adjustment:</div>
                          <div style={{ background: 'rgba(255,0,255,0.1)', padding: '4px', borderRadius: '4px' }}>
                            {previewTone}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeWorkbenchTab === 'lm' && (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: '#0c8' }}>LM Status</h4>
                  <div style={{ fontSize: '0.75em', color: '#ddd', marginBottom: '12px', fontFamily: 'monospace' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      Status:
                      <span style={{
                        color: lmHealth.status === 'healthy' ? '#0c8' : lmHealth.status === 'error' ? '#f66' : '#aa6',
                        fontWeight: 'bold'
                      }}>
                        {lmHealth.status === 'healthy' ? '✅ Healthy' : lmHealth.status === 'error' ? '❌ Error' : '⏳ Unknown'}
                      </span>
                    </div>
                    <div>Backend: {lmDebug?.backend || 'unknown'}</div>
                    <div>Worker: {lmHealth.workerActive ? '🟢 Active' : '🔴 Inactive'}</div>
                    <div>Context: {lmContextInitialized ? '🟢 Initialized' : '🔴 Not initialized'}</div>
                    <div>LM runs: {(() => {
                      try {
                        const stats = (globalThis as any).__mtLmStats;
                        return stats?.runs || 0;
                      } catch { return 0; }
                    })()}</div>
                    <div>Tokens: {lmDebug?.lastChunks?.join('').length || 0}</div>
                    <div>Last latency: {lmMetrics[lmMetrics.length - 1]?.latency || 0}ms</div>
                    {lmHealth.lastError && (
                      <div style={{ color: '#f66', fontSize: '0.7em', marginTop: '4px' }}>
                        Error: {lmHealth.lastError}
                      </div>
                    )}
                  </div>
                  
                  {/* Emit swap button */}
                  <button
                    onClick={() => {
                      if (lastHighlight) {
                        emitSwap(lastHighlight.start, lastHighlight.end, 'TEST_SWAP');
                      }
                    }}
                    disabled={!lastHighlight}
                    style={{
                      padding: '6px 12px',
                      background: lastHighlight ? '#f90' : '#444',
                      color: lastHighlight ? '#000' : '#888',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.75em',
                      cursor: lastHighlight ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Emit Test Swap
                  </button>
                </div>
              )}

              {activeWorkbenchTab === 'logs' && (
                <div style={{ fontSize: '0.7em', fontFamily: 'monospace', color: '#ddd' }}>
                  {logs.slice(-8).map((l, i) => (
                    <div key={`${l.ts}-${i}`}>[{new Date(l.ts).toLocaleTimeString()}] {l.type}: {l.msg}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;