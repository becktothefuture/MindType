/*╔══════════════════════════════════════════════════════════╗
  ║  ░  MAIN  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Band-swap noise-cluster animation demo; Band-swap animation tokens
  • WHY  ▸ REQ-BAND-SWAP, CONTRACT-BAND-SWAP
  • HOW  ▸ See linked contracts and guides in docs
*/

// Animation configuration
const DEFAULT_TOKENS = {
  bandSpeed: 0.15,        // Band movement speed (playhead)
  bandSize: 12,           // Band size in characters
  bandMix: 80,            // Character swap probability %
  noiseFPS: 15,           // Noise evolution speed in FPS
  noiseIntensity: 90,     // Noise field strength %
  noiseDensity: 70,       // Noise coverage area %
  autoplay: true,         // Automatic band movement
  playhead: 0             // Manual band position %
};

// Braille symbols for the noise effect
const DEFAULT_SYMBOLS = [
  '⠁', '⠂', '⠃', '⠄', '⠅', '⠆', '⠇', '⠈', '⠉', '⠊', '⠋', '⠌', '⠍', '⠎', '⠏',
  '⠐', '⠑', '⠒', '⠓', '⠔', '⠕', '⠖', '⠗', '⠘', '⠙', '⠚', '⠛', '⠜', '⠝', '⠞', '⠟',
  '⠠', '⠡', '⠢', '⠣', '⠤', '⠥', '⠦', '⠧', '⠨', '⠩', '⠪', '⠫', '⠬', '⠭', '⠮', '⠯',
  '⠰', '⠱', '⠲', '⠳', '⠴', '⠵', '⠶', '⠷', '⠸', '⠹', '⠺', '⠻', '⠼', '⠽', '⠾', '⠿'
];

const textElements = document.querySelectorAll('[data-mt]');
const state = { ...DEFAULT_TOKENS };

let rafId = 0;
let running = false;
let originalText = '';
let textChars = [];
let currentText = [];
let lastNoiseFrame = 0;
let bandHighlight = null;

// Track band info for testing
let lastBandInfo = { start: 0, end: 0, center: 0 };
let lastSamplePoint = { x: 0, y: 0 };

function initializeText() {
  if (!textElements.length) return;
  
  // Get the original text and convert to character array
  const textEl = textElements[0]; // Focus on first text element
  originalText = (textEl.textContent || '').trim();
  textChars = [...originalText];
  currentText = [...originalText]; // Track current state
  
  // Update the element with trimmed text
  textEl.textContent = originalText;
  
  // Store original for restoration
  textEl.dataset.originalText = originalText;
  
  // Create band highlight element
  createBandHighlight();
}

function createBandHighlight() {
  if (!textElements.length) return;
  
  const textEl = textElements[0];
  const container = textEl.parentElement;
  
  // Create highlight element
  bandHighlight = document.createElement('div');
  bandHighlight.className = 'band-highlight';
  bandHighlight.setAttribute('aria-hidden', 'true');
  
  // Insert before text element
  container.insertBefore(bandHighlight, textEl);
}

function updateBandHighlight(start, end) {
  if (!bandHighlight || !textElements.length) return;
  
  const textEl = textElements[0];
  const rect = textEl.getBoundingClientRect();
  const containerRect = textEl.parentElement.getBoundingClientRect();
  
  // Approximate character width (rough estimation)
  const charWidth = rect.width / originalText.length;
  const charHeight = parseFloat(getComputedStyle(textEl).fontSize) * 1.2;
  
  // Calculate highlight position
  const highlightLeft = start * charWidth;
  const highlightWidth = Math.max(charWidth, (end - start + 1) * charWidth);
  
  // Position relative to container
  bandHighlight.style.left = `${highlightLeft}px`;
  bandHighlight.style.top = `${rect.top - containerRect.top - 4}px`;
  bandHighlight.style.width = `${highlightWidth}px`;
  bandHighlight.style.height = `${charHeight + 8}px`;
}

