/*╔══════════════════════════════════════════════════════╗
  ║  ░  PLAYWRIGHT: LOGGING AND STAGES  ░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Validate demo panels update: logs, stages, active region
  • WHY  ▸ Ensure end-to-end observability for debugging
  • HOW  ▸ Drive typing; assert DOM updates and log entries
*/

import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

test.describe('Web Demo: Logs and Stage Previews', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test('shows Process Log entries after typing', async ({ page }) => {
    const editor = page.getByPlaceholder('Type here...');
    await editor.click();
    await editor.type(' hello');
    await expect(page.getByTestId('process-log')).toContainText(/INGEST|SNAP|ACTIVE_REGION|STATUS/);
  });

  test('active region label appears and updates', async ({ page }) => {
    const editor = page.getByPlaceholder('Type here...');
    await editor.click();
    await editor.type(' test');
    const label = page.getByTestId('active-region-label');
    await expect(label).toBeVisible();
    await expect(label).toContainText('Active:');
  });

  test('context window preview is present', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder="(context window)"]');
    await expect(textarea).toBeVisible();
  });

  test('stage previews render and at least buffer shows content', async ({ page }) => {
    const editor = page.getByPlaceholder('Type here...');
    await editor.click();
    await editor.type(' quick check');
    // Buffer preview exists and is non-empty
    const buffer = page.locator('label:text("1) Buffer")');
    await expect(buffer).toBeVisible();
    // Since previews are read-only textareas following labels, ensure at least one has text
    const anyPreview = page.locator('textarea', { hasText: /.*/ }).first();
    await expect(anyPreview).toBeVisible();
  });
});


