// ESLint 9 flat config. Replaces the deprecated `next lint` interactive setup
// (gone in Next 16). Wraps the existing Next + Core-Web-Vitals presets via the
// FlatCompat shim so we don't have to hand-roll plugin loading.
//
// Run with `npm run lint` (next.js-aware) — passes silently when clean,
// exits non-zero on errors so CI / pre-commit can rely on it.

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  // Ignore generated / vendor output. ESLint 9 takes globalIgnores from a
  // standalone object with only `ignores`.
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'public/**',
      'scripts/seed/node_modules/**',
      'db/migrations/**',
      'next-env.d.ts',
    ],
  },

  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    // Project-wide tweaks. The Next presets are strict-leaning; relax a few
    // rules that clash with the codebase conventions documented in CLAUDE.md.
    rules: {
      // Drizzle's $defaultFn + raw SQL strings produce lots of `any` casts at
      // the schema boundary. Keep this as a warning rather than error so we
      // still see the noise but don't block the lint.
      '@typescript-eslint/no-explicit-any': 'warn',
      // We use process.env directly per CLAUDE.md §15 instead of a wrapper.
      'no-process-env': 'off',
      // Allow inline comments next to short utility types / token maps.
      'no-inline-comments': 'off',
    },
  },

  // Scripts directory is plain ESM Node — no JSX, no Next constraints.
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Hostinger's Node bootstrapper expects a CommonJS server.js at the project
  // root — require() is the contract there, not a smell.
  {
    files: ['server.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
