import { test, expect } from '@playwright/test';

test.describe('web demo active region', () => {
  test('emits active region after typing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Mind::Type Web Demo')).toBeVisible();
    const ta = page.getByPlaceholder('Type here...');
    await expect(ta).toBeVisible();
    await ta.click();
    await ta.fill('Hello world');
    // Assert on label rather than low-level event for stability
    await expect(page.getByTestId('active-region-label')).toBeVisible();
  });
});


