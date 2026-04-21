# folio.e8e — Phase 1 Task Breakdown

**Version:** 1.0
**Phase:** 1 — Build MVP (weeks 1–12)
**Audience:** Opus 4.7
**Prerequisites:** Read `HANDOFF_01_overview.md` and `HANDOFF_03_design_system.md` first

---

## How to execute this document

Each task below has:

- **ID** (e.g., `T1.2`) — unique identifier, use in branch names
- **Goal** — one sentence on what "done" looks like
- **Deliverables** — concrete files or systems produced
- **Acceptance criteria** — checklist of verifiable conditions
- **Dependencies** — which tasks must complete first
- **Estimated effort** — rough complexity indicator

Execute tasks within a week in the numbered order. Tasks within the same week may parallelize if no dependency exists.

**Convention:** One branch per task. PR includes acceptance criteria as a checklist the reviewer (you) ticks before merging.

---

## WEEK 1 — Foundation, specs, and bootstrapping

### T1.1 — Initialize monorepo and deployment pipelines

**Goal:** A deployable Next.js web app and Expo mobile app, both pointing at a Supabase instance, showing "Hello from folio.e8e" end-to-end.

**Deliverables:**
- Monorepo with `/web` (Next.js 15, App Router, TypeScript strict) and `/mobile` (Expo SDK 52+) and `/shared` (types, constants)
- Vercel project connected to GitHub, deploying `/web` on push to `main`
- Expo EAS project for mobile builds
- Supabase project provisioned, connection strings in `.env.local` and Vercel env vars
- README with setup instructions

**Acceptance criteria:**
- [ ] `pnpm install && pnpm dev` runs both web and mobile locally without errors
- [ ] Pushing to `main` triggers a Vercel preview deploy that loads successfully
- [ ] Mobile app runs on iOS simulator and Android emulator, displaying "Hello from folio.e8e"
- [ ] TypeScript strict mode enabled, no `any` in scaffolding code
- [ ] `.env.example` committed with all required variables documented

**Effort:** Small (0.5 day)

### T1.2 — Database schema and RLS policies

**Goal:** Supabase schema for all Phase 1 tables with row-level security enforced.

**Deliverables:**
- Migration files in `/supabase/migrations/`
- Tables: `users_profile`, `broker_connections`, `signals`, `stock_scores`, `decisions`, `trades`, `retrospectives`, `traces`, `user_memory`, `watchlist`, `feedback_items`
- RLS policies: every table except `signals` and `stock_scores` requires `user_id = auth.uid()` for read/write
- TypeScript types generated from schema via `supabase gen types`

**Feedback table decision:** If a `feedback_items` table or equivalent already exists in the repo, keep it if functional and wire into T1.2's schema. Otherwise create a minimal clean version per Appendix A. Phase 2 is explicitly a learning phase — structured feedback capture from day one means Phase 2 has data to work with.

**Acceptance criteria:**
- [ ] Migrations run cleanly against a fresh Supabase instance
- [ ] Seed script populates: 10 test users, 100 sample signals, 461 ticker scores
- [ ] RLS policy test: User A cannot read User B's `decisions` rows
- [ ] Generated `database.types.ts` committed and imported in shared types
- [ ] Primary keys use `uuid` default `gen_random_uuid()` everywhere except `stock_scores` which uses `(ticker, as_of_date)` composite

**Schema reference:** See Appendix A at end of this file.

**Dependencies:** T1.1

**Effort:** Medium (1 day)

### T1.3 — Auth flow with Supabase + MFA

**Goal:** User can sign up, verify MFA, and log in on both web and mobile.

**Deliverables:**
- `/web/app/(auth)/sign-up`, `/sign-in`, `/verify-mfa` routes
- Mobile equivalents in `/mobile/app/(auth)/`
- Shared auth hook/context usable on both platforms
- Email verification flow with Supabase magic links
- TOTP MFA enrollment via Supabase Auth

**Acceptance criteria:**
- [ ] User can complete: sign up → email verify → MFA enroll → sign in, fully end-to-end on web
- [ ] Same flow works on mobile
- [ ] Protected routes redirect unauthenticated users to sign-in
- [ ] Session persists across page reloads (web) and app restarts (mobile)
- [ ] Design matches `folio.e8e_design_walkthrough_v2.1.html` onboarding screens
- [ ] All auth-related strings match the voice guidelines in HANDOFF_01 §10

**Dependencies:** T1.1, T1.2

**Effort:** Medium (1 day)

### T1.4 — Design tokens package

**Goal:** CSS variables and React Native theme constants extracted from `folio.e8e_design_walkthrough_v2.1.html` into a reusable package.

**Deliverables:**
- `/shared/design-tokens/tokens.ts` — typed exports of all colors, spacing, radii, fonts
- `/web/app/globals.css` — CSS variables matching tokens
- `/mobile/theme/index.ts` — React Native theme consumable by styled components

