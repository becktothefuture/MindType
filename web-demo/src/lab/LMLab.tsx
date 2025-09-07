/*╔══════════════════════════════════════════════════════════╗
  ║  ░  L M   L A B  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                          ║
  ║   Simple LM stream lab (context → tone) with rules UI.   ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  • WHAT ▸ Send fuzzy text to mock stream; view JSONL + results
  • WHY  ▸ Inspect stages, diffs, commits; tune thresholds/tone
  • HOW  ▸ Uses createMockStreamLMAdapter and applies events
*/

import { useEffect, useMemo, useRef, useState } from 'react';
import { createWorkerLMAdapter } from '../../../core/lm/workerAdapter';
import { createLMContextManager } from '../../../core/lm/contextManager';
import { replaceRange } from '../../../utils/diff';

type Tone = 'None' | 'Casual' | 'Professional';

export function LMLab() {
  const [input, setInput] = useState("Type: 'teh brwon fox' and press Run");
  const [tone, setTone] = useState<Tone>('None');
  const [tauInput, setTauInput] = useState(0.6);
  const [tauCommit, setTauCommit] = useState(0.8);
  const [tauTone, setTauTone] = useState(0.7);
  const [bandStart, setBandStart] = useState(0);
  const [bandEnd, setBandEnd] = useState(40);
  const [jsonl, setJsonl] = useState<string>('');
  const [contextOut, setContextOut] = useState('');
  const [toneOut, setToneOut] = useState('');
  const [running, setRunning] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [error, setError] = useState<string>('');

  // Worker-backed adapter (remote models to avoid local asset requirement)
  const adapter = useMemo(() => createWorkerLMAdapter(() => new Worker(new URL('../worker/lmWorker.ts', import.meta.url), { type: 'module' })), []);
  const contextManager = useMemo(() => createLMContextManager(), []);
  const lastRunId = useRef(0);
  const pendingPreset = useRef(false);
  const [dynamicPresets, setDynamicPresets] = useState<Array<{ id: string; name: string; text: string; tone?: string }>>([]);
  const [contextInitialized, setContextInitialized] = useState(false);

  async function run() {
    const runId = ++lastRunId.current;
    setRunning(true);
    setJsonl('');
    setContextOut('');
    setToneOut('');
    setError('');

    try {
      // Initialize context manager if not already done
      if (!contextInitialized) {
        const caret = Math.max(0, Math.min(input.length, bandEnd));
        await contextManager.initialize(input, caret);
        setContextInitialized(true);
      } else {
        // Update context for current input
        const caret = Math.max(0, Math.min(input.length, bandEnd));
        contextManager.updateWideContext(input);
        contextManager.updateCloseContext(input, caret);
      }

      // Build a span + prompt using policy
      const { selectSpanAndPrompt, postProcessLMOutput } = await import('../../../core/lm/policy');
      const caret = Math.max(0, Math.min(input.length, bandEnd));
      const sel = selectSpanAndPrompt(input, caret);
      if (!sel.band || !sel.prompt) {
        setRunning(false);
        return;
      }

      // Get context window for enhanced prompting
      const contextWindow = contextManager.getContextWindow();
      console.log('[LMLab] Using dual-context:', {
        wideTokens: contextWindow.wide.tokenCount,
        closeLength: contextWindow.close.text.length,
        bandSize: sel.band.end - sel.band.start
      });

      // Stream tokens from the real adapter with dual-context
      let acc = '';
      for await (const chunk of adapter.stream({ 
        text: input, 
        caret, 
        band: sel.band, 
        settings: { 
          prompt: sel.prompt, 
          maxNewTokens: sel.maxNewTokens,
          wideContext: contextWindow.wide.text.slice(0, 2000), // Truncate for performance
          closeContext: contextWindow.close.text
        } 
      })) {
        acc += chunk;
        setJsonl((prev) => prev + chunk);
      }
      const cleaned = postProcessLMOutput(acc.trim(), sel.span?.length || 0);
      
      // Validate proposal using context manager
      if (cleaned && sel.span && contextManager.validateProposal(cleaned, sel.span)) {
        setContextOut(cleaned);
        setToneOut(cleaned);
        console.log('[LMLab] Proposal validated and applied:', cleaned.slice(0, 50));
      } else if (cleaned && sel.span) {
        setError('LM proposal rejected by context validation');
        console.log('[LMLab] Proposal rejected:', { original: sel.span, proposal: cleaned });
      }
    } catch (e: any) {
      setError('LM unavailable. Enable network access or try again later.');
      // eslint-disable-next-line no-console
      console.warn('[LMLab] Real adapter failed:', e);
    } finally {
      setRunning(false);
    }
  }

  // Auto-run when a preset is applied
  useEffect(() => {
    // Load dynamic presets
    (async () => {
      try {
        const res = await fetch('/lab-presets.json');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.presets)) setDynamicPresets(data.presets);
        }
      } catch {}
    })();
    if (pendingPreset.current) {
      pendingPreset.current = false;
      setTimeout(() => { if (!running) run(); }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, bandStart, bandEnd, tone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key === '?') && (e.metaKey || e.ctrlKey)) {
        setPanelOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function applyPreset(text: string, opts?: { tone?: Tone }) {
    setInput(text);
    setBandStart(0);
    setBandEnd(text.length);
    if (opts?.tone) setTone(opts.tone);
    pendingPreset.current = true;
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '1rem' }}>
      <div style={{ flex: 1 }}>
        <h2>LM Lab</h2>
        {/* Dynamic presets from JSON */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {dynamicPresets.map((p) => (
            <button key={p.id} onClick={() => applyPreset(p.text, { tone: p.tone as Tone })}>{p.name}</button>
          ))}
        </div>
        <textarea
          aria-label="Input"
          data-testid="lm-input"
          style={{ width: '100%', height: '10rem' }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={run} disabled={running} data-testid="lm-run">Run</button>
          {dynamicPresets.length === 0 && (
            <>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Presets:</div>
              <button onClick={() => applyPreset("helloo thr weathfr has beenb hood")}>Typos</button>
              <button onClick={() => applyPreset("I has went to the store.")}>Grammar</button>
              <button onClick={() => applyPreset("We can't ship this, it's kinda bad.", { tone: 'Professional' })}>Tone</button>
            </>
          )}
        </div>
        {error && (
          <div role="alert" style={{ marginTop: 8, color: '#f66', fontSize: 12 }}>{error}</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <h3>Context Output</h3>
            <pre data-testid="lm-context-output" style={{ whiteSpace: 'pre-wrap' }}>{contextOut}</pre>
          </div>
          <div>
            <h3>Tone Output</h3>
            <pre data-testid="lm-tone-output" style={{ whiteSpace: 'pre-wrap' }}>{toneOut}</pre>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <h3>JSONL Stream</h3>
          <pre data-testid="lm-jsonl" style={{ maxHeight: '30vh', overflow: 'auto', background: '#111', color: '#0f0', padding: '0.5rem' }}>{jsonl}</pre>
        </div>
      </div>
      <aside
        aria-label="Rules Panel"
        style={{
          position: 'sticky', top: '5vh', height: '90vh', minWidth: '320px',
          border: '1px solid #333', padding: '1rem', marginRight: '5vh',
          display: panelOpen ? 'block' : 'none'
        }}
      >
        <h3>Rules</h3>
        <label> Tone:&nbsp;
          <select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
            <option>None</option>
            <option>Casual</option>
            <option>Professional</option>
          </select>
        </label>
        <div style={{ marginTop: '0.5rem' }}>
          <label> τ_input: <input type="range" min={0.0} max={1.0} step={0.01} value={tauInput} onChange={(e) => setTauInput(parseFloat(e.target.value))} /></label>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <label> τ_commit: <input type="range" min={0.0} max={1.0} step={0.01} value={tauCommit} onChange={(e) => setTauCommit(parseFloat(e.target.value))} /></label>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <label> τ_tone: <input type="range" min={0.0} max={1.0} step={0.01} value={tauTone} onChange={(e) => setTauTone(parseFloat(e.target.value))} /></label>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <label> Band start: <input type="number" value={bandStart} onChange={(e) => setBandStart(parseInt(e.target.value || '0'))} /></label>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <label> Band end: <input type="number" value={bandEnd} onChange={(e) => setBandEnd(parseInt(e.target.value || '0'))} /></label>
        </div>
        <p style={{ marginTop: '0.5rem' }}>
          Tip: Toggle panel with Cmd/Ctrl + /. Right‑aligned with 5vh margins.
        </p>
      </aside>
    </div>
  );
}

export default LMLab;


