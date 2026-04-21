-- =============================================================================
-- RLS cross-user isolation test
-- Runs as the `authenticated` Postgres role with user A's JWT claims injected,
-- so the policies (auth.uid() = user_id) are actually exercised. Queries that
-- request user B's rows must return zero — not because of a WHERE filter, but
-- because RLS filtered them out first.
--
-- Usage: supabase db execute -f supabase/tests/rls-cross-user.sql
-- Requires: at least two seeded users (run seeds/seed-users.mjs first).
-- =============================================================================

BEGIN;

-- Stage 1 — resolve user UUIDs while still running as the connection role
-- (postgres/service_role). Stash them as session settings so the role switch
-- below doesn't lose them.
DO $resolve$
DECLARE
  u_a uuid;
  u_b uuid;
BEGIN
  SELECT user_id INTO u_a FROM public.users_profile ORDER BY created_at ASC LIMIT 1;
  SELECT user_id INTO u_b FROM public.users_profile ORDER BY created_at ASC OFFSET 1 LIMIT 1;
  IF u_a IS NULL OR u_b IS NULL THEN
    RAISE EXCEPTION 'Seed at least two users before running this test (run seeds/seed-users.mjs)';
  END IF;
  PERFORM set_config('test.u_a', u_a::text, true);
  PERFORM set_config('test.u_b', u_b::text, true);
END
$resolve$;

-- Stage 2 — impersonate user A. SET LOCAL ROLE switches the executing role
-- (RLS is enforced); set_config injects the JWT claims that auth.uid() reads.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.u_a'),
    'role', 'authenticated'
  )::text,
  true
);

-- Stage 3 — assert user A cannot see any of user B's rows on every user-scoped
-- table. If RLS is working, each count is zero; if any row leaks, RAISE fires.
DO $check$
DECLARE
  leaked int;
  u_b uuid := current_setting('test.u_b')::uuid;
BEGIN
  SELECT count(*) INTO leaked FROM public.decisions          WHERE user_id = u_b;
  IF leaked > 0 THEN RAISE EXCEPTION 'RLS leak: decisions (% rows)', leaked; END IF;

  SELECT count(*) INTO leaked FROM public.watchlist          WHERE user_id = u_b;
  IF leaked > 0 THEN RAISE EXCEPTION 'RLS leak: watchlist (% rows)', leaked; END IF;

  SELECT count(*) INTO leaked FROM public.user_memory        WHERE user_id = u_b;
  IF leaked > 0 THEN RAISE EXCEPTION 'RLS leak: user_memory (% rows)', leaked; END IF;

  SELECT count(*) INTO leaked FROM public.trades             WHERE user_id = u_b;
  IF leaked > 0 THEN RAISE EXCEPTION 'RLS leak: trades (% rows)', leaked; END IF;

  SELECT count(*) INTO leaked FROM public.retrospectives     WHERE user_id = u_b;
  IF leaked > 0 THEN RAISE EXCEPTION 'RLS leak: retrospectives (% rows)', leaked; END IF;

  SELECT count(*) INTO leaked FROM public.traces             WHERE user_id = u_b;
  IF leaked > 0 THEN RAISE EXCEPTION 'RLS leak: traces (% rows)', leaked; END IF;

  SELECT count(*) INTO leaked FROM public.broker_connections WHERE user_id = u_b;
  IF leaked > 0 THEN RAISE EXCEPTION 'RLS leak: broker_connections (% rows)', leaked; END IF;

  SELECT count(*) INTO leaked FROM public.users_profile      WHERE user_id = u_b;
  IF leaked > 0 THEN RAISE EXCEPTION 'RLS leak: users_profile (% rows)', leaked; END IF;

  RAISE NOTICE 'RLS cross-user test passed — user A cannot read any of user B rows.';
END
$check$;

RESET ROLE;
ROLLBACK;
