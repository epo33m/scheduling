import { SHIFT_TYPE_CATALOG } from '@repo/types';
import { shiftTypeSeedSchema } from '@repo/validators';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Seeds `shift_type` with the PAGI/SORE/MIDDLE hours from the PRD. Idempotent:
 * the code is unique, so re-running updates hours instead of inserting rows.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  for (const definition of SHIFT_TYPE_CATALOG) {
    const shift = shiftTypeSeedSchema.parse(definition);
    const hours = {
      startTime: shift.startTime,
      endTime: shift.endTime,
      positions: shift.positions,
    };

    await prisma.shiftType.upsert({
      where: { code: shift.code },
      create: { code: shift.code, ...hours },
      update: hours,
    });
  }

  console.log(`Seeded ${SHIFT_TYPE_CATALOG.length} shift_type rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
