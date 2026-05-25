import { defineConfig, devices } from '@playwright/test';

// E2E config. Spins up the prod server (next start) against the local SQLite
// so tests run against the same code path as production. Tests live in
// scripts/tests/e2e/*.spec.ts.
//
// Run: `npm run test:e2e` — assumes the dev hasn't manually started a server
// on port 3300. CI: run on a fresh image.

const PORT = 3300;

export default defineConfig({
  testDir: './scripts/tests/e2e',
  fullyParallel: false,                 // single SQLite file = serial writes
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: `npm run build && PORT=${PORT} npm run start`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Same DB the dev server uses, so tests see real seeded data.
      DATABASE_PATH: process.env.DATABASE_PATH ?? `${process.cwd()}/citynight.local.sqlite`,
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}`,
      // Suppress the production-only ad / analytics scripts during tests.
      NEXT_PUBLIC_NOINDEX: '1',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