function drawFrame() {
  if (!textElements.length || !textChars.length) return;
  
  const now = performance.now();
  const textEl = textElements[0];
  
  // Calculate noise frame based on FPS
  const noiseFrameTime = 1000 / state.noiseFPS; // Convert FPS to milliseconds
  const currentNoiseFrame = Math.floor(now / noiseFrameTime);
  
  // Only update noise on new frames to maintain consistent FPS
  const shouldUpdateNoise = currentNoiseFrame !== lastNoiseFrame;
  lastNoiseFrame = currentNoiseFrame;
  
  // Band position calculation (separate from noise)
  const play = state.autoplay
    ? (now * state.bandSpeed * 0.001) % 1
    : state.playhead / 100;
  
  // Band moves through the entire paragraph
  const maxChars = textChars.length;
  const bandCenter = Math.floor(play * maxChars);
  const half = Math.max(1, Math.floor(state.bandSize / 2));
  const start = Math.max(0, bandCenter - half);
  const end = Math.min(maxChars - 1, bandCenter + half);
  
  lastBandInfo = { start, end, center: bandCenter };
  
  // Update visual band highlight
  updateBandHighlight(start, end);
  
  // First, restore all characters to original state
  for (let i = 0; i < maxChars; i++) {
    currentText[i] = textChars[i];
  }
  
  // Apply character swapping only within the current band
  for (let i = 0; i < maxChars; i++) {
    const originalChar = textChars[i];
    if (!originalChar || originalChar === ' ') continue;
    
    const inBand = i >= start && i <= end;
    
    if (inBand && shouldUpdateNoise) {
      // Noise calculation for character swapping
      const mix = state.bandMix / 100;
      const noiseTime = currentNoiseFrame * 0.1; // Use frame-based time
      const noiseIntensity = state.noiseIntensity / 100;
      const noiseDensity = state.noiseDensity / 100;
      
      // Simple time-based noise for variation
      const timeNoise = Math.sin(noiseTime + i * 0.1) * 0.5 + 0.5;
      
      // Calculate final swap probability (much more direct)
      const baseProbability = mix * noiseDensity * noiseIntensity;
      const finalProbability = baseProbability * timeNoise;
      const shouldSwap = Math.random() < finalProbability;
      
      if (shouldSwap) {
        // Select braille symbol based on noise
        const symbolNoise = Math.sin(noiseTime * 4 + i * 0.15) * 0.5 + 0.5;
        const symbolIndex = Math.floor(symbolNoise * DEFAULT_SYMBOLS.length);
        currentText[i] = DEFAULT_SYMBOLS[symbolIndex];
      }
    }
  }
  
  // Update DOM only if text changed (performance optimization)
  const newTextString = currentText.join('');
  if (textEl.textContent !== newTextString) {
    textEl.textContent = newTextString;
  }
  
  // Update sample point for testing (approximate center of band)
  const midIdx = Math.min(end, Math.max(start, bandCenter));
  lastSamplePoint = { x: midIdx * 20, y: 50 }; // Approximate positioning
}



function loop() {
  if (!running) return;
  drawFrame();
  rafId = requestAnimationFrame(loop);
}

function start() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (running) return;
  running = true;
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  cancelAnimationFrame(rafId);
}

function onResize() {
  // No layout measurement needed for direct text manipulation
  drawFrame();
}

