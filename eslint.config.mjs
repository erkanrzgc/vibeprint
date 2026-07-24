import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '.output/',
      '.wxt/',
      'test-results/',
      // Captured from live sites by tools/capture - generated data, not authored code.
      'test/fixtures/corpus/',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    // React lives only in the popup. Scoped so rules-of-hooks does not misread Playwright's
    // fixture `use` callback (test/e2e) as a React hook - that is a false positive, not a
    // violation worth silencing inline.
    files: ['entrypoints/**'],
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Capture/eval/store tooling and the test suite run under Node.
    files: ['tools/**', 'test/**', '*.config.*'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Playwright fixtures without dependencies require the literal `async ({}, use)` shape.
    files: ['test/e2e/**'],
    rules: { 'no-empty-pattern': ['error', { allowObjectPatternsAsParameters: true }] },
  },
  // Must come last: disables any stylistic rule that would fight Prettier.
  prettier,
);
