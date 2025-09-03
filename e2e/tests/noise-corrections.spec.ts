/*╔══════════════════════════════════════════════════════╗
  ║  ░  N O I S E   C O R R E C T I O N S   ( E 2 E )  ░░  ║
  ║                                                      ║
  ║  Word subs, transpositions, whitespace, caret-safe.  ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

test.describe('Noise corrections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test('word substitutions (teh/ht e/yuor/recieve)', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.waitFor({ state: 'visible' });
    await ta.click();
    await ta.fill('hte yuor recieve teh');
    await page.waitForTimeout(1200);
    const preview = await page.getByTestId('preview-noise').inputValue();
    expect(preview).toContain('the');
    expect(preview).toContain('your');
    expect(preview).toContain('receive');
  });

  test('transpositions (waht/taht/nto/thier)', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.waitFor({ state: 'visible' });
    await ta.click();
    await ta.fill('waht taht nto thier');
    await page.waitForTimeout(1200);
    const preview = await page.getByTestId('preview-noise').inputValue();
    expect(preview).toContain('what');
    expect(preview).toContain('that');
    expect(preview).toContain('not');
    expect(preview).toContain('their');
  });

  test('whitespace normalization and caret safety', async ({ page }) => {
    const ta = page.getByPlaceholder('Type here...');
    await ta.waitFor({ state: 'visible' });
    await ta.click();
    await ta.fill('a  b\ntab\t\tend ');
    // move caret to middle
    await ta.focus();
    await ta.press('ArrowLeft');
    const caretLabel = page.getByTestId('active-region-label');
    await expect(caretLabel).toBeVisible();
    await page.waitForTimeout(1200);
    const preview = await page.getByTestId('preview-noise').inputValue();
    expect(preview).toContain('a b');
    expect(preview).toContain('tab ');
  });
});


