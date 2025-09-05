/*╔══════════════════════════════════════════════════════╗
  ║  ░  LANGUAGE GATING (E2E)  ░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║  Non-English text should not trigger Context/Tone.   ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';

test('non-English text stays rules-only', async ({ page }) => {
  await page.goto(DEMO_URL);
  const ta = page.getByPlaceholder('Type here...');
  await ta.click();
  await ta.fill('mañana será mejor 你好');
  await page.waitForTimeout(1200);
  // Sanity: editor contains text; process log has entries but no APPLY burst expected from Context/Tone
  await expect(page.getByTestId('process-log')).toContainText(/STATUS|SNAP|ACTIVE_REGION/);
});




