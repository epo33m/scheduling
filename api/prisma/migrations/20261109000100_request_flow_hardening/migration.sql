-- Hand-written hardening for the F3 request-flow tables. Prisma generates the
-- DDL; this pass adds what it cannot express: the day-of-week rule and RLS.

-- Off requests exist only Monday–Thursday (PRD §Aturan bisnis, "Sistem membatasi
-- form"). The api checks the same rule, this CHECK is defence-in-depth so a
-- direct write can never park a Friday–Sunday libur. ISODOW numbers Mon=1..Sun=7.
ALTER TABLE "off_request"
  ADD CONSTRAINT "off_request_tanggal_is_weekday"
    CHECK (EXTRACT(ISODOW FROM "tanggal") BETWEEN 1 AND 4);

-- RLS deny-all (PRD §Aturan keamanan): the browser never reads these tables,
-- the NestJS api over the direct connection (table owner) is the only path.
ALTER TABLE "schedule_week" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "off_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift_request" ENABLE ROW LEVEL SECURITY;

-- Policies are created only when the Supabase client roles exist, so the same
-- migration applies to a plain Postgres instance (RLS with no policy denies all).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'CREATE POLICY "schedule_week_deny_all" ON "schedule_week" '
         || 'AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
    EXECUTE 'CREATE POLICY "off_request_deny_all" ON "off_request" '
         || 'AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
    EXECUTE 'CREATE POLICY "shift_request_deny_all" ON "shift_request" '
         || 'AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
  END IF;
END
$$;
