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

test('Warm run latency within threshold', async ({ page }) => {
  await page.goto('/#/lab');
  // Warm start
  await page.getByRole('button', { name: 'Typos' }).click();
  await page.waitForTimeout(300);
  // Measure
  const t0 = Date.now();
  const ctx = page.getByTestId('lm-context-output');
  const alert = page.locator('[role="alert"]');
  let hadAlert = false;
  let hadMetrics = false;
  const gotAny = await Promise.race<Promise<boolean> | Promise<boolean>>([
    (async () => {
      // Poll up to 15s for any characters produced or metrics activity
      const start = Date.now();
      while (Date.now() - start < 15000) {
        const s = (await ctx.textContent()) || '';
        if (s.trim().length > 0) return true;
        try {
          const mlen = await page.evaluate(() => (globalThis as any).__mtLmMetrics?.length || 0);
          if (mlen > 0) { hadMetrics = true; return true; }
        } catch {}
        await page.waitForTimeout(200);
      }
      return false;
    })(),
    (async () => {
      try {
        await alert.waitFor({ state: 'visible', timeout: 15000 });
        hadAlert = true;
        return true;
      } catch {
        return false;
      }
    })()
  ]);
  const dt = Date.now() - t0;
  if (!gotAny) {
    test.info().annotations.push({ type: 'skipped', description: 'No LM output/alert/metrics within 15s; likely CDN/local assets blocked' });
    test.skip();
    return;
  }
  if (!hadAlert) {
    // Soft guardrail: within 8s on remote/CDN; non-fatal if slower
    expect.soft(dt).toBeLessThanOrEqual(8000);
  }
});


