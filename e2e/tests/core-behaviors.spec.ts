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

  test('Typing produces logs/metrics (status row visible)', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    await ta.type('hello world', { delay: 20 });
    await expect(page.locator('span:has-text("Caret:")')).toBeVisible();
  });

  test('logs tab shows recent entries after idle', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    await ta.type('hi');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Logs' }).click();
    const logs = page.locator('[data-testid="process-log"], .logs');
    await expect(logs).toBeVisible();
  });

  test('tick slider within reasonable bounds', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first();
    const v = Number(await slider.inputValue());
    expect(v).toBeGreaterThanOrEqual(10);
    expect(v).toBeLessThanOrEqual(500);
  });

  test('band size slider respects broad limits', async ({ page }) => {
    const sliders = page.locator('input[type="range"]');
    const band = sliders.nth(1);
    const v = Number(await band.inputValue());
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(50);
  });

  test('context diff panel shows content', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    await ta.type('abc', { delay: 10 });
    await page.waitForTimeout(200);
    await expect(page.getByText('Context / LM')).toBeVisible();
  });

  test('process log stays bounded', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    for (let i = 0; i < 120; i++) {
      await ta.type('x');
    }
    // Switch to logs tab to see process log
    await page.getByRole('button', { name: 'Logs' }).click();
    const text = await page.locator('[data-testid="process-log"]').innerText();
    // We only render last ~12 lines; ensure it's not enormous
    expect(text.length).toBeLessThan(4000);
  });
});


