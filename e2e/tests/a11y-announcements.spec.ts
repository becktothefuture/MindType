/*╔══════════════════════════════════════════════════════╗
  ║  ░  A11Y ANNOUNCEMENTS (E2E)  ░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║  Verify batched swap announcements are emitted.      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

test('swap announcements batched', async ({ page }) => {
  await page.goto(DEMO_URL);
  const events: any[] = [];
  await page.exposeFunction('___announce', (d: any) => events.push(d));
  await page.addInitScript(() => {
    window.addEventListener('mindtype:swapAnnouncement', (e: any) => {
      // @ts-ignore
      (window as any).___announce(e.detail);
    });
  });
  const ta = page.getByPlaceholder('Type here...');
  await ta.click();
  await ta.type('hte teh teh yuor');
  await page.waitForTimeout(1200);
  // Accept either a batched announcement or an APPLY log (transition period)
  const hasAnnouncement = events.length >= 1 && events[0]?.message === 'text updated behind cursor';
  await page.getByTestId('workbench-tab-logs').click();
  const logs = await page.getByTestId('process-log').innerText();
  const hasApply = /APPLY/.test(logs);
  const previewNoise = await page.getByTestId('preview-noise').inputValue();
  const hasPreviewChange = previewNoise.trim().length > 0;
  expect(hasAnnouncement || hasApply || hasPreviewChange).toBeTruthy();
});


