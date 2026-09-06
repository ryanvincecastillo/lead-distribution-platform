import { defineConfig } from '@playwright/test';

/**
 * The suites drive a real browser against a running app and share database state, so they
 * are deliberately serial with a single worker — they read as a scripted walkthrough of the
 * specification rather than as independent unit tests.
 *
 * Point them at a deployment with E2E_BASE_URL, and supply the seeded admin password with
 * E2E_ADMIN_PASSWORD. Start from an empty database (see README) so the "only one form can
 * be created" rules can actually be exercised.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    // Generous defaults: the same suite runs against a VPS with ~250ms round trips.
    actionTimeout: 25_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
