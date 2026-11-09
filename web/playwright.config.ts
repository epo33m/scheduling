import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * The Playwright tier: full cycles against the real stack — local Next.js and
 * NestJS servers talking to the hosted Supabase project. It is not wired into
 * CI because the seed needs the hosted service_role secret. Run it with
 * `bun run test:e2e` from the repo root once the root .env carries SUPABASE_URL
 * and SUPABASE_SERVICE_ROLE_KEY for the hosted project (already migrated and
 * seeded).
 *
 * The servers run on their own ports so a developer's `bun run dev` can stay
 * up, and the web server gets E2E=1, which is what arms the password-login
 * route the real Google flow cannot serve headlessly. The seed writes to the
 * hosted database: it deletes and rebuilds only the fixture rows (emails ending
 * kyne-e2e.test, plus the two fixture Mondays).
 */
const WEB_PORT = 3210;
const API_PORT = 3211;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  // localhost, not 127.0.0.1: dev rewrites the redirect origin to localhost,
  // and the session cookie is host-only, so a host switch mid-flow drops it.
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'bun run dev',
      cwd: path.join(__dirname, '..', 'api'),
      port: API_PORT,
      env: { PORT: String(API_PORT) },
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `bunx next dev --port ${WEB_PORT}`,
      cwd: __dirname,
      port: WEB_PORT,
      env: { E2E: '1', API_URL: `http://127.0.0.1:${API_PORT}` },
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
