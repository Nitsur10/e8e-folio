# folio.e8e -- MVP Architecture Design

**Date:** 2026-04-18
**Status:** Approved
**Approach:** Monorepo (Expo + Next.js + Inngest) -- Approach C

---

## Constraints

- Solo developer with AI assistance
- Mobile-first via Expo (web support included, desktop dashboard Phase 2)
- Alpaca paper trading only (no real money for MVP)
- Claude only (Sonnet for agent decisions, Haiku for enrichment/UI)
- Best architecture possible -- no shortcuts, but defer infrastructure that isn't needed yet

---

## 1. Monorepo Structure & Tooling

```
e8e-folio/
├── apps/
│   ├── mobile/                  # Expo Router (SDK 52)
│   │   ├── app/                 # File-based routing (screens)
│   │   ├── components/          # Mobile-specific composed components
│   │   ├── constants/           # Theme tokens, config
│   │   ├── hooks/               # Mobile-specific hooks
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── web/                     # Next.js 15 (App Router)
│       ├── src/
│       │   ├── app/             # API routes + desktop pages (Phase 2)
│       │   │   ├── api/
│       │   │   │   ├── health/
│       │   │   │   ├── inngest/
│       │   │   │   ├── webhooks/
│       │   │   │   └── trpc/
│       │   │   └── (dashboard)/
│       │   ├── trpc/            # tRPC routers + middleware
│       │   └── lib/
│       ├── inngest/             # Workflow definitions
│       └── package.json
│
├── packages/
│   ├── core/                    # Zod schemas, types, constants, Inngest event types
│   ├── agent/                   # Agent runtime, context assembler, constraint engine
│   ├── signals/                 # Signal pipeline + enrichment
│   ├── broker/                  # Alpaca adapter + execution service
│   ├── db/                      # Supabase typed client + queries
│   └── ui/                      # Shared UI primitives (React Native)
│
├── supabase/                    # Migrations, config, seed data
├── .github/workflows/           # CI/CD pipelines
├── docs/                        # Design docs, runbooks
├── turbo.json
├── package.json
└── tsconfig.base.json
```

**Tooling:**
- Turborepo for monorepo orchestration
- pnpm for package management
- TypeScript strict mode everywhere, shared base tsconfig
- Zod schemas in `core/` as single source of truth

---

## 2. Database Schema & Data Layer

**Provider:** Supabase (Postgres + RLS)

### Tables

**profiles** -- user preferences, risk tolerance, onboarding state

**agents** -- agent definitions
- agent_id, user_id, name, description, ticker, strategy
- risk_profile (conservative/moderate/aggressive)
- position_size_pct, max_daily_trades
- mode (paper), status (draft/paper/paused/retired)
- lifecycle_state, drift_baseline (JSONB)
- paper_start_date, total_decisions (cached)

**decisions** -- every agent decision
- decision_id, agent_id, user_id
- trigger_type (cron/signal/user)
- action (buy/sell/hold/skip), ticker, quantity, price_at_decision
- reasoning, proposal_json, constraint_results
- context_manifest_hash, prompt_version
- status (proposed/approved/rejected/executed/failed)
- human_approval (pending/approved/rejected/auto)
- approval_expires_at, retrospective_text
- signals_used (UUID array)

**orders** -- broker orders
- order_id, decision_id, agent_id, alpaca_order_id
- side, qty, type, time_in_force
- filled_price, filled_qty, status, idempotency_key

**positions** -- current holdings per agent
- position_id, agent_id, user_id, ticker
- qty, avg_entry_price, current_price, unrealized_pnl

**signals** -- enriched signals from pipeline
- signal_id, source, ticker, headline, body_hash
- sentiment, novelty, materiality (Haiku scores)
- relevance_score, expires_at

**traces** -- LLM call traces (in Postgres for MVP, R2 later)
- trace_id, decision_id, agent_id
- prompt_hash, model, temperature
- input_tokens, output_tokens, latency_ms, cost_usd

