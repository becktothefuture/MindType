/*╔══════════════════════════════════════════════════════╗
  ║  ░  M T  S C R O L L  A N I M  V 1  C O R E  ░░░░░░  ║
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
  • WHAT ▸ Effect engine: prepare → order → animate; rAF scrambler fallback
  • WHY  ▸ Airport-style reveal on enter; exit scrub via ScrollTrigger
  • HOW  ▸ One ST per block, shared ticker per active block, cleanup-safe
*/

import { splitTargets, observeEnter, prefersReducedMotion } from './dom.js';
import { gsap } from 'https://esm.sh/gsap@3.12.5';

function dbg(...args) {
  try {
    console.log('[mt]', ...args);
  } catch {}
}

export const DEFAULTS = {
  selector: '[data-mt]',
  unit: 'char', // 'line' | 'word' | 'char'
  fontDesktop: 120,
  fontMobile: 54,
  wave: 4,
  scatter: 0.2,
  randomness: 0.4,
  fps: 30,
  charset:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !@#$%^&*(){}[]<>+=?_·:;|',
  // Builder glyphs (center rows only: dots {2,3,5,6}); AUTO generates from Unicode map
  brailleCharset: 'AUTO',
  brailleBias: 0.35, // 0..1 probability to pick from braille set
  settleMs: 120,
  enterThreshold: 0.1,
  enterOffsetPx: 0,
  lineEnterPercent: 10,
  lineExitTopPercent: 15,
  exitTopPercent: 10,
  minExitOpacity: 0.6,
  blurPx: 4,
  scaleMax: 1.04,
  yUp: 20,
  triggerOnce: true,
  colorFinal: '#fff',
  colorActive: '#FF2DAA',
  // Neon complementary defaults: pink and orange family
  colorActive1: '#FF2DAA',
  colorActive2: '#FF6A00',
  colorActive3: '#FF7A00',
  colorActive4: '#FFD166',
  activeOpacity: 0.9,
  activeJitter: 0.06, // subtle random color shifts
  activeHueOscDeg: 20, // ± degrees hue oscillation
};

const ACTIVE_LIMIT = 300; // max concurrent active chars across page

