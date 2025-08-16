import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { FogSystem } from './fog.js';
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
  },
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

// Load particle texture
const loader = new THREE.TextureLoader();
const particleTex = loader.load(particleURL);
particleTex.wrapS = particleTex.wrapT = THREE.ClampToEdgeWrapping;
particleTex.minFilter = THREE.LinearFilter;
particleTex.magFilter = THREE.LinearFilter;

// Noise texture for fog (reuse grain as pseudo-noise)
const noiseTex = loader.load(grainURL);
noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
noiseTex.minFilter = THREE.LinearFilter;
noiseTex.magFilter = THREE.LinearFilter;

let fogSystem, burstSystem;
let lastT = performance.now();
let meter = 0;
let intensity = 0;

// XY pads: integrated into control groups
const densityContainer = document.getElementById('density-pad-container');
const blurContainer = document.getElementById('blur-pad-container');
const fogContainer = document.getElementById('fog-pad-container');
const padDensity = new XYPad(densityContainer, 'pad-density', 'Density / Energy', {
  x: 0.83,
  y: 0.64,
});
const padBlur = new XYPad(blurContainer, 'pad-blur', 'Blur / Glow', { x: 0.77, y: 0.41 });
const padFog = new XYPad(fogContainer, 'pad-fog', 'Fog Scale / Pulse', {
  x: 0.94,
  y: 1.0,
});
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
  if (fogSystem) fogSystem.setAspect(w / h);
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
  burstSystem.spawnBurst(localIntensity, xy, glowBoost);
  // shock impulse to push fog outward briefly
  if (fogSystem) fogSystem.impulse(0.6 * autoImpact);
});

// Glass blur mapping (8px → 12px)
const glass = document.getElementById('glass');
const grain = document.getElementById('grain');

function init() {
  fogSystem = new FogSystem(scene, noiseTex);
  burstSystem = new BurstSystem(scene, particleTex, CONFIG);
  // ensure radial fog uses correct aspect on first frame
  fogSystem.setAspect((window.innerWidth || 1) / (window.innerHeight || 1));
  requestAnimationFrame(loop);
}

function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
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
  // Fog push reacts to meter with an adjustable gain
  const gain = window.__fogPushGain != null ? window.__fogPushGain : 1.2;
  if (fogSystem) fogSystem.setPush(Math.min(1.5, intensity * gain * autoPush));

  // Update glass blur
  const blurMinBase = parseFloat(document.getElementById('blurMin').value) || 8;
  const blurMaxBase = parseFloat(document.getElementById('blurMax').value) || 12;
  const blurLoBase = Math.min(blurMinBase, blurMaxBase);
  const blurHiBase = Math.max(blurMinBase, blurMaxBase);
  // Blur pad: X boosts blur range; Y boosts glow/brightness later
  const blurMin = blurLoBase * lerp(1.3, 1.8, padBlur.getX());
  const blurMax = blurHiBase * lerp(2.0, 3.0, padBlur.getX());
  const blurPx =
    lerp(blurMin, blurMax, Math.min(1, intensity * autoImpact)).toFixed(2) + 'px';
  if (glass.style.getPropertyValue('--blur-amount') !== blurPx) {
    glass.style.setProperty('--blur-amount', blurPx);
  }

  // Fog pad live mapping (Scale / Pulse) — strong influence
  const fogScaleBase = parseFloat(document.getElementById('fogScale').value) || 1.0;
  const fogPulseBase = parseFloat(document.getElementById('fogPulse').value) || 0.0;
  const fogScaleFromPad = lerp(0.25, 3.0, padFog.getX());
  const fogPulseFromPad = lerp(-1.0, 1.0, padFog.getY());
  fogSystem.setScale(fogScaleBase * fogScaleFromPad);
  fogSystem.setPulse(fogPulseBase + fogPulseFromPad);

  // Update systems
  fogSystem.update(dt, t * 0.001);
  burstSystem.update(dt);

  renderer.render(scene, camera);

  // FPS
  accum += dt;
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
const fogAlpha = document.getElementById('fogAlpha');
const fogAlphaVal = document.getElementById('fogAlphaVal');
const fogScale = document.getElementById('fogScale');
const fogScaleVal = document.getElementById('fogScaleVal');
const fogPulse = document.getElementById('fogPulse');
const fogPulseVal = document.getElementById('fogPulseVal');
const fogSpeed = document.getElementById('fogSpeed');
const fogSpeedVal = document.getElementById('fogSpeedVal');
const fogPush = document.getElementById('fogPush');
const fogPushVal = document.getElementById('fogPushVal');
const fogRot = document.getElementById('fogRot');
const fogRotVal = document.getElementById('fogRotVal');
const fogExpand = document.getElementById('fogExpand');
const fogExpandVal = document.getElementById('fogExpandVal');
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
const shockRadiusEl = document.getElementById('shockRadius');
const shockRadiusVal = document.getElementById('shockRadiusVal');
const vignetteEl = document.getElementById('vignette');
const vignetteVal = document.getElementById('vignetteVal');
const hz120El = document.getElementById('hz120');

