import { test, expect } from '@playwright/test';

test('web demo launches and textarea remains responsive', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Mind::Type Web Demo')).toBeVisible();
  const ta = page.getByPlaceholder('Type here. Pause to see live corrections.');
  await expect(ta).toBeVisible();
  await ta.click();
  await ta.fill('Hello teh wolrd');
  await expect(ta).toHaveValue('Hello teh wolrd');
});