export function createEngine(userConfig = {}) {
  let config = { ...DEFAULTS, ...userConfig };
  let controllers = [];
  let triggers = [];
  let exitTweens = [];
  let observers = [];
  let tickerRefs = new Set();
  let destroyed = false;

  function getConfig() {
    return config;
  }

  function setConfig(patch) {
    config = { ...config, ...patch };
    // For structural changes, restart
    restart();
  }

  function mount() {
    destroyed = false;
    controllers = splitTargets(config.selector);
    dbg('mount()', { blocks: controllers.length, selector: config.selector });
    setupBlocks();
  }

  function unmount() {
    destroyed = true;
    dbg('unmount()');
    const ST = gsap.plugins?.ScrollTrigger;
    if (ST) {
      try {
        ST.getAll().forEach((t) => t.kill());
      } catch {}
    }
    for (const t of exitTweens) t.kill();
    exitTweens = [];
    for (const st of triggers) st.kill?.();
    triggers = [];
    for (const o of observers) o.disconnect?.();
    observers = [];
    for (const tk of tickerRefs) tk.stop();
    tickerRefs.clear();
    controllers = [];
  }

  function restart() {
    unmount();
    mount();
  }

  function setupBlocks() {
    controllers.forEach((ctl) => prepareBlock(ctl));
  }

  function prepareBlock(ctl) {
    // Initial visual state
    ctl.el.style.setProperty('--mt-exit-blur', `${config.blurPx}px`);
    // Start block invisible to prevent FOUC; reveal on enter
    gsap.set(ctl.el, { opacity: 0, filter: 'none', y: 0, scale: 1 });

    // Build a quick map from char element to index for line operations
    if (!ctl._charIndexMap) {
      ctl._charIndexMap = new Map();
      ctl.chars.forEach((c, i) => ctl._charIndexMap.set(c, i));
    }

    // Line-level entry and exit
    const startPos = 100 - (config.lineEnterPercent || 10); // e.g., 90% means 10% from bottom
    const weighted = weightedCharset(
      config.charset,
      config.brailleCharset,
      config.brailleBias,
    );
    ctl.lines.forEach((ln) => {
      // Entry: start scrambling when bottom of line reaches viewport startPos%
      gsap.to(
        {},
        {
          scrollTrigger: {
            trigger: ln,
            start: `bottom ${startPos}%`,
            once: config.triggerOnce,
            onEnter: () => runEnterLine(ctl, ln, weighted),
          },
        },
      );
    });

    // Exit: prefer ScrollTrigger.batch to reduce instance count on long pages
    const ST = gsap.plugins?.ScrollTrigger;
    if (ST && typeof ST.batch === 'function' && ctl.lines.length) {
      ST.batch(ctl.lines, {
        start: () => `top ${config.lineExitTopPercent || 15}%`,
        end: 'bottom top',
        scrub: 0.2,
        onUpdate: (batch) => {
          for (const ln of batch) {
            const inst = ST.getByTrigger(ln);
            const p = inst ? inst.progress : 0;
            gsap.set(ln, {
              opacity: gsap.utils.mapRange(0, 1, 1, config.minExitOpacity, p),
              y: gsap.utils.mapRange(0, 1, 0, -config.yUp, p),
              filter: `blur(${config.blurPx * p}px)`,
              scale: gsap.utils.mapRange(0, 1, 1, config.scaleMax, p),
            });
          }
        },
      });
    } else {
      // Fallback: one ST per line (existing behavior)
      ctl.lines.forEach((ln) => {
        const t = gsap.fromTo(
          ln,
          { opacity: 1, y: 0, filter: 'none', scale: 1 },
          {
            opacity: () => config.minExitOpacity,
            y: -config.yUp,
            filter: `blur(${config.blurPx}px)`,
            scale: config.scaleMax,
            ease: 'none',
            scrollTrigger: {
              trigger: ln,
              start: () => `top ${config.lineExitTopPercent || 15}%`,
              end: 'bottom top',
              scrub: 0.2,
            },
          },
        );
        exitTweens.push(t);
        if (t.scrollTrigger) triggers.push(t.scrollTrigger);
      });
    }
  }

  function orderUnits(ctl) {
    const unit = config.unit;
    let groups = unit === 'line' ? ctl.lines : unit === 'word' ? ctl.words : ctl.chars;
    // Fallback if too many chars
    if (groups === ctl.chars && ctl.chars.length > 5000) groups = ctl.words;
    return groups;
  }

  function computeOrderedIndices(ctl, unit) {
    // Map desired unit grouping back to character indices so ticker can operate
    // consistently on char spans.
    if (unit === 'char') return Array.from(ctl.chars, (_, i) => i);

    // Build index map: for each word/line, collect contained chars' indices
    const indices = [];
    const indexMap = new Map();
    ctl.chars.forEach((c, i) => indexMap.set(c, i));
    if (unit === 'word') {
      ctl.words.forEach((w) => {
        const chars = w.querySelectorAll('.mt-char');
        chars.forEach((c) => {
          const i = indexMap.get(c);
          if (i >= 0) indices.push(i);
        });
      });
    } else if (unit === 'line') {
      ctl.lines.forEach((ln) => {
        const chars = ln.querySelectorAll('.mt-char');
        chars.forEach((c) => {
          const i = indexMap.get(c);
          if (i >= 0) indices.push(i);
        });
      });
    }
    // Fallback to natural order if empty
    return indices.length ? indices : Array.from(ctl.chars, (_, i) => i);
  }

  function runEnter(ctl) {
    if (prefersReducedMotion()) {
      // Quick snap
      ctl.chars.forEach((c, i) => {
        c.textContent = ctl.finalChars[i];
        c.style.opacity = '1';
        c.style.color = config.colorFinal;
      });
      gsap.to(ctl.el, { opacity: 1, duration: 0.2, overwrite: 'auto' });
      dbg('reduced-motion: snap reveal');
      return;
    }

    // Try GSAP ScrambleTextPlugin if present
    const hasScramble = !!gsap.plugins?.ScrambleTextPlugin;
    // Reveal parent opacity immediately on enter
    gsap.to(ctl.el, { opacity: 1, duration: 0.2, overwrite: 'auto' });

    if (hasScramble) {
      dbg('using ScrambleTextPlugin');
      animateWithScramblePlugin(ctl);
    } else {
      dbg('using rAF ticker fallback');
      animateWithTicker(ctl);
    }
  }

  function runEnterLine(ctl, lineEl, weighted) {
    if (prefersReducedMotion()) {
      const chars = lineEl.querySelectorAll('.mt-char');
      chars.forEach((c) => {
        c.textContent = c.dataset.final || c.textContent;
        c.style.opacity = '1';
        c.style.color = config.colorFinal;
      });
      gsap.to(ctl.el, { opacity: 1, duration: 0.2, overwrite: 'auto' });
      return;
    }
    const hasScramble = !!gsap.plugins?.ScrambleTextPlugin;
    gsap.to(ctl.el, { opacity: 1, duration: 0.2, overwrite: 'auto' });
    if (hasScramble) {
      gsap.to(lineEl, {
        duration: 0.6,
        scrambleText: {
          text: lineEl.textContent,
          chars: weighted,
          revealDelay: 0,
          speed: config.fps,
          rightToLeft: false,
        },
        color: config.colorFinal,
        onStart: () =>
          gsap.set(lineEl, {
            opacity: config.activeOpacity,
            color: pickActiveColor(config),
          }),
        ease: 'power2.out',
      });
    } else {
      animateWithTickerLine(ctl, lineEl);
    }
  }

  function animateWithTickerLine(ctl, lineEl) {
    const chars = Array.from(lineEl.querySelectorAll('.mt-char'));
    const final = chars.map((c) => c.dataset.final || c.textContent || '');
    const total = chars.length;
    const wave = Math.max(1, Math.floor(config.wave));
    const scatter = clamp01(config.scatter);
    const randomness = clamp01(config.randomness);
    const perFrame = Math.max(1, Math.min(wave, total));
    const active = new Set();
    const settled = new Array(total).fill(false);
    const settleAt = new Array(total).fill(0);
    const frameInterval = 1000 / config.fps;
    let lastFrame = 0;
    // init
    for (let i = 0; i < total; i++) {
      chars[i].style.opacity = '0';
      chars[i].style.color = pickActiveColor(config);
    }

    function tick(now) {
      if (now - lastFrame < frameInterval) return raf();
      lastFrame = now;
      // choose window start based on settled progress
      const settledCount = settled.reduce((a, v) => a + (v ? 1 : 0), 0);
      const start = Math.min(total - 1, settledCount);
      let end = Math.min(total, start + wave);
      let candidates = [];
      for (let i = start; i < end; i++) if (!settled[i]) candidates.push(i);
      if (scatter > 0 && candidates.length > 1) shuffleInPlace(candidates, scatter);
      const slice = candidates.slice(0, perFrame);
      slice.forEach((i) => {
        if (!active.has(i)) {
          active.add(i);
          settleAt[i] =
            now + Math.max(60, config.settleMs) * (1 + randomness * Math.random());
        }
      });
      for (const i of Array.from(active)) {
        const c = chars[i];
        c.style.opacity = String(config.activeOpacity ?? 1);
        if (now >= settleAt[i]) {
          c.textContent = final[i];
          c.style.color = config.colorFinal;
          settled[i] = true;
          active.delete(i);
        } else {
          c.textContent = randomGlyph(
            config.charset,
            config.brailleCharset,
            config.brailleBias,
          );
        }
      }
      if (settled.every(Boolean)) return stop();
      raf();
    }
    function raf() {
      tk._id = requestAnimationFrame(tick);
    }
    function stop() {
      cancelAnimationFrame(tk._id);
      tickerRefs.delete(tk);
    }
    const tk = { _id: 0, stop };
    tickerRefs.add(tk);
    raf();
  }

  function animateWithScramblePlugin(ctl) {
    const units = orderUnits(ctl);
    const tl = gsap.timeline();
    const weighted = weightedCharset(
      config.charset,
      config.brailleCharset,
      config.brailleBias,
    );
    // For line/word, scramble blocks with small per-char stagger
    units.forEach((unitEl) => {
      tl.to(
        unitEl,
        {
          duration: 0.6,
          scrambleText: {
            text: unitEl.textContent,
            chars: weighted,
            revealDelay: 0,
            speed: config.fps,
            rightToLeft: false,
          },
          color: config.colorFinal,
          onStart: () =>
            gsap.set(unitEl, {
              opacity: config.activeOpacity,
              color: pickActiveColor(config),
            }),
          stagger: { each: 0.008 },
          ease: 'power2.out',
        },
        0,
      );
    });
  }

  function animateWithTicker(ctl) {
    const chars = ctl.chars;
    const final = ctl.finalChars;
    const total = chars.length;
    const ordered = computeOrderedIndices(ctl, config.unit);
    const orderedTotal = ordered.length;
    const wave = Math.max(1, Math.floor(config.wave));
    const scatter = clamp01(config.scatter);
    const randomness = clamp01(config.randomness);
    const perFrame = Math.max(
      1,
      Math.floor(ACTIVE_LIMIT / Math.max(1, controllers.length)),
    );
    const active = new Set();
    const settled = new Array(total).fill(false);
    const activatedAt = new Array(total).fill(0);
    const settleAt = new Array(total).fill(0);
    const startTime = performance.now();
    const frameInterval = 1000 / config.fps;
    let lastFrame = 0;
    const lastColorAt = new Array(total).fill(0);
    const activeColorIndex = new Array(total).fill(-1);

    // Preclear to empty chars with opacity 0
    for (let i = 0; i < total; i++) {
      const c = chars[i];
      c.style.opacity = '0';
      c.style.color = pickActiveColor(config);
      c.textContent = '\u00A0' === final[i] ? '\u00A0' : ' ';
    }
    dbg('ticker start', { total, wave, scatter, fps: config.fps });

    function pickWindowStart(progress) {
      return Math.floor(progress * orderedTotal);
    }

    function tick(now) {
      if (destroyed) return stop();
      if (now - lastFrame < frameInterval) return raf();
      lastFrame = now;

      // Determine window start advancing left→right over time by settled count
      const settledCount = settled.reduce((a, v) => a + (v ? 1 : 0), 0);
      const progress = settledCount / total;
      let start = pickWindowStart(progress);
      let end = Math.min(orderedTotal, start + wave);
      // Build window candidates based on ordered indices
      let candidates = [];
      for (let i = start; i < end; i++) {
        const idx = ordered[i];
        if (!settled[idx]) candidates.push(idx);
      }
      if (scatter > 0 && candidates.length > 1) shuffleInPlace(candidates, scatter);

      // Activate a slice capped globally
      const allow = Math.max(1, Math.min(candidates.length, perFrame));
      const chosen = candidates.slice(0, allow);
      const nowMs = now;
      for (const idx of chosen) {
        if (!active.has(idx)) {
          active.add(idx);
          activatedAt[idx] = nowMs;
          const jitter = 1 + randomness * Math.random();
          settleAt[idx] = nowMs + Math.max(60, config.settleMs) * jitter;
        }
      }

      // Mutate active chars
      for (const idx of Array.from(active)) {
        if (settled[idx]) {
          active.delete(idx);
          continue;
        }
        const ch = chars[idx];
        const finalCh = final[idx];
        if (finalCh === '\n') {
          settled[idx] = true;
          active.delete(idx);
          continue;
        }
        ch.style.opacity = String(config.activeOpacity ?? 1);
        // Occasionally rotate active color for organic shimmer
        if (now - lastColorAt[idx] > 80) {
          ch.style.color = pickActiveColor(config, activeColorIndex[idx]);
          lastColorAt[idx] = now;
        }
        const shouldSettle = now >= settleAt[idx];
        if (shouldSettle) {
          ch.textContent = finalCh;
          ch.style.color = config.colorFinal;
          // no settle bump; keep scale stable
          settled[idx] = true;
          active.delete(idx);
        } else {
          ch.textContent = randomGlyph(
            config.charset,
            config.brailleCharset,
            config.brailleBias,
          );
        }
      }

      // Stop when done
      if (settled.every(Boolean)) {
        dbg('ticker complete', { durationMs: Math.round(performance.now() - startTime) });
        return stop();
      }
      raf();
    }

    function raf() {
      tk._id = requestAnimationFrame(tick);
    }
    function stop() {
      cancelAnimationFrame(tk._id);
      tickerRefs.delete(tk);
    }
    const tk = { _id: 0, stop };
    tickerRefs.add(tk);
    raf();
  }

  return { mount, unmount, setConfig, restart, getConfig };
}

