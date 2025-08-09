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
import prettier from 'eslint-plugin-prettier';

export default [
  {
    ignores: [
      'dist/**',
      'target/**',
      'node_modules/**',
      'coverage/**',
      'web-demo/**',
      'e2e/**',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: { '@typescript-eslint': tsPlugin, prettier },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'prettier/prettier': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
