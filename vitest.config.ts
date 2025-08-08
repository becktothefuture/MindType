/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  V I T E S T   C O N F I G  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║   Scope core unit tests and exclude e2e/web-demo by default. ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Runs unit tests under tests/** only
  • WHY  ▸ Avoids pulling Playwright/React deps into unit run
  • HOW  ▸ Configure include/exclude patterns
*/
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: ['e2e/**', 'web-demo/**'],
  },
});