function randomGlyph(mainCharset, brailleCharset, brailleBias = 0) {
  if (brailleCharset === 'AUTO') brailleCharset = computeMiddleRowBraille();
  const useBraille = Math.random() < clamp01(brailleBias);
  const source =
    useBraille && brailleCharset && brailleCharset.length ? brailleCharset : mainCharset;
  const i = Math.floor(Math.random() * source.length) || 0;
  return source.charAt(i);
}

function weightedCharset(mainCharset, brailleCharset, brailleBias = 0) {
  if (brailleCharset === 'AUTO') brailleCharset = computeMiddleRowBraille();
  if (!brailleCharset || !brailleCharset.length || brailleBias <= 0) return mainCharset;
  // Duplicate braille set according to bias for plugin charset strings
  const repeats = Math.max(1, Math.round(5 * clamp01(brailleBias)));
  return mainCharset + brailleCharset.repeat(repeats);
}

function shuffleInPlace(arr, intensity) {
  // Partial Fisher–Yates based on intensity (0..1)
  const swaps = Math.floor(arr.length * intensity);
  for (let s = 0; s < swaps; s++) {
    const i = Math.floor(Math.random() * arr.length);
    const j = Math.floor(Math.random() * arr.length);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v || 0));
}

function pickActiveColor(cfg, lastIndex = -1) {
  // Weighted selection: 1 most frequent → 4 rarest by default
  const weights = [cfg.colorActive1, cfg.colorActive2, cfg.colorActive3, cfg.colorActive4]
    .map((c, i) => ({ c, w: [0.55, 0.25, 0.15, 0.05][i] }))
    .filter((x) => !!x.c);
  if (!weights.length) return cfg.colorActive || '#60A5FA';
  const r = Math.random();
  let acc = 0,
    chosen = weights[0].c;
  for (const x of weights) {
    acc += x.w;
    if (r <= acc) {
      chosen = x.c;
      break;
    }
  }
  const base = chosen;
  const osc = hueOscillate(base, cfg.activeHueOscDeg || 0);
  return jitterColor(osc, cfg.activeJitter || 0.06);
}

