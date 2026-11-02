import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Browser-only legacy ES modules are served untouched from public/.
  // They are not authored or bundled as React/TypeScript application source.
  globalIgnores(['public/**', 'reference/**']),
]);
