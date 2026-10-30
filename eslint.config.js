import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.wrangler/**',
    '**/.idea/**',
    'artifacts/**',
    'output/**',
    '.openai/local/**',
    '.playwright-cli/**',
    'games/*/src/campaign-data.js',
  ]),
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 'latest' },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: [
      'apps/arcade/src/**/*.js',
      'games/*/src/**/*.js',
      'packages/*/src/**/*.js',
      'packages/*/preview/**/*.js',
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.{js,mjs}', 'scripts/**/*.{js,mjs}', '**/tests/**/*.mjs', 'games/*/qa/**/*.mjs'],
    languageOptions: { globals: globals.nodeBuiltin },
  },
  {
    // These runners also contain callbacks executed inside the browser page.
    files: [
      'scripts/**/*qa*.{js,mjs}',
      'scripts/*layout*.js',
      'scripts/verify-games.mjs',
      'scripts/legacy-playthroughs.mjs',
      'scripts/run-batch*.mjs',
      'games/*/qa/**/*.mjs',
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['worker/**/*.js'],
    languageOptions: { globals: { ...globals.worker, ...globals.serviceworker } },
  },
  {
    files: ['apps/arcade/public/sw.js'],
    languageOptions: { sourceType: 'script', globals: globals.serviceworker },
  },
  prettier,
]);
