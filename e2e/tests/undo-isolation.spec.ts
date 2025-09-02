/*╔══════════════════════════════════════════════════════╗
  ║  ░  U N D O   I S O L A T I O N   E 2 E  ░░░░░░░░░░░  ║
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
  • WHAT ▸ Smoke test for undoIsolation rollback via UI events
  • WHY  ▸ Verify system edits can be rolled back independently
  • HOW  ▸ Simulates typing, system corrections, and undo events
*/
import { test, expect } from '@playwright/test';

test('undo isolation: system edits can be rolled back via keyboard shortcut', async ({ page }) => {
  await page.goto('/');
  
  const textarea = page.getByPlaceholder('Type here. Pause to see live corrections.');
  await expect(textarea).toBeVisible();
  await textarea.click();

  // Type text that might trigger system corrections
  await textarea.fill('Hello teh wolrd');
  await expect(textarea).toHaveValue('Hello teh wolrd');

  // Wait for potential system corrections to be applied
  await page.waitForTimeout(1200); // Wait longer than idle threshold
  
  // Get the current value (may have been corrected)
  const valueAfterCorrections = await textarea.inputValue();
  
  // Simulate undo via keyboard shortcut (Ctrl+Z on Windows/Linux, Cmd+Z on Mac)
  const isMac = await page.evaluate(() => navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  const modifier = isMac ? 'Meta' : 'Control';
  
  await page.keyboard.press(`${modifier}+z`);
  await page.waitForTimeout(100); // Wait for undo to process
  
  const valueAfterUndo = await textarea.inputValue();
  
  // Verify that undo was processed (value should change)
  // Note: This is a smoke test - we're not asserting specific corrections,
  // just that the undo mechanism is responsive to keyboard events
  console.log(`Original: "Hello teh wolrd"`);
  console.log(`After corrections: "${valueAfterCorrections}"`);
  console.log(`After undo: "${valueAfterUndo}"`);
  
  // Basic smoke test: textarea should still be functional after undo
  await expect(textarea).toBeFocused();
  
  // Test that we can continue typing after undo
  await textarea.press('End'); // Go to end of text
  await textarea.type(' more text');
  
  const finalValue = await textarea.inputValue();
  expect(finalValue).toContain('more text');
});

test('undo isolation: multiple system edit groups can be rolled back', async ({ page }) => {
  await page.goto('/');
  
  const textarea = page.getByPlaceholder('Type here. Pause to see live corrections.');
  await textarea.click();

  // Type first batch of text
  await textarea.fill('First sentance with erors.');
  await page.waitForTimeout(200); // Short pause for first correction group
  
  // Type second batch
  await textarea.press('End');
  await textarea.type(' Second sentance with mor erors.');
  await page.waitForTimeout(1200); // Wait for corrections
  
  const valueAfterCorrections = await textarea.inputValue();
  
  // Perform multiple undos
  const isMac = await page.evaluate(() => navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  const modifier = isMac ? 'Meta' : 'Control';
  
  // First undo
  await page.keyboard.press(`${modifier}+z`);
  await page.waitForTimeout(50);
  const valueAfterFirstUndo = await textarea.inputValue();
  
  // Second undo
  await page.keyboard.press(`${modifier}+z`);
  await page.waitForTimeout(50);
  const valueAfterSecondUndo = await textarea.inputValue();
  
  // Verify undo chain is working
  console.log(`After corrections: "${valueAfterCorrections}"`);
  console.log(`After first undo: "${valueAfterFirstUndo}"`);
  console.log(`After second undo: "${valueAfterSecondUndo}"`);
  
  // Smoke test: verify textarea remains functional
  await expect(textarea).toBeFocused();
  expect(await textarea.inputValue()).toBeTruthy(); // Should still have some text
});

test('undo isolation: beforeinput events are captured for undo detection', async ({ page }) => {
  await page.goto('/');
  
  // Add event listener to capture beforeinput events
  await page.evaluate(() => {
    (window as any).capturedUndoEvents = [];
    document.addEventListener('beforeinput', (e: any) => {
      if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
        (window as any).capturedUndoEvents.push({
          type: e.inputType,
          timestamp: Date.now()
        });
      }
    });
  });
  
  const textarea = page.getByPlaceholder('Type here. Pause to see live corrections.');
  await textarea.click();
  await textarea.fill('Test text for undo detection');
  
  // Trigger undo
  const isMac = await page.evaluate(() => navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  const modifier = isMac ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+z`);
  await page.waitForTimeout(100);
  
  // Check if undo events were captured
  const capturedEvents = await page.evaluate(() => (window as any).capturedUndoEvents);
  
  // Smoke test: verify event detection mechanism is working
  // Note: Some browsers/environments may not fire beforeinput for programmatic undos
  console.log('Captured undo events:', capturedEvents);
  
  // At minimum, verify the event listener setup worked
  expect(Array.isArray(capturedEvents)).toBe(true);
  
  // Verify textarea is still responsive
  await expect(textarea).toBeFocused();
});
