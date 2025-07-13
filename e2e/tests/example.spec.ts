import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/MindType/);
});

test('can greet', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // create a locator
  const nameInput = page.getByPlaceholder('Enter a name');
  const greetButton = page.getByRole('button', { name: 'Greet' });
  const greetingText = page.locator('p > strong');

  // set the name
  await nameInput.fill('Playwright');

  // click the button
  await greetButton.click();

  // check the greeting
  await expect(greetingText).toHaveText('Hello from Rust, Playwright!');
});
