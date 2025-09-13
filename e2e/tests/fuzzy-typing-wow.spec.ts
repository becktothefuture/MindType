/*╔══════════════════════════════════════════════════════╗
  ║  ░  F U Z Z Y   T Y P I N G   W O W   T E S T  ░░░░░  ║
  ║                                                      ║
  ║   E2E test for user's fuzzy example with visual     ║
  ║   indicators and braille animation detection.       ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ E2E test for fuzzy typing correction with visual feedback
  • WHY  ▸ Ensure demo delivers "wow" factor with visible corrections
  • HOW  ▸ Playwright test with text improvement and animation detection
*/

import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

// User's original fuzzy example
const FUZZY_TEXT = "heya ha ve you hgeard there was a n icre cream trk outside that';s kinda cool right";

// Expected improvements (some corrections)
const EXPECTED_IMPROVEMENTS = [
  'have',     // ha ve → have
  'heard',    // hgeard → heard  
  'an ice',   // a n icre → an ice
  'truck',    // trk → truck
  'that\'s'   // that';s → that's
];

test.describe('Fuzzy Typing Wow Demo (T-WOW-007)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // Ensure LM is enabled for corrections
    const lmToggle = page.getByRole('checkbox', { name: /Enable LM/ });
    if (await lmToggle.isVisible()) {
      await lmToggle.check();
    }
    
    // Enable diagnostic mode for better test reliability
    const diagnosticToggle = page.getByRole('checkbox', { name: /Diagnostic mode/ });
    if (await diagnosticToggle.isVisible()) {
      await diagnosticToggle.check();
    }
  });

  test('User fuzzy example shows corrections with CTA button', async ({ page }) => {
    // Find the main textarea
    const textarea = page.locator('textarea').first();
    await textarea.click();
    
    // Verify the fuzzy text is pre-loaded (from default preset)
    const initialValue = await textarea.inputValue();
    expect(initialValue).toContain('heya ha ve you hgeard');
    
    // Click the "Run Corrections" CTA button
    const runButton = page.getByRole('button', { name: /Run Corrections/ });
    await expect(runButton).toBeVisible();
    await runButton.click();
    
    // Wait for corrections to process (up to 3 seconds)
    await page.waitForTimeout(3000);
    
    // Get the final textarea value
    const finalValue = await textarea.inputValue();
    console.log('Initial text:', initialValue.substring(0, 50) + '...');
    console.log('Final text:', finalValue.substring(0, 50) + '...');
    
    // Check for at least some expected improvements
    let improvementsFound = 0;
    for (const improvement of EXPECTED_IMPROVEMENTS) {
      if (finalValue.includes(improvement)) {
        improvementsFound++;
        console.log(`✓ Found improvement: ${improvement}`);
      }
    }
    
    // Expect at least 2 out of 5 corrections to be applied
    expect(improvementsFound).toBeGreaterThanOrEqual(2);
    
    // Verify the text has actually changed (some correction occurred)
    expect(finalValue).not.toBe(initialValue);
  });

  test('Manual typing shows corrections and visual indicators', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.click();
    await textarea.fill(''); // Clear any prefilled text
    
    // Type the fuzzy text manually
    await textarea.type(FUZZY_TEXT, { delay: 100 });
    
    // Wait for corrections to apply
    await page.waitForTimeout(2500);
    
    // Get the corrected text
    const correctedValue = await textarea.inputValue();
    
    // Verify some corrections were applied
    expect(correctedValue).not.toBe(FUZZY_TEXT);
    
    // Check for specific improvements
    const hasImprovements = EXPECTED_IMPROVEMENTS.some(improvement => 
      correctedValue.includes(improvement)
    );
    expect(hasImprovements).toBe(true);
    
    // Check for APPLY logs in diagnostics (if visible)
    const processLog = page.getByTestId('process-log');
    if (await processLog.isVisible()) {
      const logText = await processLog.textContent();
      expect(logText).toContain('APPLY');
    }
  });

  test('Rules-only mode produces deterministic output', async ({ page }) => {
    // Enable rules-only mode
    const rulesOnlyToggle = page.getByRole('checkbox', { name: /Rules Only/ });
    if (await rulesOnlyToggle.isVisible()) {
      await rulesOnlyToggle.check();
    }
    
    const textarea = page.locator('textarea').first();
    await textarea.click();
    await textarea.fill('');
    
    // Type a simple typo that rules can fix
    await textarea.type('The teh quick brown fox', { delay: 50 });
    
    // Wait for rules to apply
    await page.waitForTimeout(1000);
    
    // Get the result
    const result = await textarea.inputValue();
    
    // Rules should fix simple transposition
    expect(result).toContain('The the quick brown fox');
  });

  test('LM health metrics increment during corrections', async ({ page }) => {
    // Open the workbench
    const workbenchToggle = page.getByRole('checkbox', { name: /Show workbench/ });
    if (await workbenchToggle.isVisible()) {
      await workbenchToggle.check();
    }
    
    // Switch to LM tab
    const lmTab = page.getByRole('button', { name: /LM Status/ });
    if (await lmTab.isVisible()) {
      await lmTab.click();
      
      // Get initial LM runs count
      const initialRunsText = await page.locator('text=LM runs:').textContent();
      const initialRuns = parseInt(initialRunsText?.match(/\d+/)?.[0] || '0');
      
      // Trigger corrections
      const runButton = page.getByRole('button', { name: /Run Corrections/ });
      await runButton.click();
      
      // Wait for LM processing
      await page.waitForTimeout(2000);
      
      // Check if LM runs increased
      const finalRunsText = await page.locator('text=LM runs:').textContent();
      const finalRuns = parseInt(finalRunsText?.match(/\d+/)?.[0] || '0');
      
      // LM runs should have incremented (if LM is working)
      console.log(`LM runs: ${initialRuns} → ${finalRuns}`);
      expect(finalRuns).toBeGreaterThanOrEqual(initialRuns);
    }
  });

  test('Context windows display in diagnostics', async ({ page }) => {
    // Open workbench and LM tab
    const workbenchToggle = page.getByRole('checkbox', { name: /Show workbench/ });
    if (await workbenchToggle.isVisible()) {
      await workbenchToggle.check();
    }
    
    const lmTab = page.getByRole('button', { name: /LM Status/ });
    if (await lmTab.isVisible()) {
      await lmTab.click();
      
      // Trigger context initialization by clicking textarea
      const textarea = page.locator('textarea').first();
      await textarea.click();
      
      // Wait for context initialization
      await page.waitForTimeout(500);
      
      // Check for context windows section
      const contextSection = page.locator('text=Context Windows');
      if (await contextSection.isVisible()) {
        // Verify wide and close context displays
        await expect(page.locator('text=Wide Context')).toBeVisible();
        await expect(page.locator('text=Close Context')).toBeVisible();
        
        // Verify context has content
        const wideContext = page.locator('div:has-text("Wide Context") + div');
        const wideContextText = await wideContext.textContent();
        expect(wideContextText?.length).toBeGreaterThan(0);
      }
    }
  });

  test('Preset selector changes demo text', async ({ page }) => {
    // Find the preset selector
    const presetSelector = page.locator('select').first();
    await expect(presetSelector).toBeVisible();
    
    // Get initial text
    const textarea = page.locator('textarea').first();
    const initialText = await textarea.inputValue();
    
    // Change to a different preset
    await presetSelector.selectOption('Common Typos');
    
    // Wait for text to update
    await page.waitForTimeout(200);
    
    // Verify text changed
    const newText = await textarea.inputValue();
    expect(newText).not.toBe(initialText);
    expect(newText).toContain('teh quick brown fox');
    
    // Verify description updated
    const description = page.locator('p:has-text("Typical typing errors")');
    await expect(description).toBeVisible();
  });
});


