import path from 'node:path';
import { config as loadEnv } from 'dotenv';

/**
 * Runs before any spec. The suite drives the real stack, so it fails fast with
 * the actual missing piece instead of a wall of navigation timeouts.
 */
export default async function globalSetup(): Promise<void> {
  loadEnv({
    path: [
      path.join(__dirname, '.env.local'),
      path.join(__dirname, '..', '.env'),
      path.join(__dirname, '..', '..', '.env'),
    ],
  });

  const supabaseUrl =
    process.env.SUPABASE_URL ?? 'https://rplpdnuyipccsckzvmyg.supabase.co';

  // The hosted /auth/v1/health route sits behind the apikey gateway and 401s
  // without a key, so probe the public JWKS the api verifies tokens against.
  const jwks = await fetch(
    `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
  ).catch(() => null);

  if (!jwks?.ok) {
    throw new Error(
      `Hosted Supabase is not reachable at ${supabaseUrl}. ` +
        'Check the project ref, your network, and that SUPABASE_URL is right.',
    );
  }

  // Imported after loadEnv so the seed's module-level env reads (SUPABASE_URL,
  // SUPABASE_SERVICE_ROLE_KEY) see the .env values; a static import would
  // evaluate them before dotenv has run.
  const { seedE2e } = await import('./seed');
  await seedE2e();
}
