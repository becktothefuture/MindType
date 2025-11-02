/*╔══════════════════════════════════════════════════════╗
  ║  ░  P L A Y G R O U N D   V 0 . 6  ░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ v0.6 Playground: Correction Wave demo with LM-only pipeline
  • WHY  ▸ Showcase revolutionary typing intelligence with controls
  • HOW  ▸ Single textarea + overlay + controls for AR/tone/thresholds
*/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LMAdapterV06 } from '../../core/lm/adapter_v06';
import { runCorrectionWave } from '../../core/correctionWave_v06';
import { getActiveRegionWords, setActiveRegionWords, getConfidenceThresholds, setConfidenceThresholds } from '../../config/defaultThresholds';
import type { ToneTarget } from '../../engines/toneTransformer_v06';
import './App.css';

interface PlaygroundState {
  text: string;
  caret: number;
  activeRegionWords: number;
  toneTarget: ToneTarget;
  thresholds: {
    τ_input: number;
    τ_commit: number;
    τ_tone: number;
  };
  lmStatus: 'initializing' | 'ready' | 'error';
  lmError?: string;
}

export default function PlaygroundV06() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lmAdapterRef = useRef<LMAdapterV06 | null>(null);
  
  const [state, setState] = useState<PlaygroundState>({
    text: 'Type here to see the Correction Wave in action. Try typing with some typos and watch the LM-only pipeline correct them behind your cursor.',
    caret: 0,
    activeRegionWords: getActiveRegionWords(),
    toneTarget: 'None',
    thresholds: getConfidenceThresholds(),
    lmStatus: 'initializing',
  });

  // Initialize LM adapter
  useEffect(() => {
    const initLM = async () => {
      try {
        const adapter = new LMAdapterV06();
        await adapter.init();
        lmAdapterRef.current = adapter;
        setState(prev => ({ ...prev, lmStatus: 'ready' }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          lmStatus: 'error', 
          lmError: error instanceof Error ? error.message : 'Unknown LM error' 
        }));
      }
    };
    initLM();
  }, []);

  // Handle text changes and trigger correction wave
  const handleTextChange = useCallback(async (newText: string, newCaret: number) => {
    setState(prev => ({ ...prev, text: newText, caret: newCaret }));

    // Trigger correction wave after a pause
    if (lmAdapterRef.current && state.lmStatus === 'ready') {
      try {
        const result = await runCorrectionWave({
          text: newText,
          caret: newCaret,
          lmAdapter: lmAdapterRef.current,
          toneTarget: state.toneTarget,
        });

        // Apply corrections to textarea
        let updatedText = newText;
        for (const diff of result.diffs.reverse()) { // Apply right-to-left to preserve indices
          updatedText = updatedText.slice(0, diff.start) + diff.text + updatedText.slice(diff.end);
        }

        if (updatedText !== newText && textareaRef.current) {
          textareaRef.current.value = updatedText;
          setState(prev => ({ ...prev, text: updatedText }));
        }

        // Update active region overlay
        updateActiveRegionOverlay(result.activeRegion);
      } catch (error) {
        console.warn('Correction wave error:', error);
      }
    }
  }, [state.lmStatus, state.toneTarget]);

  // Update active region visual overlay
  const updateActiveRegionOverlay = useCallback((region: { start: number; end: number }) => {
    if (!overlayRef.current || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    
    // Clear previous highlights
    overlay.innerHTML = '';
    
    if (region.start < region.end) {
      // Create highlight span for active region
      const span = document.createElement('span');
      span.className = 'active-region-highlight';
      span.textContent = state.text.slice(region.start, region.end);
      
      // Position the highlight (simplified positioning)
      span.style.position = 'absolute';
      span.style.backgroundColor = 'rgba(60, 197, 204, 0.2)';
      span.style.borderRadius = '2px';
      span.style.pointerEvents = 'none';
      
      overlay.appendChild(span);
    }
  }, [state.text]);

  // Control handlers
  const handleActiveRegionChange = (words: number) => {
    setActiveRegionWords(words);
    setState(prev => ({ ...prev, activeRegionWords: words }));
  };

  const handleToneChange = (tone: ToneTarget) => {
    setState(prev => ({ ...prev, toneTarget: tone }));
  };

  const handleThresholdChange = (key: keyof typeof state.thresholds, value: number) => {
    const newThresholds = { ...state.thresholds, [key]: value };
    setConfidenceThresholds(newThresholds);
    setState(prev => ({ ...prev, thresholds: newThresholds }));
  };

  const restartLM = async () => {
    setState(prev => ({ ...prev, lmStatus: 'initializing', lmError: undefined }));
    try {
      const adapter = new LMAdapterV06();
      await adapter.init();
      lmAdapterRef.current = adapter;
      setState(prev => ({ ...prev, lmStatus: 'ready' }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        lmStatus: 'error', 
        lmError: error instanceof Error ? error.message : 'Unknown LM error' 
      }));
    }
  };

  return (
    <div className="playground-v06">
      <header className="playground-header">
        <h1>Mind⠶Flow v0.6 Playground</h1>
        <p>Revolutionary Typing Intelligence • LM-only Pipeline • Single Active Region</p>
      </header>

      <main className="playground-main">
        <div className="editor-section">
          <div className="editor-container">
            <textarea
              ref={textareaRef}
              className="playground-textarea"
              value={state.text}
              onChange={(e) => {
                const newCaret = e.target.selectionStart;
                handleTextChange(e.target.value, newCaret);
              }}
              onSelect={(e) => {
                const newCaret = e.currentTarget.selectionStart;
                setState(prev => ({ ...prev, caret: newCaret }));
              }}
              placeholder="Type here to experience the Correction Wave..."
              rows={12}
            />
            <div ref={overlayRef} className="editor-overlay" />
          </div>

          <div className="lm-status">
            {state.lmStatus === 'initializing' && (
              <div className="status-initializing">🔄 Initializing LM...</div>
            )}
            {state.lmStatus === 'ready' && (
              <div className="status-ready">✅ LM Ready</div>
            )}
            {state.lmStatus === 'error' && (
              <div className="status-error">
                ❌ LM Error: {state.lmError}
                <button onClick={restartLM} className="restart-btn">Restart</button>
              </div>
            )}
          </div>
        </div>

        <div className="controls-section">
          <h3>Correction Wave Controls</h3>
          
          <div className="control-group">
            <label>Active Region Size: {state.activeRegionWords} words</label>
            <input
              type="range"
              min="5"
              max="50"
              value={state.activeRegionWords}
              onChange={(e) => handleActiveRegionChange(Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label>Tone Target</label>
            <select 
              value={state.toneTarget} 
              onChange={(e) => handleToneChange(e.target.value as ToneTarget)}
            >
              <option value="None">None (default)</option>
              <option value="Casual">Casual</option>
              <option value="Professional">Professional</option>
            </select>
          </div>

          <div className="control-group">
            <label>τ_input: {state.thresholds.τ_input.toFixed(2)}</label>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={state.thresholds.τ_input}
              onChange={(e) => handleThresholdChange('τ_input', Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label>τ_commit: {state.thresholds.τ_commit.toFixed(2)}</label>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={state.thresholds.τ_commit}
              onChange={(e) => handleThresholdChange('τ_commit', Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label>τ_tone: {state.thresholds.τ_tone.toFixed(2)}</label>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={state.thresholds.τ_tone}
              onChange={(e) => handleThresholdChange('τ_tone', Number(e.target.value))}
            />
          </div>
        </div>
      </main>

      <style jsx>{`
        .playground-v06 {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family: 'Geist Sans', system-ui, sans-serif;
        }

        .playground-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .playground-header h1 {
          font-size: 2.5rem;
          margin: 0;
          color: #111;
        }

        .playground-header p {
          color: #666;
          margin: 0.5rem 0 0 0;
        }

        .playground-main {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }

        .editor-container {
          position: relative;
        }

        .playground-textarea {
          width: 100%;
          padding: 1rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-family: 'Geist Mono', monospace;
          font-size: 1rem;
          line-height: 1.5;
          resize: vertical;
        }

        .playground-textarea:focus {
          outline: none;
          border-color: #3cc5cc;
        }

        .editor-overlay {
          position: absolute;
          top: 1rem;
          left: 1rem;
          pointer-events: none;
          z-index: 1;
        }

        .active-region-highlight {
          background: rgba(60, 197, 204, 0.2);
          border-radius: 2px;
          padding: 0 2px;
        }

        .lm-status {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .status-ready {
          background: #e8f5e8;
          color: #1b5e20;
        }

        .status-error {
          background: #ffebee;
          color: #c62828;
        }

        .status-initializing {
          background: #fff8e1;
          color: #e65100;
        }

        .restart-btn {
          margin-left: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: #3cc5cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .controls-section {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
        }

        .controls-section h3 {
          margin: 0 0 1rem 0;
          color: #333;
        }

        .control-group {
          margin-bottom: 1rem;
        }

        .control-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #555;
        }

        .control-group input[type="range"] {
          width: 100%;
        }

        .control-group select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

