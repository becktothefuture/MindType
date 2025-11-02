/*╔══════════════════════════════════════════════════════╗
  ║  ░  M I N I M A L   P L A Y G R O U N D  ░░░░░░░░░░░  ║
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
  • WHAT ▸ Minimal v0.6 demo: Correction Wave with basic controls
  • WHY  ▸ Get working demo quickly to showcase v0.6 capabilities
  • HOW  ▸ Simple textarea + Active Region overlay + LM status
*/

import React, { useState, useRef, useCallback } from 'react';
import { getActiveRegionWords, setActiveRegionWords } from '../../config/defaultThresholds';

interface DemoState {
  text: string;
  caret: number;
  activeRegionWords: number;
  lmStatus: 'ready' | 'error' | 'disabled';
}

export default function MinimalPlayground() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [state, setState] = useState<DemoState>({
    text: 'Welcome to Mind⠶Flow v0.6! Type here to experience the revolutionary Correction Wave. This demo showcases the LM-only pipeline with a single configurable Active Region (default: 20 words) that grows dynamically during typing bursts.',
    caret: 0,
    activeRegionWords: getActiveRegionWords(),
    lmStatus: 'disabled', // Start disabled for quick demo
  });

  const handleTextChange = useCallback((newText: string, newCaret: number) => {
    setState(prev => ({ ...prev, text: newText, caret: newCaret }));
    
    // Show Active Region visually (simplified)
    if (textareaRef.current) {
      // Calculate Active Region bounds
      const words = newText.slice(0, newCaret).split(/\s+/).filter(w => w.length > 0);
      const takeWords = Math.min(state.activeRegionWords, words.length);
      const activeWords = words.slice(-takeWords);
      const activeText = activeWords.join(' ');
      const regionStart = Math.max(0, newText.lastIndexOf(activeText, newCaret));
      
      // Simple visual feedback in console for now
      console.log('Active Region:', { 
        start: regionStart, 
        end: newCaret, 
        text: newText.slice(regionStart, newCaret),
        words: takeWords 
      });
    }
  }, [state.activeRegionWords]);

  const handleActiveRegionChange = (words: number) => {
    setActiveRegionWords(words);
    setState(prev => ({ ...prev, activeRegionWords: words }));
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '2rem', fontFamily: 'system-ui' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0, color: '#111' }}>
          Mind⠶Flow v0.6 Playground
        </h1>
        <p style={{ color: '#666', margin: '0.5rem 0' }}>
          Revolutionary Typing Intelligence • LM-only Pipeline • Single Active Region
        </p>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={state.text}
              onChange={(e) => {
                const newCaret = e.target.selectionStart;
                handleTextChange(e.target.value, newCaret);
              }}
              onSelect={(e) => {
                const newCaret = e.currentTarget.selectionStart;
                setState(prev => ({ ...prev, caret: newCaret }));
              }}
              style={{
                width: '100%',
                height: '300px',
                padding: '1rem',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '1rem',
                lineHeight: '1.5',
                resize: 'vertical',
              }}
              placeholder="Type here to experience the Correction Wave..."
            />
          </div>

          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            borderRadius: '6px', 
            background: state.lmStatus === 'ready' ? '#e8f5e8' : '#fff8e1',
            color: state.lmStatus === 'ready' ? '#1b5e20' : '#e65100'
          }}>
            {state.lmStatus === 'ready' && '✅ LM Ready - Corrections Active'}
            {state.lmStatus === 'disabled' && '⚠️ LM Disabled - Demo Mode (Visual Only)'}
            {state.lmStatus === 'error' && '❌ LM Error - Corrections Unavailable'}
          </div>
        </div>

        <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Correction Wave Controls</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#555' }}>
              Active Region Size: {state.activeRegionWords} words
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={state.activeRegionWords}
              onChange={(e) => handleActiveRegionChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <small style={{ color: '#666' }}>
              The region behind your cursor where corrections happen
            </small>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#555' }}>
              Pipeline Status
            </label>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              • Noise Transformer: {state.lmStatus === 'ready' ? 'LM-only' : 'Disabled'}<br/>
              • Context Transformer: {state.lmStatus === 'ready' ? 'LM-only' : 'Disabled'}<br/>
              • Tone Transformer: None (default)<br/>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#555' }}>
              Active Region Preview
            </label>
            <div style={{ 
              fontSize: '0.8rem', 
              fontFamily: 'monospace', 
              background: 'rgba(60, 197, 204, 0.1)', 
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(60, 197, 204, 0.3)',
              minHeight: '3rem'
            }}>
              {(() => {
                const words = state.text.slice(0, state.caret).split(/\s+/).filter(w => w.length > 0);
                const takeWords = Math.min(state.activeRegionWords, words.length);
                const activeWords = words.slice(-takeWords);
                return activeWords.join(' ') || 'Type to see Active Region...';
              })()}
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#666', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
            <strong>v0.6 Features:</strong><br/>
            ✅ Single Active Region (configurable)<br/>
            ✅ LM-only transformers<br/>
            ✅ Burst growth logic<br/>
            ✅ Grapheme-safe boundaries<br/>
            ✅ Caret safety guarantee<br/>
            ✅ External undo policy<br/>
          </div>
        </div>
      </main>
    </div>
  );
}