**push_tokens** -- Expo push notification tokens
- id, user_id, device_id, expo_push_token
- platform (ios/android/web), active, last_used_at

**feature_flags** -- simple runtime flags
- key (PK), enabled, description, updated_at

**Existing tables** (from bootstrap): feedback_items, requirements, routine_logs

### Key decisions
- RLS on everything -- users can only see their own data
- `decisions` is the central table linking agents to orders
- `context_manifest_hash` enables decision replay
- Traces in Postgres for MVP -- move to R2 when storage costs matter
- Positions derived from orders as source of truth

---

## 3. Agent Runtime & Constraint Engine

### Location: `packages/agent/`

```
packages/agent/
├── src/
│   ├── harness/
│   │   ├── index.ts              # AgentHarness -- orchestrates full cycle
│   │   ├── runner.ts             # Inngest step-by-step execution
│   │   ├── lifecycle.ts          # State machine: draft -> paper -> paused -> retired
│   │   ├── drift.ts              # Behavior drift monitor (rolling stats)
│   │   ├── retrospective.ts      # Post-trade reflection via Sonnet
│   │   ├── metrics.ts            # Win rate, Sharpe, P&L, drawdown
│   │   └── types.ts
│   │
│   ├── context/
│   │   ├── assembler.ts          # Composes all 10 sections
│   │   ├── sections/             # One file per section (10 total)
│   │   │   ├── system-identity.ts
│   │   │   ├── agent-charter.ts
│   │   │   ├── hard-constraints.ts
│   │   │   ├── portfolio-state.ts
│   │   │   ├── market-state.ts
│   │   │   ├── relevant-signals.ts
│   │   │   ├── recent-decisions.ts
│   │   │   ├── available-tools.ts
│   │   │   ├── current-task.ts
│   │   │   └── output-contract.ts
│   │   ├── manifest.ts           # Hash generation for reproducibility
│   │   └── types.ts
│   │
│   ├── constraints/
│   │   ├── engine.ts             # Runs all 5 layers in sequence
│   │   ├── l1-structural.ts      # Zod validation
│   │   ├── l2-policy.ts          # Position size, exposure, trade limits, cross-agent check
│   │   ├── l3-simulated.ts       # Post-trade portfolio math
│   │   ├── l4-rate-cost.ts       # Token/API budget checks
│   │   ├── l5-killswitch.ts      # Global/user/agent halt flags
│   │   └── types.ts
│   │
│   ├── prompts/
│   │   ├── v1/
│   │   │   ├── system.md
│   │   │   ├── decision.md
│   │   │   └── retrospective.md
│   │   └── registry.ts
│   │
│   └── llm/
│       ├── client.ts             # Vercel AI SDK wrapper (Claude only)
│       ├── router.ts             # Model selection (Sonnet/Haiku)
│       └── types.ts
```

### Runtime flow
1. Trigger (cron/signal/user) -> AgentHarness.run()
2. Load agent charter + state from DB
3. Context Assembler composes 10 deterministic sections + manifest hash
4. LLM call (Claude Sonnet, temp=0, structured output)
5. Constraint Engine validates (5 layers, all must pass; L1 allows 2 retries)
6. Human approval (push notification, one-tap, configurable timeout)
7. Execution via broker adapter (idempotency key)
8. Persist decision, trace, order to DB
9. Async: push retrospective to user

### Key decisions
- Context assembler is pure functions -- no LLM in context selection
- Constraint engine is synchronous, no LLM calls -- pure math and rules
- Human-in-the-loop is default for MVP (auto-mode after graduation)
- Kill switch is a DB flag, checked at L5
- Prompt registry is versioned files in git
- Inngest durability: retries from failed step, not from scratch

---

## 4. Signal Pipeline

### Location: `packages/signals/`

