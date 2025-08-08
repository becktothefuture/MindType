/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  A M B I E N T   V I T E S T   T Y P E S  ░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Temporary declarations so TS can compile tests before      ║
  ║   devDependencies are installed. Overridden by real types.   ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Declares 'vitest' module with minimal exports
  • WHY  ▸ Prevents missing module/type errors in CI/editor
  • HOW  ▸ Replaced automatically once node_modules exist
*/

declare module 'vitest' {
  // Minimal surfaces for our tests; kept loose but typed
  export type TestFn = (name: string, fn: () => unknown) => void;
  export const describe: TestFn;
  export const it: TestFn;
  export function expect(actual: unknown): unknown;
}
