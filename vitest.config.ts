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
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      // Count coverage only for core library code
      include: [
        'core/**/*.ts',
        'engines/**/*.ts',
        'utils/**/*.ts',
        'config/**/*.ts',
      ],
      exclude: [
        'index.ts',
        'e2e/**',
        'web-demo/**',
        'scripts/**',
        'crates/**',
        '**/bindings/**',
        '**/*.d.ts',
        'tests/**',
        'coverage/**',
        'node_modules/**',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        branches: 90,
        functions: 90,
      },
    },
  },
});
