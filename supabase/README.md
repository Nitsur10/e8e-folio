# folio.e8e — Supabase workspace

Migrations, seed data, and RLS tests for the Phase 1 schema.

## Layout

```
supabase/
├── config.toml                        # Supabase CLI config
├── migrations/
│   ├── 001_feedback_schema.sql        # Template-era ops feedback (retained)
│   └── 002_folio_phase1_schema.sql    # Appendix A — folio.e8e Phase 1 tables
├── seed.sql                           # Public reference seed (100 signals, 461 composite scores)
├── seeds/
│   └── seed-users.mjs                 # 10 test auth users + per-user seed data
└── tests/
    └── rls-cross-user.sql             # User-A-cannot-read-user-B check
```

## First-time setup

```bash
# Link to your Supabase project
npx supabase login
npx supabase link --project-ref <your-ref>

# Apply migrations and public seed
npx supabase db push
# (or, for fresh local DB)
# npx supabase db reset

# Seed the auth users + per-user data
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node supabase/seeds/seed-users.mjs

# Regenerate TypeScript types from the live schema
pnpm dlx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" --schema public \
  > shared/src/types/database.types.ts
```

## RLS

Every user-scoped table (`decisions`, `user_memory`, `trades`, `retrospectives`, `traces`, `watchlist`, `users_profile`, `broker_connections`) enforces `user_id = auth.uid()` for all operations, plus a service-role policy for workers.

Public reference tables (`signals`, `stock_fundamentals`, `stock_scores`, `stock_composite_scores`) are readable by anon/authenticated and writable only by the service role.

Verify the cross-user isolation:

```bash
npx supabase db execute -f supabase/tests/rls-cross-user.sql
```

## Feedback table

The template's `feedback_items` (Slack-ops shape, from migration 001) is kept as-is. The v3 Appendix A `feedback_items` (user-scoped in-app feedback) is deferred until the in-app feedback UI lands — see the follow-up task in `HANDOFF_02` notes.
