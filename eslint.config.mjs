import { FlatCompat } from '@eslint/eslintrc';
import { defineConfig, globalIgnores } from 'eslint/config';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default defineConfig([
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
  }),
  globalIgnores([
    '.next/**',
    '.wrangler/**',
    'out/**',
    'playwright-report/**',
    'test-results/**',
    'node_modules/**',
    'next-env.d.ts',
    'worker-configuration.d.ts',
  ]),
]);
