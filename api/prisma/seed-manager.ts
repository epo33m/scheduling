import '../src/env';
import { parseCreateEmployee } from '@repo/validators';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Whitelists the first manager so someone can actually log in.
 *
 * The whole whitelist flow (F1/F2) has a chicken-and-egg on a fresh database:
 * the api's `AuthGuard` rejects every email that has no `employee` row, but the
 * only screen that creates those rows (`/manager/staff`) is itself behind that
 * gate, and Google sign-in never provisions a manager on its own. Seeding
 * `shift_type` already proves the fix: this runs over the pooled `DATABASE_URL`
 * as the database owner, a role exempt from the deny-all RLS that only binds
 * `anon`/`authenticated`. No JWT, no Google round trip — just the one row the
 * gate is looking for.
 *
 * Idempotent: re-running for the same email refreshes `role` and `is_active`
 * rather than stacking duplicates, so it is safe to run again after a mistake.
 *
 * Usage: `bun run db:seed-manager -- --email you@gmail.com [--name ... ]`
 */

interface Flags {
  [key: string]: string;
}

/** Parse `--key value` pairs from argv, ignoring the `--` bun passes through. */
function parseFlags(argv: string[]): Flags {
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    // A bare `--` is the separator bun/turbo pass through; skip it, not its value.
    if (token === '--') {
      continue;
    }
    if (token.startsWith('--')) {
      flags[token.slice(2)] = argv[i + 1] ?? '';
      i += 1;
    }
  }
  return flags;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const email = flags.email;
  if (!email) {
    throw new Error(
      'Email wajib. Contoh: bun run db:seed-manager -- --email you@gmail.com',
    );
  }

  // A bootstrap account has no probation to track, so it lands as `tetap`, which
  // needs no `probationEndDate`. The manager can still add staff on probation
  // later through the normal screen.
  const parsed = parseCreateEmployee({
    name: flags.name ?? email.split('@')[0],
    email,
    position: flags.position ?? 'bar',
    role: flags.role ?? 'manager',
    status: flags.status ?? 'tetap',
    probationEndDate: flags.probation ?? null,
  });
  if (!parsed.ok) {
    throw new Error(`Data tidak valid: ${parsed.message}`);
  }
  const input = parsed.value;

  const existing = await prisma.employee.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    // Refresh the two fields login depends on; leave name/position as they are.
    const updated = await prisma.employee.update({
      where: { id: existing.id },
      data: { role: input.role, isActive: true },
      select: { id: true, email: true, role: true, isActive: true },
    });
    console.log(
      `Diperbarui: ${updated.email} sudah terdaftar (role ${updated.role}, aktif ${updated.isActive}).`,
    );
    return;
  }

  const created = await prisma.employee.create({
    data: {
      name: input.name,
      email: input.email,
      position: input.position,
      role: input.role,
      status: input.status,
      probationEndDate: input.probationEndDate
        ? new Date(`${input.probationEndDate}T00:00:00.000Z`)
        : null,
      isActive: true,
    },
    select: { id: true, email: true, role: true },
  });
  console.log(
    `Dibuat: ${created.email} masuk daftar putih dengan role ${created.role}. Sekarang bisa masuk lewat Google.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
