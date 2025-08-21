import { test, expect } from '@playwright/test';

test.describe.skip('template app examples', () => {
  test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MindType/);
  });

  test('can greet', async ({ page }) => {
    await page.goto('/');
    const nameInput = page.getByPlaceholder('Enter a name');
    await nameInput.fill('Playwright');
    const greetButton = page.getByRole('button', { name: 'Greet' });
    await greetButton.click();
    await expect(page.getByText('Hello Playwright')).toBeVisible();
  });
});
