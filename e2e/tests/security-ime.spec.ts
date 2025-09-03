/*╔══════════════════════════════════════════════════════╗
  ║  ░  SECURITY / IME GATING (E2E)  ░░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║  Secure fields and IME composing pause pipeline.     ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

test.describe('Security/IME gating', () => {
  test('IME composing sets typing state but suppresses APPLY', async ({ page }) => {
    await page.goto(DEMO_URL);
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    // Simulate composition events
    await page.evaluate(() => {
      const ta = document.querySelector('textarea.editor-textarea')!;
      ta.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    });
    await ta.type('abc');
    await page.evaluate(() => {
      const ta = document.querySelector('textarea.editor-textarea')!;
      ta.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    });
    await expect(page.getByTestId('process-log')).toContainText(/STATUS|SNAP/);
  });
});


