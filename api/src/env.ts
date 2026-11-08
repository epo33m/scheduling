import { config } from 'dotenv';

// One .env at the repo root, shared by the api runtime, Prisma and the seed. An
// api/.env can override it: dotenv keeps the first value it finds per key.
config({ path: ['.env', '../.env'] });
