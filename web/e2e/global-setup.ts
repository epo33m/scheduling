import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { seedE2e } from './seed';

/**
 * Runs before any spec. The suite drives the real stack, so it fails fast with
 * the actual missing piece instead of a wall of navigation timeouts.
 */
export default async function globalSetup(): Promise<void> {
  loadEnv({
    path: [
      path.join(__dirname, '.env.local'),
      path.join(__dirname, '..', '.env'),
    ],
  });

  const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54421';

  const health = await fetch(`${supabaseUrl}/auth/v1/health`).catch(() => null);

  if (!health?.ok) {
    throw new Error(
      `Local Supabase is not reachable at ${supabaseUrl}. ` +
        'Run `bun run db:start` and `bun run db:migrate` first.',
    );
  }

  await seedE2e();
}