function updateFogUI() {
  if (!fogSystem) return;
  const aRaw = parseFloat(fogAlpha.value);
  const a = Math.max(0, aRaw);
  fogAlphaVal.textContent = a.toFixed(2);
  fogSystem.setAlpha(a);

  const s = parseFloat(fogScale.value);
  fogScaleVal.textContent = s.toFixed(2);
  fogSystem.setScale(s);

  const p = parseFloat(fogPulse.value);
  fogPulseVal.textContent = p.toFixed(2);
  fogSystem.setPulse(p);

  const sp = parseFloat(fogSpeed.value);
  fogSpeedVal.textContent = sp.toFixed(2);
  fogSystem.setSpeedScale(sp);

  const pushG = parseFloat(fogPush.value);
  fogPushVal.textContent = pushG.toFixed(2);
  // store push gain in a simple global for the loop
  window.__fogPushGain = pushG;

  // Rotation and expansion multipliers
  const rot = parseFloat(fogRot.value);
  fogRotVal.textContent = rot.toFixed(2);
  const exp = parseFloat(fogExpand.value);
  fogExpandVal.textContent = exp.toFixed(2);
  for (const l of fogSystem.layers) {
    l.mesh.material.uniforms.uRotSpeed.value = rot * fogSystem.baseSpeeds[0] * 0.1; // scaled rotation
    l.mesh.material.uniforms.uExpandSpeed.value = exp * 0.03; // global expand scaler
  }

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
  // simple offset animation via requestAnimationFrame step in loop
  const t = performance.now() * 0.001;
  const ox = Math.sin(t * 0.7) * gSp;
  const oy = Math.cos(t * 0.5) * gSp;
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

  // Auto mode readout
  if (autoSensEl && autoSensVal)
    autoSensVal.textContent = (parseFloat(autoSensEl.value) || 0).toFixed(2);
  if (shockRadiusEl && shockRadiusVal)
    shockRadiusVal.textContent = (parseFloat(shockRadiusEl.value) || 0.42).toFixed(2);
  if (vignetteEl && vignetteVal)
    vignetteVal.textContent = (parseFloat(vignetteEl.value) || 0.12).toFixed(2);
  if (fogSystem && shockRadiusEl) {
    for (const l of fogSystem.layers)
      l.mesh.material.uniforms.uShockRadius.value =
        parseFloat(shockRadiusEl.value) || 0.42;
  }
  if (fogSystem && vignetteEl) fogSystem.setVignette(parseFloat(vignetteEl.value) || 0.0);

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
  fogAlpha,
  fogScale,
  fogPulse,
  fogSpeed,
  fogPush,
  fogRot,
  fogExpand,
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
  shockRadiusEl,
  vignetteEl,
];
for (const el of allControlElements) {
  if (el) el.addEventListener('input', updateFogUI);
}
updateFogUI();

// Persist controls to localStorage
const CONTROL_KEYS = [
  'fogAlpha',
  'fogScale',
  'fogPulse',
  'fogSpeed',
  'fogPush',
  'fogRot',
  'fogExpand',
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
  'shockRadius',
  'vignette',
];

function saveControls() {
  const obj = {};
  for (const k of CONTROL_KEYS) obj[k] = document.getElementById(k).value;
  localStorage.setItem('ethereal_controls', JSON.stringify(obj));
}

function loadControls() {
  const raw = localStorage.getItem('ethereal_controls');
  if (!raw) return;
  try {
    const obj = JSON.parse(raw);
    for (const k of CONTROL_KEYS) {
      if (obj[k] != null) document.getElementById(k).value = obj[k];
    }
  } catch {}
}

for (const k of CONTROL_KEYS) {
  document.getElementById(k).addEventListener('change', saveControls);
}
loadControls();
updateFogUI();

// Reset to defaults
resetBtn.addEventListener('click', () => {
  const defaults = {
    fogAlpha: '0.00',
    fogScale: '1.20',
    fogPulse: '0.00',
    fogSpeed: '2.00',
    fogPush: '0.00',
    fogRot: '2.00',
    fogExpand: '1.00',
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
    shockRadius: '0.42',
    vignette: '0.12',
    autoMode: 'true',
    autoSens: '0.60',
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
    tempest: {
      // Explosive bursts, maximum energy unleashed
      meterInc: '0.25',
      meterDecay: '0.15',
      burstAlpha: '0.45',
      partBright: '1.0',
      lightStrength: '6.5',
      impact: '2.5',
      partCount: '1.8',
      partSize: '2.5',
      fogAlpha: '0.20',
      fogScale: '0.8',
      fogSpeed: '3.0',
      fogPush: '2.0',
      blurMin: '50',
      blurMax: '30',
      glassAlpha: '0.12',
      grainOpacity: '0.28',
      bgDark: '0.35',
      padSettings: { density: [0.98, 0.95], blur: [0.95, 0.98], fog: [0.9, 0.92] },
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
    void: {
      // Return to darkness, wandering through fog again - but VISIBLE
      meterInc: '0.03',
      meterDecay: '0.015',
      burstAlpha: '0.12',
      partBright: '0.25',
      lightStrength: '1.0',
      impact: '0.3',
      partCount: '0.3',
      partSize: '1.5',
      fogAlpha: '0.30',
      fogScale: '2.8',
      fogSpeed: '0.4',
      fogPush: '-0.3',
      blurMin: '65',
      blurMax: '45',
      glassAlpha: '0.18',
      grainOpacity: '0.5',
      bgDark: '0.7',
      padSettings: { density: [0.15, 0.25], blur: [0.9, 0.1], fog: [0.95, 0.9] },
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
    if (P.padSettings.fog) {
      padFog.x = P.padSettings.fog[0];
      padFog.y = P.padSettings.fog[1];
      padFog._render();
      padFog._emit();
      localStorage.setItem(
        'ethereal_xy_pad-fog',
        JSON.stringify({ x: padFog.x, y: padFog.y }),
      );
    }
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
