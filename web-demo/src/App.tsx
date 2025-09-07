/*╔══════════════════════════════════════════════════════════╗
  ║  ░  APP.TSX  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Web demo tone controls and thresholds
  • WHY  ▸ REQ-TONE-CONTROLS-UI
  • HOW  ▸ See linked contracts and guides in docs
*/
import { useState, useEffect, useRef } from "react";
import "./App.css";
import { SCENARIOS } from "./scenarios";
import { replaceRange } from "../../utils/diff";
import { boot } from "../../index";
import { createWorkerLMAdapter } from "../../core/lm/workerAdapter";
import { createLiveRegion, type LiveRegion } from "../../ui/liveRegion";
import { setSwapConfig, emitSwap } from "../../ui/swapRenderer";
import { setLoggerConfig } from "../../core/logger";
import {
  getTypingTickMs,
  getMinValidationWords,
  getMaxValidationWords,
  setValidationBandWords,
  getConfidenceThresholds,
  setConfidenceThresholds,
  getConfidenceSensitivity,
  setConfidenceSensitivity,
} from "../../config/defaultThresholds";

// Types
type CaretSnapshot = {
  primary: string;
  input_modality: string;
  field_kind: string;
  selection: { start: number; end: number; collapsed: boolean };
  ime_active: boolean;
  blocked: boolean;
  caret: number;
  text_len: number;
  device_tier: string;
  timestamp_ms: number;
};

type LMDebugInfo = {
  enabled: boolean;
  status: string;
  band: { start: number; end: number } | null;
  span: string | null;
  ctxBefore: string;
  ctxAfter: string;
  prompt: string | null;
  controlJson: string;
  lastChunks: string[];
};