```
packages/signals/
├── src/
│   ├── sources/
│   │   ├── alpaca.ts             # Market data
│   │   ├── benzinga.ts           # News feed
│   │   ├── polygon.ts            # News + market data
│   │   ├── health.ts             # Source health checks + fallback
│   │   ├── config.ts             # Rate limits, credibility weights
│   │   └── types.ts              # Normalized RawEvent type
│   │
│   ├── pipeline/
│   │   ├── ingest.ts             # Poll sources, normalize
│   │   ├── filter.ts             # Ticker extraction, watchlist match, dedup, credibility
│   │   ├── enrich.ts             # Haiku: sentiment, novelty, materiality
│   │   ├── derive.ts             # Sentiment delta, velocity
│   │   └── schedule.ts           # Market-hours-aware cron config
│   │
│   ├── bus/
│   │   ├── publisher.ts          # Write to Upstash Redis Streams
│   │   ├── consumer.ts           # Read by ticker + time window
│   │   └── types.ts
│   │
│   ├── feedback/
│   │   └── linker.ts             # Links signals to decisions for quality tracking
│   │
│   └── index.ts
```

### Pipeline stages
1. **Ingest** -- poll sources on Inngest cron (every 2-3 min market hours, every 30 min after hours)
2. **Filter** -- ticker extraction, watchlist match, content hash dedup, source credibility weighting
3. **Enrich** -- Claude Haiku structured output: sentiment (-1 to 1), novelty (bool), materiality (low/med/high)
4. **Derive** -- compute deltas (sentiment changed since last window), velocity (signal frequency)
5. **Publish** -- write to Upstash Redis Streams with TTL + persist to Postgres signals table
6. **Consume** -- agents query by ticker + time window via consumer

### Key decisions
- Upstash Redis Streams (not Kafka) -- sufficient for one user, cheap, managed
- Content hash dedup prevents duplicate signals from multiple sources
- Source credibility is a simple config map, not ML
- Signals expire (Redis TTL + Postgres expires_at)
- Signal-decision linker enables future quality scoring
- Source health checks: if one source is down, pipeline continues with others
- MVP sources: Alpaca (market data) + Benzinga (news). EDGAR later.

---

## 5. Broker Integration

### Location: `packages/broker/`

```
packages/broker/
├── src/
│   ├── adapters/
│   │   ├── alpaca/
│   │   │   ├── client.ts         # Alpaca API client (paper endpoint)
│   │   │   ├── orders.ts         # Submit, cancel, get status
│   │   │   ├── positions.ts      # Get positions, account info
│   │   │   ├── market-data.ts    # Quotes, bars, snapshots
│   │   │   └── websocket.ts      # Real-time trade updates + fills
│   │   └── types.ts              # BrokerAdapter interface
│   │
│   ├── execution/
│   │   ├── service.ts            # Validates, submits, reconciles
│   │   ├── idempotency.ts        # Key generation + dedup check
│   │   └── reconciler.ts         # Poll/websocket fill status, update positions
│   │
│   └── index.ts
```

### Key decisions
- BrokerAdapter interface -- IBKR implements same interface in Phase 2
- Paper endpoint only (`paper-api.alpaca.markets`), one config flag for live later
- Idempotency key from decision_id prevents double-submit on Inngest retries
- Websocket for instant fill notifications (better UX for push notifications)
- Position reconciliation: derive from orders, don't trust cached state

---

## 6. Mobile App & UI Architecture

### Location: `apps/mobile/` + `packages/ui/`

