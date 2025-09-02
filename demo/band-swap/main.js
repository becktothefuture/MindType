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

// Configuration for the manual noise wave
const DEFAULTS = {
  // Wave properties
  waveWidth: 12, // Width of noise band in characters
  noiseIntensity: 0.7, // Probability of character swapping (0-1)
  noiseUpdateInterval: 100, // Update noise every 100ms (0.1s)

  // Visual feedback
  showWaveIndicator: true, // Show visual indicator of wave position
  waveColor: '#ff6b6b', // Color of wave indicator

  // Braille symbols for noise effect
  brailleBias: 0.6, // Probability of using braille vs regular chars (0-1)
  charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()',
};

// Braille symbols (middle rows only for better visual consistency)
const BRAILLE_SYMBOLS = [
  '⠁',
  '⠂',
  '⠃',
  '⠄',
  '⠅',
  '⠆',
  '⠇',
  '⠈',
  '⠉',
  '⠊',
  '⠋',
  '⠌',
  '⠍',
  '⠎',
  '⠏',
  '⠐',
  '⠑',
  '⠒',
  '⠓',
  '⠔',
  '⠕',
  '⠖',
  '⠗',
  '⠘',
  '⠙',
  '⠚',
  '⠛',
  '⠜',
  '⠝',
  '⠞',
  '⠟',
  '⠠',
  '⠡',
  '⠢',
  '⠣',
  '⠤',
  '⠥',
  '⠦',
  '⠧',
  '⠨',
  '⠩',
  '⠪',
  '⠫',
  '⠬',
  '⠭',
  '⠮',
  '⠯',
  '⠰',
  '⠱',
  '⠲',
  '⠳',
  '⠴',
  '⠵',
  '⠶',
  '⠷',
  '⠸',
  '⠹',
  '⠺',
  '⠻',
  '⠼',
  '⠽',
  '⠾',
  '⠿',
];

// State management
let config = { ...DEFAULTS };
let animationId = null;
let noiseTimer = null;
let isRunning = false;
let noiseFrame = 0;

// Wave position (in character coordinates)
let waveLine = 0; // Current line (0-based)
let waveChar = 0; // Character position within line

// Text data
let textLines = [];
let originalText = '';
let currentText = '';
let originalLines = [];
let charWidth = 0;
let lineHeight = 0;

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

  // Split text into lines and cache original data
  textLines = splitIntoLines(originalText);
  originalLines = textLines.map((line) => line.split(''));

  // Cache measurements
  cacheMeasurements();

  // Build control panel
  buildPanel();

  // Setup click/drag interaction
  setupInteraction();

  // Start noise animation
  startNoiseAnimation();

  // Position wave in middle of first line
  waveLine = 0;
  waveChar = Math.floor(textLines[0].length / 2);
  updateWave();
}

// Split text into lines based on natural breaks
function splitIntoLines(text) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  const maxCharsPerLine = 80;

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

// Cache measurements once
function cacheMeasurements() {
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
  charWidth = testSpan.getBoundingClientRect().width;
  document.body.removeChild(testSpan);

  const computed = getComputedStyle(textElement);
  lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;
}

// Setup click and drag interaction
function setupInteraction() {
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  textElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;

    // Move wave to click position
    const rect = textElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    moveWaveToPosition(x, y);
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const rect = textElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    moveWaveToPosition(x, y);
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Also support touch events
  textElement.addEventListener('touchstart', (e) => {
    isDragging = true;
    const touch = e.touches[0];
    lastX = touch.clientX;
    lastY = touch.clientY;

    const rect = textElement.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    moveWaveToPosition(x, y);
    e.preventDefault();
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const rect = textElement.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    moveWaveToPosition(x, y);
    e.preventDefault();
  });

  document.addEventListener('touchend', () => {
    isDragging = false;
  });
}

// Convert screen coordinates to wave position
function moveWaveToPosition(screenX, screenY) {
  // Calculate line from Y coordinate
  const lineIndex = Math.floor(screenY / lineHeight);
  waveLine = Math.max(0, Math.min(lineIndex, textLines.length - 1));

  // Calculate character position from X coordinate
  const charIndex = Math.floor(screenX / charWidth);
  const currentLineLength = textLines[waveLine].length;
  waveChar = Math.max(0, Math.min(charIndex, currentLineLength - 1));

  updateWave();
}

// Start the noise animation timer
function startNoiseAnimation() {
  isRunning = true;
  noiseTimer = setInterval(() => {
    noiseFrame++;
    updateWave();
  }, config.noiseUpdateInterval);
}

// Stop the noise animation
function stopNoiseAnimation() {
  isRunning = false;
  if (noiseTimer) {
    clearInterval(noiseTimer);
    noiseTimer = null;
  }
}

// Update the wave effect
function updateWave() {
  if (!textLines[waveLine]) return;

  const lines = [];

  for (let i = 0; i < textLines.length; i++) {
    if (i === waveLine) {
      // Apply noise to current line only
      const lineText = textLines[i];
      const start = Math.max(0, waveChar - Math.floor(config.waveWidth / 2));
      const end = Math.min(lineText.length, start + config.waveWidth);

      const before = lineText.substring(0, start);
      const band = lineText.substring(start, end);
      const after = lineText.substring(end);

      const noisyBand = applyNoiseToBand(band, start);
      lines.push(before + noisyBand + after);
    } else {
      // Keep other lines unchanged
      lines.push(textLines[i]);
    }
  }

  // Update text content
  const newText = lines.join('\n');
  textElement.textContent = newText;

  // Update visual indicator if enabled
  if (config.showWaveIndicator) {
    updateWaveIndicator();
  }
}

