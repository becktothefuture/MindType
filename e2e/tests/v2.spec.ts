import { test, expect } from '@playwright/test';

test.describe('web demo corrections', () => {
  test('applies basic correction behind caret', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Mind::Type Web Demo')).toBeVisible();
    const ta = page.locator('textarea');
    await expect(ta).toBeVisible();
    await ta.click();
    await ta.fill('Hello teh world');
    // Allow pipeline to process pause and apply rules-only diff
    await page.waitForTimeout(600);
    await expect(ta).toHaveValue(/Hello the world/);
  });
});


