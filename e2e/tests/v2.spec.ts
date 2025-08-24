import { test, expect } from '@playwright/test';

test.describe('web demo corrections', () => {
  test('applies basic correction behind caret', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Mind::Type Web Demo')).toBeVisible();
    const ta = page.locator('textarea');
    await expect(ta).toBeVisible();
    // Enable LM mock to produce deterministic highlight events
    const lmToggle = page.getByRole('checkbox', { name: 'Enable LM (mock) — demo only' });
    await lmToggle.check();
    // Prepare a one-shot promise resolved on the next highlight event
    await page.addInitScript(() => {
      (window as any).__mtWaitForHighlight = () =>
        new Promise<void>((resolve) => {
          const handler = (e: Event) => {
            const d = (e as CustomEvent).detail as { text?: string };
            if (typeof d?.text === 'string') {
              window.removeEventListener('mindtype:highlight', handler);
              resolve();
            }
          };
          window.addEventListener('mindtype:highlight', handler);
        });
    });
    await ta.click();
    await ta.fill('Hello teh world');
    // Wait for actual correction signal instead of sleeping
    await page.evaluate(async () => {
      await (window as any).__mtWaitForHighlight();
    });
    await expect(ta).toHaveValue(/Hello the world/);
  });
});


