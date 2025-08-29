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
import path from 'path';
import { pathToFileURL } from 'url';

const demoPath = path.resolve(__dirname, '..', '..', '..', 'demo', 'band-swap', 'index.html');
const DEMO_URL = pathToFileURL(demoPath).href;

test('band swap renders and does not collapse layout', async ({ page }) => {
  await page.goto(DEMO_URL);
  const paragraph = page.locator('#paragraph');
  await expect(paragraph).toBeVisible();
  const overlay = page.locator('#overlay');
  await expect(overlay).toBeVisible();
  const rect1 = await paragraph.boundingBox();
  await page.waitForTimeout(150);
  const rect2 = await paragraph.boundingBox();
  expect(rect1?.width).toBeGreaterThan(0);
  expect(rect1?.height).toBeGreaterThan(0);
  expect(rect2?.width).toBeCloseTo(rect1!.width!, 0);
  expect(rect2?.height).toBeCloseTo(rect1!.height!, 0);
});
