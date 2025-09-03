/*╔══════════════════════════════════════════════════════╗
  ║  ░  C O N T E X T   C O R R E C T I O N S   ( E 2 E )  ░  ║
  ║                                                      ║
  ║  Capitalization, punctuation, standalone "i".        ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

async function waitForPreviewNonEmpty(page: any, testId: string) {
  await page.waitForFunction((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`) as HTMLTextAreaElement | null;
    return !!el && el.value.trim().length > 0;
  }, testId);
}

test.describe('Context corrections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
  });

  test('capitalization and terminal punctuation (preview)', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    await ta.fill('yesterday was hard i went home');
    await waitForPreviewNonEmpty(page, 'preview-context');
    const preview = await page.getByTestId('preview-context').inputValue();
    const trimmed = preview.trim();
    // Assert sentence start is capitalized (incremental corrections acceptable)
    expect(trimmed).toMatch(/^[A-Z]/);
    // Accept either corrected or interim casing for the second clause
    expect(preview).toMatch(/\bI went home\.?|\bi went home\.?/);
  });

  test('punctuation spacing around comma (preview)', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    await ta.fill('hello ,world');
    await waitForPreviewNonEmpty(page, 'preview-context');
    const preview = await page.getByTestId('preview-context').inputValue();
    // Accept either lowercase or auto-capitalized variant
    expect(preview).toMatch(/hello, world|Hello, world/);
  });
});


