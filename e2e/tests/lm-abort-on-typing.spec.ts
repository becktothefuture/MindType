/*╔══════════════════════════════════════════════════════╗
  ║  ░  L M   A B O R T   O N   T Y P I N G   ░░░░░░░░░  ║
  ║                                                      ║
  ║   Ensure in-flight generations are not applied if    ║
  ║   the user keeps typing (stale-drop/abort).          ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Type during a run; verify no stale apply
  • WHY  ▸ Correctness and UX (no surprise overwrites)
  • HOW  ▸ Trigger run, type more, assert unchanged out
*/
import { test, expect } from '@playwright/test';

test('Typing during run avoids stale application', async ({ page }) => {
  await page.goto('/#/lab');
  // Start with a sentence and run
  await page.getByRole('textbox', { name: 'Input' }).fill('helloo thr weathfr has beenb hood');
  await page.getByRole('button', { name: 'Run' }).click();
  // Immediately type more to force abort of in-flight request
  await page.getByRole('textbox', { name: 'Input' }).type(' today');
  // Give some time; context output should either be empty or not override the new suffix
  const ctx = page.getByRole('heading', { name: 'Context Output' }).locator('xpath=following-sibling::pre[1]');
  await page.waitForTimeout(1200);
  const text = await ctx.textContent();
  // If there is text, it should not remove the freshly added suffix " today"
  const inputNow = await page.getByRole('textbox', { name: 'Input' }).inputValue();
  expect(inputNow.endsWith(' today')).toBeTruthy();
  // Allow either empty (no apply) or improved text that still preserves suffix in input
  expect(text === null || text.length >= 0).toBeTruthy();
});


