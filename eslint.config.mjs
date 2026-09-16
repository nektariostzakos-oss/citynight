// ESLint 9 flat config. eslint-config-next 16 ships native flat configs, so the
// Next and Core Web Vitals presets are spread in directly. The FlatCompat shim
// that wrapped them before crashes with eslint-config-next 16 (its legacy
// loader fails while validating the flat presets), so `npm run lint` stopped
// before it linted a single file.
//
// Run with `npm run lint`: passes silently when clean, exits non-zero on
// errors so CI and hooks can rely on it.

import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

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
      // Vendored Atelier template: its own Next 16 / React 19 sub-app. Built
      // and linted under its own pipeline; we do not co-mingle with citynight.
      'templates/atelier-base/**',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    // eslint-config-next registers the react-hooks plugin only for these
    // extensions. An unscoped override would also reach .cjs files, where
    // ESLint stops with "could not find plugin react-hooks".
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    rules: {
      // react-hooks v7 flags effects that set state right after mount or on a
      // prop change: reading browser-only state (geolocation, theme, locale,
      // storage, the clock) or resetting UI on navigation. Rewriting them is
      // its own task, so they stay visible as warnings, not failures.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

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

  // Scripts directory is plain ESM Node: no JSX, no Next constraints.
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Hostinger's Node bootstrapper expects a CommonJS server.js at the project
  // root: require() is the contract there, not a smell.
  {
    files: ['server.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
