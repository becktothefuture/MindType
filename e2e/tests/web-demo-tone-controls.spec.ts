// Playwright E2E for Tone UI (manual run)
// Usage: npx playwright test e2e/tests/web-demo-tone-controls.spec.ts
import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

test.describe('Tone UI controls', () => {
  test('enable Tone and set target', async ({ page }) => {
    await page.goto(DEMO_URL);
    // Toggle Tone
    await page.getByLabel('Tone: Enabled').check();
    // Select target
    await page.getByLabel('Tone target').selectOption('Professional');
    // Move a slider
    await page.getByLabel('τ_tone').evaluate((el: HTMLInputElement) => {
      el.value = '0.9';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // Persistence check: reload & verify
    await page.reload();
    await expect(page.getByLabel('Tone: Enabled')).toBeChecked();
    await expect(page.getByLabel('Tone target')).toHaveValue('Professional');
  });

  test('toggle Braille markers', async ({ page }) => {
    await page.goto(DEMO_URL);
    const markerToggle = page.getByLabel('Show Braille markers');
    await markerToggle.check();
    await markerToggle.uncheck();
    // We don’t assert visuals here; acceptance doc covers behavior
    await expect(markerToggle).not.toBeChecked();
  });
});
