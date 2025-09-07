/*╔══════════════════════════════════════════════════════╗
  ║  ░  W O R K B E N C H   P A N E L   ( E 2 E )  ░░░  ║
  ║                                                      ║
  ║   Validate workbench tabs, persistence, export.      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Test workbench panel functionality
  • WHY  ▸ Ensure monitoring and testing tools work
  • HOW  ▸ Toggle panel, switch tabs, export session
*/
import { test, expect } from '@playwright/test';

test.describe('Workbench Panel', () => {
  test('switches tabs in integrated panel', async ({ page }) => {
    await page.goto('/');
    
    // Test tab switching in the integrated workbench area
    const tabs = ['metrics', 'logs', 'lm', 'presets'];
    for (const tab of tabs) {
      await page.getByTestId(`workbench-tab-${tab}`).click();
      // Verify tab content appears
      if (tab === 'metrics') {
        await expect(page.locator('text=LM runs:')).toBeVisible();
      } else if (tab === 'logs') {
        await expect(page.getByTestId('process-log')).toBeVisible();
      } else if (tab === 'lm') {
        await expect(page.locator('text=Backend:')).toBeVisible();
      } else if (tab === 'presets') {
        await expect(page.locator('button:has-text("Typos")')).toBeVisible();
      }
    }
  });

  test('deterministic mode toggle works', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('workbench-tab-lm').click();
    
    const toggle = page.getByTestId('deterministic-mode');
    await toggle.check();
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();
  });

  test('export session downloads data', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('workbench-tab-metrics').click();
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-session').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/mindtype-session-.*\.json/);
  });
});
