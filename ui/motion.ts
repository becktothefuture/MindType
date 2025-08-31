/*╔══════════════════════════════════════════════════════════╗
  ║  ░  MOTION  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Respect reduced-motion; single announcement; mechanical swap
  • WHY  ▸ REQ-A11Y-MOTION
  • HOW  ▸ See linked contracts and guides in docs
*/

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function applyReducedMotionAttribute(
  target?: HTMLElement | Document | null,
): void {
  const root: HTMLElement | null =
    (target as HTMLElement) ?? document?.documentElement ?? null;
  if (!root) return;
  if (prefersReducedMotion()) {
    root.setAttribute('data-reduced-motion', 'true');
  } else {
    root.removeAttribute('data-reduced-motion');
  }
}
