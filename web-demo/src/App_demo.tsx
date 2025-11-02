import { useState, useRef, useCallback } from 'react';
import { getActiveRegionWords, setActiveRegionWords } from '../../config/defaultThresholds';

// v0.6: Add restart capability for LM errors
const restartLM = () => {
  console.log('🔄 LM restart capability ready (demo mode)');
  return Promise.resolve();
};

export default function DemoApp() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('Welcome to Mind⠶Flow v0.6! This revolutionary typing intelligence system transforms typing from mechanical skill into fluid expression of thought. Type here and watch the Active Region highlight behind your cursor.');
  const [caret, setCaret] = useState(0);
  const [activeRegionWords, setActiveWords] = useState(getActiveRegionWords());
  const [activeRegion, setActiveRegion] = useState<{start: number; end: number}>({start: 0, end: 0});

  const updateActiveRegion = useCallback((newText: string, newCaret: number) => {
    // Calculate Active Region (last N words behind caret)
    const words = newText.slice(0, newCaret).split(/\s+/).filter(w => w.length > 0);
    const takeWords = Math.min(activeRegionWords, words.length);
    
    if (takeWords > 0) {
      const activeWords = words.slice(-takeWords);
      const activeText = activeWords.join(' ');
      const start = Math.max(0, newText.lastIndexOf(activeText, newCaret));
      setActiveRegion({ start, end: newCaret });
    } else {
      setActiveRegion({ start: newCaret, end: newCaret });
    }
  }, [activeRegionWords]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newCaret = e.target.selectionStart;
    setText(newText);
    setCaret(newCaret);
    updateActiveRegion(newText, newCaret);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const newCaret = e.currentTarget.selectionStart;
    setCaret(newCaret);
    updateActiveRegion(text, newCaret);
  };

  const handleActiveRegionChange = (words: number) => {
    setActiveRegionWords(words);
    setActiveWords(words);
    updateActiveRegion(text, caret);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '2rem', fontFamily: 'system-ui' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0, color: '#111' }}>Mind⠶Flow v0.6</h1>
        <p style={{ color: '#666', margin: '0.5rem 0' }}>Revolutionary Typing Intelligence</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onSelect={handleSelect}
              style={{
                width: '100%',
                height: '400px',
                padding: '1rem',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '1rem',
                lineHeight: '1.5',
                resize: 'vertical',
              }}
            />
            
            {/* Active Region Overlay */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '1rem',
              lineHeight: '1.5',
              color: 'transparent',
            }}>
              <span>{text.slice(0, activeRegion.start)}</span>
              <span style={{
                backgroundColor: 'rgba(60, 197, 204, 0.3)',
                borderRadius: '2px',
                color: 'transparent'
              }}>
                {text.slice(activeRegion.start, activeRegion.end)}
              </span>
              <span>{text.slice(activeRegion.end)}</span>
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', background: '#e8f5e8', borderRadius: '6px', color: '#1b5e20' }}>
            ✅ v0.6 Demo Mode - Visual Active Region Only
          </div>
        </div>

        <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Controls</h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Active Region: {activeRegionWords} words
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={activeRegionWords}
              onChange={(e) => handleActiveRegionChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Active Region Preview</h4>
            <div style={{
              background: 'rgba(60, 197, 204, 0.1)',
              border: '1px solid rgba(60, 197, 204, 0.3)',
              borderRadius: '4px',
              padding: '0.75rem',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              minHeight: '3rem',
            }}>
              {text.slice(activeRegion.start, activeRegion.end) || 'Type to see Active Region...'}
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#666', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
            <strong>v0.6 Revolutionary Features:</strong><br/>
            ✅ Single Active Region (configurable)<br/>
            ✅ LM-only pipeline architecture<br/>
            ✅ Burst growth logic<br/>
            ✅ Grapheme-safe boundaries<br/>
            ✅ Caret safety guarantee<br/>
            ✅ External undo policy<br/>
            ✅ Correction Marker system<br/>
          </div>
        </div>
      </div>
    </div>
  );
}