```
apps/mobile/
├── app/                           # Expo Router
│   ├── _layout.tsx
│   ├── +notifications.ts          # Push -> deep link router
│   ├── (auth)/
│   │   ├── splash.tsx
│   │   ├── onboarding.tsx
│   │   ├── questionnaire.tsx
│   │   └── broker-connect.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx            # 4 tabs: Home, Agents, Signals, Settings
│   │   ├── index.tsx              # Home screen
│   │   ├── agents/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── create.tsx
│   │   ├── signals.tsx
│   │   └── settings.tsx
│   ├── decision/[id].tsx
│   └── trace/[id].tsx
│
├── components/
│   ├── home/
│   │   ├── LayoutEngine.tsx       # Generative UI -- renders Haiku layout manifest
│   │   ├── LayoutFallback.tsx     # Static default layout
│   │   ├── PortfolioCard.tsx
│   │   ├── RegimeBanner.tsx
│   │   ├── AgentSummaryCard.tsx
│   │   └── NewsFeed.tsx
│   ├── decision/
│   │   ├── DecisionHero.tsx
│   │   ├── ConstraintChips.tsx
│   │   ├── ReasoningQuote.tsx
│   │   └── ApproveReject.tsx
│   ├── agent/
│   │   ├── AgentDetailHero.tsx
│   │   ├── MiniStats.tsx
│   │   ├── ActivityBar.tsx
│   │   └── DecisionHistory.tsx
│   └── retro/
│       ├── RetroHero.tsx
│       ├── RetroTimeline.tsx
│       └── RetroLesson.tsx
│
├── hooks/
│   ├── usePortfolio.ts
│   ├── useAgents.ts
│   ├── useDecisions.ts
│   ├── useSignals.ts
│   ├── usePushNotifications.ts
│   ├── useNetworkState.ts         # Connectivity + stale data
│   ├── useBiometricGate.ts        # Face ID / fingerprint
│   ├── useCachedState.ts          # MMKV offline cache
│   └── useRealtimeChannel.ts      # Supabase Realtime with reconnect
│
└── constants/
    └── theme.ts
```

### Design system: `packages/ui/`

```
packages/ui/
├── src/
│   ├── primitives/
│   │   ├── Text.tsx               # Serif, sans, mono variants
│   │   ├── Card.tsx
│   │   ├── Button.tsx             # Primary, secondary, ghost, destructive
│   │   ├── Pill.tsx               # Amber, teal, sage
│   │   ├── Toggle.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Sparkline.tsx
│   │   ├── Skeleton.tsx           # Loading placeholders
│   │   └── ErrorBoundary.tsx      # Per-card error isolation
│   │
│   ├── tokens/
│   │   ├── colors.ts              # bg:#0f100d, amber:#d4a25e, teal:#6fb3a4, etc.
│   │   ├── typography.ts          # Fraunces, Inter Tight, JetBrains Mono
│   │   ├── spacing.ts
│   │   └── radii.ts
│   │
│   └── icons/
│       └── index.ts
```

### Key decisions
- Design tokens extracted from HTML walkthrough
- Supabase Realtime for live updates (portfolio, signals, decision status)
- Push notifications via Expo Notifications + deep linking
- Generative UI: Haiku composes layout manifest, LayoutEngine renders, 30-60s cache TTL, static fallback
- Offline: MMKV local cache, stale data with "last updated" badge
- Security: expo-secure-store for Alpaca keys, biometric gate for kill switch + trade approval
- Haptics on approve/reject/kill switch
- Animations via react-native-reanimated + moti
- Accessibility: all primitives require accessibilityLabel

### Additional mobile dependencies
- expo-secure-store, expo-haptics, expo-local-authentication
- react-native-reanimated, moti
- react-native-mmkv
- sentry-expo

---

## 7. Backend API & Data Flow

### tRPC (type-safe API):

```
apps/web/src/trpc/
├── router.ts
├── context.ts                     # Auth context from Supabase JWT
├── errors.ts                      # Structured error mapping
├── middleware/
│   ├── auth.ts                    # JWT verification -> protectedProcedure
│   ├── rateLimit.ts               # Upstash per-user (100 read/min, 20 write/min)
│   └── logger.ts                  # Structured request logging
│
├── routers/
│   ├── home.ts                    # Combined home screen payload (parallel queries)
│   ├── portfolio.ts
│   ├── agents.ts
│   ├── decisions.ts
│   ├── signals.ts
│   ├── orders.ts
│   ├── onboarding.ts              # Includes registerPushToken
│   ├── settings.ts                # Includes toggleKillSwitch
│   └── admin.ts                   # Cost monitoring, usage stats
```

### Webhook endpoints:

