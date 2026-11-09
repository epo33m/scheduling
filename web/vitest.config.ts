import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The Playwright specs live under e2e/ and are run by `bun run test:e2e`,
    // never by vitest.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'e2e/**'],
  },
});
