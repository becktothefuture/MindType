/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C A R E T   S T A T U S   L A M P S   ( E 2 E )  ░░░░░░  ║
  ║                                                              ║
  ║   Verifies lamps/badges for typing, pauses, paste, blur,     ║
  ║   and selection. Uses the web-demo dev server.               ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝ */

import { test, expect } from '@playwright/test';

const editor = (page: any) => page.getByPlaceholder('Type here. Pause to see live corrections.');

test.describe('Caret status lamps', () => {
  test('typing → short pause → long pause', async ({ page }) => {
    await page.goto('/');
    const ta = editor(page);
    await ta.click();
    await ta.type('hello');
    await page.waitForTimeout(600);
    await expect(page.getByTestId('caret-primary')).toHaveText(/SHORT_PAUSE/);
    await page.waitForTimeout(2500);
    await expect(page.getByTestId('caret-primary')).toHaveText(/LONG_PAUSE/);
  });

  test('paste and blur', async ({ page }) => {
    await page.goto('/');
    const ta = editor(page);
    await ta.click();
    await page.evaluate(async () => {
      try { await navigator.clipboard.writeText('X'); } catch {}
      const e = new ClipboardEvent('paste', { bubbles: true });
      document.activeElement?.dispatchEvent(e);
    });
    await page.waitForTimeout(200);
    await expect(page.getByTestId('caret-primary')).toHaveText(/PASTED/);
    await ta.blur();
  });

  test('selection active', async ({ page }) => {
    await page.goto('/');
    const ta = editor(page);
    await ta.click();
    await ta.type('abcdef');
    await page.evaluate(() => {
      const ta = document.querySelector('textarea.editor-textarea') as HTMLTextAreaElement;
      ta.setSelectionRange(1, 4);
      document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
    });
    await expect(page.getByTestId('caret-primary')).toHaveText(/SELECTION_ACTIVE/);
  });
});


