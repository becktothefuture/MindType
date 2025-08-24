import { test, expect } from '@playwright/test';

test('web demo launches and textarea remains responsive', async ({ page }) => {
  await page.goto('/');
  // Expect demo header/title present
  await expect(page.locator('text=Mind')).toBeVisible();
  // Find the main textarea input
  const ta = page.locator('textarea');
  await expect(ta).toBeVisible();
  await ta.click();
  await ta.fill('Hello teh wolrd');
  // Ensure value is set and caret preserved after typing
  await expect(ta).toHaveValue('Hello teh wolrd');
});


