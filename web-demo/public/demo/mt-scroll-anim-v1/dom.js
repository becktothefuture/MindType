/*╔══════════════════════════════════════════════════════╗
  ║  ░  M T  S C R O L L  A N I M  V 1  D O M  ░░░░░░░░  ║
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
  • WHAT ▸ SplitType wiring, spanization helpers, IO helpers
  • WHY  ▸ Provide pre-split lines/words/chars and enter observers
  • HOW  ▸ ESM SplitType; sticky data with WeakMap; simple IO
*/

import SplitType from 'https://esm.sh/split-type@0.3.4';

const splitMap = new WeakMap();

/**
 * Split all targets matching the selector into lines/words/chars.
 * Returns lightweight controllers per element.
 */
export function splitTargets(selector) {
  const nodes = Array.from(document.querySelectorAll(selector));
  return nodes.map((el) => splitElement(el));
}

function splitElement(el) {
  // Revert any previous SplitType on this element
  const prev = splitMap.get(el);
  if (prev) {
    try {
      prev.split.revert();
    } catch {}
  }

  const split = new SplitType(el, {
    types: 'lines, words, chars',
    tagName: 'span',
    lineClass: 'mt-line',
    wordClass: 'mt-word',
    charClass: 'mt-char',
  });

  const lines = Array.from(split.lines || []);
  const words = Array.from(split.words || []);
  const chars = Array.from(split.chars || []);

  // Cache final char values
  const finalChars = chars.map((c) => c.textContent || '');
  chars.forEach((c, i) => {
    c.dataset.final = finalChars[i];
  });

  // Lock width per character to prevent layout jumps during scrambling
  // Measure while the final glyph is still present, then fix width
  const widths = chars.map((c) => c.getBoundingClientRect().width);
  chars.forEach((c, i) => {
    const w = widths[i];
    if (w > 0) c.style.width = `${w}px`;
    c.style.display = 'inline-block';
  });

  const ctl = { el, split, lines, words, chars, finalChars };
  splitMap.set(el, ctl);
  return ctl;
}

export function revertSplit(el) {
  const ctl = splitMap.get(el);
  if (ctl) {
    try {
      ctl.split.revert();
    } catch {}
    splitMap.delete(el);
  }
}

/** Observe element entering viewport at given threshold (0..1). */
export function observeEnter(el, threshold, cb, rootMargin) {
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= threshold) {
          cb();
        }
      }
    },
    { threshold: clampThreshold(threshold), rootMargin: rootMargin || '0px' },
  );
  obs.observe(el);
  return { disconnect: () => obs.disconnect() };
}

function clampThreshold(t) {
  if (Array.isArray(t)) return t.map(clamp01);
  return clamp01(t);
}
function clamp01(v) {
  return Math.max(0, Math.min(1, v || 0));
}

/** prefers-reduced-motion helper */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