// Apply noise to a band of characters
function applyNoiseToBand(band, startOffset) {
  if (!band) return band;

  const chars = band.split('');

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char === ' ') continue;

    // Use frame-based randomization for consistent but varied results
    const seed = noiseFrame * 1000 + startOffset + i;
    const random = seededRandom(seed);

    if (random < config.noiseIntensity) {
      const useBraille = seededRandom(seed + 1000) < config.brailleBias;
      if (useBraille) {
        const symbolIndex = Math.floor(
          seededRandom(seed + 2000) * BRAILLE_SYMBOLS.length,
        );
        chars[i] = BRAILLE_SYMBOLS[symbolIndex];
      } else {
        const charIndex = Math.floor(seededRandom(seed + 3000) * config.charset.length);
        chars[i] = config.charset[charIndex];
      }
    }
  }

  return chars.join('');
}

// Seeded random function for consistent but varied results
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Update visual wave indicator
function updateWaveIndicator() {
  // Remove existing indicator
  const existingIndicator = document.getElementById('wave-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Create new indicator
  const indicator = document.createElement('div');
  indicator.id = 'wave-indicator';
  indicator.style.cssText = `
    position: absolute;
    pointer-events: none;
    background: ${config.waveColor}20;
    border: 2px solid ${config.waveColor};
    border-radius: 4px;
    z-index: 1000;
    transition: all 0.1s ease;
  `;

  // Position indicator
  const rect = textElement.getBoundingClientRect();
  const x = waveChar * charWidth;
  const y = waveLine * lineHeight;
  const width = config.waveWidth * charWidth;

  indicator.style.left = `${rect.left + x}px`;
  indicator.style.top = `${rect.top + y}px`;
  indicator.style.width = `${width}px`;
  indicator.style.height = `${lineHeight}px`;

  document.body.appendChild(indicator);
}

// Panel building
function buildPanel() {
  panel.innerHTML = '';

  // Add title
  const title = document.createElement('h3');
  title.textContent = 'Manual Noise Wave Controls';
  panel.appendChild(title);

  // Add instructions
  const instructions = document.createElement('div');
  instructions.className = 'mt-instructions';
  instructions.innerHTML = `
    <p><strong>How to use:</strong></p>
    <p>• Click anywhere in the text to move the noise wave</p>
    <p>• Drag to continuously move the wave</p>
    <p>• The wave updates every 0.1 seconds automatically</p>
  `;
  panel.appendChild(instructions);

  // Define control fields
  const fields = [
    {
      key: 'waveWidth',
      type: 'range',
      label: 'Wave Width',
      min: 3,
      max: 30,
      step: 1,
      desc: 'Width of noise band in characters',
    },
    {
      key: 'noiseIntensity',
      type: 'range',
      label: 'Noise Intensity',
      min: 0,
      max: 1,
      step: 0.05,
      desc: 'Probability of character swapping',
    },
    {
      key: 'noiseUpdateInterval',
      type: 'range',
      label: 'Update Interval (ms)',
      min: 50,
      max: 500,
      step: 10,
      desc: 'How often the noise changes (milliseconds)',
    },
    {
      key: 'brailleBias',
      type: 'range',
      label: 'Braille Bias',
      min: 0,
      max: 1,
      step: 0.05,
      desc: 'Probability of using braille symbols',
    },
    {
      key: 'showWaveIndicator',
      type: 'checkbox',
      label: 'Show Wave Indicator',
      desc: 'Show visual indicator of wave position',
    },
  ];

  // Create sections
  const sections = [
    {
      title: 'Wave Properties',
      desc: 'Control the size and behavior of the noise wave.',
      keys: ['waveWidth', 'noiseIntensity', 'noiseUpdateInterval'],
    },
    {
      title: 'Visual Settings',
      desc: 'Adjust the visual appearance and feedback.',
      keys: ['brailleBias', 'showWaveIndicator'],
    },
  ];

  // Build sections
  sections.forEach((section) => {
    const sectionEl = createSection(section.title, section.desc);
    section.keys.forEach((key) => {
      const field = fields.find((f) => f.key === key);
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
    updateWave();
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

      // Restart animation if interval changed
      if (field.key === 'noiseUpdateInterval') {
        stopNoiseAnimation();
        startNoiseAnimation();
      }
    });

    group.appendChild(label);
    group.appendChild(input);
    group.appendChild(valueSpan);
  } else if (field.type === 'checkbox') {
    input.checked = config[field.key];

    input.addEventListener('change', (e) => {
      config[field.key] = e.target.checked;
      if (field.key === 'showWaveIndicator' && !config[field.key]) {
        const indicator = document.getElementById('wave-indicator');
        if (indicator) indicator.remove();
      }
    });

    group.appendChild(input);
    group.appendChild(label);
  }

  return group;
}

// Update all field values
function updateAllFields() {
  Object.keys(config).forEach((key) => {
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
window.manualNoiseWave = {
  start: startNoiseAnimation,
  stop: stopNoiseAnimation,
  config: () => config,
  getWavePosition: () => ({ waveLine, waveChar }),
  moveWave: moveWaveToPosition,
};