function jitterColor(hex, amt) {
  // Simple HSL jitter around base hex
  const { h, s, l } = hexToHsl(hex);
  const j = (n) => Math.max(0, Math.min(1, n + (Math.random() * 2 - 1) * amt));
  return hslToHex((h + (Math.random() * 4 - 2) * (amt * 100)) % 360, j(s), j(l));
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  const bigint = parseInt(
    v.length === 3
      ? v
          .split('')
          .map((c) => c + c)
          .join('')
      : v,
    16,
  );
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return { r, g, b };
}

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

let __osc_ts = 0;
let __osc_val = 0; // cache across calls per frame
function hueOscillate(hex, amplitudeDeg) {
  if (!amplitudeDeg) return hex;
  const now = performance.now();
  if (now - __osc_ts > 16) {
    // ~60fps
    __osc_ts = now;
    const t = now * 0.001; // seconds
    __osc_val = Math.sin(t * Math.PI * 2 * 0.2); // 0.2 Hz default
  }
  const { h, s, l } = hexToHsl(hex);
  const offset = __osc_val * amplitudeDeg;
  return hslToHex((h + offset + 360) % 360, s, l);
}

// Build braille chars limited to middle rows only (dots 2,3,5,6)
let __builder_cache = null;
function computeMiddleRowBraille() {
  if (__builder_cache) return __builder_cache;
  const chars = [];
  const DOTS = { 1: 0x1, 2: 0x2, 3: 0x4, 4: 0x8, 5: 0x10, 6: 0x20, 7: 0x40, 8: 0x80 };
  const base = 0x2800;
  for (let mask = 1; mask < 256; mask++) {
    const hasTop = mask & DOTS[1] || mask & DOTS[4];
    const hasBottom = mask & DOTS[7] || mask & DOTS[8];
    const hasMiddle = mask & (DOTS[2] | DOTS[3] | DOTS[5] | DOTS[6]);
    if (!hasTop && !hasBottom && hasMiddle) chars.push(String.fromCharCode(base + mask));
  }
  __builder_cache = chars.join('');
  return __builder_cache;
}
