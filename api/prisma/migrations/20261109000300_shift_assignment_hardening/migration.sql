-- Hand-written hardening for the F5 schedule table. Prisma generates the DDL;
-- this pass adds what it cannot express: the day rules and RLS.

-- Pagi and sore can be placed any day, while libur and middle only exist
-- Senin–Kamis (PRD §Aturan bisnis, GLOSSARY › Middle). The api checks the same
-- rule; this CHECK is defence-in-depth so a direct write cannot park a middle
-- or a libur on a busy day. ISODOW numbers Mon=1..Sun=7. "shift_code" IS NULL
-- is libur, so COALESCE keeps the null case out of the true branch.
ALTER TABLE "shift_assignment"
  ADD CONSTRAINT "shift_assignment_day_rule"
    CHECK (
      COALESCE("shift_code" IN ('PAGI', 'SORE'), false)
      OR EXTRACT(ISODOW FROM "tanggal") BETWEEN 1 AND 4
    );

-- RLS deny-all (PRD §Aturan keamanan): the browser never reads the schedule
-- either, the NestJS api over the direct connection (table owner) is the only
-- path. Policies are created only when the Supabase client roles exist, so the
-- same migration applies to a plain Postgres instance (RLS with no policy
-- denies all).
ALTER TABLE "shift_assignment" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'CREATE POLICY "shift_assignment_deny_all" ON "shift_assignment" '
         || 'AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
  END IF;
END
$$;
