/**
 * Test-only identities for the Playwright suite. Real login is a Google OAuth
 * round-trip a headless browser cannot finish, so the suite signs these accounts
 * in with a password instead. The e2e-login route stays inert unless the server
 * itself runs with E2E=1, which no deployment sets; seed rows are deleted and
 * recreated on every run.
 */
export const E2E_PASSWORD = 'e2e-kyne-test-password';

export const E2E_EMAILS = {
  manager: 'maya@kyne-e2e.test',
  kitchenA: 'kiki@kyne-e2e.test',
  kitchenB: 'dila@kyne-e2e.test',
  bar: 'rian@kyne-e2e.test',
} as const;

export const E2E_EMAIL_LIST: readonly string[] = Object.values(E2E_EMAILS);
