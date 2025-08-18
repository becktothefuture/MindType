import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { BurstSystem } from './bursts.js';
import { XYPad } from './xypad.js';
import {
  clamp,
  smoothstep,
  lerp,
  makeSoftParticleDataURL,
  makeGrainDataURL,
} from './utils.js';

// Config (tuneable)
const CONFIG = {
  meter: { inc: 0.15, decayPerSec: 0.4, max: 1.5 },
  renderer: { maxPixelRatio: 1.5 },
  particles: {
    maxActive: 2000,
    curlAmp: 0.25,
    brightnessScale: 0.8, // reduce per-particle brightness
    countScale: 0.85, // reduce overall counts slightly
    sizeScale: 1.0,
    minSaturation: 0.45,
    hueJitterDeg: 8,
    motionScale: 0.5, // globally slow motion ~50%
    lifeScale: 1.6, // longer lifetime to slow growth/decay
    dragPerSec: 0.35, // simple physics damping
  },
  timeScale: 1.0,
};

// Scene setup
const canvas = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false,
});
renderer.setClearColor(0x0b0f12, 1);
renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, CONFIG.renderer.maxPixelRatio),
);
let targetPixelRatio = Math.min(
  window.devicePixelRatio || 1,
  CONFIG.renderer.maxPixelRatio,
);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.z = 5;

// Generate textures
const particleURL = makeSoftParticleDataURL(128);
const grainURL = makeGrainDataURL(256);

// Apply grain to overlay
const grainDiv = document.getElementById('grain');
grainDiv.style.backgroundImage = `url(${grainURL})`;
const lensDiv = document.getElementById('lens');

// Load particle texture
const loader = new THREE.TextureLoader();
const particleTex = loader.load(particleURL);
particleTex.wrapS = particleTex.wrapT = THREE.ClampToEdgeWrapping;
particleTex.minFilter = THREE.LinearFilter;
particleTex.magFilter = THREE.LinearFilter;

// (fog removed) no noise texture needed

let burstSystem;
let lastT = performance.now();
let meter = 0;
let intensity = 0;
let simTime = 0;
// Dynamo (generator inertia) state
let dynOmega = 0; // rotational speed proxy
const DYN_MAX = 3.0;
const DYN_DECAY = 1.2; // per second
window.__dynamoEnabled = window.__dynamoEnabled || false;
window.__dynamoGain = window.__dynamoGain || 1.2;

// XY pads: integrated into control groups
const densityContainer = document.getElementById('density-pad-container');
const blurContainer = document.getElementById('blur-pad-container');
const padDensity = new XYPad(densityContainer, 'pad-density', 'Density / Energy', {
  x: 0.83,
  y: 0.64,
});
const padBlur = new XYPad(blurContainer, 'pad-blur', 'Blur / Glow', { x: 0.77, y: 0.41 });
let xy = { x: padDensity.getX(), y: padDensity.getY() };
padDensity.onChange((x, y) => {
  xy.x = x;
  xy.y = y;
});

// FPS meter (rolling avg)
const fpsDiv = document.getElementById('fps');
let lastFpsUpdate = 0;
let accum = 0;
let frames = 0;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', () => {
  // micro debounce by rAF
  requestAnimationFrame(resize);
});
resize();

// Key handling
function isModifierKey(e) {
  const k = e.key;
  return k === 'Shift' || k === 'Alt' || k === 'Control' || k === 'Meta';
}
window.addEventListener('keydown', (e) => {
  if (isModifierKey(e)) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key))
    e.preventDefault();
  meter = clamp(meter + CONFIG.meter.inc, 0, CONFIG.meter.max);
  const localIntensity = smoothstep(0.0, 1.0, meter / 1.2);
  const autoOn = autoModeEl ? autoModeEl.checked : false;
  const autoSens = autoSensEl ? parseFloat(autoSensEl.value) || 0 : 0;
  const autoImpact = autoOn ? 1.0 + localIntensity * autoSens : 1.0;
  const glowBoost =
    (window.__impactGain != null ? window.__impactGain : 1.0) *
    autoImpact *
    lerp(0.5, 3.0, padBlur.getY());
  // Dynamo: each keystroke adds impulse to rotational energy
  if (window.__dynamoEnabled)
    dynOmega = Math.min(DYN_MAX, dynOmega + 0.35 * (1 + intensity));
  burstSystem.spawnBurst(localIntensity, xy, glowBoost);
});