function App() {
  const [text, setText] = useState("Try typing: 'teh qiuck brwon fox jmups oevr the lzay dog'");
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [tickMs, setTickMs] = useState<number>(getTypingTickMs());
  const [minBand] = useState<number>(getMinValidationWords());
  const [maxBand, setMaxBand] = useState<number>(getMaxValidationWords());
  const [bandRange, setBandRange] = useState<{ start: number; end: number } | null>(null);
  const [lastHighlight, setLastHighlight] = useState<{ start: number; end: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [lmEnabled, setLmEnabled] = useState(true);
  const [toneEnabled, setToneEnabled] = useState<boolean>(false);
  const [toneTarget, setToneTarget] = useState<'None' | 'Casual' | 'Professional'>('None');
  const [tauInput, setTauInput] = useState<number>(getConfidenceThresholds().τ_input);
  const [tauCommit, setTauCommit] = useState<number>(Math.min(getConfidenceThresholds().τ_commit, 0.8));
  const [tauTone] = useState<number>(getConfidenceThresholds().τ_tone);
  const [sensitivity, setSensitivity] = useState<number>(Math.max(getConfidenceSensitivity(), 1.6));
  const [showMarkers, setShowMarkers] = useState<boolean>(false);
  const [caretState, setCaretState] = useState<CaretSnapshot | null>(null);
  const [eps, setEps] = useState<number>(0);
  const [stats, setStats] = useState<any>(null);
  const [lmDebug, setLmDebug] = useState<LMDebugInfo | undefined>(undefined);
  // Diagnostics
  const [ignoreGating, setIgnoreGating] = useState<boolean>(true);
  const [diagnosticMode, setDiagnosticMode] = useState<boolean>(false);
  // Stage preview buffers
  const [previewBuffer, setPreviewBuffer] = useState<string>("");
  const [previewNoise, setPreviewNoise] = useState<string>("");
  const [previewContext, setPreviewContext] = useState<string>("");
  const [previewTone, setPreviewTone] = useState<string>("");
  const [contextWindowPreview, setContextWindowPreview] = useState<string>("");
  // Process log (bounded)
  const [logs, setLogs] = useState<Array<{ ts: number; type: string; msg: string }>>([]);
  const lastIngestRef = useRef<number>(0);
  
  // Workbench state (integrated into main grid)
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<'metrics' | 'logs' | 'lm' | 'presets'>('metrics');
  const [lmMetrics, setLmMetrics] = useState<Array<{timestamp: number, latency: number, tokens: number, backend: string}>>([]);
  const [sentencesPerSide, setSentencesPerSide] = useState(3);
  const [deterministicMode, setDeterministicMode] = useState(false);

  function pushLog(type: string, msg: string) {
    const entry = { ts: Date.now(), type, msg };
    setLogs((prev) => {
      const next = [...prev, entry];
      if (next.length > 200) next.shift();
      return next;
    });
    // Mirror to console
    // eslint-disable-next-line no-console
    console.log(`[LOG ${type}]`, msg);
  }

  const secureRef = useRef(false);
  const imeRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const caretRef = useRef<number>(0);
  const typingGlowTimerRef = useRef<number | null>(null);
  const liveRegionRef = useRef<LiveRegion | null>(null);

  const [pipeline] = useState(() =>
    boot({
      security: {
        isSecure: () => secureRef.current,
        isIMEComposing: () => imeRef.current,
      },
    }),
  );

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newText = e.target.value;
    const newCaret = e.target.selectionStart;
    setText(newText);
    caretRef.current = newCaret;
    lastIngestRef.current = Date.now();
    console.debug('[Demo] ingest', { caret: newCaret, textLen: newText.length });
    pushLog('INGEST', `caret=${newCaret} len=${newText.length}`);
    pipeline.ingest(newText, newCaret, Date.now());
    
    // Diagnostic mode: emit fake corrections after a delay
    if (diagnosticMode && newText.length > 0) {
      setTimeout(() => {
        // Find a simple typo pattern
        const typoMatch = newText.match(/\b(teh|waht|nto|brwon)\b/i);
        if (typoMatch) {
          const start = typoMatch.index!;
          const end = start + typoMatch[0].length;
          const corrections: Record<string, string> = {
            'teh': 'the', 'Teh': 'The',
            'waht': 'what', 'Waht': 'What',
            'nto': 'not', 'Nto': 'Not',
            'brwon': 'brown', 'Brwon': 'Brown'
          };
          const corrected = corrections[typoMatch[0]] || typoMatch[0];
          console.log('[DIAGNOSTIC] Emitting fake correction:', { start, end, corrected });
          pushLog('DIAGNOSTIC', `fake correction: ${typoMatch[0]} → ${corrected}`);
          window.dispatchEvent(new CustomEvent('mindtype:mechanicalSwap', {
            detail: { start, end, corrected }
          }));
        }
      }, 800);
    }
  }

  // LM adapter toggle (worker-backed adapter by default; UI stays thin)
  useEffect(() => {
    if (lmEnabled && !deterministicMode) {
      try {
        const adapter = createWorkerLMAdapter(() => new Worker(new URL('./worker/lmWorker.ts', import.meta.url), { type: 'module' }));
        pipeline.setLMAdapter(adapter as any);
        pushLog('LM', 'enabled: worker');
      } catch (error) {
        console.warn('[Demo] LM enable failed:', error);
        pushLog('LM', 'error: worker init failed');
      }
    } else {
      pipeline.setLMAdapter({
        // Avoid no-empty lint: yield a harmless empty string
        stream: async function* () { console.debug('[Demo] LM noop stream active'); yield ""; }
      });
      pushLog('LM', deterministicMode ? 'disabled: deterministic mode' : 'disabled');
    }
  }, [lmEnabled, deterministicMode, pipeline]);

  // Apply settings
  useEffect(() => { pipeline.setToneEnabled(toneEnabled); }, [toneEnabled, pipeline]);
  useEffect(() => { pipeline.setToneTarget(toneTarget); }, [toneTarget, pipeline]);
  useEffect(() => {
    setConfidenceThresholds({ τ_input: tauInput, τ_commit: tauCommit, τ_tone: tauTone });
    try { localStorage.setItem('mt_tauCommit', String(tauCommit)); } catch {}
  }, [tauInput, tauCommit, tauTone]);
  useEffect(() => { setSwapConfig({ showMarker: showMarkers }); }, [showMarkers]);
  useEffect(() => {
    setConfidenceSensitivity(sensitivity);
    try { localStorage.setItem('mt_sensitivity', String(sensitivity)); } catch {}
  }, [sensitivity]);
  
  // Enable logger in demo for visibility (temporary)
  useEffect(() => {
    try { setLoggerConfig({ enabled: true, level: 'info' }); } catch {}
  }, []);

  // Persist workbench tab state
  useEffect(() => {
    try { localStorage.setItem('mt_workbench_tab', activeWorkbenchTab); } catch {}
  }, [activeWorkbenchTab]);
  
  // Load persisted workbench state
  useEffect(() => {
    try {
      const tab = localStorage.getItem('mt_workbench_tab') as typeof activeWorkbenchTab;
      if (tab && ['metrics', 'logs', 'lm', 'presets'].includes(tab)) {
        setActiveWorkbenchTab(tab);
      }
    } catch {}
  }, []);

  // Debug info collection
  useEffect(() => {
    (window as any).mt = pipeline;
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
      
        // Collect stage previews
        try {
          const previews = (globalThis as any).__mtStagePreview;
          console.log('[Demo] Stage previews:', previews);
          if (previews) {
            if (previews.noise) {
              console.log('[Demo] Setting noise preview:', previews.noise);
              setPreviewNoise(previews.noise);
            }
            if (previews.context) {
              console.log('[Demo] Setting context preview:', previews.context);
              setPreviewContext(previews.context);
            }
            if (previews.tone) {
              console.log('[Demo] Setting tone preview:', previews.tone);
              setPreviewTone(previews.tone);
            }
            if (previews.buffer) {
              setPreviewBuffer(previews.buffer);
            }
          }
        } catch {}
    }, 800);
    return () => window.clearInterval(id);
  }, [pipeline]);

  // Gating status banner
  const [pausedBySelectionOrBlur, setPausedBySelectionOrBlur] = useState(false);
  useEffect(() => {
    function onStatus(ev: any) {
      try {
        const statuses = ev?.detail?.statuses || {};
        const paused = Boolean(statuses?.SELECTION_ACTIVE || statuses?.BLUR);
        setPausedBySelectionOrBlur(paused);
      } catch {}
    }
    window.addEventListener('mindtype:status', onStatus as any);
    return () => window.removeEventListener('mindtype:status', onStatus as any);
  }, []);

  // Scenario step-through
  useEffect(() => {
    if (!scenarioId) return;
    const scenario = SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;
    const chars = scenario.raw.split('');
    const revealed = chars.slice(0, stepIndex).join('');
    setText(revealed);
  }, [scenarioId, stepIndex]);

  // Pipeline lifecycle
  useEffect(() => {
    // Load persisted defaults once at mount
    try {
      const savedTau = Number(localStorage.getItem('mt_tauCommit'));
      if (Number.isFinite(savedTau) && savedTau > 0 && savedTau <= 0.98) setTauCommit(savedTau);
      const savedSens = Number(localStorage.getItem('mt_sensitivity'));
      if (Number.isFinite(savedSens) && savedSens >= 1) setSensitivity(savedSens);
    } catch {}
    pipeline.start();
    liveRegionRef.current = createLiveRegion();
    
    // Event handlers
    const onActiveRegion = (e: Event) => {
      const { start, end } = (e as CustomEvent).detail;
      console.debug('[Event] mindtype:activeRegion', { start, end });
      pushLog('ACTIVE_REGION', `[${start},${end}]`);
      setBandRange({ start, end });
    };
    
    const applyFromEvent = (start: number, end: number, corrected?: string) => {
      try {
        let caret = caretRef.current;
        if (ignoreGating) {
          // Diagnostic: avoid caret-crossing rejection by moving caret behind end for the replace operation
          caret = Math.max(caret, end);
        }
        const updated = corrected != null ? replaceRange(text, start, end, corrected, caret) : text;
        if (corrected != null) {
          console.debug('[Apply] swap', { start, end, corrected, beforeLen: text.length, afterLen: updated.length });
          pushLog('APPLY', `len=${text.length}->${updated.length}`);
          setText(updated);
          pipeline.ingest(updated, caret);
          requestAnimationFrame(() => {
            const ta = textareaRef.current;
            if (ta) {
              if (ignoreGating && document.activeElement !== ta) try { ta.focus(); } catch {}
              ta.setSelectionRange(caretRef.current, caretRef.current);
            }
          });
        }
      } catch (err) {
        console.warn('Failed to apply correction:', err);
      }
    };

    const onHighlight = (e: Event) => {
      const { start, end } = (e as CustomEvent).detail;
      console.debug('[Event] mindtype:highlight', { start, end });
      const dt = lastIngestRef.current ? (Date.now() - lastIngestRef.current) : -1;
      pushLog('HIGHLIGHT', `range=[${start},${end}] dt=${dt}ms`);
      setLastHighlight({ start, end });
      setTimeout(() => setLastHighlight(null), 2000);
      const { text: corrected } = (e as CustomEvent).detail;
      // Emit mechanical swap for UI/announcements
      try { emitSwap({ start, end, text: corrected }); } catch {}
      applyFromEvent(start, end, corrected);
    };

    const onMechanicalSwap = (e: Event) => {
      const { start, end, text: corrected } = (e as CustomEvent).detail as { start: number; end: number; text: string };
      console.debug('[Event] mindtype:mechanicalSwap', { start, end });
      pushLog('MECH_SWAP', `range=[${start},${end}]`);
      applyFromEvent(start, end, corrected);
    };

    const onCaretSnapshot = (e: CustomEvent) => {
      const snapshots = e.detail;
      if (snapshots.length > 0) {
        const s = snapshots[snapshots.length - 1];
        setCaretState(s);
        console.debug('[Event] caret snapshot', s.primary, { caret: s.caret, len: s.text_len });
        pushLog('SNAP', `${s.primary} caret=${s.caret} len=${s.text_len}`);
      }
    };

    const onCaretStats = (e: CustomEvent) => {
      setStats(e.detail);
      setEps(e.detail?.eps_smoothed || 0);
      console.debug('[Event] caret stats', e.detail);
      pushLog('STATS', `eps=${e.detail?.eps_smoothed ?? 0}`);
    };

    const onStatus = (e: CustomEvent) => {
      const { statuses } = e.detail || {};
      if (statuses) pushLog('STATUS', Object.keys(statuses).filter((k) => statuses[k]).join(','));
      try {
        const blocked = statuses?.SELECTION_ACTIVE || statuses?.BLUR;
        setBlockedBanner(blocked ? 'Corrections paused: selection/blur' : '');
      } catch {}
    };

    window.addEventListener('mindtype:activeRegion', onActiveRegion as EventListener);
    window.addEventListener('mindtype:highlight', onHighlight as EventListener);
    window.addEventListener('mindtype:mechanicalSwap', onMechanicalSwap as EventListener);
    window.addEventListener('mindtype:caretSnapshot', onCaretSnapshot as EventListener);
    window.addEventListener('mindtype:caretSnapshots', onCaretSnapshot as EventListener);
    window.addEventListener('mindtype:caretStats', onCaretStats as EventListener);
    window.addEventListener('mindtype:status', onStatus as EventListener);

    return () => {
      window.removeEventListener('mindtype:activeRegion', onActiveRegion as EventListener);
      window.removeEventListener('mindtype:highlight', onHighlight as EventListener);
      window.removeEventListener('mindtype:mechanicalSwap', onMechanicalSwap as EventListener);
      window.removeEventListener('mindtype:caretSnapshot', onCaretSnapshot as EventListener);
      window.removeEventListener('mindtype:caretSnapshots', onCaretSnapshot as EventListener);
      window.removeEventListener('mindtype:caretStats', onCaretStats as EventListener);
      window.removeEventListener('mindtype:status', onStatus as EventListener);
      pipeline.stop();
      liveRegionRef.current?.destroy();
    };
  }, [pipeline, text]);

  // Stage preview derivation: compute light-weight representations for UI
  useEffect(() => {
    const caret = caretRef.current;
    const activeStart = bandRange?.start ?? Math.max(0, caret - 48);
    const activeEnd = bandRange?.end ?? caret;
    const buf = text.slice(activeStart, activeEnd);
    setPreviewBuffer(buf);
    try {
      // Noise preview: apply simple substitutions locally (mirror noise basics)
      let n = buf
        .replace(/\bteh\b/g, 'the')
        .replace(/\brecieve\b/g, 'receive')
        .replace(/\bhte\b/g, 'the')
        .replace(/\byuor\b/g, 'your')
        // Transpositions mirrored from engine
        .replace(/\bwaht\b/g, 'what')
        .replace(/\btaht\b/g, 'that')
        .replace(/\bnto\b/g, 'not')
        .replace(/\bthier\b/g, 'their')
        .replace(/\s{2,}/g, ' ');
      setPreviewNoise(n === buf ? '' : n);
      // Context preview: punctuation spacing + capitalization + terminal punctuation
      let c = n || buf;
      // Normalize punctuation spacing similar to contextTransform
      c = c.replace(/\s+([,.])/g, '$1');
      c = c.replace(/([,.])(\S)/g, '$1 $2');
      c = c.replace(/(^|[.!?]\s+)([a-z])/g, (_m, p1, p2) => `${p1}${p2.toUpperCase()}`);
      if (/\w[\w\s,'”\)\]]+$/.test(c) && !/[.!?]\s*$/.test(c)) c = c.trimEnd() + '.';
      setPreviewContext(c === (n || buf) ? '' : c);
      // Context window preview string
      const before = text.slice(Math.max(0, activeStart - 80), activeStart);
      const after = text.slice(activeEnd, Math.min(text.length, activeEnd + 80));
      setContextWindowPreview(`${before}[${buf}]${after}`);
      // Tone preview (Professional): light contraction expansion
      let t = c;
      if (toneEnabled && toneTarget === 'Professional') {
        t = t
          .replace(/\bcan't\b/gi, 'cannot')
          .replace(/\bwon't\b/gi, 'will not')
          .replace(/\bdon't\b/gi, 'do not')
          .replace(/\bit's\b/gi, 'it is');
      }
      setPreviewTone(t === c ? '' : t);
    } catch {}
  }, [text, bandRange, toneEnabled, toneTarget]);

  const [blockedBanner, setBlockedBanner] = useState<string>('');

  return (
    <div className="App">
      {pausedBySelectionOrBlur && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000,
          background: 'rgba(20,20,20,0.85)', color: '#fff', padding: '0.5rem 0.75rem',
          borderRadius: 6, fontSize: 12
        }}>
          Corrections paused: selection/blur
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

      {/* 7x5 Grid Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gridTemplateRows: 'repeat(5, 1fr)', 
        gap: '8px',
        // Header height approx 56px + margins; ensure total remains within 100vh
        height: 'calc(100vh - 64px)',
        maxWidth: '100vw'
      }}>

        {/* EDITOR - Takes up 3x3 (main focus) */}
        <div style={{ 
          gridColumn: '1 / 4', 
          gridRow: '1 / 4',
          background: 'rgba(255,255,255,0.05)',
          border: '2px solid rgba(0,200,120,0.3)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1em', textAlign: 'center' }}>✍️ Editor</h3>
          <div className={`editor-wrap ${isTyping ? 'typing' : ''}`} style={{ flex: 1 }}>
            <div className="editor-overlay" aria-hidden id="mt-overlay" ref={overlayRef} />
            <textarea
              className="editor-textarea"
              ref={textareaRef}
              value={text}
              placeholder="Type here..."
              onChange={handleTextChange}
              onBlur={() => setIsTyping(false)}
              onCompositionStart={() => {
                imeRef.current = true;
                setIsTyping(true);
              }}
              onCompositionEnd={() => {
                imeRef.current = false;
                if (typingGlowTimerRef.current) window.clearTimeout(typingGlowTimerRef.current);
                typingGlowTimerRef.current = window.setTimeout(() => setIsTyping(false), 1200);
              }}
              style={{ 
                width: '100%', 
                height: '100%', 
                minHeight: '120px',
                background: 'rgba(0,0,0,0.3)',
                color: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                padding: '8px',
                fontSize: '0.9em',
                resize: 'none',
                fontFamily: 'monospace'
              }}
              data-gramm="false"
              data-lt-active="false"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
          {/* Active region display */}
          <div style={{ marginTop: '6px', textAlign: 'center', fontSize: '0.75em' }}>
            {bandRange && (
              <span style={{ fontFamily: "monospace", padding: '2px 4px', background: 'rgba(0,200,120,0.2)', borderRadius: '3px' }} data-testid="active-region-label">
                Active: [{bandRange.start}, {bandRange.end}]
              </span>
            )}
          </div>
        </div>

        {/* LM CONTROLS - 2x1 */}
        <div style={{ 
          gridColumn: '4 / 6', 
          gridRow: '1 / 2',
          background: 'rgba(255,255,255,0.05)',
          border: '2px solid rgba(0,200,120,0.4)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9em', textAlign: 'center' }}>🧠 Language Model</h4>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: '0.85em', fontWeight: '500' }}>
            <input
              type="checkbox"
              checked={lmEnabled}
              onChange={(e) => setLmEnabled(e.target.checked)}
              style={{ transform: 'scale(1.2)' }}
            />
            Enable Qwen2.5-0.5B
          </label>
          <div style={{ fontSize: '0.7em', textAlign: 'center', marginTop: '4px', color: lmEnabled ? '#0C6' : '#999' }}>
            {lmEnabled ? 'AI Active' : 'Rules Only'}
          </div>
          <div style={{ fontSize: '0.65em', textAlign: 'center', marginTop: '2px', color: 'rgba(255,255,255,0.6)' }}>
            Noise runs without LM; LM powers Context/Tone
          </div>
        </div>

        {/* SCENARIOS - 2x1 */}
        <div style={{ 
          gridColumn: '6 / 8', 
          gridRow: '1 / 2',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9em', textAlign: 'center' }}>📝 Scenarios</h4>
          <select
            value={scenarioId ?? ''}
            onChange={(e) => {
              const v = e.target.value || null;
              setScenarioId(v);
              setStepIndex(0);
              if (!v) setText("Try typing: 'teh qiuck brwon fox jmups oevr the lzay dog'");
            }}
            style={{ 
              width: '100%', 
              padding: '4px', 
              fontSize: '0.8em',
              background: 'rgba(255,255,255,0.1)', 
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px'
            }}
          >
            <option value="">Custom</option>
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          {scenarioId && (
            <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
              <button onClick={() => setStepIndex((i) => Math.max(0, i - 1))} style={{ fontSize: '0.7em', padding: '2px 4px', flex: 1 }}>⬅️</button>
              <button onClick={() => setStepIndex((i) => i + 1)} style={{ fontSize: '0.7em', padding: '2px 4px', flex: 1 }}>➡️</button>
              <button onClick={() => {
                const s = SCENARIOS.find((x) => x.id === scenarioId);
                if (s) setText(s.corrected);
              }} style={{ fontSize: '0.7em', padding: '2px 4px', flex: 1 }}>✨</button>
            </div>
          )}
        </div>

        {/* TONE CONTROLS - 1x1 */}
        <div style={{ 
          gridColumn: '4 / 5', 
          gridRow: '2 / 3',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8em', textAlign: 'center' }}>🎨 Tone</h4>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: '0.75em', marginBottom: '4px' }}>
            <input
              type="checkbox"
              checked={toneEnabled}
              onChange={(e) => setToneEnabled(e.target.checked)}
            />
            Enable
          </label>
          <select
            value={toneTarget}
            onChange={(e) => setToneTarget(e.target.value as 'None' | 'Casual' | 'Professional')}
            disabled={!toneEnabled}
            style={{ 
              padding: '2px 4px', 
              fontSize: '0.7em',
              background: 'rgba(255,255,255,0.1)', 
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '3px'
            }}
          >
            <option value="None">None</option>
            <option value="Casual">Casual</option>
            <option value="Professional">Pro</option>
          </select>
        </div>

        {/* PERFORMANCE - 1x1 */}
        <div style={{ 
          gridColumn: '5 / 6', 
          gridRow: '2 / 3',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8em', textAlign: 'center' }}>⚡ Performance</h4>
          <div style={{ fontSize: '0.7em' }}>
            <div style={{ marginBottom: '4px' }}>
              Tick: {tickMs}ms
              <input
                type="range"
                min={30}
                max={150}
                step={5}
                value={tickMs}
                onChange={(e) => setTickMs(parseInt(e.target.value, 10))}
                style={{ width: '100%', height: '4px' }}
              />
            </div>
            <div>
              Band: {maxBand}w
              <input
                type="range"
                min={2}
                max={8}
                step={1}
                value={maxBand}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMaxBand(val);
                  setValidationBandWords(minBand, val);
                }}
                style={{ width: '100%', height: '4px' }}
              />
            </div>
          </div>
        </div>

        {/* CONFIDENCE THRESHOLDS - 2x1 */}
        <div style={{ 
          gridColumn: '6 / 8', 
          gridRow: '2 / 3',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8em', textAlign: 'center' }}>🎯 Confidence</h4>
          <div style={{ fontSize: '0.65em', display: 'grid', gap: '3px' }}>
            <div>
              τ_input: {tauInput.toFixed(2)}
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={tauInput}
                onChange={(e) => setTauInput(parseFloat(e.target.value))}
                style={{ width: '100%', height: '3px' }}
              />
            </div>
            <div>
              τ_commit: {tauCommit.toFixed(2)}
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={tauCommit}
                onChange={(e) => setTauCommit(parseFloat(e.target.value))}
                style={{ width: '100%', height: '3px' }}
              />
            </div>
            <div>
              Sensitivity ×{sensitivity.toFixed(2)}
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                style={{ width: '100%', height: '3px' }}
              />
            </div>
          </div>
        </div>

        {/* STATUS INDICATORS - 3x1 */}
        <div style={{ 
          gridColumn: '4 / 7', 
          gridRow: '3 / 4',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8em', textAlign: 'center' }}>📊 Status</h4>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', fontSize: '0.7em' }}>
            <span style={{ fontFamily: 'monospace', padding: '2px 4px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }} data-testid="caret-primary">
              {(caretState?.primary || 'BLUR').toUpperCase()}
            </span>
            <span style={{ fontFamily: 'monospace' }}>EPS: {eps.toFixed(1)}</span>
            {stats && (
              <>
                <span>WPM: {typeof stats?.wpm_smoothed === 'number' ? Math.round(stats!.wpm_smoothed) : Math.round((eps * 60) / 5)}</span>
                <span>Keys: {stats.keystrokes ?? 0}</span>
              </>
            )}
          </div>
          
          {/* State indicators */}
          <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '6px' }}>
            {['BLUR','TYPING','SHORT_PAUSE','LONG_PAUSE'].map((k) => {
              const on = (caretState?.primary || '').toUpperCase() === k;
              const color = on ? '#0C6' : 'rgba(255,255,255,0.2)';
              return (
                <div key={k} title={k} style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: color, 
                  border: '1px solid rgba(255,255,255,0.3)' 
                }} />
              );
            })}
          </div>
        </div>

        {/* LM DEBUG INFO - 1x1 */}
        <div style={{ 
          gridColumn: '7 / 8', 
          gridRow: '3 / 4',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8em', textAlign: 'center' }}>🔍 LM Debug</h4>
          <div style={{ fontSize: '0.65em', fontFamily: 'monospace' }}>
            {lmDebug?.enabled ? (
              <>
                <div>Status: {lmDebug.status}</div>
                {lmDebug.band && <div>Band: [{lmDebug.band.start},{lmDebug.band.end}]</div>}
                {lmDebug.lastChunks.length > 0 && (
                  <div>Last: {lmDebug.lastChunks.slice(-2).join(' ')}</div>
                )}
              </>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.5)' }}>No LM activity</div>
            )}
          </div>
        </div>

        {/* WORKBENCH TABS + CONTENT - 4x1 */}
        <div style={{ 
          gridColumn: '1 / 5', 
          gridRow: '4 / 5',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Tab Navigation */}
          <div style={{ 
            display: 'flex', 
            marginBottom: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '6px'
          }}>
            {(['metrics', 'logs', 'lm', 'presets'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveWorkbenchTab(tab)}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  background: activeWorkbenchTab === tab ? 'rgba(0,200,120,0.15)' : 'transparent',
                  border: 'none',
                  color: activeWorkbenchTab === tab ? '#0c8' : '#aaa',
                  fontSize: '0.7em',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                data-testid={`workbench-tab-${tab}`}
              >
                {tab === 'metrics' && '📊 Metrics'}
                {tab === 'logs' && '📋 Logs'} 
                {tab === 'lm' && '🧠 LM'}
                {tab === 'presets' && '✨ Presets'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeWorkbenchTab === 'metrics' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-around', fontSize: '0.7em', fontFamily: 'monospace', marginBottom: '8px' }}>
                {stats && (
                  <>
                    <span>Avg Δt: {stats.avg_inter_key_ms ? Math.round(stats.avg_inter_key_ms) : 0}ms</span>
                    <span>Burst: {stats.burst_len_current ?? 0}/{stats.burst_len_max ?? 0}</span>
                    <span>Del: {stats.deletes_seen ?? 0}</span>
                    <span>Paste: {stats.pastes ?? 0}</span>
                    <span>Jump: {stats.caret_jumps ?? 0}</span>
                  </>
                )}
              </div>
              <div style={{ fontSize: '0.7em', color: '#ddd' }}>
                <div>LM runs: {lmMetrics.length} | Avg latency: {lmMetrics.length ? Math.round(lmMetrics.reduce((a, m) => a + m.latency, 0) / lmMetrics.length) : 0}ms</div>
                <button
                  onClick={() => {
                    const data = {
                      session: Date.now(),
                      metrics: lmMetrics,
                      logs: logs.slice(-50),
                      text: text,
                      settings: { lmEnabled, toneEnabled, toneTarget, deterministicMode }
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `mindtype-session-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    marginTop: '6px',
                    padding: '4px 8px',
                    background: 'rgba(0,200,120,0.1)',
                    border: '1px solid rgba(0,200,120,0.3)',
                    borderRadius: '4px',
                    color: '#0c8',
                    fontSize: '0.7em',
                    cursor: 'pointer'
                  }}
                  data-testid="export-session"
                >
                  📥 Export
                </button>
              </div>
            </div>
          )}

          {activeWorkbenchTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <label style={{ textAlign: 'left', opacity: 0.8, fontSize: '0.75em' }}>Process Log</label>
              <div data-testid="process-log" style={{ height: 120, overflow: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, padding: 4, textAlign: 'left', fontSize: '0.72em', fontFamily: 'monospace' }}>
                {logs.slice(-12).map((l, i) => (
                  <div key={`${l.ts}-${i}`}>[{new Date(l.ts).toLocaleTimeString()}] {l.type}: {l.msg}</div>
                ))}
              </div>
            </div>
          )}

          {activeWorkbenchTab === 'lm' && (
            <div>
              <div style={{ fontSize: '0.7em', color: '#ddd', marginBottom: '8px' }}>
                <div>Backend: {lmDebug?.backend || 'unknown'}</div>
                <div>Tokens: {lmDebug?.lastChunks?.join('').length || 0}</div>
                <div>Last latency: {lmMetrics[lmMetrics.length - 1]?.latency || 0}ms</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7em', color: '#ddd' }}>
                <input
                  type="checkbox"
                  checked={deterministicMode}
                  onChange={(e) => setDeterministicMode(e.target.checked)}
                  data-testid="deterministic-mode"
                />
                Deterministic (rules-only)
              </label>
              <div style={{ fontSize: '0.6em', opacity: 0.7, marginTop: '4px' }}>
                Disables LM for reproducible testing
              </div>
            </div>
          )}

          {activeWorkbenchTab === 'presets' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button onClick={() => setText('helloo thr weathfr has beenb hood')} style={{ padding: '6px', background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.3)', borderRadius: '4px', color: '#0c8', fontSize: '0.7em' }}>Typos</button>
                <button onClick={() => setText('I has went to the store.')} style={{ padding: '6px', background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.3)', borderRadius: '4px', color: '#0c8', fontSize: '0.7em' }}>Grammar</button>
                <button onClick={() => setText("We can't ship this, it's kinda bad.")} style={{ padding: '6px', background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.3)', borderRadius: '4px', color: '#0c8', fontSize: '0.7em' }}>Tone</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: '8px' }}>
                <label style={{ textAlign: 'left', opacity: 0.8, fontSize: '0.75em' }}>Context window</label>
                <textarea data-testid="context-window" readOnly value={contextWindowPreview} placeholder="(context window)" style={{ width: '100%', height: 44, background: 'rgba(0,0,0,0.25)', color: '#ddd', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: 4, resize: 'none', fontSize: '0.75em' }} />
              </div>
            </div>
          )}
        </div>

        {/* STAGE PREVIEWS - 3x1 */}
        <div style={{ 
          gridColumn: '5 / 8', 
          gridRow: '4 / 5',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8em', textAlign: 'center' }}>🧪 Stage Previews</h4>
          <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, minmax(28px, 1fr))', gap: '6px', fontSize: '0.7em' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <label style={{ textAlign: 'left', opacity: 0.8 }}>1) Buffer</label>
              <textarea data-testid="preview-buffer" readOnly value={previewBuffer} style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.25)', color: '#ddd', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: 4, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <label style={{ textAlign: 'left', opacity: 0.8 }}>2) After Noise</label>
              <textarea data-testid="preview-noise" readOnly value={previewNoise} placeholder={previewNoise ? '' : '(no change)'} style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.25)', color: '#ddd', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: 4, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <label style={{ textAlign: 'left', opacity: 0.8 }}>3) After Context</label>
              <textarea data-testid="preview-context" readOnly value={previewContext} placeholder={previewContext ? '' : '(no change)'} style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.25)', color: '#ddd', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: 4, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <label style={{ textAlign: 'left', opacity: 0.8 }}>4) After Tone</label>
              <textarea data-testid="preview-tone" readOnly value={previewTone} placeholder={previewTone ? '' : '(no change)'} style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.25)', color: '#ddd', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: 4, resize: 'none' }} />
            </div>
          </div>
        </div>

        {/* VISUAL SETTINGS - 3x1 */}
        <div style={{ 
          gridColumn: '1 / 4', 
          gridRow: '5 / 6',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around'
        }}>
          <h4 style={{ margin: 0, fontSize: '0.8em' }}>🎨 Visual</h4>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: '0.75em' }}>
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(e) => setShowMarkers(e.target.checked)}
            />
            Swap markers
          </label>
          {lastHighlight && (
            <span style={{ fontFamily: "monospace", fontSize: '0.7em', padding: '2px 4px', background: 'rgba(255,200,0,0.2)', borderRadius: '3px' }}>
              Highlight: [{lastHighlight.start}, {lastHighlight.end}]
            </span>
          )}
        </div>

        {/* QUICK ACTIONS - 4x1 */}
        <div style={{ 
          gridColumn: '4 / 8', 
          gridRow: '5 / 6',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around'
        }}>
          <h4 style={{ margin: 0, fontSize: '0.8em' }}>⚡ Quick Actions</h4>
          <button onClick={() => setText("")} style={{ fontSize: '0.7em', padding: '4px 8px' }}>
            🗑️ Clear
          </button>
          <button onClick={() => {
            const preset = { tickMs, minBand, maxBand, tauInput, tauCommit, tauTone };
            navigator.clipboard?.writeText(JSON.stringify(preset, null, 2));
          }} style={{ fontSize: '0.7em', padding: '4px 8px' }}>
            📋 Copy Settings
          </button>
          <button onClick={() => {
            setText("teh qiuck brwon fox jmups oevr the lzay dog. this is a test of the mind type system.");
          }} style={{ fontSize: '0.7em', padding: '4px 8px' }}>
            🎯 Demo Text
          </button>
          <label style={{ fontSize: '0.7em', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={diagnosticMode}
              onChange={(e) => setDiagnosticMode(e.target.checked)}
            />
            🔧 Diagnostic
          </label>
          <label style={{ fontSize: '0.7em', display: 'flex', alignItems: 'center', gap: '4px' }} title="Ignore selection/blur gating (unsafe)">
            <input
              type="checkbox"
              checked={ignoreGating}
              onChange={(e) => setIgnoreGating(e.target.checked)}
              data-testid="toggle-ignore-gating"
            />
            🚫 Ignore gating (unsafe)
          </label>
        </div>
      </div>

      {/* Workbench Panel - REMOVED: Integrated into main grid */}
      {false && workbenchOpen && (
        <aside 
          data-testid="workbench-panel"
          style={{
            position: 'fixed',
            top: '5vh',
            right: '5vh',
            width: '400px',
            height: '85vh',
            background: 'rgba(15, 20, 30, 0.95)',
            border: '2px solid rgba(0, 200, 120, 0.3)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid rgba(255,255,255,0.1)', 
            padding: '8px'
          }}>
            {(['live', 'lm', 'logs', 'metrics', 'presets'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveWorkbenchTab(tab)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  background: activeWorkbenchTab === tab ? 'rgba(0,200,120,0.2)' : 'transparent',
                  border: 'none',
                  color: activeWorkbenchTab === tab ? '#0c8' : '#aaa',
                  fontSize: '0.7em',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {tab === 'live' && '▶️ Live'}
                {tab === 'lm' && '🧠 LM'}
                {tab === 'logs' && '📋 Logs'}
                {tab === 'metrics' && '📊 Metrics'}
                {tab === 'presets' && '✨ Presets'}
              </button>
            ))}
            <button
              onClick={() => setWorkbenchOpen(false)}
              style={{
                marginLeft: '8px',
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: '0.8em'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            {activeWorkbenchTab === 'live' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: '#0c8' }}>Stage Previews</h4>
                <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: '8px', height: '300px' }}>
                  <div>
                    <label style={{ fontSize: '0.7em', opacity: 0.8 }}>Buffer</label>
                    <textarea data-testid="workbench-preview-buffer" readOnly value={previewBuffer} style={{ width: '100%', height: '60px', background: 'rgba(0,0,0,0.3)', color: '#ddd', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: 4, resize: 'none', fontSize: '0.7em' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7em', opacity: 0.8 }}>After Noise</label>
                    <textarea data-testid="workbench-preview-noise" readOnly value={previewNoise} style={{ width: '100%', height: '60px', background: 'rgba(0,0,0,0.3)', color: '#ddd', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: 4, resize: 'none', fontSize: '0.7em' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7em', opacity: 0.8 }}>After Context</label>
                    <textarea data-testid="workbench-preview-context" readOnly value={previewContext} style={{ width: '100%', height: '60px', background: 'rgba(0,0,0,0.3)', color: '#ddd', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: 4, resize: 'none', fontSize: '0.7em' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7em', opacity: 0.8 }}>After Tone</label>
                    <textarea data-testid="workbench-preview-tone" readOnly value={previewTone} style={{ width: '100%', height: '60px', background: 'rgba(0,0,0,0.3)', color: '#ddd', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: 4, resize: 'none', fontSize: '0.7em' }} />
                  </div>
                </div>
              </div>
            )}
            
            {activeWorkbenchTab === 'lm' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: '#0c8' }}>LM Status</h4>
                <div style={{ fontSize: '0.8em', color: '#ddd', marginBottom: '12px' }}>
                  <div>Backend: {lmDebug?.backend || 'unknown'}</div>
                  <div>Tokens: {lmDebug?.lastChunks?.join('').length || 0}</div>
                  <div>Last latency: {lmMetrics[lmMetrics.length - 1]?.latency || 0}ms</div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8em', color: '#ddd' }}>
                  <input
                    type="checkbox"
                    checked={deterministicMode}
                    onChange={(e) => setDeterministicMode(e.target.checked)}
                    data-testid="deterministic-mode"
                  />
                  Deterministic mode (rules-only)
                </label>
                <div style={{ fontSize: '0.7em', opacity: 0.7, marginTop: '4px' }}>
                  Disables LM for reproducible testing
                </div>
              </div>
            )}
            
            {activeWorkbenchTab === 'logs' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: '#0c8' }}>Process Logs</h4>
                <div style={{ maxHeight: '400px', overflow: 'auto', fontSize: '0.7em', fontFamily: 'monospace' }}>
                  {logs.slice(-50).map((log, i) => (
                    <div key={i} style={{ marginBottom: '2px', color: '#ddd' }}>
                      [{new Date(log.ts).toLocaleTimeString()}] {log.type}: {log.msg}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeWorkbenchTab === 'metrics' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: '#0c8' }}>Performance Metrics</h4>
                <div style={{ fontSize: '0.8em', color: '#ddd', marginBottom: '12px' }}>
                  <div>Total LM runs: {lmMetrics.length}</div>
                  <div>Avg latency: {lmMetrics.length ? Math.round(lmMetrics.reduce((a, m) => a + m.latency, 0) / lmMetrics.length) : 0}ms</div>
                  <div>Total tokens: {lmMetrics.reduce((a, m) => a + m.tokens, 0)}</div>
                </div>
                <button
                  onClick={() => {
                    const data = {
                      session: Date.now(),
                      metrics: lmMetrics,
                      logs: logs.slice(-100),
                      text: text,
                      settings: { lmEnabled, toneEnabled, toneTarget, deterministicMode }
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `mindtype-session-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(0,200,120,0.2)',
                    border: '1px solid rgba(0,200,120,0.4)',
                    borderRadius: '4px',
                    color: '#0c8',
                    fontSize: '0.8em',
                    cursor: 'pointer'
                  }}
                  data-testid="export-session"
                >
                  📥 Export Session
                </button>
              </div>
            )}
            
            {activeWorkbenchTab === 'presets' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: '#0c8' }}>Test Presets</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => setText('helloo thr weathfr has beenb hood')} style={{ padding: '8px', background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.3)', borderRadius: '4px', color: '#0c8' }}>Typos</button>
                  <button onClick={() => setText('I has went to the store.')} style={{ padding: '8px', background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.3)', borderRadius: '4px', color: '#0c8' }}>Grammar</button>
                  <button onClick={() => setText("We can't ship this, it's kinda bad.")} style={{ padding: '8px', background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.3)', borderRadius: '4px', color: '#0c8' }}>Tone</button>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Workbench Toggle - REMOVED: Integrated into main grid */}
    </div>
    </div>
  );
}

export default App;