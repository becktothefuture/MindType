/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  E S L I N T   C O N F I G  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║   Lints TS with Prettier harmony.                            ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ TypeScript linting ruleset with Prettier integration
  • WHY  ▸ Enforce consistency; catch issues early
  • HOW  ▸ Uses @typescript-eslint + eslint-config-prettier
*/
/* eslint-env node */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  ignorePatterns: ["dist", "target", "web-demo/node_modules", "node_modules"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  rules: {
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
};