// Glass blur mapping (8px → 12px)
const glass = document.getElementById('glass');
const grain = document.getElementById('grain');

function init() {
  burstSystem = new BurstSystem(scene, particleTex, CONFIG);
  requestAnimationFrame(loop);
}

function loop(t) {
  const rawDt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  const ts = Math.max(0.1, CONFIG.timeScale || 1.0);
  const dt = rawDt * ts;
  simTime += dt;
  // Update meter
  meter = Math.max(0, meter - CONFIG.meter.decayPerSec * dt);
  intensity = smoothstep(0.0, 1.0, meter / 1.2);
  // Auto mode: adapt impact & fog push from typing speed
  const autoOn = autoModeEl ? autoModeEl.checked : false;
  const autoSens = autoSensEl ? parseFloat(autoSensEl.value) || 0 : 0;
  if (autoSensVal) autoSensVal.textContent = autoSens.toFixed(2);
  let autoImpact = 1.0,
    autoPush = 1.0;
  if (autoOn) {
    autoImpact = 1.0 + intensity * autoSens;
    autoPush = 1.0 + intensity * autoSens;
  }
  // (fog removed)
  // Dynamo decay and modulation
  if (dynOmega > 0) dynOmega = Math.max(0, dynOmega - DYN_DECAY * dt);
  const dynNorm = Math.min(1, dynOmega / DYN_MAX);

  // Update glass blur
  const blurMinBase = parseFloat(document.getElementById('blurMin').value) || 8;
  const blurMaxBase = parseFloat(document.getElementById('blurMax').value) || 12;
  const blurLoBase = Math.min(blurMinBase, blurMaxBase);
  const blurHiBase = Math.max(blurMinBase, blurMaxBase);
  // Blur pad: X boosts blur range; Y boosts glow/brightness later
  const blurMin = blurLoBase * lerp(1.15, 1.5, padBlur.getX());
  const blurMax = blurHiBase * lerp(1.7, 2.3, padBlur.getX());
  const blurPx =
    lerp(blurMin, blurMax, Math.min(1, intensity * autoImpact)).toFixed(2) + 'px';
  if (glass.style.getPropertyValue('--blur-amount') !== blurPx) {
    glass.style.setProperty('--blur-amount', blurPx);
  }

  // (fog removed)

  // Update systems (fog removed). Optionally brighten slightly with dynamo
  if (window.__dynamoEnabled && dynNorm > 0) {
    CONFIG.particles.brightnessScale *= 1.0 + dynNorm * (window.__dynamoGain - 1.0) * 0.1;
  }
  burstSystem.update(dt);

  renderer.render(scene, camera);

  // FPS
  // FPS measured on real time, not scaled sim time
  accum += rawDt;
  frames++;
  if (t - lastFpsUpdate > 300) {
    const fps = (frames / accum) | 0;
    fpsDiv.textContent = fps + ' fps';
    // Pixel ratio governor (supports 120 Hz mode)
    const maxPR = Math.min(window.devicePixelRatio || 1, CONFIG.renderer.maxPixelRatio);
    if (hz120El && hz120El.checked) {
      if (fps < 116 && targetPixelRatio > 0.75) {
        targetPixelRatio = Math.max(0.75, targetPixelRatio - 0.25);
        renderer.setPixelRatio(targetPixelRatio);
      } else if (fps > 118 && targetPixelRatio < maxPR) {
        targetPixelRatio = Math.min(maxPR, targetPixelRatio + 0.25);
        renderer.setPixelRatio(targetPixelRatio);
      }
    } else {
      if (fps < 52 && targetPixelRatio > 1.0) {
        targetPixelRatio = Math.max(1.0, targetPixelRatio - 0.25);
        renderer.setPixelRatio(targetPixelRatio);
      } else if (fps > 58 && targetPixelRatio < maxPR) {
        targetPixelRatio = Math.min(maxPR, targetPixelRatio + 0.25);
        renderer.setPixelRatio(targetPixelRatio);
      }
    }
    lastFpsUpdate = t;
    accum = 0;
    frames = 0;
  }

  requestAnimationFrame(loop);
}

init();

