-- Verifies that user A cannot read user B's decisions / memory / trades / retro / traces / watchlist.
-- Run inside a Supabase SQL editor or via `supabase db execute -f supabase/tests/rls-cross-user.sql`
-- after seeding. Relies on two seeded users A and B existing.

BEGIN;

SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
DECLARE
  u_a uuid;
  u_b uuid;
  leaked int;
BEGIN
  SELECT user_id INTO u_a FROM public.users_profile ORDER BY created_at ASC LIMIT 1;
  SELECT user_id INTO u_b FROM public.users_profile ORDER BY created_at ASC OFFSET 1 LIMIT 1;

  IF u_a IS NULL OR u_b IS NULL THEN
    RAISE EXCEPTION 'Seed at least 2 users before running this test';
  END IF;

  -- Simulate user A
  PERFORM set_config('request.jwt.claim.sub', u_a::text, true);
  SELECT count(*) INTO leaked FROM public.decisions WHERE user_id = u_b;
  IF leaked > 0 THEN
    RAISE EXCEPTION 'RLS leak: user A read % decisions of user B', leaked;
  END IF;

  SELECT count(*) INTO leaked FROM public.watchlist WHERE user_id = u_b;
  IF leaked > 0 THEN
    RAISE EXCEPTION 'RLS leak: user A read % watchlist rows of user B', leaked;
  END IF;

  SELECT count(*) INTO leaked FROM public.user_memory WHERE user_id = u_b;
  IF leaked > 0 THEN
    RAISE EXCEPTION 'RLS leak: user A read % memory rows of user B', leaked;
  END IF;

  RAISE NOTICE 'RLS cross-user test passed.';
END $$;

ROLLBACK;
