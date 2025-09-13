/*╔══════════════════════════════════════════════════════╗
  ║  ░  C O R R E C T I O N   F L U X   L O G I C   ░░░  ║
  ║                                                      ║
  ║   Vanilla JS engine for the animated correction      ║
  ║   entity, controls, and simulated commits.           ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Dot‑matrix entity with independent animation clock
  • WHY  ▸ Explore UX/params separate from LM
  • HOW  ▸ Absolute overlay + pooled glyph nodes
*/

// Demo text with deliberate noise
const DEMO_TEXT = (
  "heya have you heard there was a n icre cream truck outside that';s kinda cool right"\n" +
  "it parked near the corner and people were like, is it open?\n" +
  "some folks said the flavour list was wildddd and the prices were okish"
);

// State
const state = {
  progress: 0, // 0..100
  speed: 1.0,
  density: 16,
  size: 18,
  hue: 160,
  sat: 70,
  light: 80,
  trailMs: 400,
  jitter: 2,
  pathType: 'linear', // linear|sine|spiral|flow|summon
  amp: 12,
  freq: 1.0,
  cadence: 'word', // word|boundary|sentence
  delayMs: 120,
  bias: 0.6,
  priority: 'med',
  autoPlay: true,
  showTrail: true,
  reduced: false,
};

const els = {
  textWrap: document.getElementById('textWrap'),
  overlay: document.getElementById('entityOverlay'),
  progress: document.getElementById('progress'),
  progressValue: document.getElementById('progressValue'),
  collapseBtn: document.getElementById('collapseBtn'),
  controlPane: document.getElementById('controlPane'),
};

// Render text as spans (for approximate positioning and future highlight)
function renderText(text) {
  els.textWrap.innerHTML = '';
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement('span');
    span.className = 'text-char';
    span.textContent = text[i];
    span.dataset.index = String(i);
    els.textWrap.appendChild(span);
  }
}

// Simple word boundary detection
function isBoundaryChar(ch) {
  return /[\s.,!?;:"'()\[\]{}]/.test(ch);
}

function wordBoundaries(text) {
  const bounds = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || (isBoundaryChar(text[i]) && !isBoundaryChar(text[i-1]))) {
      bounds.push({ start, end: i });
      start = i;
    }
  }
  return bounds.filter(b => b.end > b.start);
}

// Overlay entity pool
const pool = [];
function acquireDot() {
  const el = pool.pop() || document.createElement('div');
  el.className = 'entity-dot';
  els.overlay.appendChild(el);
  return el;
}
function releaseDot(el) {
  if (!el) return;
  if (el.parentElement === els.overlay) els.overlay.removeChild(el);
}

function colorCss() {
  return `hsl(${state.hue} ${state.sat}% ${state.light}%)`;
}