// Hook up live controls
// fog controls removed
const bgDark = document.getElementById('bgDark');
const bgDarkVal = document.getElementById('bgDarkVal');
const blurMinEl = document.getElementById('blurMin');
const blurMinVal = document.getElementById('blurMinVal');
const blurMaxEl = document.getElementById('blurMax');
const blurMaxVal = document.getElementById('blurMaxVal');
const glassAlpha = document.getElementById('glassAlpha');
const glassAlphaVal = document.getElementById('glassAlphaVal');
const grainOpacity = document.getElementById('grainOpacity');
const grainOpacityVal = document.getElementById('grainOpacityVal');
const grainScale = document.getElementById('grainScale');
const grainScaleVal = document.getElementById('grainScaleVal');
const grainSpeed = document.getElementById('grainSpeed');
const grainSpeedVal = document.getElementById('grainSpeedVal');
const partBright = document.getElementById('partBright');
const partBrightVal = document.getElementById('partBrightVal');
const impact = document.getElementById('impact');
const impactVal = document.getElementById('impactVal');
const lightStrength = document.getElementById('lightStrength');
const lightStrengthVal = document.getElementById('lightStrengthVal');
const partCount = document.getElementById('partCount');
const partCountVal = document.getElementById('partCountVal');
const partSize = document.getElementById('partSize');
const partSizeVal = document.getElementById('partSizeVal');
const minSat = document.getElementById('minSat');
const minSatVal = document.getElementById('minSatVal');
const hueJitter = document.getElementById('hueJitter');
const hueJitterVal = document.getElementById('hueJitterVal');
const meterDecayEl = document.getElementById('meterDecay');
const meterDecayVal = document.getElementById('meterDecayVal');
const burstAlphaEl = document.getElementById('burstAlpha');
const burstAlphaVal = document.getElementById('burstAlphaVal');
const meterIncEl = document.getElementById('meterInc');
const meterIncVal = document.getElementById('meterIncVal');
const resetBtn = document.getElementById('resetControls');
const presetBar = document.getElementById('presets');
const autoModeEl = document.getElementById('autoMode');
const autoSensEl = document.getElementById('autoSens');
const autoSensVal = document.getElementById('autoSensVal');
const toggleUIBtn = document.getElementById('toggleUI');
// fog-related controls removed
const hz120El = document.getElementById('hz120');
const timeScaleEl = document.getElementById('timeScale');
const timeScaleVal = document.getElementById('timeScaleVal');
const exportJsonBtn = document.getElementById('exportJson');
const importJsonBtn = document.getElementById('importJson');
const importJsonFile = document.getElementById('importJsonFile');
const glassPresetBar = document.getElementById('glassPresets');