```
apps/web/src/app/api/webhooks/
├── verify.ts                      # Shared HMAC signature verification
├── slack/route.ts
└── alpaca/route.ts
```

### Data flow patterns
- **READ:** Mobile -> tRPC query -> Supabase -> response + Realtime subscription
- **WRITE:** Mobile -> tRPC mutation -> Supabase + Inngest event -> optimistic update
- **PUSH:** Inngest -> save to DB -> Supabase Realtime (foreground) + Expo push (background)
- **STREAMING:** tRPC -> cache miss -> Haiku streams layout -> LayoutEngine renders incrementally

### Key decisions
- tRPC for end-to-end type safety (one Zod schema shared everywhere)
- Auth middleware validates Supabase JWT on every request
- Rate limiting via Upstash Redis @upstash/ratelimit
- Webhook signature verification (HMAC) before processing
- Optimistic updates on mutations for instant UX
- Combined `home.getHomeScreen` procedure avoids waterfall on app open
- Typed Inngest events in `packages/core/src/events.ts`
- Supabase Realtime with auto-reconnect + exponential backoff
- Push token lifecycle in `push_tokens` table, prune invalid tokens

---

## 8. Infrastructure & Deployment

### Services

| Service | Provider | Purpose | MVP Cost |
|---------|----------|---------|----------|
| Web API + Inngest host | Vercel Pro | Next.js API routes | ~$20/mo |
| Agent workflows | Inngest Cloud Free | Durable workflows, crons | Free (25k runs) |
| Database + Auth | Supabase Free -> Pro | Postgres, Auth, Realtime | Free -> $25/mo |
| Signal bus + Rate limit | Upstash Redis Free | Redis Streams, rate limits | Free (10k cmds/day) |
| LLM | Anthropic API | Sonnet + Haiku | ~$30-80/mo |
| Broker | Alpaca Free | Paper trading | Free |
| Push | Expo Free | iOS/Android push | Free |
| Builds | EAS Build Free | Mobile binaries | Free (30 builds/mo) |
| Errors | Sentry Free | Crash reports | Free |

**Total MVP: ~$50-125/mo** (mostly LLM usage)

### CI/CD (GitHub Actions)

```
On PR:
  1. Typecheck (tsc --noEmit)
  2. Lint (eslint)
  3. Unit tests (vitest)
  4. Vercel preview deploy
  5. Inngest workflow smoke tests

On merge to main:
  1. All PR checks
  2. Vercel production deploy
  3. Inngest function sync
  4. Migration check
  5. Smoke test /api/health

On release tag:
  1. EAS Build (iOS + Android)
  2. EAS Submit to TestFlight / Play Store
```

### Key decisions
- Three environments: dev (local), preview (PR), production
- No Langfuse/Grafana/R2/KMS for MVP -- defer until needed
- Traces in Postgres, errors in Sentry, costs via traces table query
- Database backups: weekly pg_dump via GitHub Actions -> Supabase Storage
- Inngest failure callback: push notification to user + log to routine_logs
- sentry-expo for mobile crash reporting
- Expo OTA updates for fast JS iteration without app store review
- Feature flags in DB table (generative_ui, signal_pipeline, push_notifications)
- Uptime: Vercel cron pings /api/health every 5 min
- Local dev: turbo dev starts supabase + inngest-cli + expo + next in parallel
- Migration safety: supabase db diff in CI, no auto-apply for destructive changes
- Secret rotation documented in runbooks
- Cost monitoring via admin tRPC router surfaced in settings

---

## Deferred to Phase 2+

- Desktop dashboard (rich trace viewer, signal feeds, agent config)
- IBKR broker adapter
- Live trading (real money)
- Multi-provider LLM routing (OpenAI, Gemini)
- Langfuse tracing + Grafana dashboards
- Cloudflare R2 for trace/prompt archival
- AWS KMS for broker key encryption
- Cross-asset signal correlation
- Agent graduation: paper -> staged -> live_auto
- SEC EDGAR filing ingestion
- Behavior drift ML (beyond simple stats)
