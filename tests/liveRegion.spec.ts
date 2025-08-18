/* @vitest-environment jsdom */
/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L I V E   R E G I O N   T E S T S  ░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Verifies ARIA attributes, message updates, and teardown.   ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Unit tests for createLiveRegion
  • WHY  ▸ FT-311: accessible announcements
  • HOW  ▸ Inspect DOM; fake timers for async announce
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLiveRegion } from '../ui/liveRegion';

describe('Live Region', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a polite live region with status role by default', () => {
    const lr = createLiveRegion();
    const el = document.getElementById('mt-live-region')!;
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.getAttribute('role')).toBe('status');
    lr.destroy();
  });

  it('supports assertive announcements with alert role', () => {
    const lr = createLiveRegion({ id: 'ar', politeness: 'assertive' });
    const el = document.getElementById('ar')!;
    expect(el.getAttribute('aria-live')).toBe('assertive');
    expect(el.getAttribute('role')).toBe('alert');
    lr.destroy();
  });

  it('announces text updates (async) and toggles ZWSP to force repeat', () => {
    const lr = createLiveRegion({ id: 'says' });
    const el = document.getElementById('says')!;
    lr.announce('Fixed typo');
    expect(el.textContent).toBe('');
    vi.runAllTimers();
    expect(el.textContent).toContain('Fixed typo');
    const first = el.textContent;
    lr.announce('Fixed typo');
    vi.runAllTimers();
    expect(el.textContent).not.toBe(first); // ZWSP toggled
    lr.destroy();
  });

  it('tears down cleanly', () => {
    const lr = createLiveRegion({ id: 'gone' });
    expect(document.getElementById('gone')).toBeTruthy();
    lr.destroy();
    expect(document.getElementById('gone')).toBeFalsy();
  });
});
