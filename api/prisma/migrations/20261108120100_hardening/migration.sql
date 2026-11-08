-- Hand-written hardening that the generated DDL cannot express.

-- Shift hours are local WITA wall-clock times (PRD §Prinsip). Hold the columns
-- to HH:MM so no caller can write a timestamp or a 24-hour-plus value.
ALTER TABLE "shift_type"
  ADD CONSTRAINT "shift_type_start_time_hhmm" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT "shift_type_end_time_hhmm" CHECK ("end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- RLS deny-all (PRD §Aturan keamanan): the browser never reads these tables.
-- The only path to data is the NestJS api over the direct Postgres connection,
-- which runs as the table owner and therefore still sees every row.
ALTER TABLE "employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift_type" ENABLE ROW LEVEL SECURITY;

-- The policies make "deny everything" explicit for the Supabase client roles.
-- They are created only when those roles exist so the migration also applies to
-- a plain Postgres instance; RLS without a policy already denies all access.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'CREATE POLICY "employee_deny_all" ON "employee" '
         || 'AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
    EXECUTE 'CREATE POLICY "shift_type_deny_all" ON "shift_type" '
         || 'AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
  END IF;
END
$$;