**Acceptance criteria:**
- [ ] All color tokens from HANDOFF_03 §2 present and named consistently
- [ ] Font loading works: Fraunces, JetBrains Mono, Inter Tight on both platforms
- [ ] Web: CSS variables render correctly, test page shows all swatches
- [ ] Mobile: theme provider wraps app, tokens accessible via hook
- [ ] No hardcoded hex values in any feature code (enforce in lint rule)

**Dependencies:** T1.1

**Effort:** Small (0.5 day)

### T1.5 — Observability skeleton

**Goal:** Sentry capturing errors on both web and mobile; Langfuse Cloud receiving LLM traces (no traces yet, just the connection).

**Deliverables:**
- Sentry initialized in web and mobile entry points
- Langfuse Cloud project and API keys configured in env
- Test error logged and visible in Sentry dashboard
- Test LLM call logged and visible in Langfuse dashboard

**Acceptance criteria:**
- [ ] Throwing `new Error("test")` in a route handler shows in Sentry within 1 minute
- [ ] Calling Anthropic API via Vercel AI SDK with Langfuse instrumentation shows trace in Langfuse
- [ ] PII is scrubbed from Sentry (user emails, API keys) via `beforeSend` hook
- [ ] Observability is disabled in local dev unless explicitly enabled

**Dependencies:** T1.1

**Effort:** Small (0.5 day)

---

## WEEK 2 — Data pipelines and broker adapter

### T2.1 — Alpaca BYOK adapter with KMS encryption

**Goal:** User can enter their Alpaca paper API key + secret, the platform encrypts it with AWS KMS envelope encryption, stores it, and can verify it works.

**Deliverables:**
- `/features/broker/api/connect.ts` — POST handler accepting key + secret
- `/features/broker/lib/kms.ts` — envelope encryption using AWS KMS
- `/features/broker/lib/alpaca.ts` — typed Alpaca client using the user's decrypted key
- `/features/broker/api/verify.ts` — calls Alpaca `GET /v2/account`, confirms connection
- Hard check: rejects any key that looks like a live-trading key (validates against `paper-api.alpaca.markets` base URL only)

**Acceptance criteria:**
- [ ] User can enter key via UI (matches walkthrough screen 04 "Broker")
- [ ] Key is encrypted before hitting DB (verify: raw DB row shows ciphertext, not key)
- [ ] Decryption works: platform can place a paper order using stored key
- [ ] Live keys are rejected with clear error
- [ ] Key can be revoked (delete row + KMS key deletion)
- [ ] Unit tests cover: encryption round-trip, live-key rejection, Alpaca error handling

**Dependencies:** T1.2, T1.3

**Effort:** Medium (1–1.5 days)

### T2.2 — Signal ingestion pipeline (Benzinga + EDGAR + Polygon news)

**Goal:** Three source adapters running on Vercel Cron, ingesting news into `signals` table with dedup and materiality scoring.

**Deliverables:**
- `/workers/signals/benzinga.ts` — cron handler, runs every 15 min
- `/workers/signals/edgar.ts` — cron handler, runs every 30 min for 8-K, 10-Q, Form 4
- `/workers/signals/polygon-news.ts` — cron handler, runs every 15 min
- `/features/signals/lib/dedup.ts` — hash-based deduplication across sources
- `/features/signals/lib/materiality.ts` — Haiku-powered scoring: { sentiment: -1..1, materiality: 0..1, event_type: string, summary: string }
- Signal envelope schema (Zod) applied uniformly across all sources

**Acceptance criteria:**
- [ ] Running all three crons for 48 hours ingests ≥5,000 unique signals
- [ ] Dedup: zero duplicate signals (verified by a SQL check)
- [ ] Every signal has a materiality score (no nulls)
- [ ] Signal pipeline handles source API failures gracefully (logs, retries with backoff, does not crash cron)
- [ ] Signals table has index on `(ticker, as_of_date)` for fast Advisor queries
- [ ] Haiku materiality scoring costs logged (expect ~$0.01 per 100 signals)

**Dependencies:** T1.2, T1.5

**Effort:** Large (2–2.5 days)

### T2.3 — Fundamentals ETL from Financial Modeling Prep

**Goal:** Nightly job that refreshes fundamentals (income statement, balance sheet, cash flow, estimates) for all S&P 500 tickers.

**Deliverables:**
- `/workers/fundamentals/fmp-etl.ts` — cron handler, runs 2 AM ET daily
- `/features/fundamentals/lib/fmp.ts` — typed FMP client with rate-limit handling
- Fundamentals stored in `stock_fundamentals` table (ticker, as_of_date, raw_json)

