/*╔══════════════════════════════════════════════════════╗
  ║  ░  D E M O S   O V E R V I E W   E 2 E  ░░░░░░░░░░░  ║
  ║                                                      ║
  ║  WHAT ▸ Verify /#/demos lists links and navigation    ║
  ║  WHY  ▸ Ensure unified demos index works              ║
  ║  HOW  ▸ Navigate and assert key elements              ║
  ╚══════════════════════════════════════════════════════╝ */
import { test, expect } from '@playwright/test';

const OVERVIEW = '/#/demos';

test('overview lists main and visual demo links', async ({ page }) => {
  await page.goto(OVERVIEW);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Demo Showcase|Mind⠶Type/i);
  await expect(page.locator('a[href="/#/"]')).toBeVisible();
  await expect(page.locator('a[href="/demo/band-swap/"]')).toBeVisible();
  await expect(page.locator('a[href="/demo/mt-braille-animation-v1/"]')).toBeVisible();
  await expect(page.locator('a[href="/demo/mt-scroll-anim-v1/"]')).toBeVisible();
});

test('navigate to main demo from overview', async ({ page }) => {
  await page.goto(OVERVIEW);
  await page.locator('a[href="/#/"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Unified Typing Lab|Mind::Type/i);
});