function updateFogUI() {
  // repurpose to update global scene + glass
  // Darkness / background
  const dark = parseFloat(bgDark.value);
  bgDarkVal.textContent = dark.toFixed(2);
  const base = 0x0b0f12;
  const r = ((base >> 16) & 255) * (1 + dark * -1);
  const g = ((base >> 8) & 255) * (1 + dark * -1);
  const b = (base & 255) * (1 + dark * -1);
  renderer.setClearColor((r << 16) | (g << 8) | (b | 0), 1);

  // Glass - dark blue tint
  const gA = parseFloat(glassAlpha.value);
  glassAlphaVal.textContent = gA.toFixed(2);
  glass.style.background = `rgba(80,120,160,${gA.toFixed(3)})`;
  // Blur bounds labels
  blurMinVal.textContent = blurMinEl.value;
  blurMaxVal.textContent = blurMaxEl.value;

  // Grain
  const gOpRaw = parseFloat(grainOpacity.value);
  const gOp = clamp(gOpRaw, 0, 1);
  grainOpacityVal.textContent = gOp.toFixed(3);
  grain.style.opacity = gOp.toString();
  const gSc = parseFloat(grainScale.value);
  grainScaleVal.textContent = gSc.toFixed(0);
  grain.style.backgroundSize = `${gSc}px ${gSc}px`;
  const gSp = parseFloat(grainSpeed.value);
  grainSpeedVal.textContent = gSp.toFixed(0);
  // Use scaled simulation time for grain motion
  const ox = Math.sin(simTime * 0.7) * gSp;
  const oy = Math.cos(simTime * 0.5) * gSp;
  grain.style.backgroundPosition = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;

  // Particles
  const pb = parseFloat(partBright.value);
  partBrightVal.textContent = pb.toFixed(2);
  CONFIG.particles.brightnessScale = pb; // defaults now lower; impact controls additive boost
  const ls = parseFloat(lightStrength.value || '1.0');
  lightStrengthVal.textContent = ls.toFixed(2);
  // Macro: map Light Strength to brightness, count, size
  CONFIG.particles.brightnessScale = pb * ls;
  CONFIG.particles.countScale = lerp(0.7, 1.6, (ls - 0.5) / 1.5);
  CONFIG.particles.sizeScale = lerp(0.85, 1.5, (ls - 0.5) / 1.5);
  const imp = parseFloat(impact.value);
  impactVal.textContent = imp.toFixed(2);
  window.__impactGain = imp;
  const pc = parseFloat(partCount.value);
  partCountVal.textContent = pc.toFixed(2);
  CONFIG.particles.countScale = pc;
  const ps = parseFloat(partSize.value);
  partSizeVal.textContent = ps.toFixed(2);
  CONFIG.particles.sizeScale = ps;
  const ms = parseFloat(minSat.value);
  minSatVal.textContent = ms.toFixed(2);
  CONFIG.particles.minSaturation = ms;
  const hj = parseFloat(hueJitter.value);
  hueJitterVal.textContent = hj.toFixed(0);
  CONFIG.particles.hueJitterDeg = hj;

  // Time scale
  if (timeScaleEl && timeScaleVal) {
    const ts = clamp(parseFloat(timeScaleEl.value) || 1, 0.1, 2.0);
    timeScaleVal.textContent = ts.toFixed(2);
    CONFIG.timeScale = ts;
  }

  // Auto mode readout
  if (autoSensEl && autoSensVal)
    autoSensVal.textContent = (parseFloat(autoSensEl.value) || 0).toFixed(2);
  // fog-specific UI removed

  // Meter decay and burst alpha
  if (meterDecayEl && meterDecayVal) {
    CONFIG.meter.decayPerSec = parseFloat(meterDecayEl.value) || CONFIG.meter.decayPerSec;
    meterDecayVal.textContent = CONFIG.meter.decayPerSec.toFixed(2);
  }
  if (burstAlphaEl && burstAlphaVal) {
    window.__burstAlpha = Math.max(
      0,
      Math.min(1, parseFloat(burstAlphaEl.value) || 0.25),
    );
    burstAlphaVal.textContent = window.__burstAlpha.toFixed(2);
  }
  if (meterIncEl && meterIncVal) {
    CONFIG.meter.inc = parseFloat(meterIncEl.value) || CONFIG.meter.inc;
    meterIncVal.textContent = CONFIG.meter.inc.toFixed(2);
  }
}

// Hook up all controls to live update
const allControlElements = [
  bgDark,
  blurMinEl,
  blurMaxEl,
  glassAlpha,
  grainOpacity,
  grainScale,
  grainSpeed,
  partBright,
  partCount,
  partSize,
  minSat,
  hueJitter,
  lightStrength,
  impact,
  meterDecayEl,
  burstAlphaEl,
  meterIncEl,
  timeScaleEl,
];
for (const el of allControlElements) {
  if (el) el.addEventListener('input', updateFogUI);
}
updateFogUI();

// Persist controls to localStorage
const CONTROL_KEYS = [
  'bgDark',
  'blurMin',
  'blurMax',
  'glassAlpha',
  'grainOpacity',
  'grainScale',
  'grainSpeed',
  'lightStrength',
  'partBright',
  'impact',
  'partCount',
  'partSize',
  'minSat',
  'hueJitter',
  'autoMode',
  'autoSens',
  'meterDecay',
  'burstAlpha',
  'meterInc',
  'hz120',
  'timeScale',
];

const LS_CONTROLS_KEY = 'ethereal_controls'; // legacy flat values
const LS_FULLCFG_KEY = 'ethereal_config_v1'; // robust, versioned config object

function coerceToNumber(v, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function readControlValue(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  if (el.type === 'checkbox') return !!el.checked;
  return el.value;
}

function writeControlValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === 'checkbox') {
    el.checked = value === true || value === 'true';
  } else if (value != null) {
    el.value = String(value);
  }
}

function saveControls() {
  // Back-compat: flat map of control values (strings/booleans as-is)
  const flat = {};
  for (const k of CONTROL_KEYS) flat[k] = readControlValue(k);
  localStorage.setItem(LS_CONTROLS_KEY, JSON.stringify(flat));
  // Full config as robust JSON
  saveFullConfigToLocalStorage();
}

