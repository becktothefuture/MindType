/*╔══════════════════════════════════════════════════════╗
  ║  ░  L M   R E S P O N S I V E N E S S   ░░░░░░░░░░░░  ║
  ║                                                      ║
  ║   Measure warm-run latency from Run click to first   ║
  ║   non-empty output in LM Lab.                        ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Latency guardrails for UX
  • WHY  ▸ Detect regressions and backend fallback slowness
  • HOW  ▸ Warm-up run, then measure time to first token
*/
import { test, expect } from '@playwright/test';
const LM_AVAILABLE = ['true', 'remote', 'local'].includes(String(process.env.MT_LM_AVAILABLE || ''));

test.skip(!LM_AVAILABLE, 'LM not available in CI');

test('Warm run latency within threshold', async ({ page, browserName }) => {
  await page.goto('/#/lab');
  // Warm-up
  await page.getByRole('textbox', { name: 'Input' }).fill('helloo thr weathfr has beenb hood');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.waitForTimeout(2000);

  // Measure
  await page.getByRole('button', { name: 'Run' }).click();
  const start = Date.now();
  const ctx = page.getByTestId('lm-context-output');
  const alert = page.locator('[role="alert"]');
  const gotAny = await Promise.race([
    ctx.waitFor({ state: 'visible' }).then(async () => ((await ctx.textContent()) || '').length > 0),
    alert.waitFor({ state: 'visible' }).then(() => true)
  ]);
  expect(gotAny).toBeTruthy();
  const latency = Date.now() - start;
  const budget = browserName === 'webkit' ? 6000 : 4500;
  expect(latency).toBeLessThanOrEqual(budget);
});


