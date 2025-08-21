import { useEffect, useMemo, useRef, useState } from 'react';
import { boot } from '../../../index';
import { replaceRange } from '../../../utils/diff';
import { setLoggerConfig } from '../../../core/logger';
import {
  getMinValidationWords,
  getMaxValidationWords,
  setValidationBandWords,
  setTypingTickMs,
} from '../../../config/defaultThresholds';

type LayoutName = 'qwerty' | 'qwertz';

const LAYOUTS: Record<LayoutName, string[]> = {
  qwerty: ['`1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'],
  qwertz: ['`1234567890-=', 'qwertzuiop[]', "asdfghjkl;'", 'yxcvbnm,./'],
};

function buildAdjacency(rows: string[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const grid = rows.map((r) => r.split(''));
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = grid[r][c].toLowerCase();
      const neighbors: string[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < grid.length && cc >= 0 && cc < grid[rr].length) {
            neighbors.push(grid[rr][cc].toLowerCase());
          }
        }
      }
      map[ch] = Array.from(new Set(neighbors));
    }
  }
  return map;
}

function pickAdjacentChar(ch: string, layout: LayoutName, rng: () => number): string {
  const rows = LAYOUTS[layout];
  const adj = buildAdjacency(rows);
  const lower = ch.toLowerCase();
  const opts = adj[lower];
  if (!opts || opts.length === 0) return ch;
  const pick = opts[Math.floor(rng() * opts.length)];
  return ch === lower ? pick : pick.toUpperCase();
}

// Approachable, long-form sample text
const PASSAGE = (
  'This is a simple product note about how MindTyper helps you compose clear text. ' +
  'It spots little slips like doubled spaces, missing letters, or stray punctuation, ' +
  'and quietly straightens them while you continue typing. You can pause, think, and ' +
  'resume without losing your place. The goal is not to be poetic, just helpful and ' +
  'calm. As you type, the engine watches recent words and cleans them up in a way that ' +
  'feels natural, like a careful editor sitting beside you. The demo below simulates a ' +
  'real keyboard session with bursts and short breaks, so you can see the cleanup catch ' +
  'up to the words you just wrote. Feel free to tweak the sliders to adjust speed, error ' +
  'rate, and rhythm. When the passage reaches the end, it clears and starts again so you ' +
  'can observe the behavior from the very first characters.'
);