function loadControls() {
  // Prefer full config; fall back to legacy flat controls
  if (loadFullConfigFromLocalStorage()) return;
  const raw = localStorage.getItem(LS_CONTROLS_KEY);
  if (!raw) return false;
  try {
    const obj = JSON.parse(raw);
    for (const k of CONTROL_KEYS) writeControlValue(k, obj[k]);
    return true;
  } catch {
    return false;
  }
}

function buildFullConfigObject() {
  const controls = {};
  for (const k of CONTROL_KEYS) controls[k] = readControlValue(k);
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    pads: {
      density: { x: padDensity.getX(), y: padDensity.getY() },
      blur: { x: padBlur.getX(), y: padBlur.getY() },
    },
    engine: {
      meter: { ...CONFIG.meter },
      renderer: { ...CONFIG.renderer },
      particles: { ...CONFIG.particles },
    },
    ui: {
      hz120: !!(hz120El && hz120El.checked),
      timeScale: CONFIG.timeScale,
    },
    controls,
  };
}

function applyFullConfigObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  // Controls
  if (obj.controls && typeof obj.controls === 'object') {
    for (const k of CONTROL_KEYS)
      if (obj.controls[k] != null) writeControlValue(k, obj.controls[k]);
  }
  // Pads
  const pads = obj.pads || {};
  const d = pads.density || {};
  const b = pads.blur || {};
  if (typeof d.x === 'number') padDensity.x = Math.min(Math.max(d.x, 0), 1);
  if (typeof d.y === 'number') padDensity.y = Math.min(Math.max(d.y, 0), 1);
  padDensity._render();
  padDensity._emit();
  if (typeof b.x === 'number') padBlur.x = Math.min(Math.max(b.x, 0), 1);
  if (typeof b.y === 'number') padBlur.y = Math.min(Math.max(b.y, 0), 1);
  padBlur._render();
  padBlur._emit();
  // Engine merges (forward-compatible)
  if (obj.engine && typeof obj.engine === 'object') {
    if (obj.engine.meter) Object.assign(CONFIG.meter, obj.engine.meter);
    if (obj.engine.renderer) Object.assign(CONFIG.renderer, obj.engine.renderer);
    if (obj.engine.particles) Object.assign(CONFIG.particles, obj.engine.particles);
  }
  // UI
  if (obj.ui && typeof obj.ui === 'object') {
    if (hz120El && obj.ui.hz120 != null) hz120El.checked = !!obj.ui.hz120;
    if (timeScaleEl && obj.ui.timeScale != null) {
      timeScaleEl.value = String(obj.ui.timeScale);
      CONFIG.timeScale = clamp(parseFloat(timeScaleEl.value) || 1, 0.1, 2.0);
    }
  }
  updateFogUI();
  return true;
}

function saveFullConfigToLocalStorage() {
  try {
    localStorage.setItem(LS_FULLCFG_KEY, JSON.stringify(buildFullConfigObject()));
  } catch {}
}

function loadFullConfigFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_FULLCFG_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return applyFullConfigObject(obj);
  } catch {
    return false;
  }
}

for (const k of CONTROL_KEYS) {
  const el = document.getElementById(k);
  if (el) el.addEventListener('change', saveControls);
}
loadControls();
updateFogUI();

// Reset to defaults
resetBtn.addEventListener('click', () => {
  const defaults = {
    bgDark: '0.00',
    blurMin: '24',
    blurMax: '10',
    glassAlpha: '0.06',
    grainOpacity: '0.00',
    grainScale: '256',
    grainSpeed: '18',
    lightStrength: '2.00',
    partBright: '0.40',
    impact: '0.75',
    partCount: '0.50',
    partSize: '1.20',
    minSat: '0.75',
    hueJitter: '8',
    meterDecay: '0.05',
    burstAlpha: '0.15',
    meterInc: '0.08',
    autoMode: 'true',
    autoSens: '0.60',
    timeScale: '1.00',
  };
  for (const k of CONTROL_KEYS) {
    const el = document.getElementById(k);
    if (el) {
      if (el.type === 'checkbox') {
        el.checked = defaults[k] === 'true';
      } else {
        el.value = defaults[k] || '';
      }
    }
  }
  saveControls();
  updateFogUI();
});

