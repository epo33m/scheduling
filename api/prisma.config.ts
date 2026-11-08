import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Same two-file lookup as api/src/env.ts: an api/.env wins, the repo-root .env
// fills the rest. Inlined because Prisma loads this config as plain CJS.
config({ path: ['.env', '../.env'] });

// `prisma generate` (and CI) must work before .env exists, so fall back to a
// placeholder that is never dialed.
const datasourceUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  'postgresql://generate-only:generate-only@127.0.0.1:1/generate_only';

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun prisma/seed.ts',
  },
  datasource: {
    // Migrations go over DIRECT_URL; the api reads DATABASE_URL through the pg adapter.
    url: datasourceUrl,
  },
});
