-- Hand-written hardening for the F5 schedule table. Prisma generates the DDL;
-- this pass adds what it cannot express: RLS.

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