**Acceptance criteria:**
- [ ] Full S&P 500 refresh completes in under 30 minutes
- [ ] Edge cases handled: missing data, delisted tickers, M&A events (skip gracefully, log)
- [ ] Cron can resume partial failures (don't re-fetch already-fetched tickers in same run)
- [ ] 5 consecutive nights of clean runs before acceptance
- [ ] FMP API cost stays within subscription limits

**Dependencies:** T1.2

**Effort:** Medium (1.5 days)

---

## WEEK 3 — The 40-factor Screener backend

### T3.1 — 40-factor scoring engine

**Goal:** Nightly job computes all 40 factors for S&P 500, normalizes to 0-100, weighted composite stored.

**Deliverables:**
- `/features/screener/lib/factors/` — one file per factor category (valuation, quality, growth, health, smart-money, momentum, capital-return)
- `/features/screener/lib/scoring.ts` — orchestrator that runs all factors, normalizes, composites
- `/workers/screener/nightly-scoring.ts` — cron runs after fundamentals ETL completes
- Output written to `stock_scores` table

**Factor list:** See Appendix B.

**Acceptance criteria:**
- [ ] All 40 factors compute for ≥95% of S&P 500 tickers (some will have nulls for missing data — acceptable)
- [ ] Normalized scores are 0-100, percentile-rank within universe
- [ ] Direction flags respected (lower P/E scores higher, etc)
- [ ] Composite score calculated as sum of (normalized × weight/100)
- [ ] Top 10 composite scores are directionally sensible (manual sanity check)
- [ ] Nightly job completes in under 30 minutes
- [ ] Partial failures don't block the run (tickers with errors get null scores, run continues)
- [ ] Test suite covers: each factor's calculation, normalization math, composite weighting

**Dependencies:** T2.3

**Effort:** Large (2.5–3 days)

### T3.2 — Screener API endpoints

**Goal:** tRPC endpoints for top-N, sector filter, ticker lookup.

**Deliverables:**
- `/features/screener/api/router.ts` — tRPC router
- Endpoints: `getTopN`, `getBySector`, `getTickerDetail`, `searchTickers`
- Zod schemas for all inputs/outputs
- Response caching via Vercel edge cache (1 hour TTL on list endpoints)

**Acceptance criteria:**
- [ ] All endpoints return in under 500ms p95
- [ ] `getTickerDetail` includes all 40 factor scores, raw values, explainers
- [ ] Sector filter works for all 11 GICS sectors
- [ ] Type-safe end-to-end from client through tRPC
- [ ] Cache invalidation on nightly score update

**Dependencies:** T3.1

**Effort:** Small (1 day)

---

## WEEK 4 — Screener UI (web)

### T4.1 — Screener home page (web)

**Goal:** Top-10 view, matches walkthrough screen 09 "Mid-session" style.

**Deliverables:**
- `/web/app/screener/page.tsx`
- Top-10 list with composite score, ticker, company name, sector, factor highlights
- Toggle: absolute top-10 vs within-sector
- Sector filter dropdown
- Search bar for ticker lookup

**Acceptance criteria:**
- [ ] Matches design system: Fraunces for headers, JetBrains Mono for numbers, amber for accents
- [ ] Loading states use skeleton UI (no spinners)
- [ ] Empty state if no data (shouldn't happen, but handle it)
- [ ] Keyboard navigation: arrow keys to move through list, Enter to open detail
- [ ] Responsive from 320px to 1600px
- [ ] Lighthouse accessibility score ≥95

**Dependencies:** T3.2, T1.4

**Effort:** Medium (1.5 days)

### T4.2 — Stock detail view (web)

**Goal:** Full factor breakdown for a selected ticker.

**Deliverables:**
- `/web/app/screener/[ticker]/page.tsx`
- Header: ticker, company name, current price, current composite score
- Sections: one per lens (Valuation, Quality, Growth, Health, Smart-money, Momentum, Capital Return)
- Each factor shows: raw value, normalized score, weight, one-line explainer, direction indicator
- "Why this score?" section showing top 3 contributors and bottom 3 detractors
- CTA: "Get the Advisor's view" (links to Advisor page for this ticker)

**Acceptance criteria:**
- [ ] Page renders in under 1s p95
- [ ] All 40 factors displayed with explainers
- [ ] Numbers are monospaced, colors follow design rules
- [ ] Mobile-friendly layout (lens sections stack vertically on narrow screens)
- [ ] Deep link works: `/screener/AAPL` loads directly

**Dependencies:** T4.1

**Effort:** Medium (1.5 days)

### T4.3 — Watchlist feature

**Goal:** User can save tickers and see a watchlist view.

**Deliverables:**
- Heart/star button on detail view
- `/web/app/watchlist/page.tsx`
- tRPC endpoints: `addToWatchlist`, `removeFromWatchlist`, `getWatchlist`
- Max 50 tickers per user (enforced in API)

**Acceptance criteria:**
- [ ] Add/remove persists to DB
- [ ] Watchlist page shows same columns as Screener but only user's saved tickers
- [ ] Optimistic UI updates (feels instant)
- [ ] 51st add returns user-friendly error

**Dependencies:** T4.2

**Effort:** Small (1 day)

---

## WEEK 5 — Screener UI (mobile)

### T5.1 — Screener screens (mobile)

**Goal:** Mobile parity for T4.1 and T4.2.

**Deliverables:**
- `/mobile/app/(tabs)/screener.tsx`
- `/mobile/app/screener/[ticker].tsx`
- Tab bar with Screener, Watchlist, Profile

**Acceptance criteria:**
- [ ] Feature parity with web Screener and detail
- [ ] Native feel: pull-to-refresh, smooth scrolling, system fonts fallback
- [ ] Matches design walkthrough mobile screens
- [ ] Tested on iOS simulator and Android emulator
- [ ] Works on smallest target device (iPhone SE 2nd gen)

**Dependencies:** T4.1, T4.2, T1.4

**Effort:** Large (2–2.5 days)

### T5.2 — Watchlist (mobile)

**Goal:** Mobile parity for T4.3.

**Deliverables:**
- `/mobile/app/(tabs)/watchlist.tsx`

**Acceptance criteria:**
- [ ] Feature parity with web watchlist
- [ ] Swipe-to-remove on iOS/Android

**Dependencies:** T4.3, T5.1

**Effort:** Small (0.5 day)

### T5.3 — Onboarding flow (mobile + web)

**Goal:** New user can go from signup to Screener in under 3 minutes.

**Deliverables:**
- Full onboarding: splash → sign up → MFA → Alpaca key entry → welcome screen → Screener
- Matches walkthrough screens 01-07
- Progress indicator showing where user is in flow

**Acceptance criteria:**
- [ ] 5 test users complete end-to-end in under 3 minutes average
- [ ] Dropout analytics captured at each step
- [ ] Back navigation works without data loss
- [ ] Mobile and web flows feel equivalent

**Dependencies:** T1.3, T2.1, T5.1

**Effort:** Medium (1.5 days)

---

## WEEK 6 — Internal launch and iteration buffer

### T6.1 — Internal soft launch

**Goal:** 5 internal users (you + trusted network) complete full onboarding and spend 1 hour with the Screener.

**Deliverables:**
- Deploy production (`folio.e8e` or placeholder domain)
- 5 users recruited, onboarded, given access
- Feedback collection: in-app feedback button + scheduled 30-min calls
- Analytics dashboard: DAU, screener queries, watchlist adds, drop-off points

**Acceptance criteria:**
- [ ] All 5 users complete onboarding without assistance
- [ ] Each places at least one paper trade via Alpaca (even if not through Advisor yet)
- [ ] Zero P0 incidents during the week
- [ ] Feedback synthesized into a punch-list for week 7-8 fixes

**Dependencies:** T5.3

**Effort:** Small (coordinate + observe, 0.5 day actual work + ongoing support)

### T6.2 — Week 6 fix cycle

**Goal:** Address the top 10 issues from T6.1 feedback.

**Deliverables:**
- Bug fixes based on feedback
- UX polish based on observed friction
- Performance optimizations if any endpoints are slow

**Acceptance criteria:**
- [ ] All P1 bugs from feedback resolved
- [ ] P2 bugs prioritized for week 11-12
- [ ] Analytics improvements (new events based on what's hard to measure)

**Dependencies:** T6.1

**Effort:** Medium (2 days, depends on feedback)

---

## WEEK 7 — Advisor agent infrastructure

### T7.1 — Agent harness core

**Goal:** The agent runtime that the Advisor (and future agents) runs on.

**Deliverables:**
- `/features/agent/lib/harness.ts` — runs an agent: assembles context, calls LLM with tools, validates output, logs trace
- `/features/agent/lib/context-assembler.ts` — builds prompt from: system identity, agent charter, user profile, portfolio state, relevant signals, user memory
- `/features/agent/lib/tools.ts` — tool registry: `getFactorScore`, `getRecentSignals`, `getUserMemory`, `getFundamentals`
- `/features/agent/lib/trace.ts` — structured trace logger writing to `traces` table and Langfuse
- Zod-validated output schema for Advisor decision

**Acceptance criteria:**
- [ ] Harness can run a test prompt with tools and produce a typed output
- [ ] Traces are logged to both `traces` table and Langfuse
- [ ] Context assembler produces deterministic output for same inputs (testable)
- [ ] Tool calls are typed: inputs validated by Zod, outputs typed
- [ ] Errors in LLM call or tool use are caught, logged, surfaced gracefully
- [ ] Unit tests cover: context assembly, each tool, harness happy path, harness error paths

**Dependencies:** T1.5 (observability), T3.1 (factors available), T2.2 (signals available)

**Effort:** Large (2.5 days)

### T7.2 — User memory system

**Goal:** User actions (approved, rejected, dismissed, noted) are captured and retrievable for agent context.

**Deliverables:**
- `user_memory` table schema (ticker, action_type, timestamp, metadata_json, user_note)
- `/features/memory/lib/record.ts` — records user actions
- `/features/memory/lib/retrieve.ts` — returns relevant memory for a given ticker + context
- Integration with agent harness: memory retrieved and included in context

**Acceptance criteria:**
- [ ] Memory is recorded on every user action
- [ ] Retrieval returns top-N most relevant memories for a ticker (by recency + similarity)
- [ ] Memory never exposes other users' data (RLS-enforced)
- [ ] Test: create fake user, record 10 memories, verify retrieval returns correct ones

**Dependencies:** T7.1

**Effort:** Medium (1.5 days)

---

## WEEK 8 — Advisor agent and UI

### T8.1 — Advisor agent implementation

**Goal:** `runAdvisor(ticker, userId)` produces a structured decision card.

**Deliverables:**
- `/features/advisor/lib/agent.ts` — Advisor-specific agent using the harness
- Charter: produce structured analysis, never recommend, always cite sources
- Output schema: `{ bullCase[], bearCase[], smartMoneyView, upcomingCatalysts[], overallRead: { direction, confidence, rationale }, memoryReferences[] }`
- System prompt frozen and version-controlled

**Acceptance criteria:**
- [ ] Running Advisor on 20 random S&P 500 tickers produces valid outputs for all
- [ ] Every claim cites a specific signal, factor, or data point (automated check)
- [ ] Zero hallucinated facts in manual review of 50 outputs (acceptance gate)
- [ ] Outputs include `memoryReferences` when relevant user memory exists
- [ ] Overall read uses low/medium/high confidence, never percentages
- [ ] Cost per Advisor query stays under $0.10 (monitor in Langfuse)

**Dependencies:** T7.1, T7.2

**Effort:** Large (2.5 days, includes prompt iteration)

### T8.2 — Advisor UI (web + mobile)

**Goal:** User selects ticker, sees Advisor view, can place paper trade.

**Deliverables:**
- `/web/app/advisor/[ticker]/page.tsx` — Advisor page (matches walkthrough screen 11 "Decision")
- Mobile equivalent
- Streaming UI: reasoning appears progressively as LLM generates
- Decision card components: bull case, bear case, smart-money, catalysts, overall read
- Action buttons: "Place paper buy," "Reject — tell agent why," "Save to watchlist"
- Reasoning trace accessible via "Why this view?" link

**Acceptance criteria:**
- [ ] Matches walkthrough design (decision hero, signal chips, constraint row)
- [ ] Streaming works on web and mobile
- [ ] Paper buy flows to Alpaca via broker adapter, confirmation matches walkthrough screen 12
- [ ] Reject flow captures optional note, feeds into user memory
- [ ] Beta disclaimer visible on every Advisor view
- [ ] p95 time-to-first-token under 3 seconds

**Dependencies:** T8.1, T2.1

**Effort:** Large (2.5 days)

---

## WEEK 9 — Trade execution and post-trade flow

### T9.1 — Paper trade execution

**Goal:** Approved trades route to Alpaca paper, fill, and update user's position view.

**Deliverables:**
- `/features/trades/api/execute.ts` — POST handler that places order via Alpaca
- Idempotency: same decision_id never produces two orders
- `/features/trades/lib/reconcile.ts` — polls Alpaca for fill status, updates `trades` table
- Position view: `/web/app/portfolio/page.tsx` and mobile equivalent

**Acceptance criteria:**
- [ ] 100 test trades placed, 100 fills reconciled, 0 duplicates
- [ ] Trade history visible to user with full trace reference
- [ ] Failed fills show clear error (rejected by Alpaca, insufficient buying power, etc)
- [ ] Portfolio page shows current paper positions pulled from Alpaca

**Dependencies:** T2.1, T8.2

**Effort:** Medium (2 days)

### T9.2 — Trace viewer

**Goal:** User can view the full reasoning trace for any of their decisions.

**Deliverables:**
- `/web/app/trace/[decisionId]/page.tsx`
- Display: context manifest (what the agent knew), tool calls made, LLM input/output, final decision
- Matches walkthrough screen 15 "Explain" and desktop screen 20 "Trace viewer"

**Acceptance criteria:**
- [ ] Any user's decisions link to their traces
- [ ] Trace is read-only, human-readable, no raw JSON dumps
- [ ] Mobile version available and works on small screens
- [ ] Only user's own traces accessible (RLS-enforced)

**Dependencies:** T8.2, T9.1

**Effort:** Medium (1.5 days)

---

## WEEK 10 — Retrospectives

### T10.1 — Retrospective generator

**Goal:** 30 days after a user approves a paper buy, generate a structured retrospective.

**Deliverables:**
- `/workers/retrospectives/daily-generator.ts` — cron runs daily, finds trades from 30 days ago
- `/features/retrospectives/lib/generate.ts` — uses agent harness to generate retrospective
- Retrospective schema: { tradeId, priceChangePct, thesisHeld, factorsStable, lessons[], overallOutcome }
- Email digest sent via Resend or similar

**Acceptance criteria:**
- [ ] Cron identifies trades needing retrospectives without duplicates
- [ ] Retrospective content is grounded: cites actual price, actual factor changes, actual news
- [ ] Email is branded, matches voice guidelines
- [ ] User can view retrospectives in-app at `/retrospectives`
- [ ] Test with 10 simulated historical trades

**Dependencies:** T8.1, T9.1

**Effort:** Large (2.5 days)

### T10.2 — Retrospective UI

**Goal:** User can view retrospectives in the app.

**Deliverables:**
- `/web/app/retrospectives/page.tsx` — list view
- `/web/app/retrospectives/[id]/page.tsx` — detail view
- Mobile equivalents
- Matches walkthrough screen 13 "Retrospective"

**Acceptance criteria:**
- [ ] Clean visual design, agent-authored voice
- [ ] "What I learned" section prominently displayed
- [ ] Links back to original trade and trace
- [ ] Mobile-friendly

**Dependencies:** T10.1

**Effort:** Medium (1.5 days)

---

## WEEK 11 — Hardening, polish, and recruitment

### T11.1 — Error handling audit

**Goal:** Every external call (Alpaca, Anthropic, FMP, Polygon, Benzinga, EDGAR) has explicit error handling.

**Deliverables:**
- Error taxonomy document
- Retry policies with exponential backoff
- Graceful degradation UI states
- Critical errors alert to Sentry with proper severity

**Acceptance criteria:**
- [ ] Simulate each external service being down: product degrades gracefully, user sees informative error
- [ ] No unhandled promise rejections in production logs over 48 hours
- [ ] Sentry shows zero uncaught errors

**Dependencies:** Most prior tasks

**Effort:** Medium (2 days)

### T11.2 — Performance optimization

**Goal:** All user-facing pages meet performance budgets.

**Deliverables:**
- Lighthouse audit on all web pages
- React Native performance profiling on mobile
- Database query optimization for slow queries

**Acceptance criteria:**
- [ ] Lighthouse: ≥90 across all metrics on 5 key pages
- [ ] Mobile: 60fps scrolling on all lists
- [ ] Database: p95 query time under 100ms
- [ ] Bundle size: web initial JS under 200KB gzipped

**Dependencies:** Most prior tasks

**Effort:** Medium (1.5 days)

### T11.3 — Pre-launch security review

**Goal:** Self-audit of security posture before opening to beta users.

**Deliverables:**
- Security checklist (see Appendix C) run and signed off
- Any findings remediated

**Acceptance criteria:**
- [ ] No secrets in git history
- [ ] All API routes have auth checks
- [ ] RLS tested on every user-data table
- [ ] KMS encryption verified end-to-end
- [ ] Rate limiting in place on auth and LLM endpoints
- [ ] HTTPS-only enforced

**Dependencies:** All prior tasks

**Effort:** Medium (1.5 days)

---

## WEEK 12 — Beta launch

### T12.1 — Beta user recruitment

**Goal:** 25+ real users signed up, active in the product.

**Deliverables:**
- Waitlist email sent to founder's network
- Onboarding walkthrough for first users
- Personal 30-min call with first 10 users
- Feedback mechanism in-app

**Acceptance criteria:**
- [ ] 50+ people invited, 25+ sign up, 15+ complete onboarding
- [ ] First 10 users have had a direct conversation with founder
- [ ] Feedback mechanism is used (≥5 feedback items submitted)

**Dependencies:** T11.3

**Effort:** Ongoing through the week, roughly 2 days of focused work

### T12.2 — Launch operations and monitoring

**Goal:** Platform is stable and observable under real user load.

**Deliverables:**
- 24/7 Sentry alerts configured
- Daily metrics dashboard (users, queries, trades, errors)
- Runbook for common issues

**Acceptance criteria:**
- [ ] Zero P0 incidents in launch week
- [ ] Alerts trigger appropriately (test by forcing errors)
- [ ] Runbook covers: Alpaca outage, LLM outage, DB issue, user reports incorrect data

**Dependencies:** T12.1

**Effort:** Medium (1.5 days)

### T12.3 — Phase 1 gate review

**Goal:** Formal check that Phase 1 has met its completion criteria.

**Deliverables:**
- Gate review document answering:
  - All acceptance criteria met? (Y/N per task)
  - 25+ users signed up? (yes/no)
  - Zero P0 incidents? (yes/no)
  - ≥5 retrospectives generated? (yes/no)
  - Any gaps or known issues?

**Acceptance criteria:**
- [ ] All checks pass OR documented exceptions with founder sign-off
- [ ] Phase 1 officially complete, Phase 2 (Learning) begins

**Dependencies:** All prior tasks

**Effort:** Small (0.5 day)

---

## Appendix A — Complete database schema

```sql
-- Users (extends Supabase auth.users)
create table public.users_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  capital_tier text check (capital_tier in ('learner', 'standard', 'active', 'pro')),
  risk_tolerance text check (risk_tolerance in ('conservative', 'moderate', 'aggressive')),
  approval_mode text default 'ask_me' check (approval_mode in ('ask_me', 'auto_under_200')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Encrypted broker API keys
create table public.broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(user_id) on delete cascade,
  broker text not null check (broker = 'alpaca_paper'),  -- Phase 1 only paper
  encrypted_key bytea not null,
  encrypted_secret bytea not null,
  kms_key_id text not null,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, broker)
);

-- Signal bus (no user-specific RLS — public data)
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text not null,
  ticker text,
  event_type text,
  headline text not null,
  summary text,
  sentiment numeric,
  materiality numeric,
  raw_payload jsonb,
  published_at timestamptz not null,
  ingested_at timestamptz default now(),
  unique (source, source_id)
);
create index idx_signals_ticker_published on public.signals(ticker, published_at desc);

-- Fundamentals raw data
create table public.stock_fundamentals (
  ticker text not null,
  as_of_date date not null,
  period_type text not null,  -- 'quarterly', 'annual', 'ttm'
  raw_data jsonb not null,
  updated_at timestamptz default now(),
  primary key (ticker, as_of_date, period_type)
);

-- Computed factor scores
create table public.stock_scores (
  ticker text not null,
  as_of_date date not null,
  factor_name text not null,
  raw_value numeric,
  normalized_score numeric check (normalized_score between 0 and 100),
  weight numeric,
  weighted_contribution numeric,
  lens text,
  primary key (ticker, as_of_date, factor_name)
);

-- Composite scores for fast top-N queries
create table public.stock_composite_scores (
  ticker text not null,
  as_of_date date not null,
  composite_score numeric check (composite_score between 0 and 100),
  sector text,
  market_cap numeric,
  primary key (ticker, as_of_date)
);
create index idx_composite_desc on public.stock_composite_scores(as_of_date, composite_score desc);

-- Every advisor query and user action
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(user_id) on delete cascade,
  ticker text not null,
  query_type text not null,  -- 'advisor_query', 'paper_trade_intent'
  agent_output jsonb,
  user_action text,  -- 'approved', 'rejected', 'dismissed', 'saved'
  user_note text,
  trace_id uuid,
  created_at timestamptz default now()
);

-- User memory (learns from actions)
create table public.user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(user_id) on delete cascade,
  ticker text,
  memory_type text not null,  -- 'preference', 'rejection_pattern', 'note'
  content jsonb not null,
  decision_id uuid references public.decisions(id),
  created_at timestamptz default now()
);
create index idx_memory_user_ticker on public.user_memory(user_id, ticker, created_at desc);

-- Paper trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(user_id) on delete cascade,
  decision_id uuid references public.decisions(id),
  alpaca_order_id text unique,
  ticker text not null,
  side text not null check (side in ('buy', 'sell')),
  quantity numeric not null,
  order_type text not null,
  status text not null,  -- 'pending', 'filled', 'rejected', 'cancelled'
  filled_price numeric,
  filled_at timestamptz,
  created_at timestamptz default now()
);

-- Retrospectives
create table public.retrospectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(user_id) on delete cascade,
  trade_id uuid not null references public.trades(id),
  generated_at timestamptz default now(),
  content jsonb not null,  -- { priceChangePct, thesisHeld, factorsStable, lessons, overallOutcome }
  viewed_at timestamptz,
  unique (trade_id)
);

-- Agent execution traces
create table public.traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users_profile(user_id) on delete cascade,
  agent_name text not null,
  context_manifest jsonb,
  tool_calls jsonb,
  llm_input jsonb,
  llm_output jsonb,
  duration_ms int,
  cost_usd numeric,
  langfuse_trace_id text,
  created_at timestamptz default now()
);

-- Watchlist
create table public.watchlist (
  user_id uuid not null references public.users_profile(user_id) on delete cascade,
  ticker text not null,
  added_at timestamptz default now(),
  alert_criteria jsonb,  -- Phase 3+
  primary key (user_id, ticker)
);

-- Feedback items (lightweight for Phase 2 learning)
create table public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(user_id) on delete cascade,
  page_context text,  -- e.g., 'screener', 'advisor:AAPL', 'retrospective:xyz'
  feedback_text text not null,
  rating int check (rating between 1 and 5),  -- optional
  created_at timestamptz default now()
);
create index idx_feedback_user_created on public.feedback_items(user_id, created_at desc);
```

**RLS policies:** Every table except `signals`, `stock_fundamentals`, `stock_scores`, `stock_composite_scores` has RLS requiring `user_id = auth.uid()`. The stock tables are read-only public.

---

## Appendix B — 40-factor list

Seven lenses, weights totalling 100.

### Valuation (20%)
| Factor | Weight | Direction | Source |
|---|---|---|---|
| `dcf_implied_growth` | 8 | Lower is better | FMP |
| `ev_ebitda` | 4 | Lower is better | FMP |
| `p_fcf` | 4 | Lower is better | FMP |
| `pe_ratio` | 2 | Lower is better | FMP |
| `peg_ratio` | 2 | Lower is better | FMP |

### Quality & Profitability (18%)
| Factor | Weight | Direction | Source |
|---|---|---|---|
| `roic` | 6 | Higher is better | FMP |
| `gross_margin_stability` | 4 | Higher + lower std | FMP (5y history) |
| `roe` | 4 | Higher is better | FMP |
| `operating_margin` | 2 | Higher is better | FMP |
| `piotroski_f_score` | 2 | Higher is better | FMP (computed) |

### Growth (12%)
| Factor | Weight | Direction | Source |
|---|---|---|---|
| `revenue_cagr_3y` | 4 | Higher is better | FMP |
| `eps_cagr_3y` | 4 | Higher is better | FMP |
| `analyst_revision_momentum_90d` | 4 | Higher is better | FMP estimates |

### Financial Health (14%)
| Factor | Weight | Direction | Source |
|---|---|---|---|
| `debt_to_ebitda` | 4 | Lower is better | FMP |
| `interest_coverage` | 3 | Higher is better | FMP |
| `current_ratio` | 2 | Higher is better | FMP |
| `fcf_yield` | 3 | Higher is better | FMP |
| `cash_conversion` | 2 | Higher (closer to 1) | FMP |

### Smart-Money (14%)
| Factor | Weight | Direction | Source |
|---|---|---|---|
| `super_investor_conviction` | 5 | Higher is better | WhaleWisdom or EDGAR 13F |
| `super_investor_accumulation_delta` | 4 | Higher is better | Quarterly 13F delta |
| `insider_net_transactions_90d` | 3 | Positive is better | EDGAR Form 4 |
| `short_interest_change` | 2 | Lower is better | FINRA free feed |

### Momentum & Sentiment (12%)
| Factor | Weight | Direction | Source |
|---|---|---|---|
| `momentum_12m_ex_last` | 5 | Higher is better | Polygon |
| `relative_strength_vs_sector` | 3 | Higher is better | Polygon + sector index |
| `earnings_surprise_4q` | 2 | Higher is better | FMP |
| `news_sentiment_trend_30d` | 2 | Higher is better | Our signal pipeline |

### Capital Return & Risk (10%)
| Factor | Weight | Direction | Source |
|---|---|---|---|
| `fcf_backed_dividend_yield` | 3 | Higher is better | FMP computed |
| `buyback_yield_net` | 2 | Higher is better | FMP |
| `max_drawdown_3y` | 3 | Lower (closer to 0) | Polygon |
| `beta` | 2 | User preference | Polygon |

**Total: 100%.**

---

## Appendix C — Pre-launch security checklist

- [ ] No hardcoded secrets in source (scan with `gitleaks`)
- [ ] All environment variables documented in `.env.example`
- [ ] Every API route has auth check except explicitly public ones
- [ ] RLS enabled on all user-data tables, tested with cross-user access attempts
- [ ] KMS keys configured with proper IAM policies
- [ ] Rate limiting on auth endpoints (5 attempts / 15 min per IP)
- [ ] Rate limiting on LLM endpoints (60 requests / hour per user for Phase 1)
- [ ] HTTPS-only enforced via Vercel
- [ ] CORS configured to only allow the production domain
- [ ] Content Security Policy headers set
- [ ] User input sanitized (especially search queries, notes)
- [ ] Logs scrubbed of PII (emails, API keys, tokens)
- [ ] Backup strategy: Supabase daily backups enabled
- [ ] Incident runbook: who gets paged, escalation path
- [ ] Terms of Service and Privacy Policy live (minimal SaaS templates, counsel later)

---

**End of HANDOFF_02. Refer to HANDOFF_03 for design system specifics when implementing UI tasks.**
