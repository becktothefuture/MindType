/*╔══════════════════════════════════════════════════════════╗
  ║  ░  BAND-SWAP NOISE WAVE DEMO  ░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Noise wave animation that travels line-by-line through text
  • WHY  ▸ Demonstrate living text with dynamic character swapping
  • HOW  ▸ Line-by-line wave movement with 10fps noise evolution
*/

// Animation configuration with comprehensive controls
const DEFAULTS = {
  // Wave movement
  waveSpeed: 0.5,           // Speed of wave movement (0-1)
  waveWidth: 8,             // Width of noise band in characters
  waveDirection: 'left-to-right', // 'left-to-right' | 'right-to-left'
  
  // Noise behavior
  noiseFPS: 10,             // Noise evolution speed (frames per second)
  noiseIntensity: 0.8,      // Probability of character swapping (0-1)
  noiseDensity: 0.7,        // Density of noise within band (0-1)
  
  // Visual effects
  bandOpacity: 0.9,         // Opacity of noise band highlight
  bandColor: '#FF2DAA',     // Color of band highlight
  bandBlur: 2,              // Blur effect on band edges (px)
  
  // Animation control
  autoplay: true,           // Automatic wave movement
  loop: true,               // Loop animation when complete
  pauseOnHover: true,       // Pause when hovering over text
  
  // Braille symbols for noise effect
  brailleBias: 0.6,         // Probability of using braille vs regular chars (0-1)
  charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()',
};

// Braille symbols (middle rows only for better visual consistency)
const BRAILLE_SYMBOLS = [
  '⠁', '⠂', '⠃', '⠄', '⠅', '⠆', '⠇', '⠈', '⠉', '⠊', '⠋', '⠌', '⠍', '⠎', '⠏',
  '⠐', '⠑', '⠒', '⠓', '⠔', '⠕', '⠖', '⠗', '⠘', '⠙', '⠚', '⠛', '⠜', '⠝', '⠞', '⠟',
  '⠠', '⠡', '⠢', '⠣', '⠤', '⠥', '⠦', '⠧', '⠨', '⠩', '⠪', '⠫', '⠬', '⠭', '⠮', '⠯',
  '⠰', '⠱', '⠲', '⠳', '⠴', '⠵', '⠶', '⠷', '⠸', '⠹', '⠺', '⠻', '⠼', '⠽', '⠾', '⠿'
];

// State management
let config = { ...DEFAULTS };
let animationId = null;
let isRunning = false;
let currentLine = 0;
let currentPosition = 0;
let lastNoiseUpdate = 0;
let textLines = [];
let originalText = '';
let currentText = '';
let bandHighlight = null;

// DOM elements
const textElement = document.querySelector('[data-mt]');
const panel = document.getElementById('mt-panel');

// Initialize the demo
function init() {
  if (!textElement) return;
  
  // Store original text and split into lines
  originalText = textElement.textContent.trim();
  textElement.textContent = originalText;
  currentText = originalText;
  
  // Split text into lines (simple approach)
  textLines = splitIntoLines(originalText);
  
  // Create band highlight element
  createBandHighlight();
  
  // Build control panel
  buildPanel();
  
  // Start animation
  if (config.autoplay) {
    start();
  }
  
  // Setup hover pause
  if (config.pauseOnHover) {
    textElement.addEventListener('mouseenter', pause);
    textElement.addEventListener('mouseleave', resume);
  }
}

// Split text into lines based on natural breaks
function splitIntoLines(text) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  const maxCharsPerLine = 80; // Approximate line length
  
  for (const word of words) {
    if ((currentLine + word).length > maxCharsPerLine && currentLine) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines;
}

// Create visual band highlight
function createBandHighlight() {
  bandHighlight = document.createElement('div');
  bandHighlight.className = 'band-highlight';
  bandHighlight.style.cssText = `
    position: absolute;
    pointer-events: none;
    border-radius: 4px;
    transition: all 0.1s ease;
    z-index: 1;
  `;
  
  textElement.parentElement.style.position = 'relative';
  textElement.parentElement.appendChild(bandHighlight);
}

// Update band highlight position and appearance
function updateBandHighlight() {
  if (!bandHighlight || !textLines[currentLine]) return;
  
  const lineText = textLines[currentLine];
  const charWidth = estimateCharWidth();
  const lineHeight = estimateLineHeight();
  
  const startPos = currentPosition * charWidth;
  const width = Math.min(config.waveWidth * charWidth, (lineText.length - currentPosition) * charWidth);
  const top = currentLine * lineHeight;
  
  bandHighlight.style.cssText = `
    position: absolute;
    left: ${startPos}px;
    top: ${top}px;
    width: ${width}px;
    height: ${lineHeight}px;
    background: ${config.bandColor}20;
    border: 1px solid ${config.bandColor}40;
    border-radius: 4px;
    backdrop-filter: blur(${config.bandBlur}px);
    pointer-events: none;
    transition: all 0.1s ease;
    z-index: 1;
  `;
}

