/*╔══════════════════════════════════════════════════════╗
  ║  ░  U N I F I E D   D E M O   O V E R L A Y S  ░░░░░  ║
  ║                                                      ║
  ║   E2E tests for overlays and correction wave.        ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Validate visible context/buffer overlays and braille wave
  • WHY  ▸ Ensure unified demo exposes internals & corrections
  • HOW  ▸ Autopilot typing then assert overlays + announcements
*/

import { test, expect } from '@playwright/test';

test('overlays visible and correction wave announces', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Unified Typing Lab/i })).toBeVisible();
  const ta = page.getByRole('textbox');
  await expect(ta).toBeVisible();
  await expect.poll(async () => (await ta.inputValue()).length, { timeout: 8000 }).toBeGreaterThan(20);

  // Overlays exist (absolute, pointer-events none)
  const hasOverlay = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div'));
    const overlays = nodes.filter((n) => {
      const s = getComputedStyle(n as HTMLElement);
      return s.position === 'absolute' && s.pointerEvents === 'none';
    });
    return overlays.length > 0;
  });
  expect(hasOverlay).toBeTruthy();

  // Correction wave via swapAnnouncement
  const hadAnnouncement = await page.evaluate(async () => {
    return new Promise<boolean>((resolve) => {
      let seen = false;
      const handler = () => { seen = true; resolve(true); };
      window.addEventListener('mindtype:swapAnnouncement', handler as any, { once: true });
      setTimeout(() => resolve(seen), 6000);
    });
  });
  expect(hadAnnouncement).toBeTruthy();
});


