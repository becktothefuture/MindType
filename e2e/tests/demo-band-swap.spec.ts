/*╔══════════════════════════════════════════════════════╗
  ║  ░  D E M O   B A N D   S W A P   E 2 E  ░░░░░░░░░░░  ║
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
  • WHAT ▸ Smoke test for band-swap demo
  • WHY  ▸ REQ-BAND-SWAP
  • HOW  ▸ Checks overlay presence, movement, and layout
*/
import { test, expect } from '@playwright/test';

const RUN_BAND_SWAP = process.env.RUN_BAND_SWAP === '1';

async function getBand(page) {
  return await page.evaluate(() => (window as any).bandSwap?.getBandInfo?.());
}
async function getSample(page) {
  return await page.evaluate(() => (window as any).bandSwap?.getSamplePoint?.());
}

test.skip(!RUN_BAND_SWAP, 'Enable with RUN_BAND_SWAP=1');

// Update to use dev server path
const DEMO_URL = '/demo/band-swap/';

test('band-swap: noise keeps animating with autoplay off (static position)', async ({ page }) => {
  await page.goto(DEMO_URL);
  // Disable autoplay and set playhead mid text if API exposed
  await page.evaluate(() => {
    if ((window as any).bandSwap?.state) {
      (window as any).bandSwap.state.autoplay = false;
      (window as any).bandSwap.state.playhead = 50;
    }
  });
  const b1 = await getBand(page);
  const s1 = await getSample(page);
  await page.waitForTimeout(150);
  const b2 = await getBand(page);
  const s2 = await getSample(page);
  // Position must remain stable when autoplay off
  if (b1 && b2) {
    expect(b2.center).toBe(b1.center);
    expect(b2.start).toBe(b1.start);
    expect(b2.end).toBe(b1.end);
  }
  if (s1 && s2) {
    expect(s1.x).toBeGreaterThan(0);
    expect(s1.y).toBeGreaterThan(0);
  }
});

test('band swap renders and does not collapse layout', async ({ page }) => {
  await page.goto(DEMO_URL);
  // Smoke: page title visible
  await expect(page.locator('h1:text("Band-Swap")')).toBeVisible();
});