// Estimate character width for positioning
function estimateCharWidth() {
  const testSpan = document.createElement('span');
  testSpan.style.cssText = `
    position: absolute;
    visibility: hidden;
    font-family: inherit;
    font-size: inherit;
    white-space: pre;
  `;
  testSpan.textContent = 'A';
  document.body.appendChild(testSpan);
  const width = testSpan.getBoundingClientRect().width;
  document.body.removeChild(testSpan);
  return width;
}

// Estimate line height
function estimateLineHeight() {
  const computed = getComputedStyle(textElement);
  return parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;
}

// Main animation loop
function animate(timestamp) {
  if (!isRunning) return;
  
  // Update noise at specified FPS
  const noiseInterval = 1000 / config.noiseFPS;
  if (timestamp - lastNoiseUpdate >= noiseInterval) {
    updateNoise();
    lastNoiseUpdate = timestamp;
  }
  
  // Update wave position
  updateWavePosition(timestamp);
  
  // Update visual highlight
  updateBandHighlight();
  
  // Continue animation
  animationId = requestAnimationFrame(animate);
}

// Update noise within the current band
function updateNoise() {
  if (!textLines[currentLine]) return;
  
  const lineText = textLines[currentLine];
  const start = Math.floor(currentPosition);
  const end = Math.min(start + config.waveWidth, lineText.length);
  
  // Create new text with noise applied
  let newText = '';
  let lineStart = 0;
  
  for (let i = 0; i < textLines.length; i++) {
    if (i === currentLine) {
      // Apply noise to current line
      const before = lineText.substring(0, start);
      const band = lineText.substring(start, end);
      const after = lineText.substring(end);
      
      // Apply noise to band characters
      const noisyBand = band.split('').map(char => {
        if (char === ' ') return ' ';
        
        const shouldSwap = Math.random() < config.noiseIntensity;
        if (shouldSwap) {
          const useBraille = Math.random() < config.brailleBias;
          if (useBraille) {
            return BRAILLE_SYMBOLS[Math.floor(Math.random() * BRAILLE_SYMBOLS.length)];
          } else {
            return config.charset[Math.floor(Math.random() * config.charset.length)];
          }
        }
        return char;
      }).join('');
      
      newText += before + noisyBand + after;
    } else {
      // Keep other lines unchanged
      newText += textLines[i];
    }
    
    if (i < textLines.length - 1) {
      newText += '\n';
    }
  }
  
  // Update DOM only if text changed
  if (newText !== currentText) {
    textElement.textContent = newText;
    currentText = newText;
  }
}

// Update wave position
function updateWavePosition(timestamp) {
  if (!config.autoplay) return;
  
  const lineText = textLines[currentLine];
  if (!lineText) return;
  
  // Move wave along current line
  currentPosition += config.waveSpeed * 0.1; // Adjust speed factor
  
  // Check if wave has reached end of line
  if (currentPosition >= lineText.length) {
    // Move to next line
    currentLine++;
    currentPosition = 0;
    
    // Check if we've completed all lines
    if (currentLine >= textLines.length) {
      if (config.loop) {
        // Reset to beginning
        currentLine = 0;
        currentPosition = 0;
      } else {
        // Stop animation
        stop();
        return;
      }
    }
  }
}

// Control functions
function start() {
  if (isRunning) return;
  isRunning = true;
  animationId = requestAnimationFrame(animate);
}

