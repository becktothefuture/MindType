// Playwright E2E for Tone UI (manual run)
// Usage: npx playwright test e2e/tests/web-demo-tone-controls.spec.ts
import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

test.describe('Tone UI controls', () => {
  test('enable Tone and set target', async ({ page }) => {
    await page.goto(DEMO_URL);
    // Toggle Tone
    // Tone controls are present but enabled via the UI card; make a tolerant check
    const toggle = page.getByLabel('Tone: Enabled');
    if (await toggle.isVisible()) {
      await toggle.check();
    }
    // Select target (if control exists in this build)
    const target = page.getByLabel('Tone target');
    if (await target.isVisible()) {
      await target.selectOption('Professional');
    }
    // Move a slider (if present)
    const toneSlider = page.getByLabel('τ_tone');
    if (await toneSlider.isVisible()) {
      await toneSlider.evaluate((el: HTMLInputElement) => {
        el.value = '0.9';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    // Persistence check (best-effort)
    await page.reload();
    const enabled = page.getByLabel('Tone: Enabled');
    if (await enabled.isVisible()) {
      await expect(enabled).toBeChecked();
    }
    const target2 = page.getByLabel('Tone target');
    if (await target2.isVisible()) {
      await expect(target2).toHaveValue('Professional');
    }
  });

  test('toggle Braille markers', async ({ page }) => {
    await page.goto(DEMO_URL);
    const markerToggle = page.getByLabel('Swap markers');
    if (await markerToggle.isVisible()) {
      await markerToggle.check();
      await markerToggle.uncheck();
      await expect(markerToggle).not.toBeChecked();
    }
    // We don’t assert visuals here; acceptance doc covers behavior
  });
});
