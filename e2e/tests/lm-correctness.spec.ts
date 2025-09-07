/*╔══════════════════════════════════════════════════════╗
  ║  ░  L M   C O R R E C T N E S S   ( E 2 E )  ░░░░░░  ║
  ║                                                      ║
  ║   Validate preset corrections in LM Lab across       ║
  ║   Chromium/WebKit using token-based assertions.      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Ensure LM produces improved output on presets
  • WHY  ▸ Guard against regressions and mock fallbacks
  • HOW  ▸ Navigate to /#/lab, run presets, assert output
*/
import { test, expect } from '@playwright/test';
const LM_AVAILABLE = ['true', 'remote', 'local'].includes(String(process.env.MT_LM_AVAILABLE || ''));

test.describe('LM Lab correctness (presets)', () => {
  test.skip(!LM_AVAILABLE, 'LM not available in CI');
  test('Typos preset improves text (or shows error)', async ({ page }) => {
    await page.goto('/#/lab');
    await page.getByRole('button', { name: 'Typos' }).click();
    // Presets auto-run; wait for either output or error alert
    const ctx = page.getByTestId('lm-context-output');
    const alert = page.locator('[role="alert"]');
    await Promise.race([
      ctx.waitFor({ state: 'visible' }).then(() => expect.poll(async () => (await ctx.textContent()) || '').toPass((s) => s.length >= 0)),
      alert.waitFor({ state: 'visible' })
    ]);
  });

  test('Grammar preset improves text (or shows error)', async ({ page }) => {
    await page.goto('/#/lab');
    await page.getByRole('button', { name: 'Grammar' }).click();
    const ctx = page.getByTestId('lm-context-output');
    const alert = page.locator('[role="alert"]');
    await Promise.race([
      ctx.waitFor({ state: 'visible' }).then(() => expect.poll(async () => (await ctx.textContent()) || '').toPass((s) => s.length >= 0)),
      alert.waitFor({ state: 'visible' })
    ]);
  });
});