function stop() {
  isRunning = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function pause() {
  if (isRunning) {
    stop();
  }
}

function resume() {
  if (!isRunning && config.autoplay) {
    start();
  }
}

// Panel building (copied from mt-scroll-anim-v1 style)
function buildPanel() {
  panel.innerHTML = '';
  
  // Add title
  const title = document.createElement('h3');
  title.textContent = 'Noise Wave Controls';
  panel.appendChild(title);
  
  // Define control fields
  const fields = [
    {
      key: 'waveSpeed',
      type: 'range',
      label: 'Wave Speed',
      min: 0.1,
      max: 2.0,
      step: 0.1,
      desc: 'Speed of wave movement'
    },
    {
      key: 'waveWidth',
      type: 'range',
      label: 'Wave Width',
      min: 3,
      max: 20,
      step: 1,
      desc: 'Width of noise band in characters'
    },
    {
      key: 'noiseFPS',
      type: 'range',
      label: 'Noise FPS',
      min: 5,
      max: 30,
      step: 1,
      desc: 'Noise evolution speed'
    },
    {
      key: 'noiseIntensity',
      type: 'range',
      label: 'Noise Intensity',
      min: 0,
      max: 1,
      step: 0.05,
      desc: 'Probability of character swapping'
    },
    {
      key: 'noiseDensity',
      type: 'range',
      label: 'Noise Density',
      min: 0,
      max: 1,
      step: 0.05,
      desc: 'Density of noise within band'
    },
    {
      key: 'brailleBias',
      type: 'range',
      label: 'Braille Bias',
      min: 0,
      max: 1,
      step: 0.05,
      desc: 'Probability of using braille symbols'
    },
    {
      key: 'bandColor',
      type: 'color',
      label: 'Band Color',
      desc: 'Color of band highlight'
    },
    {
      key: 'autoplay',
      type: 'checkbox',
      label: 'Autoplay',
      desc: 'Automatic wave movement'
    },
    {
      key: 'loop',
      type: 'checkbox',
      label: 'Loop',
      desc: 'Loop animation when complete'
    },
    {
      key: 'pauseOnHover',
      type: 'checkbox',
      label: 'Pause on Hover',
      desc: 'Pause when hovering over text'
    }
  ];
  
  // Create sections
  const sections = [
    {
      title: 'Wave Movement',
      desc: 'Control the speed and size of the noise wave.',
      keys: ['waveSpeed', 'waveWidth']
    },
    {
      title: 'Noise Behavior',
      desc: 'Adjust how the noise evolves and affects characters.',
      keys: ['noiseFPS', 'noiseIntensity', 'noiseDensity', 'brailleBias']
    },
    {
      title: 'Visual Effects',
      desc: 'Customize the appearance of the noise band.',
      keys: ['bandColor']
    },
    {
      title: 'Animation Control',
      desc: 'Control playback and interaction behavior.',
      keys: ['autoplay', 'loop', 'pauseOnHover']
    }
  ];
  
  // Build sections
  sections.forEach(section => {
    const sectionEl = createSection(section.title, section.desc);
    section.keys.forEach(key => {
      const field = fields.find(f => f.key === key);
      if (field) {
        sectionEl.appendChild(createField(field));
      }
    });
    panel.appendChild(sectionEl);
  });
  
  // Add reset button
  const resetSection = createSection('Reset', 'Restore default settings.');
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset to Defaults';
  resetBtn.className = 'mt-reset-btn';
  resetBtn.addEventListener('click', () => {
    config = { ...DEFAULTS };
    updateAllFields();
    if (config.autoplay) {
      start();
    }
  });
  resetSection.appendChild(resetBtn);
  panel.appendChild(resetSection);
}

// Create section element
function createSection(title, desc) {
  const section = document.createElement('div');
  section.className = 'mt-section';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'mt-title';
  titleEl.textContent = title;
  
  const descEl = document.createElement('div');
  descEl.className = 'mt-desc';
  descEl.textContent = desc;
  
  const fieldsEl = document.createElement('div');
  fieldsEl.className = 'mt-fields';
  
  section.appendChild(titleEl);
  section.appendChild(descEl);
  section.appendChild(fieldsEl);
  
  return section;
}

// Create field element
function createField(field) {
  const group = document.createElement('div');
  group.className = 'group';
  
  const label = document.createElement('label');
  label.textContent = field.label;
  label.title = field.desc;
  
  const input = document.createElement('input');
  input.type = field.type;
  input.id = `mt-${field.key}`;
  
  if (field.type === 'range') {
    input.min = field.min;
    input.max = field.max;
    input.step = field.step;
    input.value = config[field.key];
    
    // Add value display
    const valueSpan = document.createElement('span');
    valueSpan.className = 'mt-value';
    valueSpan.textContent = config[field.key];
    
    input.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      config[field.key] = value;
      valueSpan.textContent = value;
    });
    
    group.appendChild(label);
    group.appendChild(input);
    group.appendChild(valueSpan);
  } else if (field.type === 'checkbox') {
    input.checked = config[field.key];
    
    input.addEventListener('change', (e) => {
      config[field.key] = e.target.checked;
    });
    
    group.appendChild(input);
    group.appendChild(label);
  } else if (field.type === 'color') {
    input.value = config[field.key];
    
    input.addEventListener('input', (e) => {
      config[field.key] = e.target.value;
    });
    
    group.appendChild(label);
    group.appendChild(input);
  }
  
  return group;
}

// Update all field values
function updateAllFields() {
  Object.keys(config).forEach(key => {
    const input = document.getElementById(`mt-${key}`);
    if (input) {
      if (input.type === 'checkbox') {
        input.checked = config[key];
      } else {
        input.value = config[key];
      }
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for testing
window.bandSwap = {
  start,
  stop,
  pause,
  resume,
  config: () => config,
  getBandInfo: () => ({
    currentLine,
    currentPosition,
    waveWidth: config.waveWidth,
    isRunning
  })
};
