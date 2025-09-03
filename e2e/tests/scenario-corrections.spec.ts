/*╔══════════════════════════════════════════════════════╗
  ║  ░  PLAYWRIGHT: SCENARIO CORRECTIONS (LM)  ░░░░░░░░  ║
  ║                                                      ║
  ║  Requires ENABLE_REAL_LM=1 to run (downloads model). ║
  ║  Skips in CI by default.                             ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Validate real LM produces intended corrections
  • WHY  ▸ Confidence that end-to-end fixes match UX goals
  • HOW  ▸ Type fuzzy text; wait for swaps; compare normalized text
*/

import { test, expect } from '@playwright/test';

const DEMO_URL = process.env.DEMO_URL || 'http://localhost:5173';
const LM_REQUIRED = process.env.ENABLE_REAL_LM === '1';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\u2019/g, "'") // curly to straight apostrophe
    .replace(/\s+/g, ' ') // collapse whitespace
    .replace(/\s*([,.!?])\s*/g, '$1 ') // normalize punctuation spacing
    .trim();
}

test.describe('LM Scenario Corrections (requires real LM)', () => {
  test.skip(!LM_REQUIRED, 'ENABLE_REAL_LM=1 required');

  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
    await page.waitForLoadState('domcontentloaded');
    // Ensure LM checkbox is checked if visible
    const lmToggle = page.getByRole('checkbox', { name: /Enable Qwen2\.5-0\.5B/ });
    if (await lmToggle.isVisible()) {
      if (!(await lmToggle.isChecked())) await lmToggle.check();
    }
  });

  async function expectCorrection(page, fuzzy: string, corrected: string) {
    // Capture swap events
    const swaps: any[] = [];
    await page.exposeFunction('___swap', (d: any) => swaps.push(d));
    await page.addInitScript(() => {
      window.addEventListener('mindtype:mechanicalSwap', (e: any) => {
        // @ts-ignore
        (window as any).___swap(e.detail);
      });
    });

    const ta = page.getByPlaceholder('Type here...');
    await ta.click();
    await ta.fill('');
    await ta.type(fuzzy, { delay: 10 });
    await page.waitForTimeout(4000);

    const value = normalize(await ta.inputValue());
    const want = normalize(corrected);

    // Sanity: at least one swap occurred
    expect(swaps.length).toBeGreaterThan(0);

    // Loose equality: allow small deviations but require substring match
    expect(value).toContain(want.slice(0, Math.min(40, want.length)));
  }

  test('Scenario 1', async ({ page }) => {
    await expectCorrection(
      page,
      "im triyng to writ somethng fast bt the wors just keep spillng out wrng adn i dont evn look bakc to fix",
      "I’m trying to write something fast but the words just keep spilling out wrong and I don’t even look back to fix."
    );
  });

  test('Scenario 2', async ({ page }) => {
    await expectCorrection(
      page,
      "yehsterdy was total mes i wake up lat missd train runing runing no brekfast headach all day",
      "Yesterday was a total mess. I woke up late, missed the train, kept running, no breakfast, and had a headache all day."
    );
  });

  test('Scenario 3', async ({ page }) => {
    await expectCorrection(
      page,
      "ok so code not run propely error popp pup again nd agin cant find the line whre its brokn",
      "Okay, so the code isn’t running properly. Errors keep popping up again and again, and I can’t find the line where it’s broken."
    );
  });
});