// Ethereal mood presets that capture the original vision
function applyPreset(name) {
  const P = {
    whisper: {
      // The first gentle whisper - minimal fog, subtle particles, but VISIBLE
      meterInc: '0.06',
      meterDecay: '0.04',
      burstAlpha: '0.20',
      partBright: '0.30',
      lightStrength: '1.5',
      impact: '0.8',
      partCount: '0.4',
      partSize: '1.0',
      fogAlpha: '0.06',
      fogScale: '1.8',
      fogSpeed: '0.4',
      fogPush: '0.2',
      blurMin: '16',
      blurMax: '8',
      glassAlpha: '0.04',
      grainOpacity: '0.08',
      bgDark: '0.0',
      padSettings: { density: [0.35, 0.4], blur: [0.2, 0.3], fog: [0.4, 0.2] },
    },
    echo: {
      // Continuing whispers becoming sequence of tones
      meterInc: '0.08',
      meterDecay: '0.06',
      burstAlpha: '0.18',
      partBright: '0.35',
      lightStrength: '1.8',
      impact: '0.6',
      partCount: '0.5',
      partSize: '1.1',
      fogAlpha: '0.08',
      fogScale: '1.4',
      fogSpeed: '0.7',
      fogPush: '0.4',
      blurMin: '18',
      blurMax: '10',
      glassAlpha: '0.05',
      grainOpacity: '0.10',
      bgDark: '0.05',
      padSettings: { density: [0.5, 0.55], blur: [0.35, 0.45], fog: [0.55, 0.35] },
    },
    aurora: {
      // Gentle northern lights - slow, flowing, mysterious
      meterInc: '0.05',
      meterDecay: '0.03',
      burstAlpha: '0.25',
      partBright: '0.45',
      lightStrength: '2.2',
      impact: '0.4',
      partCount: '0.3',
      partSize: '1.8',
      fogAlpha: '0.12',
      fogScale: '1.6',
      fogSpeed: '0.5',
      fogPush: '0.1',
      blurMin: '28',
      blurMax: '16',
      glassAlpha: '0.08',
      grainOpacity: '0.18',
      bgDark: '0.15',
      padSettings: { density: [0.3, 0.7], blur: [0.6, 0.4], fog: [0.7, 0.2] },
    },
    glow: {
      // Playful dance of colours and illumination
      meterInc: '0.10',
      meterDecay: '0.08',
      burstAlpha: '0.22',
      partBright: '0.5',
      lightStrength: '2.5',
      impact: '0.9',
      partCount: '0.65',
      partSize: '1.3',
      fogAlpha: '0.10',
      fogScale: '1.2',
      fogSpeed: '1.2',
      fogPush: '0.6',
      blurMin: '24',
      blurMax: '14',
      glassAlpha: '0.07',
      grainOpacity: '0.14',
      bgDark: '0.1',
      padSettings: { density: [0.65, 0.65], blur: [0.55, 0.65], fog: [0.65, 0.55] },
    },
    symphony: {
      // Fluid typing, growing illumination through heartbeats of colour
      meterInc: '0.14',
      meterDecay: '0.10',
      burstAlpha: '0.28',
      partBright: '0.7',
      lightStrength: '3.8',
      impact: '1.4',
      partCount: '0.9',
      partSize: '1.7',
      fogAlpha: '0.14',
      fogScale: '1.0',
      fogSpeed: '1.8',
      fogPush: '0.9',
      blurMin: '36',
      blurMax: '20',
      glassAlpha: '0.09',
      grainOpacity: '0.16',
      bgDark: '0.2',
      padSettings: { density: [0.8, 0.78], blur: [0.75, 0.82], fog: [0.8, 0.75] },
    },
    storm: {
      // Chaotic energy, rapid bursts, turbulent fog
      meterInc: '0.20',
      meterDecay: '0.25',
      burstAlpha: '0.35',
      partBright: '0.8',
      lightStrength: '4.5',
      impact: '1.8',
      partCount: '1.2',
      partSize: '1.4',
      fogAlpha: '0.16',
      fogScale: '0.7',
      fogSpeed: '3.2',
      fogPush: '1.8',
      blurMin: '20',
      blurMax: '35',
      glassAlpha: '0.06',
      grainOpacity: '0.08',
      bgDark: '0.1',
      padSettings: { density: [0.9, 0.85], blur: [0.4, 0.9], fog: [0.6, 0.95] },
    },
    // Replacements: more atmospheric presets
    mist: {
      // Soft, slow build and decay; diffused
      meterInc: '0.05',
      meterDecay: '0.025',
      burstAlpha: '0.18',
      partBright: '0.35',
      lightStrength: '1.7',
      impact: '0.5',
      partCount: '0.6',
      partSize: '1.8',
      blurMin: '30',
      blurMax: '16',
      glassAlpha: '0.08',
      grainOpacity: '0.18',
      bgDark: '0.08',
      padSettings: { density: [0.45, 0.55], blur: [0.55, 0.45] },
    },
    aether: {
      // Ethereal, slow-breathing light field
      meterInc: '0.06',
      meterDecay: '0.03',
      burstAlpha: '0.22',
      partBright: '0.45',
      lightStrength: '2.2',
      impact: '0.7',
      partCount: '0.7',
      partSize: '2.2',
      blurMin: '34',
      blurMax: '18',
      glassAlpha: '0.09',
      grainOpacity: '0.22',
      bgDark: '0.12',
      padSettings: { density: [0.55, 0.65], blur: [0.65, 0.55] },
    },
    dynamo: {
      // Generator metaphor: typing adds inertia to light engine
      meterInc: '0.07',
      meterDecay: '0.035',
      burstAlpha: '0.24',
      partBright: '0.55',
      lightStrength: '2.6',
      impact: '0.9',
      partCount: '0.8',
      partSize: '2.0',
      blurMin: '28',
      blurMax: '20',
      glassAlpha: '0.08',
      grainOpacity: '0.20',
      bgDark: '0.10',
      padSettings: { density: [0.6, 0.6], blur: [0.7, 0.5] },
      dynamo: { enabled: true, gain: 1.4 },
    },
    cosmic: {
      // Deep space feel - sparse but intense, slow movements
      meterInc: '0.04',
      meterDecay: '0.02',
      burstAlpha: '0.35',
      partBright: '0.6',
      lightStrength: '3.0',
      impact: '0.5',
      partCount: '0.25',
      partSize: '2.8',
      fogAlpha: '0.18',
      fogScale: '3.0',
      fogSpeed: '0.3',
      fogPush: '-0.1',
      blurMin: '45',
      blurMax: '25',
      glassAlpha: '0.12',
      grainOpacity: '0.35',
      bgDark: '0.6',
      padSettings: { density: [0.2, 0.8], blur: [0.7, 0.3], fog: [0.95, 0.1] },
    },
    deep: {
      // Underwater/deep ocean - slow, heavy, mysterious
      meterInc: '0.06',
      meterDecay: '0.03',
      burstAlpha: '0.15',
      partBright: '0.4',
      lightStrength: '1.8',
      impact: '0.6',
      partCount: '0.6',
      partSize: '2.0',
      fogAlpha: '0.22',
      fogScale: '2.2',
      fogSpeed: '0.6',
      fogPush: '0.0',
      blurMin: '35',
      blurMax: '20',
      glassAlpha: '0.14',
      grainOpacity: '0.25',
      bgDark: '0.4',
      padSettings: { density: [0.6, 0.4], blur: [0.8, 0.2], fog: [0.85, 0.3] },
    },
  }[name];
  if (!P) return;

  // Apply slider values
  const apply = (k, v) => {
    const el = document.getElementById(k);
    if (el) {
      el.value = v;
    }
  };
  Object.entries(P).forEach(([k, v]) => {
    if (k !== 'padSettings') apply(k, v);
  });

  // Apply XY pad settings
  if (P.padSettings) {
    if (P.padSettings.density) {
      padDensity.x = P.padSettings.density[0];
      padDensity.y = P.padSettings.density[1];
      padDensity._render();
      padDensity._emit();
      localStorage.setItem(
        'ethereal_xy_pad-density',
        JSON.stringify({ x: padDensity.x, y: padDensity.y }),
      );
    }
    if (P.padSettings.blur) {
      padBlur.x = P.padSettings.blur[0];
      padBlur.y = P.padSettings.blur[1];
      padBlur._render();
      padBlur._emit();
      localStorage.setItem(
        'ethereal_xy_pad-blur',
        JSON.stringify({ x: padBlur.x, y: padBlur.y }),
      );
    }
  }

  // Dynamo toggle
  if (P.dynamo) {
    window.__dynamoEnabled = !!P.dynamo.enabled;
    if (typeof P.dynamo.gain === 'number') window.__dynamoGain = P.dynamo.gain;
  } else {
    window.__dynamoEnabled = false;
  }

  saveControls();
  updateFogUI();
  // visual active state
  for (const btn of presetBar.querySelectorAll('button'))
    btn.classList.remove('preset-active');
  const btn = presetBar.querySelector(`[data-preset="${name}"]`);
  if (btn) btn.classList.add('preset-active');
}

