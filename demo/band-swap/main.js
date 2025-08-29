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

import { DEFAULT_TOKENS, DEFAULT_SYMBOLS } from '../../contracts/animTokens.js';

const paragraphEl = document.getElementById('paragraph');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const dpr = Math.max(1, window.devicePixelRatio || 1);

const state = { ...DEFAULT_TOKENS };
let rafId = 0;
let running = false;
let layout = null;

let lastBandInfo = { start: 0, end: 0, center: 0 };
let lastSamplePoint = { x: 0, y: 0 };

function measureLayout() {
  const rect = paragraphEl.getBoundingClientRect();
  const styles = getComputedStyle(paragraphEl);
  const font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = styles.color || '#000';
  const text = paragraphEl.textContent || '';
  // naive single-line wrap: measure per char positions; preserve layout stability
  const chars = [...text];
  const boxes = [];
  let x = 0;
  let y = parseFloat(styles.fontSize);
  const maxW = rect.width;
  for (const ch of chars) {
    const w = ctx.measureText(ch).width;
    if (x + w > maxW && ch !== ' ') {
      x = 0;
      y += parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.4;
    }
    boxes.push({ ch, x, y, w });
    x += w;
  }
  layout = { boxes, width: rect.width, height: rect.height };
}

function drawFrame() {
  if (!layout) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const { boxes } = layout;
  const total = boxes.length;
  const play = state.autoplay
    ? (performance.now() * state.bandSpeed * 0.001) % 1
    : state.playhead / 100;
  const bandCenter = Math.floor(play * total);
  const half = Math.max(1, Math.floor(state.bandSpread));
  const start = Math.max(0, bandCenter - half);
  const end = Math.min(total - 1, bandCenter + half);
  lastBandInfo = { start, end, center: bandCenter };

  const mix = state.bandMix / 100;

  // Mask background under band chars, then draw swapped glyphs only
  const styles = getComputedStyle(document.body);
  const bg = styles.backgroundColor || '#fff';
  ctx.fillStyle = bg;
  const metrics = ctx.measureText('M');
  const ascent = metrics.actualBoundingBoxAscent || 0;
  const descent = metrics.actualBoundingBoxDescent || 0;
  const height = ascent + descent || parseFloat(getComputedStyle(paragraphEl).lineHeight) || 20;

  for (let i = start; i <= end; i++) {
    const { ch, x, y, w } = boxes[i];
    if (!ch || ch === ' ') continue;
    ctx.fillRect(x, y - ascent, w || 1, height);
  }

  ctx.fillStyle = getComputedStyle(paragraphEl).color || '#000';
  for (let i = start; i <= end; i++) {
    const { ch, x, y } = boxes[i];
    if (!ch || ch === ' ') continue;
    const out = Math.random() < mix
      ? DEFAULT_SYMBOLS[Math.floor(Math.random() * DEFAULT_SYMBOLS.length)]
      : ch;
    ctx.fillText(out, x, y);
  }

  // Record a central sample point for tests
  const midIdx = Math.min(end, Math.max(start, bandCenter));
  const b = boxes[midIdx] || { x: 0, y: 0 };
  lastSamplePoint = { x: Math.floor((b.x + (b.w || 8) / 2) * dpr), y: Math.floor((b.y - ascent / 2) * dpr) };
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
  measureLayout();
  drawFrame();
}

function buildPanel() {
  const panel = document.getElementById('mt-panel');
  panel.innerHTML = '';
  const controls = [
    { label: 'Speed', key: 'bandSpeed', type: 'range', min: 0, max: 3, step: 0.1 },
    { label: 'Spread', key: 'bandSpread', type: 'range', min: 1, max: 20, step: 1 },
    { label: 'Mix', key: 'bandMix', type: 'range', min: 0, max: 100, step: 1 },
    { label: 'Autoplay', key: 'autoplay', type: 'checkbox' },
    { label: 'Playhead', key: 'playhead', type: 'range', min: 0, max: 100, step: 1 },
  ];
  for (const c of controls) {
    const row = document.createElement('div');
    row.className = 'mt-row';
    const label = document.createElement('label');
    label.textContent = c.label;
    const input = document.createElement('input');
    input.type = c.type;
    if (c.type === 'checkbox') {
      input.checked = state[c.key];
      input.addEventListener('change', () => {
        state[c.key] = input.checked;
        if (state.autoplay) start();
        else stop();
      });
    } else {
      input.min = String(c.min);
      input.max = String(c.max);
      input.step = String(c.step);
      input.value = String(state[c.key]);
      input.addEventListener('input', () => {
        const v = Number(input.value);
        state[c.key] = v;
        if (!state.autoplay && c.key !== 'playhead') return;
        drawFrame();
      });
    }
    row.appendChild(label);
    row.appendChild(input);
    panel.appendChild(row);
  }
}

function setupIOPause() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) start();
      else stop();
    }
  });
  io.observe(paragraphEl);
}

window.addEventListener('resize', onResize);
window.addEventListener('load', () => {
  measureLayout();
  buildPanel();
  setupIOPause();
  if (state.autoplay) start();
  else drawFrame();
});

// Expose debug hooks for tests
window.bandSwap = {
  getBandInfo: () => ({ ...lastBandInfo }),
  getSamplePoint: () => ({ ...lastSamplePoint }),
  state,
};
