/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  E S L I N T   F L A T   C O N F I G  ░░░░░░░░░░░░░░░░░░  ║
  ║   ESLint v9 flat config for TypeScript + Prettier harmony.   ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Lints .ts files; ignores vendor/subpackages
  • WHY  ▸ Enforce consistency; catch issues early
  • HOW  ▸ @typescript-eslint + eslint-config-prettier
*/
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['dist/**', 'target/**', 'node_modules/**', 'web-demo/**', 'e2e/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
