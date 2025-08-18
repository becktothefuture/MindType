/* @vitest-environment jsdom */
/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  R E D U C E D   M O T I O N   T E S T S  ░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Verifies reduced-motion detection and attribute toggle.     ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Unit tests for motion helpers
  • WHY  ▸ FT-312 acceptance
  • HOW  ▸ Mock matchMedia; inspect documentElement attribute
*/

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prefersReducedMotion, applyReducedMotionAttribute } from '../ui/motion';

function createMql(matches: boolean): MediaQueryList {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}

describe('Reduced Motion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute('data-reduced-motion');
  });

  it('detects reduced motion via matchMedia', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((q: string) =>
      createMql(q.includes('reduce')),
    );
    expect(prefersReducedMotion()).toBe(true);
  });

  it('sets data-reduced-motion attribute on documentElement when reduce is preferred', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => createMql(true));
    applyReducedMotionAttribute();
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true');
  });

  it('removes attribute when reduce is not preferred', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => createMql(false));
    document.documentElement.setAttribute('data-reduced-motion', 'true');
    applyReducedMotionAttribute();
    expect(document.documentElement.hasAttribute('data-reduced-motion')).toBe(false);
  });
});
