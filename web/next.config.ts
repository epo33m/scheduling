import path from 'node:path';
import { config } from 'dotenv';
import type { NextConfig } from 'next';

// The repo keeps one .env at its root, shared with the api and Prisma. Next
// only looks inside this package, so load the root file here; a web/.env.local
// wins over it, and vars already set win over both.
config({ path: [path.resolve('.env.local'), path.resolve('../.env')] });

const nextConfig: NextConfig = {};

export default nextConfig;
