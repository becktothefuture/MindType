/*╔══════════════════════════════════════════════════════╗
  ║  ░  DEMO CORRECTIONS E2E TEST  ░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║  WHAT ▸ Test textarea corrections in web demo        ║
  ║  WHY  ▸ Validate FT-318A demo applies corrections    ║
  ║  HOW  ▸ Type fuzzy text, wait for corrections        ║
  ╚══════════════════════════════════════════════════════╝ */
import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

test.describe('Demo Corrections (FT-318A)', () => {
  test('Demo applies "Hello teh" → "Hello the" correction', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // Enable diagnostic mode for reliable testing
    const diagnosticToggle = page.getByRole('checkbox', { name: /Diagnostic mode/ });
    if (await diagnosticToggle.isVisible()) {
      await diagnosticToggle.check();
    }
    
    const textarea = page.getByPlaceholder('Type here...');
    await textarea.click();
    await textarea.fill('');
    
    // Type the test text with typo
    await textarea.type('Hello teh world', { delay: 50 });
    
    // Wait for correction to be applied
    await page.waitForTimeout(1500);
    
    // Get the final textarea value
    const finalValue = await textarea.inputValue();
    
    // The correction should have been applied
    expect(finalValue).toContain('Hello the world');
    
    // Open logs tab (best-effort) and check visibility
    const logsTab = page.getByRole('button', { name: 'Logs' });
    if (await logsTab.isVisible()) {
      await logsTab.click();
      await expect(page.locator('[data-testid="process-log"], .logs')).toBeVisible();
    }
    
    // Check for braille animation indicators (if markers are enabled)
    const markerToggle = page.getByRole('checkbox', { name: /Show markers/ });
    if (await markerToggle.isVisible() && await markerToggle.isChecked()) {
      // Look for braille indicator elements that might have been created
      const brailleIndicators = page.locator('.braille-indicator');
      // Note: Animation is brief, so we might not catch it, but class should exist in DOM
      console.log('Braille indicators found:', await brailleIndicators.count());
    }
  });
  
  test('Demo preserves caret position during correction', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // Enable diagnostic mode
    const diagnosticToggle = page.getByRole('checkbox', { name: /Diagnostic mode/ });
    if (await diagnosticToggle.isVisible()) {
      await diagnosticToggle.check();
    }
    
    const textarea = page.getByPlaceholder('Type here...');
    await textarea.click();
    await textarea.fill('Hello teh');
    
    // Position caret at the end
    await textarea.press('End');
    
    // Wait for correction
    await page.waitForTimeout(1500);
    
    // Check that caret is still at the end
    const caretPosition = await page.evaluate(() => {
      const ta = document.querySelector('textarea') as HTMLTextAreaElement;
      return ta ? ta.selectionStart : -1;
    });
    
    const finalValue = await textarea.inputValue();
    expect(caretPosition).toBe(finalValue.length);
  });
  
  test('Demo shows mechanical swap events', async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // Capture swap events
    const swaps: any[] = [];
    await page.exposeFunction('___captureSwap', (detail: any) => swaps.push(detail));
    await page.addInitScript(() => {
      window.addEventListener('mindtype:mechanicalSwap', (e: any) => {
        // @ts-ignore
        (window as any).___captureSwap(e.detail);
      });
    });
    
    // Enable diagnostic mode
    const diagnosticToggle = page.getByRole('checkbox', { name: /Diagnostic mode/ });
    if (await diagnosticToggle.isVisible()) {
      await diagnosticToggle.check();
    }
    
    const textarea = page.getByPlaceholder('Type here...');
    await textarea.click();
    await textarea.fill('');
    await textarea.type('Test teh typing', { delay: 50 });
    
    // Wait for events
    await page.waitForTimeout(1500);
    
    // Should have captured at least one swap event
    expect(swaps.length).toBeGreaterThan(0);
    
    // Check swap event structure
    const firstSwap = swaps[0];
    expect(firstSwap).toHaveProperty('start');
    expect(firstSwap).toHaveProperty('end');
    expect(typeof firstSwap.start).toBe('number');
    expect(typeof firstSwap.end).toBe('number');
  });
});
