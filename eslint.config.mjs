import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { globals: { URL: 'readonly', console: 'readonly' } } },
  // Browser-only legacy ES modules are served untouched from public/.
  globalIgnores(['public/**', 'reference/**', 'dist/**', '.astro/**']),
]);
