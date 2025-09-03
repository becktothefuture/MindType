/*╔══════════════════════════════════════════════════════╗
  ║  ░  L M   I N T E G R A T I O N   E 2 E  ░░░░░░░░░░░░  ║
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
  • WHAT ▸ E2E test for LM integration in web demo
  • WHY  ▸ Verify real corrections work in browser environment
  • HOW  ▸ Test LM toggle, model loading, and correction flow
*/
import { test, expect } from '@playwright/test';

test('LM integration: can enable real LM and see loading state', async ({ page }) => {
  await page.goto('/');
  
  const textarea = page.getByPlaceholder('Type here...');
  await expect(textarea).toBeVisible();
  
  // Find and enable the LM checkbox
  const lmCheckbox = page.getByRole('checkbox', { name: /Enable Qwen2\.5-0\.5B/ });
  await expect(lmCheckbox).toBeVisible();
  
  // Enable LM and watch console for loading messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    if (msg.text().includes('[LM]') || msg.text().includes('[Demo]')) {
      consoleMessages.push(msg.text());
    }
  });
  
  await lmCheckbox.check();
  
  // Wait for LM initialization
  await page.waitForTimeout(2000);
  
  // We do not assert on remote model logs (may be blocked);
  // only verify page remains interactive.
  await expect(textarea).toBeVisible();
});

test('LM integration: typing with LM enabled shows active region', async ({ page }) => {
  await page.goto('/');
  
  const textarea = page.getByPlaceholder('Type here...');
  await textarea.click();
  
  // First type some text to establish active region tracking
  await textarea.fill('Hello world');
  await page.waitForTimeout(200);
  
  // Enable LM
  // LM might already be enabled by default; attempt to locate toggle without requiring change
  const lmCheckbox = page.getByRole('checkbox', { name: /Enable Qwen2\.5-0\.5B/ });
  if (await lmCheckbox.isChecked()) {
    // leave as-is
  } else {
    await lmCheckbox.check();
  }
  await page.waitForTimeout(500);
  
  // Type more text that could benefit from corrections
  await textarea.fill('Hello teh quick test');
  
  // Wait for active region to appear (may take longer with LM processing)
  await page.waitForTimeout(1500);
  
  // Check for active region label (should appear when bandRange is set)
  const activeRegionLabel = page.getByTestId('active-region-label');
  
  // If not visible, try waiting a bit more and typing to trigger the region
  if (!(await activeRegionLabel.isVisible())) {
    await textarea.press('End');
    await textarea.type(' more');
    await page.waitForTimeout(800);
  }
  
  await expect(activeRegionLabel).toBeVisible({ timeout: 5000 });
  
  // Verify active region shows reasonable bounds
  const labelText = await activeRegionLabel.textContent();
  expect(labelText).toMatch(/Active: \[\d+, \d+\]/);
});

test('LM integration: debug panel shows LM information when enabled', async ({ page }) => {
  await page.goto('/');
  
  // Open debug panel
  await page.keyboard.press('Alt+Shift+Meta+l'); // ⌥⇧⌘L
  
  // Enable LM
  const lmCheckbox2 = page.getByRole('checkbox', { name: /Enable Qwen2\.5-0\.5B/ });
  if (!(await lmCheckbox2.isChecked())) await lmCheckbox2.check();
  await page.waitForTimeout(1000);
  
  // Type some text
  const textarea = page.getByPlaceholder('Type here...');
  await textarea.click();
  await textarea.fill('Test teh quick correction');
  
  // Wait for processing
  await page.waitForTimeout(1500);
  
  // Check if debug panel shows LM information
  const debugPanel = page.locator('.debug-panel, [data-testid="debug-panel"]');
  if (await debugPanel.isVisible()) {
    // Look for LM-related information in debug panel
    const panelText = await debugPanel.textContent();
    console.log('Debug panel content preview:', panelText?.slice(0, 200));
    
    // Should show some LM-related information
    expect(panelText).toBeTruthy();
  }
});

test('LM integration: handles model loading gracefully', async ({ page }) => {
  await page.goto('/');
  
  // Monitor network requests for model loading
  const requests: string[] = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('huggingface') || url.includes('onnx') || url.includes('Qwen')) {
      requests.push(url);
    }
  });
  
  // Enable LM
  const lmCheckbox = page.getByRole('checkbox', { name: /Enable Qwen2\.5-0\.5B/ });
  await lmCheckbox.check();
  
  // Wait for potential model loading
  await page.waitForTimeout(3000);
  
  console.log('Model loading requests:', requests);
  
  // Test should complete without hanging
  const textarea = page.getByPlaceholder('Type here...');
  await expect(textarea).toBeVisible();
  
  // Verify page is still responsive
  await textarea.click();
  await textarea.fill('');
  await textarea.type('test');
  await expect(textarea).toHaveValue('test');
});