// Position interpolation along text
function indexToClient(i) {
  const span = els.textWrap.querySelector(`.text-char[data-index="${i}"]`);
  if (!span) return { x: 0, y: 0 };
  const rect = span.getBoundingClientRect();
  const parent = els.textWrap.getBoundingClientRect();
  return { x: rect.left - parent.left + rect.width * 0.5, y: rect.top - parent.top + rect.height * 0.5 };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// Path generators return offset {dx, dy}
function pathOffset(tNorm) { // 0..1
  const amp = state.amp;
  const f = state.freq;
  switch (state.pathType) {
    case 'sine': return { dx: 0, dy: Math.sin(tNorm * Math.PI * 2 * f) * amp };
    case 'spiral': return { dx: Math.cos(tNorm * Math.PI * 2 * f) * (amp*0.5 + amp*tNorm), dy: Math.sin(tNorm * Math.PI * 2 * f) * (amp*0.5 + amp*tNorm) };
    case 'flow': return { dx: Math.sin(tNorm * 6.283*f) * amp * 0.5, dy: Math.cos(tNorm * 6.283*(f*0.7+0.3)) * amp };
    case 'summon': return { dx: 0, dy: (1 - Math.cos(Math.min(1, tNorm*2) * Math.PI)) * -amp };
    default: return { dx: 0, dy: 0 };
  }
}

function jitter() {
  const j = state.jitter;
  return { dx: (Math.random()-0.5)*2*j, dy: (Math.random()-0.5)*2*j };
}

// Main animation
let rafId = null;
let t0 = performance.now();
let travel = 0; // 0..1
let lastCommitIdx = -1;
let pendingTrail = [];

function step() {
  const now = performance.now();
  const dt = (now - t0) / 1000;
  t0 = now;

  if (state.autoPlay && !state.reduced) {
    travel += dt * 0.1 * state.speed; // normalized speed
    if (travel > 1) travel = 1;
    const pct = Math.round(travel * 1000)/10;
    els.progress.value = String(pct);
    els.progressValue.textContent = pct.toFixed(1) + '%';
  } else {
    travel = clamp(parseFloat(els.progress.value)/100, 0, 1);
  }

  // Determine index in text by travel
  const idx = Math.floor(DEMO_TEXT.length * travel);
  // Compute entity dots
  const color = colorCss();
  const N = state.density;

  // Clear previous dots
  els.overlay.innerHTML = '';

  const anchor = indexToClient(idx);
  for (let i = 0; i < N; i++) {
    const dot = acquireDot();
    dot.style.fontSize = state.size + 'px';
    dot.textContent = i % 3 === 0 ? '⠶' : (i % 3 === 1 ? '⠤' : '⠕');
    dot.style.color = color;

    const t = (i / Math.max(1, N-1));
    const p = pathOffset(t);
    const j = jitter();
    const x = anchor.x + p.dx + j.dx;
    const y = anchor.y + p.dy + j.dy;
    dot.style.transform = `translate(${x}px, ${y}px)`;
  }

  // Trail
  if (state.showTrail && !state.reduced) {
    const trail = document.createElement('div');
    trail.className = 'entity-dot trail';
    trail.textContent = '⠶';
    trail.style.color = color;
    trail.style.fontSize = state.size + 'px';
    trail.style.transform = `translate(${anchor.x}px, ${anchor.y}px)`;
    trail.style.transition = `opacity ${state.trailMs}ms linear`;
    els.overlay.appendChild(trail);
    requestAnimationFrame(() => trail.style.opacity = '0');
    pendingTrail.push(trail);
    setTimeout(() => {
      releaseDot(trail);
    }, state.trailMs + 40);
  }

  // Simulated commits: replace characters around idx on boundaries
  simulateCommits(idx);

  rafId = requestAnimationFrame(step);
}

function simulateCommits(idx) {
  const bounds = wordBoundaries(DEMO_TEXT);
  const b = bounds.find(b => idx >= b.start && idx <= b.end);
  if (!b) return;
  if (b.end <= lastCommitIdx) return;

  if (state.cadence === 'word' && Math.random() < 0.25) {
    commitSpan(b.start, b.end);
    lastCommitIdx = b.end;
  }
}

function commitSpan(start, end) {
  // Simple repair: collapse double spaces, fix common typos like "icre" -> "ice"
  const span = DEMO_TEXT.slice(start, end);
  let fixed = span.replace(/\s{2,}/g, ' ')
                  .replace(/icre/g, 'ice')
                  .replace(/okish/g, 'ok-ish')
                  .replace(/wildddd/g, 'wild');

  for (let i = start; i < end && i < DEMO_TEXT.length; i++) {
    const ch = fixed[i - start] || ' ';
    const node = els.textWrap.querySelector(`.text-char[data-index="${i}"]`);
    if (node && node.textContent !== ch) node.textContent = ch;
  }
}

function bindControls() {
  const bind = (id, fmt, on) => {
    const el = document.getElementById(id);
    const label = document.getElementById(id + 'Val');
    if (!el) return;
    const apply = () => {
      let v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? parseFloat(el.value) : el.value;
      on(v);
      if (label && fmt) label.textContent = fmt(v);
    };
    el.addEventListener('input', apply);
    apply();
  };
  bind('speed', v => v.toFixed(1) + '×', v => state.speed = v);
  bind('density', v => String(v), v => state.density = v);
  bind('size', v => v + 'px', v => state.size = v);
  bind('hue', v => String(v), v => state.hue = v);
  bind('sat', v => v + '%', v => state.sat = v);
  bind('light', v => v + '%', v => state.light = v);
  bind('trail', v => v + 'ms', v => state.trailMs = v);
  bind('jitter', v => v + 'px', v => state.jitter = v);
  document.getElementById('pathType').addEventListener('change', e => state.pathType = e.target.value);
  bind('amp', v => v + 'px', v => state.amp = v);
  bind('freq', v => v.toFixed(1), v => state.freq = v);
  document.getElementById('cadence').addEventListener('change', e => state.cadence = e.target.value);
  bind('delay', v => v + 'ms', v => state.delayMs = v);
  bind('bias', v => v.toFixed(2), v => state.bias = v);
  document.getElementById('priority').addEventListener('change', e => state.priority = e.target.value);
  document.getElementById('autoPlay').addEventListener('change', e => state.autoPlay = e.target.checked);
  document.getElementById('showTrail').addEventListener('change', e => state.showTrail = e.target.checked);
  document.getElementById('reduced').addEventListener('change', e => state.reduced = e.target.checked);

  // Progress slider
  els.progress.addEventListener('input', () => {
    els.progressValue.textContent = parseFloat(els.progress.value).toFixed(1) + '%';
  });

  // Collapsible panel and keyboard toggle '/'
  const toggle = () => {
    const expanded = els.collapseBtn.getAttribute('aria-expanded') === 'true';
    els.collapseBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    els.controlPane.style.width = expanded ? '40px' : '';
    els.controlPane.style.overflow = expanded ? 'hidden' : 'auto';
  };
  els.collapseBtn.addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => {
    if (e.key === '/') { e.preventDefault(); toggle(); }
  });

  // XY pads
  setupPad('padSpeedDensity', 'thumbSD', (x, y) => {
    state.speed = 0.1 + x * (5 - 0.1);
    state.density = Math.round(1 + y * (64 - 1));
    document.getElementById('speed').value = String(state.speed);
    document.getElementById('density').value = String(state.density);
    document.getElementById('speedVal').textContent = state.speed.toFixed(1) + '×';
    document.getElementById('densityVal').textContent = String(state.density);
  });
  setupPad('padAmpFreq', 'thumbAF', (x, y) => {
    state.amp = Math.round(40 * x);
    state.freq = 0.1 + y * (6 - 0.1);
    document.getElementById('amp').value = String(state.amp);
    document.getElementById('freq').value = String(state.freq);
    document.getElementById('ampVal').textContent = state.amp + 'px';
    document.getElementById('freqVal').textContent = state.freq.toFixed(1);
  });
}

function setupPad(padId, thumbId, onChange) {
  const pad = document.getElementById(padId);
  const thumb = document.getElementById(thumbId);
  const rect = () => pad.getBoundingClientRect();
  const setThumb = (x, y) => { thumb.style.left = (x*100) + '%'; thumb.style.top = (y*100) + '%'; };
  let dragging = false;
  const move = (clientX, clientY) => {
    const r = rect();
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    const cx = Math.max(0, Math.min(1, x));
    const cy = Math.max(0, Math.min(1, y));
    setThumb(cx, cy);
    onChange(cx, cy);
  };
  pad.addEventListener('pointerdown', (e) => { dragging = true; pad.setPointerCapture(e.pointerId); move(e.clientX, e.clientY); });
  pad.addEventListener('pointermove', (e) => { if (dragging) move(e.clientX, e.clientY); });
  pad.addEventListener('pointerup', (e) => { dragging = false; pad.releasePointerCapture(e.pointerId); });
  // init center
  setThumb(0.5, 0.5);
}

function boot() {
  renderText(DEMO_TEXT);
  bindControls();
  t0 = performance.now();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(step);
}

boot();



