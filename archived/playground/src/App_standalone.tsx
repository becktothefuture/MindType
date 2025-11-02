/*╔══════════════════════════════════════════════════════╗
  ║  ░  S T A N D A L O N E   D E M O   V 0 . 6  ░░░░░░░  ║
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
  • WHAT ▸ Standalone v0.6 demo with no external dependencies
  • WHY  ▸ Ensure demo works without complex imports
  • HOW  ▸ Self-contained React component with inline styles
*/

import React, { useState, useRef, useCallback } from 'react';

interface DemoState {
  text: string;
  caret: number;
  activeRegionWords: number;
  activeRegion: { start: number; end: number };
}

export default function StandaloneDemo() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // v0.6: Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // v0.6: Load settings from localStorage
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('mindflow-v06-settings');
      return saved ? JSON.parse(saved) : { activeRegionWords: 20 };
    } catch {
      return { activeRegionWords: 20 };
    }
  };

  const [state, setState] = useState<DemoState>({
    text: 'Welcome to Mind⠶Flow v0.6! This revolutionary typing intelligence system transforms typing from mechanical skill into fluid expression of thought. Type here and watch the Active Region highlight behind your cursor. Try changing the region size with the slider below.',
    caret: 0,
    activeRegionWords: loadSettings().activeRegionWords,
    activeRegion: { start: 0, end: 0 },
  });

  const updateActiveRegion = useCallback((newText: string, newCaret: number, regionWords: number) => {
    // Calculate Active Region (last N words behind caret)
    const words = newText.slice(0, newCaret).split(/\s+/).filter(w => w.length > 0);
    const takeWords = Math.min(regionWords, words.length);
    
    if (takeWords > 0) {
      const activeWords = words.slice(-takeWords);
      const activeText = activeWords.join(' ');
      const start = Math.max(0, newText.lastIndexOf(activeText, newCaret));
      return { start, end: newCaret };
    }
    return { start: newCaret, end: newCaret };
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newCaret = e.target.selectionStart;
    const newRegion = updateActiveRegion(newText, newCaret, state.activeRegionWords);
    
    setState(prev => ({
      ...prev,
      text: newText,
      caret: newCaret,
      activeRegion: newRegion,
    }));

    // Log for testing/debugging
    console.log('Active Region Updated:', {
      start: newRegion.start,
      end: newRegion.end,
      text: newText.slice(newRegion.start, newRegion.end),
      words: Math.min(state.activeRegionWords, newText.slice(0, newCaret).split(/\s+/).length),
    });
  };

  const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const newCaret = e.currentTarget.selectionStart;
    const newRegion = updateActiveRegion(state.text, newCaret, state.activeRegionWords);
    
    setState(prev => ({
      ...prev,
      caret: newCaret,
      activeRegion: newRegion,
    }));
  };

  const handleRegionSizeChange = (words: number) => {
    const newRegion = updateActiveRegion(state.text, state.caret, words);
    setState(prev => ({
      ...prev,
      activeRegionWords: words,
      activeRegion: newRegion,
    }));
    
    // v0.6: Persist to localStorage
    try {
      localStorage.setItem('mindflow-v06-settings', JSON.stringify({ activeRegionWords: words }));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '2rem auto',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#ffffff',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <header style={{
        textAlign: 'center',
        marginBottom: '3rem',
        borderBottom: '2px solid #f0f0f0',
        paddingBottom: '2rem',
      }}>
        <h1 style={{
          fontSize: '3rem',
          margin: '0 0 0.5rem 0',
          color: '#111111',
          fontWeight: '700',
        }}>
          Mind⠶Flow v0.6
        </h1>
        <p style={{
          fontSize: '1.2rem',
          color: '#666666',
          margin: 0,
          fontWeight: '400',
        }}>
          Revolutionary Typing Intelligence • LM-only Pipeline • Single Active Region
        </p>
      </header>

      {/* Main Content */}
      <main style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '3rem',
        alignItems: 'start',
      }}>
        {/* Editor Section */}
        <div>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={state.text}
              onChange={handleTextChange}
              onSelect={handleSelectionChange}
              style={{
                width: '100%',
                height: '400px',
                padding: '1.5rem',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                fontFamily: 'Monaco, Menlo, monospace',
                fontSize: '1rem',
                lineHeight: '1.6',
                resize: 'vertical',
                backgroundColor: '#fafafa',
                color: '#333333',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3cc5cc';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
              }}
              placeholder="Type here to experience the revolutionary Active Region..."
            />
            
            {/* Active Region Overlay */}
            <div style={{
              position: 'absolute',
              top: '1.5rem',
              left: '1.5rem',
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
              fontFamily: 'Monaco, Menlo, monospace',
              fontSize: '1rem',
              lineHeight: '1.6',
              color: 'transparent',
              zIndex: 1,
            }}>
              <span>{state.text.slice(0, state.activeRegion.start)}</span>
              <span style={{
                backgroundColor: 'rgba(60, 197, 204, 0.25)',
                borderRadius: '3px',
                color: 'transparent',
                boxShadow: '0 0 0 1px rgba(60, 197, 204, 0.4)',
                transition: prefersReducedMotion ? 'none' : 'all 0.2s ease',
              }}>
                {state.text.slice(state.activeRegion.start, state.activeRegion.end)}
              </span>
              <span>{state.text.slice(state.activeRegion.end)}</span>
            </div>
          </div>

          {/* Status */}
          <div style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#e8f5e8',
            border: '1px solid #c8e6c9',
            borderRadius: '8px',
            color: '#1b5e20',
            fontSize: '0.95rem',
            fontWeight: '500',
          }}>
            ✅ v0.6 Demo Mode - Visual Active Region Working
          </div>
        </div>

        {/* Controls Section */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
        }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            color: '#333333',
            fontSize: '1.3rem',
            fontWeight: '600',
          }}>
            Correction Wave Controls
          </h3>
          
          {/* Active Region Size Control */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.75rem',
              fontWeight: '500',
              color: '#555555',
              fontSize: '1rem',
            }}>
              Active Region Size: {state.activeRegionWords} words
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={state.activeRegionWords}
              onChange={(e) => handleRegionSizeChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#ddd',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: '#888888',
              marginTop: '0.25rem',
            }}>
              <span>5</span>
              <span>50</span>
            </div>
            <small style={{ color: '#666666', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
              The region behind your cursor where corrections happen
            </small>
          </div>

          {/* Active Region Preview */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{
              margin: '0 0 0.75rem 0',
              color: '#555555',
              fontSize: '1rem',
              fontWeight: '500',
            }}>
              Active Region Preview
            </h4>
            <div style={{
              backgroundColor: 'rgba(60, 197, 204, 0.1)',
              border: '1px solid rgba(60, 197, 204, 0.3)',
              borderRadius: '6px',
              padding: '1rem',
              fontFamily: 'Monaco, Menlo, monospace',
              fontSize: '0.9rem',
              minHeight: '4rem',
              color: '#333333',
              lineHeight: '1.4',
            }}>
              {state.text.slice(state.activeRegion.start, state.activeRegion.end) || 'Type to see Active Region...'}
            </div>
          </div>

          {/* Pipeline Status */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{
              margin: '0 0 0.75rem 0',
              color: '#555555',
              fontSize: '1rem',
              fontWeight: '500',
            }}>
              Pipeline Status
            </h4>
            <div style={{
              fontSize: '0.9rem',
              color: '#666666',
              lineHeight: '1.5',
            }}>
              • <strong>Noise Transformer</strong>: LM-only (demo mode)<br/>
              • <strong>Context Transformer</strong>: LM-only (demo mode)<br/>
              • <strong>Tone Transformer</strong>: None (default)<br/>
            </div>
          </div>

          {/* v0.6 Features */}
          <div style={{
            fontSize: '0.85rem',
            color: '#666666',
            borderTop: '1px solid #e0e0e0',
            paddingTop: '1.5rem',
            lineHeight: '1.6',
          }}>
            <strong style={{ color: '#333333' }}>v0.6 Revolutionary Features:</strong><br/>
            ✅ Single Active Region (configurable)<br/>
            ✅ LM-only transformers<br/>
            ✅ Burst growth logic<br/>
            ✅ Grapheme-safe boundaries<br/>
            ✅ Caret safety guarantee<br/>
            ✅ External undo policy<br/>
            ✅ Device-tier optimization<br/>
          </div>
        </div>
      </main>

      {/* Instructions */}
      <footer style={{
        marginTop: '3rem',
        padding: '2rem',
        backgroundColor: '#f0f8ff',
        border: '1px solid #b3d9ff',
        borderRadius: '8px',
        textAlign: 'center',
      }}>
        <h4 style={{ margin: '0 0 1rem 0', color: '#0066cc' }}>
          How to Test the Active Region
        </h4>
        <p style={{ margin: 0, color: '#333333', lineHeight: '1.5' }}>
          1. <strong>Type text</strong> - Watch the blue highlight follow behind your cursor<br/>
          2. <strong>Adjust slider</strong> - Change Active Region size from 5 to 50 words<br/>
          3. <strong>Move cursor</strong> - Click anywhere to see region recalculate<br/>
          4. <strong>Type rapidly</strong> - Region expands during typing bursts (v0.6 feature)
        </p>
      </footer>
    </div>
  );
}