function buildPanel() {
  const panel = document.getElementById('mt-panel');
  panel.innerHTML = '';
  
  // Add title
  const title = document.createElement('h3');
  title.textContent = 'Animation Controls';
  panel.appendChild(title);
  
  const controls = [
    { label: 'Band Speed', key: 'bandSpeed', type: 'range', min: 0, max: 1, step: 0.01, desc: 'Band movement speed (playhead)' },
    { label: 'Band Size', key: 'bandSize', type: 'range', min: 1, max: 20, step: 1, desc: 'Band size in characters' },
    { label: 'Band Mix', key: 'bandMix', type: 'range', min: 0, max: 100, step: 1, desc: 'Character swap probability %' },
    { label: 'Noise FPS', key: 'noiseFPS', type: 'range', min: 1, max: 60, step: 1, desc: 'Noise evolution speed in FPS' },
    { label: 'Noise Intensity', key: 'noiseIntensity', type: 'range', min: 0, max: 100, step: 1, desc: 'Noise field strength %' },
    { label: 'Noise Density', key: 'noiseDensity', type: 'range', min: 0, max: 100, step: 1, desc: 'Noise coverage area %' },
    { label: 'Autoplay', key: 'autoplay', type: 'checkbox', desc: 'Automatic band movement' },
    { label: 'Position', key: 'playhead', type: 'range', min: 0, max: 100, step: 1, desc: 'Manual band position %' },
  ];
  
  for (const c of controls) {
    const row = document.createElement('div');
    row.className = 'mt-row';
    
    const labelContainer = document.createElement('div');
    labelContainer.style.display = 'flex';
    labelContainer.style.flexDirection = 'column';
    labelContainer.style.minWidth = '80px';
    
    const label = document.createElement('label');
    label.textContent = c.label;
    labelContainer.appendChild(label);
    
    const input = document.createElement('input');
    input.type = c.type;
    input.title = c.desc;
    
    if (c.type === 'checkbox') {
      input.checked = state[c.key];
      input.addEventListener('change', () => {
        state[c.key] = input.checked;
        updatePlayheadVisibility();
        if (state.autoplay) start();
        else stop();
        drawFrame();
      });
    } else {
      input.min = String(c.min);
      input.max = String(c.max);
      input.step = String(c.step);
      input.value = String(state[c.key]);
      
      // Add value display
      const valueDisplay = document.createElement('span');
      valueDisplay.style.fontSize = '0.8rem';
      valueDisplay.style.color = '#64748b';
      valueDisplay.style.minWidth = '40px';
      valueDisplay.style.textAlign = 'right';
      
      const updateValue = () => {
        const v = Number(input.value);
        state[c.key] = v;
        valueDisplay.textContent = c.key === 'bandSpeed' ? v.toFixed(1) : String(v);
        if (!state.autoplay && c.key !== 'playhead') return;
        drawFrame();
      };
      
      input.addEventListener('input', updateValue);
      updateValue();
      
      const inputContainer = document.createElement('div');
      inputContainer.style.display = 'flex';
      inputContainer.style.alignItems = 'center';
      inputContainer.style.gap = '0.5rem';
      inputContainer.style.flex = '1';
      inputContainer.appendChild(input);
      inputContainer.appendChild(valueDisplay);
      
      row.appendChild(labelContainer);
      row.appendChild(inputContainer);
      panel.appendChild(row);
      continue;
    }
    
    row.appendChild(labelContainer);
    row.appendChild(input);
    panel.appendChild(row);
  }
  
  updatePlayheadVisibility();
}

function updatePlayheadVisibility() {
  const playheadRow = document.querySelector('.mt-row:last-child');
  if (playheadRow) {
    playheadRow.style.opacity = state.autoplay ? '0.5' : '1';
    playheadRow.style.pointerEvents = state.autoplay ? 'none' : 'auto';
  }
}

function setupIOPause() {
  const io = new IntersectionObserver((entries) => {
    const anyVisible = entries.some(e => e.isIntersecting);
    if (anyVisible) start();
    else stop();
  });
  textElements.forEach(el => io.observe(el));
}

window.addEventListener('resize', onResize);
window.addEventListener('load', () => {
  // Ensure text elements are visible
  textElements.forEach(el => {
    el.style.opacity = '1';
    el.style.visibility = 'visible';
  });
  
  initializeText();
  buildPanel();
  setupIOPause();
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && e.target === document.body) {
      e.preventDefault();
      state.autoplay = !state.autoplay;
      const checkbox = document.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.checked = state.autoplay;
      updatePlayheadVisibility();
      if (state.autoplay) start();
      else stop();
    }
  });
  
  if (state.autoplay) start();
  else drawFrame();
});

// Expose debug hooks for tests
window.bandSwap = {
  getBandInfo: () => ({ ...lastBandInfo }),
  getSamplePoint: () => ({ ...lastSamplePoint }),
  state,
};
