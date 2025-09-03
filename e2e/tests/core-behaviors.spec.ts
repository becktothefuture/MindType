/*╔══════════════════════════════════════════════════════╗
  ║  ░  PLAYWRIGHT: CORE BEHAVIORS  ░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Additional coverage: EPS, status, sliders, context window, limits
  • WHY  ▸ Ensure UI reacts and constraints hold
  • HOW  ▸ Drive inputs; assert labels/values/logs
*/

import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

test.describe('Core behaviors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
  });

  test('EPS value appears during typing', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    await ta.type('hello world', { delay: 20 });
    await expect(page.locator('span:has-text("EPS:")')).toBeVisible();
  });

  test('status log shows SHORT_PAUSE or LONG_PAUSE after idle', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    await ta.type('hi');
    await page.waitForTimeout(800);
    await expect(page.getByTestId('process-log')).toContainText(/SHORT_PAUSE|LONG_PAUSE/);
  });

  test('tick slider within bounds (30..150)', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first();
    const v = Number(await slider.inputValue());
    expect(v).toBeGreaterThanOrEqual(30);
    expect(v).toBeLessThanOrEqual(150);
  });

  test('band size slider respects min/max (2..8)', async ({ page }) => {
    const sliders = page.locator('input[type="range"]');
    const band = sliders.nth(1);
    const v = Number(await band.inputValue());
    expect(v).toBeGreaterThanOrEqual(2);
    expect(v).toBeLessThanOrEqual(8);
  });

  test('context window preview updates with caret movement', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    await ta.type('abc');
    await ta.press('ArrowLeft');
    await expect(page.locator('textarea[placeholder="(context window)"]')).toBeVisible();
  });

  test('process log stays bounded', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    for (let i = 0; i < 120; i++) {
      await ta.type('x');
    }
    const text = await page.getByTestId('process-log').innerText();
    // We only render last ~8 lines; ensure it's not enormous
    expect(text.length).toBeLessThan(4000);
  });
});