if (presetBar) {
  presetBar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    applyPreset(b.dataset.preset);
  });
}

// Glass presets handler
if (glassPresetBar) {
  glassPresetBar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const type = b.dataset.glass;
    // Reset
    document.getElementById('blurMin').value = '24';
    document.getElementById('blurMax').value = '10';
    document.getElementById('glassAlpha').value = '0.06';
    document.getElementById('grainOpacity').value = '0.10';
    document.getElementById('grainScale').value = '256';
    if (type === 'frosted') {
      document.getElementById('blurMin').value = '26';
      document.getElementById('blurMax').value = '12';
      document.getElementById('grainOpacity').value = '0.12';
      lensDiv.style.opacity = '0';
    } else if (type === 'deep') {
      document.getElementById('blurMin').value = '38';
      document.getElementById('blurMax').value = '20';
      document.getElementById('glassAlpha').value = '0.08';
      document.getElementById('grainOpacity').value = '0.20';
      document.getElementById('grainScale').value = '384';
      lensDiv.style.opacity = '0';
    } else if (type === 'curved') {
      document.getElementById('blurMin').value = '30';
      document.getElementById('blurMax').value = '16';
      document.getElementById('glassAlpha').value = '0.07';
      document.getElementById('grainOpacity').value = '0.10';
      document.getElementById('grainScale').value = '256';
      lensDiv.style.opacity = '1';
    }
    saveControls();
    updateFogUI();
  });
}

