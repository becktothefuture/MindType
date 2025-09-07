/*╔══════════════════════════════════════════════════════╗
  ║  ░  M T  S C R O L L  A N I M  V 1  M A I N  ░░░░░░  ║
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
  • WHAT ▸ Boot: Lenis init, GSAP registration, engine mount, bind panel
  • WHY  ▸ Ensure smooth scroll + ScrollTrigger sync and live config
  • HOW  ▸ ESM imports; one ScrollTrigger per block; resize refresh
*/

import { createEngine, DEFAULTS } from './core.js';
import { mountPanel } from './panel.js';

// GSAP + plugins (ESM/CDN). Register ScrollTrigger once.
import { gsap } from 'https://esm.sh/gsap@3.12.5';
import ScrollTrigger from 'https://esm.sh/gsap@3.12.5/ScrollTrigger';
import Lenis from 'https://esm.sh/@studio-freight/lenis@1.0.41';

gsap.registerPlugin(ScrollTrigger);

const STORAGE_KEY = 'mt-demo-config-v1';

function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

// Lenis setup and ScrollTrigger sync
function initLenis() {
  const lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    smoothTouch: false,
  });

  function raf(time) {
    lenis.raf(time);
    ScrollTrigger.update();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  return lenis;
}

document.addEventListener('DOMContentLoaded', () => {
  const initialConfig = loadConfig();
  const engine = createEngine({
    ...initialConfig,
    // Ensure selector default always present
    selector: initialConfig.selector || '[data-mt]',
  });

  const lenis = initLenis();
  engine.mount();

  // Panel binds live to engine
  // Apply persisted font sizes first
  if (initialConfig.fontDesktop != null) {
    document.documentElement.style.setProperty(
      '--mt-font-desktop',
      `${initialConfig.fontDesktop}px`,
    );
  }
  if (initialConfig.fontMobile != null) {
    document.documentElement.style.setProperty(
      '--mt-font-mobile',
      `${initialConfig.fontMobile}px`,
    );
  }

  mountPanel(document.getElementById('mt-panel'), initialConfig, (patch) => {
    // Handle reset
    if (patch.__reset) {
      localStorage.removeItem(STORAGE_KEY);
      return; // page will reload from panel
    }
    const next = { ...engine.getConfig(), ...patch };
    // If font sizes changed, update CSS vars and restart to re-measure lines
    if (Object.prototype.hasOwnProperty.call(patch, 'fontDesktop')) {
      document.documentElement.style.setProperty(
        '--mt-font-desktop',
        `${patch.fontDesktop}px`,
      );
      engine.restart();
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'fontMobile')) {
      document.documentElement.style.setProperty(
        '--mt-font-mobile',
        `${patch.fontMobile}px`,
      );
      engine.restart();
    }
    // Apply other config changes
    const nonFontPatch = { ...patch };
    delete nonFontPatch.fontDesktop;
    delete nonFontPatch.fontMobile;
    if (Object.keys(nonFontPatch).length) engine.setConfig(nonFontPatch);
    saveConfig(next);
  });

  // Expose for debug
  window.mt = { engine, lenis, gsap, ScrollTrigger };

  // Refresh after spanization
  setTimeout(() => ScrollTrigger.refresh(), 0);

  // Debounced refresh on resize to realign line measurements
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      engine.restart();
      ScrollTrigger.refresh();
    }, 150);
  });
});
