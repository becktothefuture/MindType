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
import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import "./braille-animation.css";
// import { SCENARIOS } from "./scenarios"; // deprecated in unified demo
import { replaceRange } from "../../utils/diff";
import { boot } from "../../index";
import { createWorkerLMAdapter } from "../../core/lm/workerAdapter";
import { createLMContextManager, type LMContextManager } from "../../core/lm/contextManager";
import { createLiveRegion, type LiveRegion } from "../../ui/liveRegion";
import { setSwapConfig, emitSwap } from "../../ui/swapRenderer";
import { DEMO_PRESETS, DEFAULT_PRESET, type DemoPreset } from "./demo-presets";
import { setLoggerConfig, type LogRecord } from "../../core/logger";
import { diagBus } from "../../core/diagnosticsBus";
import {
  getTypingTickMs,
  getMinValidationWords,
  getMaxValidationWords,
  getConfidenceThresholds,
  getConfidenceSensitivity,
  setTypingTickMs,
  setValidationBandWords,
  setConfidenceThresholds,
  setConfidenceSensitivity,
} from "../../config/defaultThresholds";
import type { CaretSnapshot } from "./caretShim";

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
  const [text, setText] = useState(DEFAULT_PRESET.text);
  const [currentPreset, setCurrentPreset] = useState<DemoPreset>(DEFAULT_PRESET);
  // Deprecated scenario state (unified demo uses autopilot)
  // const [scenarioId, setScenarioId] = useState<string | null>(null);
  // const [stepIndex, setStepIndex] = useState<number>(0);
  const [tickMs, setTickMs] = useState<number>(getTypingTickMs());
  const defaultAutoTyping = (() => {
    try { return !(typeof navigator !== 'undefined' && (navigator as any).webdriver); } catch { return true; }
  })();
  const [autoTyping, setAutoTyping] = useState<boolean>(defaultAutoTyping);
  const [fuzziness, setFuzziness] = useState<number>(25);
  const [typingCps, setTypingCps] = useState<number>(8);
  const [correctionDelayMs, setCorrectionDelayMs] = useState<number>(180);
  const [minBand] = useState<number>(getMinValidationWords());
  const [maxBand, setMaxBand] = useState<number>(getMaxValidationWords());
  const [bandRange, setBandRange] = useState<{ start: number; end: number } | null>(null);
  const [lastHighlight] = useState<{ start: number; end: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // LM state
  const [lmEnabled, setLmEnabled] = useState(true);
  const [lmHealth] = useState<LMHealth>({ status: 'unknown', workerActive: false });
  const [lmMetrics] = useState<LMMetric[]>([]);
  const [lmDebug] = useState<LMDebugInfo | undefined>(undefined);
  const [lmContextInitialized, setLmContextInitialized] = useState(false);
  
  // Tone state
  const [toneEnabled, setToneEnabled] = useState<boolean>(false);
  const [toneTarget, setToneTarget] = useState<'None' | 'Casual' | 'Professional'>('None');
  // ⟢ Resizable bottom workbench height (px)
  const [bottomHeightPx, setBottomHeightPx] = useState<number>(220);
  const bottomResizeRef = useRef<{ dragging: boolean; startY: number; startH: number } | null>(null);

  const startBottomDrag = (e: React.MouseEvent) => {
    bottomResizeRef.current = { dragging: true, startY: e.clientY, startH: bottomHeightPx };
    window.addEventListener('mousemove', onBottomDrag);
    window.addEventListener('mouseup', stopBottomDrag);
  };

  const onBottomDrag = (e: MouseEvent) => {
    const ctx = bottomResizeRef.current;
    if (!ctx?.dragging) return;
    const delta = ctx.startY - e.clientY; // drag up increases height
    const next = Math.max(140, Math.min(420, ctx.startH + delta));
    setBottomHeightPx(next);
  };

  const stopBottomDrag = () => {
    bottomResizeRef.current = null;
    window.removeEventListener('mousemove', onBottomDrag as any);
    window.removeEventListener('mouseup', stopBottomDrag as any);
  };
  
  // Confidence thresholds
  const [tauInput, setTauInput] = useState<number>(getConfidenceThresholds().τ_input);
  const [tauCommit, setTauCommit] = useState<number>(Math.min(getConfidenceThresholds().τ_commit, 0.8));
  const [tauTone] = useState<number>(getConfidenceThresholds().τ_tone);
  const [sensitivity, setSensitivity] = useState<number>(Math.max(getConfidenceSensitivity(), 1.6));
  
  // UI state
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [caretState] = useState<CaretSnapshot | null>(null);
  const [eps] = useState<number>(0);
  const [stats] = useState<any>(null);
  const [systemStatuses, setSystemStatuses] = useState<Record<string, boolean>>({});
  const primaryStatus = (() => {
    const s = systemStatuses;
    if (s.LONG_PAUSE) return 'LONG_PAUSE';
    if (s.SHORT_PAUSE) return 'SHORT_PAUSE';
    if (s.SELECTION_ACTIVE) return 'SELECTION_ACTIVE';
    if (s.TYPING) return 'TYPING';
    if (s.PASTED) return 'PASTED';
    if (s.CARET_JUMP) return 'CARET_JUMP';
    return 'ACTIVE_IDLE';
  })();
  const [ignoreGating, setIgnoreGating] = useState<boolean>(true);
  const [diagnosticMode, setDiagnosticMode] = useState<boolean>(false);
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<'diagnostics' | 'lm' | 'logs'>('diagnostics');
  
  // Preview buffers
  const [previewBuffer, setPreviewBuffer] = useState<string>("");
  const [previewNoise, setPreviewNoise] = useState<string>("");
  const [previewContext, setPreviewContext] = useState<string>("");
  const [previewTone, setPreviewTone] = useState<string>("");
  // Overlay rects for context/buffer visualization
  const [overlayBand, setOverlayBand] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [overlayClose, setOverlayClose] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [overlayWide, setOverlayWide] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  
  // Logs & Diagnostics
  const [logs, setLogs] = useState<Array<{ ts: number; type: string; msg: string }>>([]);
  const [noiseEvents, setNoiseEvents] = useState<any[]>([]);
  const [lmWireEvents, setLmWireEvents] = useState<any[]>([]);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pipelineRef = useRef<any | null>(null);
  const lmAdapterRef = useRef<ReturnType<typeof createWorkerLMAdapter> | null>(null);
  const lmContextManagerRef = useRef<LMContextManager | null>(null);
  const liveRegionRef = useRef<LiveRegion | null>(null);
  const caretRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const autopilotTimerRef = useRef<number | null>(null);
  const autopilotIdxRef = useRef<number>(0);
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
      enabled: true,
      level: diagnosticMode ? 'debug' : 'warn',
      sink: (record: LogRecord) => {
        setLogs(prev => [
          ...prev.slice(-100),
          { ts: record.timeMs, type: record.level, msg: record.message }
        ]);
      },
    });

    // Subscribe to diagnostics bus (noise + lm-wire)
    const u1 = diagBus.subscribe('noise', (ev) => {
      setNoiseEvents(prev => [...prev.slice(-49), ev]);
    });
    const u2 = diagBus.subscribe('lm-wire', (ev) => {
      setLmWireEvents(prev => [...prev.slice(-99), ev]);
    });

    // Initialize LM adapter - use mock for reliable demo
    import('../../core/lm/mockStreamAdapter').then(({ createMockStreamLMAdapter }) => {
      const mockAdapter = createMockStreamLMAdapter();
      lmAdapterRef.current = mockAdapter;
      
      // Set the adapter on the pipeline
      if (pipelineRef.current && lmEnabled) {
        pipelineRef.current.setLMAdapter(mockAdapter);
      }
      
      console.log('[App] Mock stream adapter loaded for reliable demo');
    }).catch((error) => {
      console.error('[App] Failed to load mock adapter:', error);
      // Minimal fallback
      const fallbackAdapter = {
        async *stream() { yield 'the '; },
        abort() {},
        getStats() { return { runs: 0, staleDrops: 0 }; }
      } as any;
      lmAdapterRef.current = fallbackAdapter;
    });

    // Initialize LM context manager
    const contextManager = createLMContextManager();
    lmContextManagerRef.current = contextManager;
    (globalThis as any).__mtContextManager = contextManager;

    // Boot pipeline
    const pipeline = boot();
    pipeline.start();
    pipelineRef.current = pipeline;
    
    // LM adapter will be set asynchronously when loaded

    return () => {
      try { pipeline.stop(); } catch {}
      try { lr.destroy(); } catch {}
      (globalThis as any).__mtContextManager = undefined;
      u1();
      u2();
    };
  }, [lmEnabled, diagnosticMode]);

  // ⟢ Autopilot typing simulator (starts on load; can pause)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const SOURCE = (
      "The keyboard evolved from early telegraph and typewriter experiments. " +
      "In the nineteenth century, inventors refined key arrangements to reduce jams and to pace the movement of the fingers across rows. " +
      "Christopher Latham Sholes and collaborators produced one of the first practical typing machines, which introduced the QWERTY layout to stagger common digraphs. " +
      "As typists learned touch techniques, their fingers flowed in repeating arcs from home row to reach numbers, punctuation, and shifted characters. " +
      "The motion became a choreography: index fingers leading into frequent letters, thumbs releasing the space bar like a metronome, and pinkies reaching for modifiers. " +
      "Modern computer keyboards preserved that muscle memory while swapping mechanical levers for switches and circuits. " +
      "Typing itself became a dialogue between intent and correction, where a stream of fuzzy inputs is gradually clarified into words by context and habit."
    );

    function qwertyNeighbors(ch: string): string[] {
      const rows = ["`1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./"]; 
      const lower = ch.toLowerCase();
      for (const row of rows) {
        const i = row.indexOf(lower);
        if (i !== -1) return [row[i - 1], row[i + 1]].filter(Boolean) as string[];
      }
      return [];
    }

    function applyFuzzy(ch: string, intensity01: number): string {
      if (ch === ' ' || ch === '\n') return ch;
      const r = Math.random();
      if (r < intensity01 * 0.5) {
        const n = qwertyNeighbors(ch);
        if (n.length) return (n[Math.floor(Math.random() * n.length)] ?? ch);
      }
      if (r < intensity01 * 0.7) {
        const flip = Math.random() < 0.5;
        return flip ? (/[a-z]/.test(ch) ? ch.toUpperCase() : ch.toLowerCase()) : ch;
      }
      if (r < intensity01 * 0.85) {
        return '';
      }
      if (r < intensity01) {
        const n = qwertyNeighbors(ch);
        const ins = n.length ? n[0] : ch;
        return ins + ch;
      }
      return ch;
    }

    function scheduleNextTick() {
      const cps = Math.max(1, Math.min(20, Math.round(typingCps)));
      const delay = Math.max(10, Math.round(1000 / cps));
      autopilotTimerRef.current = window.setTimeout(() => {
        if (!autoTyping || pausedBySelectionRef.current || pausedByBlurRef.current) {
          scheduleNextTick();
          return;
        }
        const i = autopilotIdxRef.current;
        if (i >= SOURCE.length) return;
        const rawCh = SOURCE[i];
        const noisy = applyFuzzy(rawCh, Math.max(0, Math.min(1, fuzziness / 100)));
        const nextText = text + noisy;
        setText(nextText);
        const ta2 = textareaRef.current;
        if (ta2) {
          const newCaret = nextText.length;
          ta2.value = nextText;
          ta2.setSelectionRange(newCaret, newCaret);
          caretRef.current = newCaret;
          lmContextManagerRef.current?.updateWideContext(nextText);
          lmContextManagerRef.current?.updateCloseContext(nextText, newCaret);
        }
        pipelineRef.current?.ingest(nextText, caretRef.current);
        autopilotIdxRef.current = i + 1;
        scheduleNextTick();
      }, delay);
    }

    // init empty text and caret 0
    if (autopilotIdxRef.current === 0 && text.length === 0) {
      if (lmContextManagerRef.current && !lmContextInitialized) {
        lmContextManagerRef.current.initialize('', 0);
        setLmContextInitialized(true);
      }
    }
    if (autopilotTimerRef.current) clearTimeout(autopilotTimerRef.current);
    scheduleNextTick();
    return () => { if (autopilotTimerRef.current) clearTimeout(autopilotTimerRef.current); };
  }, [autoTyping, typingCps, fuzziness, lmContextInitialized, text]);

  // ⟢ Initialize caret position on app load (respect current text; no preset injection)
  useEffect(() => {
    const initializeCaret = () => {
      const ta = textareaRef.current;
      const initialCaret = (ta?.value?.length ?? text.length);
      caretRef.current = initialCaret;
      if (ta) {
        ta.setSelectionRange(initialCaret, initialCaret);
      }
      console.log('[App] Initial caret set', { textLength: ta?.value?.length ?? text.length, caret: initialCaret });
    };
    setTimeout(initializeCaret, 100);
  }, []);

  // ⟢ Load saved preset (disabled during unified autopilot mode)
  useEffect(() => {
    if (autoTyping) return; // unified demo ignores saved presets
    try {
      const savedPresetName = localStorage.getItem('mindtype-demo-preset');
      if (savedPresetName) {
        const savedPreset = DEMO_PRESETS.find(p => p.name === savedPresetName);
        if (savedPreset && savedPreset.name !== DEFAULT_PRESET.name) {
          setCurrentPreset(savedPreset);
          setText(savedPreset.text);
          const newCaret = savedPreset.text.length;
          caretRef.current = newCaret;
          const ta = textareaRef.current;
          if (ta) {
            ta.value = savedPreset.text;
            ta.setSelectionRange(newCaret, newCaret);
          }
          if (lmContextManagerRef.current) {
            lmContextManagerRef.current.initialize(savedPreset.text, newCaret);
            setLmContextInitialized(true);
          }
        }
      }
    } catch (e) {
      console.warn('[App] Failed to load preset from localStorage:', e);
    }
  }, [autoTyping]);

  // ⟢ Update configuration
  useEffect(() => {
    setTypingTickMs(tickMs);
  }, [tickMs]);

  useEffect(() => {
    setValidationBandWords(minBand, maxBand);
  }, [minBand, maxBand]);

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
    setSwapConfig({ showMarker: showMarkers, swapDurationMs: Math.max(0, correctionDelayMs) });
  }, [showMarkers, correctionDelayMs]);

  // ⟢ Reflect active region/band into local state for previews
  useEffect(() => {
    const onActiveRegion = (e: Event) => {
      const detail = (e as CustomEvent).detail as { start: number; end: number };
      if (detail && typeof detail.start === 'number' && typeof detail.end === 'number') {
        setBandRange({ start: detail.start, end: detail.end });
        // Log ACTIVE_REGION for tests
        setLogs(prev => [...prev.slice(-100), { ts: Date.now(), type: 'info', msg: `ACTIVE_REGION ${detail.start}..${detail.end}` }]);
      }
    };
    const onCaretSnap = () => setLogs(prev => [...prev.slice(-100), { ts: Date.now(), type: 'trace', msg: 'SNAP' }]);
    document.addEventListener('mindtype:activeRegion', onActiveRegion);
    window.addEventListener('mindtype:caretSnapshots', onCaretSnap as any);
    return () => {
      document.removeEventListener('mindtype:activeRegion', onActiveRegion);
      window.removeEventListener('mindtype:caretSnapshots', onCaretSnap as any);
    };
  }, []);

  // ⟢ Map text indices to approximate textarea coordinates
  const computeRectForRange = useCallback((start: number, end: number) => {
    const ta = textareaRef.current;
    if (!ta) return null;
    const value = ta.value;
    const safeStart = Math.max(0, Math.min(start, value.length));
    const safeEnd = Math.max(safeStart, Math.min(end, value.length));
    const before = value.substring(0, safeStart);
    const lines = before.split('\n');
    const lineIndex = lines.length - 1;
    const col = lines[lineIndex]?.length ?? 0;
    const charWidth = 9;
    const lineHeight = 24;
    const padding = 16;
    const left = Math.max(0, col * charWidth - ta.scrollLeft + padding);
    const top = Math.max(0, lineIndex * lineHeight - ta.scrollTop + padding);
    const width = Math.max(2, (safeEnd - safeStart) * charWidth);
    const height = lineHeight;
    return { left, top, width, height };
  }, []);

  // ⟢ Recompute overlays when inputs change
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    // Buffer/band (validation window)
    if (bandRange) setOverlayBand(computeRectForRange(bandRange.start, bandRange.end));
    else setOverlayBand(null);
    // Close context from LM context manager
    try {
      const cw = lmContextManagerRef.current?.getContextWindow?.();
      if (cw?.close) setOverlayClose(computeRectForRange(cw.close.start, cw.close.end));
      else setOverlayClose(null);
      if (cw?.wide) {
        // Show a trailing slice of wide context near caret for visibility
        const caret = caretRef.current;
        const sliceStart = Math.max(0, caret - 120);
        const sliceEnd = caret;
        setOverlayWide(computeRectForRange(sliceStart, sliceEnd));
      } else setOverlayWide(null);
    } catch {
      setOverlayClose(null);
      setOverlayWide(null);
    }
  }, [text, bandRange, lmContextInitialized, computeRectForRange]);

  // ⟢ Handle text changes
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    caretRef.current = e.target.selectionStart || 0;
    
    // Auto-initialize LM context on first keystroke if not already done
    if (lmContextManagerRef.current && !lmContextInitialized) {
      console.log('[App] Auto-initializing LM context on first keystroke');
      lmContextManagerRef.current.initialize(e.target.value, caretRef.current);
      setLmContextInitialized(true);
    }
    
    // Reset typing state
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 1000);
  }, [lmContextInitialized]);

  // ⟢ Handle textarea focus (LM context initialization)
  const handleTextareaFocus = useCallback(() => {
    if (lmContextManagerRef.current && !lmContextInitialized) {
      console.log('[App] Initializing LM context on focus');
      lmContextManagerRef.current.initialize(text, caretRef.current);
      setLmContextInitialized(true);
    }
  }, [text, lmContextInitialized]);

  // ⟢ Braille animation for corrections
  const showBrailleAnimation = useCallback((start: number, end: number, glyph: string, instant: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Create braille indicator element
    const indicator = document.createElement('div');
    indicator.className = `braille-indicator ${instant ? 'reduced-motion' : ''}`;
    indicator.textContent = glyph;
    indicator.setAttribute('aria-hidden', 'true');

    // Position the indicator at the start of the corrected span
    const textBeforeStart = textarea.value.substring(0, start);
    const lines = textBeforeStart.split('\n');
    const currentLine = lines.length - 1;
    const currentColumn = lines[currentLine].length;

    // Approximate positioning (rough calculation for demo)
    const charWidth = 9; // Approximate character width in pixels
    const lineHeight = 24; // Approximate line height in pixels
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    const left = Math.max(0, currentColumn * charWidth - scrollLeft + 16); // 16px padding
    const top = Math.max(0, currentLine * lineHeight - scrollTop + 16);

    indicator.style.left = `${left}px`;
    indicator.style.top = `${top}px`;

    // Calculate sweep distance based on corrected span length
    const spanLength = end - start;
    const sweepDistance = Math.min(spanLength * charWidth, 40);
    indicator.style.setProperty('--sweep-distance', `${sweepDistance}px`);
    // Tune animation duration from correctionDelayMs
    const seconds = Math.max(0.2, (correctionDelayMs || 180) / 1000);
    indicator.style.animationDuration = `${seconds}s`;

    // Add to textarea container
    const container = textarea.parentElement;
    if (container) {
      container.style.position = 'relative';
      container.appendChild(indicator);

      // Trigger animation
      requestAnimationFrame(() => {
        indicator.classList.add('animate');
      });

      // Clean up after animation
      setTimeout(() => {
        if (indicator.parentElement) {
          indicator.parentElement.removeChild(indicator);
        }
      }, instant ? 300 : 800);
    }
  }, [correctionDelayMs]);

  // ⟢ Handle preset changes
  const handlePresetChange = useCallback((preset: DemoPreset) => {
    setCurrentPreset(preset);
    setText(preset.text);
    const newCaret = preset.text.length;
    caretRef.current = newCaret;
    
    // Re-initialize LM context with new text
    if (lmContextManagerRef.current) {
      lmContextManagerRef.current.initialize(preset.text, newCaret);
      setLmContextInitialized(true);
    }
    
    // Update textarea and set caret properly
    const ta = textareaRef.current;
    if (ta) {
      ta.value = preset.text;
      ta.setSelectionRange(newCaret, newCaret);
      ta.focus(); // Ensure focus for caret position
    }

    // Persist to localStorage
    try {
      localStorage.setItem('mindtype-demo-preset', preset.name);
    } catch (e) {
      console.warn('[App] Failed to save preset to localStorage:', e);
    }

    console.log('[App] Preset changed:', { name: preset.name, textLength: preset.text.length, caret: newCaret });
  }, [lmContextManagerRef]);

  // ⟢ Trigger correction sweep (CTA function)
  const runCorrections = useCallback(() => {
    const pipeline = pipelineRef.current;
    const ta = textareaRef.current;
    if (!pipeline || !text || !ta) return;
    
    // Ensure caret is at end of text for corrections
    const correctCaret = text.length;
    caretRef.current = correctCaret;
    ta.setSelectionRange(correctCaret, correctCaret);
    ta.focus();
    
    console.log('[App] Running corrections via CTA button', { 
      textLength: text.length, 
      caret: correctCaret,
      textPreview: text.slice(0, 50) + '...'
    });
    
    // Force a sweep by ingesting current text with correct caret
    pipeline.ingest(text, correctCaret);
    
    // Show feedback that processing has started
    setIsTyping(false); // Stop typing indicator
  }, [text]);

  // ⟢ Apply corrections from events
  const applyFromEvent = useCallback((detail: { start: number; end: number; text: string }) => {
    const ta = textareaRef.current;
    if (!ta) return;
    
    try {
      const newText = replaceRange(ta.value, detail.start, detail.end, detail.text, caretRef.current);
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
        // Apply the text correction
        applyFromEvent(detail);
        
        // Show braille animation if marker is enabled
        if (detail.markerGlyph && showMarkers) {
          showBrailleAnimation(detail.start, detail.end, detail.markerGlyph, detail.instant);
        }
      }
    };

    const onStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail as { statuses?: Record<string, boolean> };
      const st = detail?.statuses;
      if (st) {
        setSystemStatuses(st);
        // Log STATUS for tests
        const on = Object.keys(st).filter(k => (st as Record<string, boolean>)[k]).join(',');
        setLogs(prev => [...prev.slice(-100), { ts: Date.now(), type: 'debug', msg: `STATUS ${on}` }]);
      }
    };

    const onMindtypeBlocked = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setBlockedBanner(detail?.reason || 'Blocked');
      setTimeout(() => setBlockedBanner(''), 3000);
    };

    const onSwapAnnouncement = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.message && liveRegionRef.current) {
        // Announce correction summary to screen readers
        const message = detail.count === 1 
          ? 'Text corrected behind cursor'
          : `${detail.count} corrections applied behind cursor`;
        liveRegionRef.current.announce(message);
      }
    };

    document.addEventListener('mindtype:highlight', onHighlight);
    document.addEventListener('mindtype:mechanicalSwap', onMechanicalSwap);
    document.addEventListener('mindtype:swapAnnouncement', onSwapAnnouncement);
    document.addEventListener('mindtype:blocked', onMindtypeBlocked);
    document.addEventListener('mindtype:status', onStatus);

    return () => {
      document.removeEventListener('mindtype:highlight', onHighlight);
      document.removeEventListener('mindtype:mechanicalSwap', onMechanicalSwap);
      document.removeEventListener('mindtype:swapAnnouncement', onSwapAnnouncement);
      document.removeEventListener('mindtype:blocked', onMindtypeBlocked);
      document.removeEventListener('mindtype:status', onStatus);
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
  // Deprecated scenario loader (replaced by unified autopilot demo)
  
  
  
  
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
      fontFamily: 'Geist, Inter, system-ui, sans-serif',
      color: 'rgba(245, 246, 248, 0.92)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h1 style={{ margin: 0, fontSize: '1.8em', fontWeight: '600', fontFamily: 'Geist, system-ui, sans-serif' }}>Mind::Type — Unified Typing Lab</h1>
        <div style={{ marginTop: '8px' }}>
          <a 
            href="/#/demos" 
            style={{
              color: '#7ce0b8',
              textDecoration: 'none',
              fontSize: '0.9em',
              fontWeight: '500',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#4db8ff'}
            onMouseOut={(e) => e.currentTarget.style.color = '#7ce0b8'}
          >
            🎯 View All Demos
          </a>
        </div>
      </div>

      {/* Demo Preset Controls */}
      <div style={{
        background: 'rgba(124, 224, 184, 0.1)',
        border: '1px solid rgba(124, 224, 184, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '1.1em', color: '#7ce0b8' }}>
            ✨ Quick Demo
          </h3>
          <select
            value={currentPreset.name}
            onChange={(e) => {
              const preset = DEMO_PRESETS.find(p => p.name === e.target.value);
              if (preset) handlePresetChange(preset);
            }}
            aria-label="Select demo preset"
            title="Choose a preset with different types of text errors to demonstrate"
            style={{
              background: '#1a2332',
              color: '#e7e9ee',
              border: '1px solid rgba(124, 224, 184, 0.3)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.9em'
            }}
          >
            {DEMO_PRESETS.map(preset => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
          <button
            onClick={runCorrections}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                runCorrections();
              }
            }}
            aria-label="Run corrections on current text"
            title="Apply AI-powered corrections to the current text"
            style={{
              background: 'linear-gradient(135deg, #7ce0b8, #4db8ff)',
              color: '#0b0f12',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '1em',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(124, 224, 184, 0.3)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(124, 224, 184, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 224, 184, 0.3)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #7ce0b8';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            🚀 Run Corrections
          </button>
        </div>
        <p id="demo-description" style={{ 
          margin: 0, 
          fontSize: '0.85em', 
          color: '#a0a8b0',
          fontStyle: 'italic'
        }}>
          {currentPreset.description} Text corrections will be applied automatically behind your cursor as you type, or click "Run Corrections" to process the current text immediately.
        </p>
      </div>

        {/* Main Layout Grid */}
      <div style={{ 
        display: 'grid', 
          gridTemplateColumns: '1fr 2fr 1fr',
          gridTemplateRows: `auto 1fr ${bottomHeightPx}px`,
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
            <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#0c8' }}>Autopilot</h3>
            <div style={{ display: 'grid', gap: 8, fontSize: '0.8em', marginBottom: '12px' }}>
              <label>Auto‑typing
                <input type="checkbox" checked={autoTyping} onChange={(e) => setAutoTyping(e.target.checked)} style={{ marginLeft: 8 }} />
              </label>
              <label>Speed (chars/sec): {typingCps}
                <input type="range" min="1" max="20" step="1" value={typingCps} onChange={(e) => setTypingCps(Number(e.target.value))} style={{ width: '100%' }} />
              </label>
              <label>Fuzziness: {fuzziness}%
                <input type="range" min="0" max="100" step="1" value={fuzziness} onChange={(e) => setFuzziness(Number(e.target.value))} style={{ width: '100%' }} />
              </label>
              <label>Correction delay: {correctionDelayMs}ms
                <input type="range" min="0" max="600" step="10" value={correctionDelayMs} onChange={(e) => setCorrectionDelayMs(Number(e.target.value))} style={{ width: '100%' }} />
              </label>
            </div>
            {lmContextInitialized && lmContextManagerRef.current && (
              <div style={{ marginTop: 12 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#0c8' }}>Context Windows</h3>
                {(() => {
                  try {
                    const cw = lmContextManagerRef.current!.getContextWindow();
                    return (
                      <div style={{ fontSize: '0.75em', fontFamily: 'Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ color: '#7ce0b8', fontWeight: 600 }}>Wide ({cw.wide.tokenCount} tokens)</div>
                          <div style={{ background: 'rgba(124, 224, 184, 0.1)', padding: 6, borderRadius: 4, maxHeight: 80, overflow: 'auto' }}>{cw.wide.text.slice(-240)}{cw.wide.text.length > 240 ? '…' : ''}</div>
                        </div>
                        <div>
                          <div style={{ color: '#4db8ff', fontWeight: 600 }}>Close</div>
                          <div style={{ background: 'rgba(77, 184, 255, 0.1)', padding: 6, borderRadius: 4, maxHeight: 80, overflow: 'auto' }}>{cw.close.text}</div>
                        </div>
                      </div>
                    );
                  } catch (e) {
                    return <div style={{ fontSize: '0.75em', color: '#f66' }}>Context error: {String(e)}</div>;
                  }
                })()}
              </div>
            )}
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
              aria-label="Text input for correction demonstration"
              aria-describedby="demo-description"
              role="textbox"
              aria-multiline="true"
            style={{ 
                height: '35vh',
                padding: '16px',
                fontSize: '16px',
                lineHeight: '1.6',
                background: 'rgba(20, 24, 28, 0.6)',
                color: 'rgba(245, 246, 248, 0.92)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
              resize: 'none', 
                fontFamily: 'Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace'
            }} 
          />
          {/* Overlays for context/buffer zones */}
          <div aria-hidden="true" style={{ position: 'relative', height: 0 }}>
            {overlayBand && (
              <div style={{ position: 'absolute', left: overlayBand.left, top: overlayBand.top, width: overlayBand.width, height: overlayBand.height, border: '2px dashed rgba(255,255,255,0.25)', borderRadius: 4, pointerEvents: 'none' }} title="Validation band (buffer)" />
            )}
            {overlayClose && (
              <div style={{ position: 'absolute', left: overlayClose.left, top: overlayClose.top, width: overlayClose.width, height: overlayClose.height, background: 'rgba(77, 184, 255, 0.15)', border: '1px solid rgba(77, 184, 255, 0.5)', borderRadius: 4, pointerEvents: 'none' }} title="Close context" />
            )}
            {overlayWide && (
              <div style={{ position: 'absolute', left: overlayWide.left, top: overlayWide.top, width: overlayWide.width, height: overlayWide.height, background: 'rgba(124, 224, 184, 0.12)', border: '1px solid rgba(124, 224, 184, 0.4)', borderRadius: 4, pointerEvents: 'none' }} title="Wide context (trailing slice)" />
            )}
          </div>
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
                  checked={!lmEnabled}
                  onChange={(e) => setLmEnabled(!e.target.checked)}
                />
                Rules Only (deterministic)
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
            padding: '4px',
            overflow: 'hidden'
          }}>
            <span data-testid="caret-primary">{primaryStatus}</span>
            <span>•</span>
            <span data-testid="active-region-label">Caret: {caretState?.caret ?? 0}</span>
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
            height: `${bottomHeightPx}px`,
            overflow: 'hidden'
          }}>
            {/* Resize handle */}
            <div
              onMouseDown={startBottomDrag}
              style={{ cursor: 'ns-resize', height: 6, margin: '-8px 0 8px 0', background: 'rgba(255,255,255,0.12)', borderRadius: 4 }}
              title="Drag to resize"
            />
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
                data-testid="workbench-tab-presets"
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
                data-testid="workbench-tab-logs"
              >
                Logs
            </button>
          </div>
          
            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeWorkbenchTab === 'diagnostics' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', fontSize: '0.75em', fontFamily: 'monospace' }}>
                  {/* TEXT LOOP */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: 6 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Text Loop</div>
                    <div>Caret: {caretState?.caret ?? 0}</div>
                    <div>Typing ε: {eps.toFixed(3)}</div>
                    <div>Avg Δt: {stats?.avg_inter_key_ms ? Math.round(stats.avg_inter_key_ms) : 0}ms</div>
                    <div style={{ marginTop: 6, color: '#888' }}>Statuses:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(systemStatuses).map(([k, v]) => (
                        <span key={k} style={{ padding: '2px 4px', borderRadius: 4, background: v ? 'rgba(0,204,136,0.18)' : 'rgba(255,102,102,0.18)', color: v ? '#0c8' : '#f66' }}>{k}</span>
                      ))}
                    </div>
                  </div>

                  {/* TRANSFORMER DIFFS: NOISE */}
                  <div style={{ background: 'rgba(255,153,0,0.08)', padding: '6px', borderRadius: 6 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Noise</div>
                    <div style={{ color: '#888' }}>Before</div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: 4, marginBottom: 4 }}>{previewBuffer || '—'}</div>
                    <div style={{ color: '#888' }}>After</div>
                    <div style={{ background: 'rgba(255,153,0,0.15)', padding: '4px', borderRadius: 4 }}>{previewNoise || '—'}</div>
                    <div style={{ marginTop: 6, color: '#888' }}>Recent evaluations</div>
                    <div style={{ maxHeight: 100, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.7em', background: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 4 }}>
                      {noiseEvents.length === 0 ? '—' : noiseEvents.slice(-10).reverse().map((e, i) => (
                        <div key={i}>
                          [{new Date(e.time).toLocaleTimeString()}] {e.rule} → {e.decision}
                          {e.start != null && e.end != null ? ` @${e.start}..${e.end}` : ''}
                          {e.text ? ` "${String(e.text).slice(0,20)}"` : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TRANSFORMER DIFFS: CONTEXT / LM */}
                  <div style={{ background: 'rgba(0,204,136,0.08)', padding: '6px', borderRadius: 6 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Context / LM</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                      <span>LM:</span>
                      <span style={{ padding: '2px 6px', borderRadius: 4, background: lmHealth.status === 'healthy' ? 'rgba(0,204,136,0.18)' : lmHealth.status === 'error' ? 'rgba(255,102,102,0.18)' : 'rgba(170,170,102,0.18)', color: lmHealth.status === 'healthy' ? '#0c8' : lmHealth.status === 'error' ? '#f66' : '#aa6' }}>
                        {lmHealth.status}
                      </span>
                      <span>Worker: {lmHealth.workerActive ? '🟢' : '🔴'}</span>
                      <span>Runs: {(globalThis as any).__mtLmStats?.runs || 0}</span>
                      <span>Chunks: {(globalThis as any).__mtLmStats?.chunksLast || 0}</span>
                      <span>Latency: {lmMetrics.at(-1)?.latency || 0}ms</span>
                    </div>
                    <div style={{ color: '#888' }}>Before</div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: 4, marginBottom: 4 }}>{previewBuffer || '—'}</div>
                    <div style={{ color: '#888' }}>After</div>
                    <div style={{ background: 'rgba(0,204,136,0.15)', padding: '4px', borderRadius: 4 }}>{previewContext || '—'}</div>
                    <div style={{ marginTop: 6, color: '#888' }}>LM wire (recent)</div>
                    <div style={{ maxHeight: 100, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.7em', background: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 4 }}>
                      {lmWireEvents.length === 0 ? '—' : lmWireEvents.slice(-10).reverse().map((e, i) => (
                        <div key={i}>[{new Date(e.time).toLocaleTimeString()}] {e.phase} {(e.requestId||'').slice(-6)}</div>
                      ))}
                    </div>
                  </div>

                  {/* TRANSFORMER DIFFS: TONE */}
                  <div style={{ background: 'rgba(255,0,255,0.08)', padding: '6px', borderRadius: 6 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Tone</div>
                    <div>Enabled: {toneEnabled ? 'Yes' : 'No'}</div>
                    <div>Target: {toneTarget}</div>
                    <div style={{ color: '#888', marginTop: 6 }}>Before</div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: 4, marginBottom: 4 }}>{previewBuffer || '—'}</div>
                    <div style={{ color: '#888' }}>After</div>
                    <div style={{ background: 'rgba(255,0,255,0.15)', padding: '4px', borderRadius: 4 }}>{previewTone || '—'}</div>
                  </div>
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
                    <div>Stale drops: {(() => {
                      try {
                        const stats = (globalThis as any).__mtLmStats;
                        return stats?.aborted || 0;
                      } catch { return 0; }
                    })()}</div>
                    <div>Last chunks: {(() => {
                      try {
                        const stats = (globalThis as any).__mtLmStats;
                        return stats?.chunksLast || 0;
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

                  {/* Context Windows Display */}
                  {lmContextInitialized && lmContextManagerRef.current && (
                    <div style={{ marginTop: '16px' }}>
                      <h5 style={{ margin: '0 0 8px 0', fontSize: '0.8em', color: '#0c8' }}>Context Windows</h5>
                      {(() => {
                        try {
                          const contextWindow = lmContextManagerRef.current?.getContextWindow?.();
                          if (!contextWindow) return <div style={{ fontSize: '0.7em', color: '#888' }}>No context available</div>;
                          
                          return (
                            <div style={{ fontSize: '0.7em', fontFamily: 'monospace' }}>
                              <div style={{ marginBottom: '8px' }}>
                                <div style={{ color: '#7ce0b8', fontWeight: 'bold' }}>Wide Context ({contextWindow.wide?.tokenCount || 0} tokens):</div>
                                <div style={{ 
                                  background: 'rgba(124, 224, 184, 0.1)', 
                                  padding: '4px 6px', 
                                  borderRadius: '4px',
                                  marginTop: '2px',
                                  maxHeight: '60px',
                                  overflow: 'auto',
                                  wordBreak: 'break-word'
                                }}>
                                  {contextWindow.wide?.text?.slice(-200) || 'No wide context'}
                                  {(contextWindow.wide?.text?.length || 0) > 200 && '...'}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: '#4db8ff', fontWeight: 'bold' }}>Close Context:</div>
                                <div style={{ 
                                  background: 'rgba(77, 184, 255, 0.1)', 
                                  padding: '4px 6px', 
                                  borderRadius: '4px',
                                  marginTop: '2px',
                                  maxHeight: '60px',
                                  overflow: 'auto',
                                  wordBreak: 'break-word'
                                }}>
                                  {contextWindow.close?.text || 'No close context'}
                                </div>
                              </div>
                            </div>
                          );
                        } catch (e) {
                          return <div style={{ fontSize: '0.7em', color: '#f66' }}>Context error: {String(e)}</div>;
                        }
                      })()}
                    </div>
                  )}
                  
                  {/* Emit swap button */}
                <button
                  onClick={() => {
                      if (lastHighlight) {
                        emitSwap({ start: lastHighlight.start, end: lastHighlight.end, text: 'TEST_SWAP' });
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
                <div style={{ fontSize: '0.7em', fontFamily: 'monospace', color: '#ddd' }} data-testid="process-log">
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