// UI hide/show
function toggleUI() {
  document.body.classList.toggle('hidden-ui');
}
if (toggleUIBtn) toggleUIBtn.addEventListener('click', toggleUI);
window.addEventListener('keydown', (e) => {
  if (e.key === '=') toggleUI();
});

// Make controls draggable
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

const controlsPanel = document.getElementById('controls');
if (controlsPanel) {
  controlsPanel.addEventListener('mousedown', (e) => {
    // Only drag from the panel itself, not from controls
    if (e.target === controlsPanel || e.target.closest('.control-group') === null) {
      isDragging = true;
      controlsPanel.classList.add('dragging');

      const rect = controlsPanel.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;

      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;

      // Constrain to viewport
      const maxX = window.innerWidth - controlsPanel.offsetWidth;
      const maxY = window.innerHeight - controlsPanel.offsetHeight;

      const constrainedX = Math.max(0, Math.min(maxX, x));
      const constrainedY = Math.max(0, Math.min(maxY, y));

      controlsPanel.style.right = 'auto';
      controlsPanel.style.top = 'auto';
      controlsPanel.style.transform = 'none';
      controlsPanel.style.left = constrainedX + 'px';
      controlsPanel.style.top = constrainedY + 'px';
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      controlsPanel.classList.remove('dragging');
    }
  });
}

// High-refresh toggles: when enabled, lower blur and particle load slightly
if (hz120El) {
  hz120El.addEventListener('change', () => {
    const enable = hz120El.checked;
    const minEl = document.getElementById('blurMin');
    const maxEl = document.getElementById('blurMax');
    if (enable) {
      minEl.value = Math.max(6, Math.round(parseFloat(minEl.value) * 0.85)).toString();
      maxEl.value = Math.max(6, Math.round(parseFloat(maxEl.value) * 0.85)).toString();
      CONFIG.particles.countScale *= 0.75;
      CONFIG.particles.sizeScale *= 0.9;
    } else {
      CONFIG.particles.countScale /= 0.75;
      CONFIG.particles.sizeScale /= 0.9;
    }
    saveControls();
    updateFogUI();
  });
}

// Export/Import JSON wiring
function downloadBlob(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

if (exportJsonBtn) {
  exportJsonBtn.addEventListener('click', () => {
    const obj = buildFullConfigObject();
    downloadBlob('ethereal-config.json', JSON.stringify(obj, null, 2));
  });
}

if (importJsonBtn && importJsonFile) {
  importJsonBtn.addEventListener('click', () => importJsonFile.click());
  importJsonFile.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || ''));
        if (applyFullConfigObject(obj)) {
          try {
            localStorage.setItem(LS_FULLCFG_KEY, JSON.stringify(obj));
          } catch {}
          saveControls();
        }
      } catch {}
      importJsonFile.value = '';
    };
    reader.readAsText(file);
  });
}
