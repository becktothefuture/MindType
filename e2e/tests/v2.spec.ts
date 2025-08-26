import { test, expect } from '@playwright/test';

test.describe('web demo active region', () => {
  test('emits active region after typing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Mind::Type Web Demo')).toBeVisible();
    const ta = page.getByPlaceholder('Type here. Pause to see live corrections.');
    await expect(ta).toBeVisible();
    await ta.click();
    await ta.fill('Hello world');
    // Wait for active region event
    await page.evaluate(() => new Promise<void>((resolve) => {
      const handler = () => { window.removeEventListener('mindtype:activeRegion', handler); resolve(); };
      window.addEventListener('mindtype:activeRegion', handler);
    }));
    await expect(page.getByTestId('active-region-label')).toBeVisible();
  });
});


