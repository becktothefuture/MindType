/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  R E D U C E D   M O T I O N   U T I L S  ░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Detects prefers-reduced-motion and exposes helpers to      ║
  ║   toggle minimal/alternative visuals.                        ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Query user preference and set an attribute/class
  • WHY  ▸ FT-312: honour reduced-motion across UI effects
  • HOW  ▸ Uses matchMedia with safe fallbacks
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
