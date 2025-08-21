import { test, expect } from '@playwright/test';

test.describe('v2 noisy tester', () => {
  test('applies basic correction behind caret', async ({ page }) => {
    await page.goto('/v2/');
    await expect(page.getByText('Noisy Typing Tester')).toBeVisible();

    // Turn off autoplay
    const autoplay = page.locator('label:has-text("Autoplay") input[type="checkbox"]');
    if (await autoplay.isChecked()) await autoplay.click();

    const ta = page.locator('textarea');
    await ta.click();
    await ta.fill('Hello teh world');
    await page.waitForTimeout(300);
    const v = await ta.inputValue();
    expect(v).toContain('Hello the world');
  });
});