export default function Tester() {
  const [tickMs, setTickMs] = useState(90);
  const [errorRate, setErrorRate] = useState(0.08);
  const [jitterMs, setJitterMs] = useState(20);
  const [burstiness, setBurstiness] = useState(0.5); // 0..1
  const [pauseWeight, setPauseWeight] = useState(1.5); // multiplier at spaces/punct
  const [layout, setLayout] = useState<LayoutName>('qwerty');
  const [autoPlay, setAutoPlay] = useState(true);
  const [text, setText] = useState('');
  const [minBand, setMinBand] = useState(getMinValidationWords());
  const [maxBand, setMaxBand] = useState(getMaxValidationWords());
  const [bandRange, setBandRange] = useState<{ start: number; end: number } | null>(null);
  const [debugOn, setDebugOn] = useState<boolean>(false);

  const caretRef = useRef(0);
  const textRef = useRef('');
  const simTimeoutRef = useRef<number | null>(null);
  const srcIndexRef = useRef(0);
  const burstLeftRef = useRef(0);

  const pipeline = useMemo(
    () =>
      boot({
        security: {
          isSecure: () => false,
          isIMEComposing: () => false,
        },
      }),
    [],
  );

  useEffect(() => {
    pipeline.start();
    try {
      const stored = localStorage.getItem('mt.debug');
      if (stored === 'true') {
        setLoggerConfig({ enabled: true, level: 'debug' });
        setDebugOn(true);
        console.info('[v2] debug logging enabled');
      }
    } catch {}
    return () => pipeline.stop();
  }, [pipeline]);

  useEffect(() => {
    (window as any).mt = pipeline;
    return () => delete (window as any).mt;
  }, [pipeline]);

  // Persist key controls between visits
  useEffect(() => {
    try {
      localStorage.setItem('mt.v2.tickMs', String(tickMs));
      localStorage.setItem('mt.v2.errorRate', String(errorRate));
      localStorage.setItem('mt.v2.jitterMs', String(jitterMs));
      localStorage.setItem('mt.v2.burstiness', String(burstiness));
      localStorage.setItem('mt.v2.pauseWeight', String(pauseWeight));
      localStorage.setItem('mt.v2.layout', layout);
    } catch {}
  }, [tickMs, errorRate, jitterMs, burstiness, pauseWeight, layout]);

  // Drive core tick and band size
  useEffect(() => {
    setTypingTickMs(tickMs);
  }, [tickMs]);
  useEffect(() => {
    setValidationBandWords(minBand, maxBand);
  }, [minBand, maxBand]);

  // Listen for band/highlight events and apply diffs in the textarea
  useEffect(() => {
    const onBand = (e: Event) => {
      const { start, end } = (e as CustomEvent).detail as { start: number; end: number };
      setBandRange({ start, end });
    };
    const onHighlight = (e: Event) => {
      const { start, end, text: diffText } = (e as CustomEvent).detail as {
        start: number;
        end: number;
        text?: string;
      };
      if (typeof diffText === 'string') {
        try {
          const caret = caretRef.current;
          const updated = replaceRange(textRef.current, start, end, diffText, caret);
          setText(updated);
          textRef.current = updated;
        } catch (err) {
          console.warn('[v2] failed to apply diff', { start, end, diffText, err });
        }
      }
    };
    window.addEventListener('mindtyper:validationBand', onBand as EventListener);
    window.addEventListener('mindtyper:highlight', onHighlight as EventListener);
    return () => {
      window.removeEventListener('mindtyper:validationBand', onBand as EventListener);
      window.removeEventListener('mindtyper:highlight', onHighlight as EventListener);
    };
  }, []);

  useEffect(() => {
    try {
      const t = localStorage.getItem('mt.v2.tickMs');
      const e = localStorage.getItem('mt.v2.errorRate');
      const j = localStorage.getItem('mt.v2.jitterMs');
      const b = localStorage.getItem('mt.v2.burstiness');
      const p = localStorage.getItem('mt.v2.pauseWeight');
      const l = localStorage.getItem('mt.v2.layout') as LayoutName | null;
      if (t) setTickMs(parseInt(t, 10));
      if (e) setErrorRate(parseFloat(e));
      if (j) setJitterMs(parseInt(j, 10));
      if (b) setBurstiness(parseFloat(b));
      if (p) setPauseWeight(parseFloat(p));
      if (l === 'qwerty' || l === 'qwertz') setLayout(l);
    } catch {}
  }, []);

  // Utility RNG for stable distribution per step
  const rng = () => Math.random();

  function computeDelayForChar(nextChar: string): number {
    let base = tickMs;
    // inside a burst we accelerate typing
    if (burstLeftRef.current > 0) base = Math.max(15, Math.floor(base * 0.6));
    // pauses at word boundaries and punctuation
    if (nextChar === ' ' || nextChar === '\n') base = Math.floor(base * (1 + pauseWeight));
    if (/[\.!?,:;]/.test(nextChar)) base = Math.floor(base * (1 + pauseWeight * 1.2));
    // jitter
    if (jitterMs > 0) {
      const delta = Math.floor((rng() * 2 - 1) * jitterMs);
      base = Math.max(15, base + delta);
    }
    return base;
  }

  function maybeNoisyEmit(correct: string): { emit: string; advance: number } {
    // With probability errorRate, introduce a realistic slip
    if (rng() < errorRate) {
      // If space, either skip or double
      if (correct === ' ') {
        if (rng() < 0.5) return { emit: '', advance: 1 }; // skip space
        return { emit: '  ', advance: 1 }; // double space
      }
      // Adjacent substitution for letters and common symbols
      if (/^[A-Za-z]$/.test(correct)) {
        const swapped = pickAdjacentChar(correct, layout, rng);
        return { emit: swapped, advance: 1 };
      }
      // Occasionally duplicate a character
      if (rng() < 0.2) return { emit: correct + correct, advance: 1 };
    }
    return { emit: correct, advance: 1 };
  }

  function schedule(stepDelay: number) {
    if (simTimeoutRef.current) window.clearTimeout(simTimeoutRef.current);
    simTimeoutRef.current = window.setTimeout(runStep, stepDelay);
  }

  function runStep() {
    if (!autoPlay) return;
    // Loop when we reach the end
    if (srcIndexRef.current >= PASSAGE.length) {
      srcIndexRef.current = 0;
      setText('');
      textRef.current = '';
      caretRef.current = 0;
      pipeline.ingest('', 0);
      // short reset pause
      schedule(Math.max(250, tickMs * 4));
      return;
    }

    // decide if we start or continue a burst
    if (burstLeftRef.current <= 0 && rng() < burstiness) {
      // bursts of 5-15 characters
      burstLeftRef.current = 5 + Math.floor(rng() * 11);
    }

    const nextChar = PASSAGE[srcIndexRef.current];
    const noisy = maybeNoisyEmit(nextChar);

    // apply emitted string to our text buffer
    const currentText = textRef.current;
    const nextText = currentText + noisy.emit;
    setText(nextText);
    textRef.current = nextText;
    caretRef.current = nextText.length;
    pipeline.ingest(nextText, caretRef.current);

    srcIndexRef.current += noisy.advance;
    if (burstLeftRef.current > 0) burstLeftRef.current -= 1;

    const delay = computeDelayForChar(nextChar);
    recordStep(nextChar, noisy.emit, delay);
    schedule(delay);
  }

  // Drive the simulation with variable delays
  useEffect(() => {
    if (!autoPlay) {
      if (simTimeoutRef.current) {
        window.clearTimeout(simTimeoutRef.current);
        simTimeoutRef.current = null;
      }
      return;
    }
    // kick off
    schedule(Math.max(15, tickMs));
    return () => {
      if (simTimeoutRef.current) window.clearTimeout(simTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, tickMs, errorRate, jitterMs, burstiness, pauseWeight, layout]);

  // Simple glass-style helpers
  const glass: React.CSSProperties = {
    background: 'linear-gradient(to bottom right, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };
  const headerStyle: React.CSSProperties = {
    fontSize: 'clamp(1.2rem, 2.4vw, 2rem)',
    fontWeight: 800,
    letterSpacing: 0.5,
    margin: 0,
  };
  const subStyle: React.CSSProperties = {
    marginTop: 6,
    opacity: 0.8,
    lineHeight: 1.4,
  };
  const grid: React.CSSProperties = {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    alignItems: 'center',
  };
  const ctrlLabel: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: '1rem',
    fontWeight: 600,
  };
  const rangeStyle: React.CSSProperties = { width: '100%' };
  const numberStyle: React.CSSProperties = { width: 96, fontSize: '1rem', padding: '6px 10px' };

  // Stats (observed)
  const statsRef = useRef({
    steps: 0,
    inserts: 0,
    substitutes: 0,
    duplicates: 0,
    skippedSpaces: 0,
    lastDelayMs: 0,
    avgDelayMs: 0,
  });
  const [, forceStatsTick] = useState(0);
  const healthRef = useRef({ monitor: 0, scheduler: 0, diffusion: 0, lastBandAt: 0, lastHighlightAt: 0 });

  function recordStep(nextChar: string, emitted: string, usedDelay: number) {
    const s = statsRef.current;
    s.steps += 1;
    s.lastDelayMs = usedDelay;
    s.avgDelayMs = s.avgDelayMs === 0 ? usedDelay : Math.round(s.avgDelayMs * 0.9 + usedDelay * 0.1);
    if (emitted.length > 1) {
      if (emitted === nextChar + nextChar) s.duplicates += 1;
      else s.inserts += 1;
    } else if (emitted.length === 0) {
      s.skippedSpaces += 1;
    } else if (emitted !== nextChar) {
      s.substitutes += 1;
    }
    // trigger UI update at low rate
    if (s.steps % 5 === 0) forceStatsTick((x) => x + 1);
  }

  const pagePad = 'clamp(8px, 2vw, 16px)';
  const panelPad = 'clamp(8px, 2vw, 16px)';

  return (
    <div style={{ height: '100vh', width: '100vw', boxSizing: 'border-box', padding: pagePad, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1vh, 12px)', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', color: '#E6EDF3', background: 'linear-gradient(180deg,#0b0f17,#0a0d14)' }}>
      <div style={{ ...glass, padding: panelPad }}>
        <h1 style={headerStyle}>Noisy Typing Tester</h1>
        <p style={subStyle}>
          Precise, adjustable simulation of human typing with bursts, pauses, and keyboard slips. The engine cleans up behind you like manual typing. Tune parameters and watch the effect.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)', gap: 'clamp(10px, 2vw, 20px)', alignItems: 'stretch', width: '100%', flex: 1, minHeight: 0 }}>
        <div style={{ ...glass, padding: panelPad, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          <div style={grid}>
            <label style={ctrlLabel}>
              <span>Tick (ms): {tickMs}</span>
              <input style={rangeStyle} type="range" min={20} max={220} step={1} value={tickMs} onChange={(e) => setTickMs(parseInt(e.target.value, 10))} />
            </label>
            <label style={ctrlLabel}>
              <span>Error rate: {errorRate.toFixed(2)}</span>
              <input style={rangeStyle} type="range" min={0} max={0.4} step={0.01} value={errorRate} onChange={(e) => setErrorRate(parseFloat(e.target.value))} />
            </label>
            <label style={ctrlLabel}>
              <span>Jitter (ms): {jitterMs}</span>
              <input style={rangeStyle} type="range" min={0} max={80} step={1} value={jitterMs} onChange={(e) => setJitterMs(parseInt(e.target.value, 10))} />
            </label>
            <label style={ctrlLabel}>
              <span>Burstiness: {burstiness.toFixed(2)}</span>
              <input style={rangeStyle} type="range" min={0} max={1} step={0.01} value={burstiness} onChange={(e) => setBurstiness(parseFloat(e.target.value))} />
            </label>
            <label style={ctrlLabel}>
              <span>Pause weight: {pauseWeight.toFixed(1)}</span>
              <input style={rangeStyle} type="range" min={0} max={3} step={0.1} value={pauseWeight} onChange={(e) => setPauseWeight(parseFloat(e.target.value))} />
            </label>
            <label style={ctrlLabel}>
              <span>Layout</span>
              <select value={layout} onChange={(e) => setLayout(e.target.value as LayoutName)} style={{ fontSize: '1rem', padding: '6px 10px', borderRadius: 8 }}>
                <option value="qwerty">QWERTY</option>
                <option value="qwertz">QWERTZ</option>
              </select>
            </label>
            <label style={{ ...ctrlLabel, flexDirection: 'row', alignItems: 'center' }}>
              <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} />
              <span>Autoplay</span>
            </label>
            <label style={ctrlLabel}>
              <span>Min band: {minBand}</span>
              <input style={rangeStyle} type="range" min={1} max={5} step={1} value={minBand} onChange={(e) => setMinBand(Math.min(parseInt(e.target.value, 10), maxBand))} />
            </label>
            <label style={ctrlLabel}>
              <span>Max band: {maxBand}</span>
              <input style={rangeStyle} type="range" min={3} max={12} step={1} value={maxBand} onChange={(e) => setMaxBand(Math.max(parseInt(e.target.value, 10), minBand))} />
            </label>
            <label style={{ ...ctrlLabel, flexDirection: 'row', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={debugOn}
                onChange={(e) => {
                  setDebugOn(e.target.checked);
                  try {
                    localStorage.setItem('mt.debug', e.target.checked ? 'true' : 'false');
                    setLoggerConfig({ enabled: e.target.checked, level: 'debug' });
                  } catch {}
                }}
              />
              <span>Debug logs</span>
            </label>
            <button
              onClick={() => {
                srcIndexRef.current = 0;
                burstLeftRef.current = 0;
                statsRef.current = { steps: 0, inserts: 0, substitutes: 0, duplicates: 0, skippedSpaces: 0, lastDelayMs: 0, avgDelayMs: 0 };
                setText('');
                textRef.current = '';
                caretRef.current = 0;
                pipeline.ingest('', 0);
                forceStatsTick((x) => x + 1);
              }}
              style={{ fontSize: '1rem', padding: '10px 14px', borderRadius: 10, border: '1px solid #2a3140', background: '#131a26', color: '#E6EDF3' }}
            >
              Restart
            </button>
          </div>
          <div style={{ marginTop: 12, flex: 1, minHeight: 0, display: 'flex' }}>
            <textarea
              value={text}
              placeholder="Type or watch autoplay."
              onChange={(e) => {
                const v = e.target.value;
                setText(v);
                textRef.current = v;
                caretRef.current = e.target.selectionStart ?? v.length;
                pipeline.ingest(v, caretRef.current);
              }}
              onSelect={(e) => {
                const ta = e.target as HTMLTextAreaElement;
                caretRef.current = ta.selectionStart ?? ta.value.length;
              }}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              data-gramm="false"
              data-lt-active="false"
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                width: '100%',
                height: '100%',
                fontSize: 'clamp(1.25rem, 2.2vw, 2rem)',
                lineHeight: 1.5,
                padding: 'clamp(10px, 1.8vw, 20px)',
                borderRadius: 14,
                border: '1px solid #2a3140',
                background: 'rgba(12,16,24,0.65)',
                color: '#E6EDF3',
              }}
            />
          </div>
        </div>

        <div style={{ ...glass, padding: panelPad, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: '1.1rem' }}>Live metrics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Metric label="Chars consumed" value={`${srcIndexRef.current} / ${PASSAGE.length}`} />
            <Metric label="Typed chars" value={`${text.length}`} />
            <Metric label="Last delay (ms)" value={`${statsRef.current.lastDelayMs}`} />
            <Metric label="Avg delay (ms)" value={`${statsRef.current.avgDelayMs}`} />
            <Metric label="Observed WPM" value={`${Math.round((text.length / 5) / ((statsRef.current.avgDelayMs || tickMs) / 1000 / 60))}`} />
            <Metric label="Steps" value={`${statsRef.current.steps}`} />
          </div>
          <h3 style={{ marginTop: 12, fontSize: '1rem' }}>Health</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Metric label="Monitor emits" value={`${healthRef.current.monitor}`} />
            <Metric label="Scheduler ticks" value={`${healthRef.current.scheduler}`} />
            <Metric label="Diffusion ticks" value={`${healthRef.current.diffusion}`} />
            <Metric label="Last band (ms ago)" value={`${Date.now() - healthRef.current.lastBandAt}`} />
            <Metric label="Last highlight (ms ago)" value={`${Date.now() - healthRef.current.lastHighlightAt}`} />
          </div>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Metric label="Inserts" value={`${statsRef.current.inserts}`} />
            <Metric label="Substitutes" value={`${statsRef.current.substitutes}`} />
            <Metric label="Duplicates" value={`${statsRef.current.duplicates}`} />
            <Metric label="Skipped spaces" value={`${statsRef.current.skippedSpaces}`} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <button
              onClick={() => {
                statsRef.current = { steps: 0, inserts: 0, substitutes: 0, duplicates: 0, skippedSpaces: 0, lastDelayMs: 0, avgDelayMs: 0 };
                forceStatsTick((x) => x + 1);
              }}
              style={{ fontSize: '1rem', padding: '10px 14px', borderRadius: 10, border: '1px solid #2a3140', background: '#131a26', color: '#E6EDF3' }}
            >
              Reset metrics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: 12, borderRadius: 12, border: '1px solid #2a3140', background: 'rgba(255,255,255,0.03)', color: '#E6EDF3' }}>
      <span style={{ fontSize: 12, opacity: 0.65 }}>{props.label}</span>
      <span style={{ fontSize: 18, fontWeight: 800 }}>{props.value}</span>
    </div>
  );
}


