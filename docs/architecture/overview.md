# folio.e8e — Opus Handoff Package

**Version:** 1.0 · MVP Phase 1
**Audience:** Opus 4.7 (primary) and human reviewer
**Status:** Ready for execution

---

## 1. How to use this package

This document and its companion files constitute the complete specification for building folio.e8e's MVP. Read them in this order:

1. **This file** (`HANDOFF_01_overview.md`) — product context, architecture, roadmap, conventions
2. **`HANDOFF_02_phase1_tasks.md`** — week-by-week task breakdown with acceptance criteria
3. **`HANDOFF_03_design_system.md`** — design tokens, component library, mobile-first UI rules
4. **Reference artifacts** (already produced):
   - `folio.e8e_Architecture_v1.1.docx` — full technical architecture
   - `folio.e8e_Architecture_Diagrams.md` — 10 Mermaid diagrams
   - `folio.e8e_design_walkthrough_v2.1.html` — 20-screen visual reference, source of truth for UI
   - `folio.e8e_user_journey.html` — paper-to-live user flow visualization

**Execution model:** Opus works one task at a time from `HANDOFF_02`. Before starting each task, Opus reads this overview for context and the relevant section of `HANDOFF_03` for UI specifics. Each task has explicit acceptance criteria.

---

## 2. Product context

### 2.1 What folio.e8e is

folio.e8e is an AI-assisted trading platform for technically literate retail investors. It pairs transparent factor-based stock screening with AI-driven single-stock research, all routed through Alpaca paper trading in the MVP. Users make every decision; the AI provides grounded information and structured analysis. The platform remembers user preferences and learns from user actions over time.

### 2.2 Core product bet

Technically literate retail investors will return weekly to a platform that:
- Shows its reasoning transparently
- Remembers their preferences across sessions
- Lives where the investing workflow actually happens (research → decide → execute → retrospect)
- Keeps them in control of every decision

### 2.3 Target user

A 28-45 year old with $10k–$500k in investable assets, reads company 10-Ks for fun, has an Alpaca or Robinhood account, and is skeptical of hype. Uses multiple tools today (Yahoo Finance, Seeking Alpha, ChatGPT, the broker's own tools). Would prefer one tool that does it all, if the tool earned their trust.

### 2.4 What ships in MVP (Phase 1)

Three integrated capabilities:

**The Screener** — 40-factor fundamental scoring of S&P 500 stocks, refreshed nightly, with a top-10 view. Default weights in MVP (user customization in Phase 3+).

**The Advisor** — Select a stock, get AI-generated structured analysis: bull case, bear case, smart-money view, upcoming catalysts, overall read with confidence. Every claim cites a specific data source. User can place a paper buy/sell with full reasoning trace.

**Retrospectives** — 30 days after a user approves a trade, the platform generates a structured retrospective: what happened, did the thesis hold, lessons.

Underlying these: Alpaca BYOK (paper only), user memory system, trace logging, basic mobile + web parity.

### 2.5 What does NOT ship in MVP

Explicitly deferred to prevent scope creep:

- The Wheel (options strategy) — Phase 3+
- The Mirror (politician/hedge fund copying) — Phase 3+
- The Portfolio Builder — Phase 4+
- Live trading (real money) — Phase 3+ with counsel engagement
- User-customizable Screener weight profiles — Phase 3+
- Generative UI levels L3/L4 — Phase 3+
- Push notifications — Phase 3+
- Advanced constraint engine (L3 simulated, L4 rate-limiting) — Phase 3+
- Multi-broker support — Phase 4+

---

## 3. Strategic moats (guide design decisions)

Three long-term moats that Phase 1 must seed, even if they don't show their value immediately:

**Memory moat.** User actions (approved, rejected, dismissed, noted) are captured from day one. The Advisor agent references relevant past actions when producing future analyses. This creates a personalized, sticky product that gets better the more a user uses it.

**Collective intelligence moat.** (Latent in Phase 1.) Usage data is collected in a structured way so that in later phases, aggregated anonymous signals can be surfaced ("most users with Sharpe > 1.5 are currently selling NVDA").

**Workflow ownership moat.** folio.e8e should be the first tool a user opens when investing. Phase 2's learning phase explicitly tests this ("where do you go first when you have an investing question?").

These moats inform design decisions throughout Phase 1. When in doubt, choose the option that strengthens one of these three.

---

## 4. Non-negotiable principles

When Opus makes implementation choices, these principles override convenience:

1. **Show the reasoning.** Every AI output must cite specific data sources. No unsourced claims. No phrases like "analysts generally expect" without a specific analyst citation.

2. **User controls every action.** No autonomous trading in Phase 1. Every buy, sell, or watchlist add is explicitly user-initiated or user-approved.

3. **Paper only.** The Alpaca adapter must refuse live keys in Phase 1 code. Hard check, not a config flag.

4. **Beta framing, always visible.** Every screen where a user sees AI output includes "Beta. Paper only. Not investment advice." Either as a persistent footer or inline.

5. **No performance predictions.** The Advisor never says "this stock will go up X%." It says "here's what the data shows, here's what smart money is doing, the decision is yours."

6. **No green-red P&L clichés.** Use sage (healthy) and rose (concerning) from the design system. Never saturated green/red.

7. **Monospace for numbers.** Every ticker, price, percentage, timestamp, or trace ID uses JetBrains Mono. Never body-font numbers.

8. **Amber is sacred.** The amber accent (`#D4A25E`) marks agent voice, pending actions, and urgent moments only. Never decorative.

---

## 5. Technical architecture (summary)

Full details in `folio.e8e_Architecture_v1.1.docx`. Quick reference:

### 5.1 Stack (Phase 1)

| Layer | Tool | Why |
|---|---|---|
| Web | Next.js 15 (App Router) | Vercel-native, React Server Components for Advisor UI |
| Mobile | Expo (React Native) | Fastest path to iOS + Android from one codebase |
| API | tRPC + Zod | End-to-end type safety, thin adapter to Next.js route handlers |
| Database | Supabase Postgres + RLS | Auth + database + real-time all-in-one |
| Auth | Supabase Auth + MFA | Built-in MFA, email/password for MVP |
| LLM runtime | Vercel AI SDK + `@anthropic-ai/sdk` | Streaming, tool use, native to Vercel |
| Scheduled jobs | Vercel Cron | Nightly fundamentals ETL, retrospective triggers |
| Key encryption | AWS KMS | Envelope encryption for Alpaca API keys |
| Object storage | Cloudflare R2 | Trace archival, logs |
| Observability | Langfuse Cloud + Sentry | LLM trace visibility, error monitoring |
| Broker | Alpaca Paper API | Paper trading only in MVP |
| Market data | Polygon.io | Prices, options chains (Phase 3+) |
| News | Benzinga + SEC EDGAR | News signals and filings |
| Fundamentals | Financial Modeling Prep | Income statement, balance sheet, cash flow |

### 5.2 Explicitly NOT in Phase 1

- Inngest (add in Phase 3 for Wheel durable workflows)
- Quiver Quantitative (Phase 3 for Mirror)
- Self-hosted Langfuse (stay on cloud for MVP)
- Multiple LLM providers (Anthropic only for MVP)
- Kubernetes, dedicated infra (Vercel + Supabase only)

### 5.3 High-level data model

Five core tables drive the MVP. Full schemas in task specs.

- **`users`** — Supabase-managed auth, extended with profile
- **`broker_connections`** — encrypted Alpaca keys, per-user
- **`signals`** — ingested news/filings with materiality scoring
- **`stock_scores`** — 40-factor scores per ticker per as-of-date
- **`decisions`** — every Advisor query and user response (the memory store)
- **`trades`** — paper trades placed via Alpaca, with trace references
- **`retrospectives`** — auto-generated 30-day post-trade summaries
- **`traces`** — full agent execution traces for audit and replay

---

## 6. Roadmap

### 6.1 Phase 1 — Build MVP (weeks 1–12)

Ship Screener + Advisor + Retrospectives to 25-50 users from founder's network, on Alpaca paper only.

Detailed task breakdown: `HANDOFF_02_phase1_tasks.md`

**Phase 1 gate (end of week 12):**
- 25+ real users signed up, ≥15 placed at least one paper trade
- Zero P0 incidents (no data loss, no security exposure, no trade mis-execution)
- Retrospective system has generated at least 5 real retrospectives
- All acceptance criteria in HANDOFF_02 passed

### 6.2 Phase 2 — Learn (weeks 13–15)

Not a build phase. Three weeks of user interviews, analytics review, honest assessment.

**Continue signal (both must hold):**
- ≥15 of 25-50 users returning weekly at week 4 post-launch
- ≥8 users name folio.e8e as their first tool when investing

**Pivot signal (either triggers rethink):**
- Fewer than 5 returning at week 4
- Users describe product as "I could do this in Claude"

**Output:** 2-3 page memo deciding Phase 3 direction.

### 6.3 Phase 3 — Informed build (weeks 16–28)

Scoped at end of Phase 2. Most likely paths:
- **Depth:** User-customizable Screener weights, better Advisor, Mirror
- **Automation:** The Wheel on paper
- **Workflow:** UX consolidation, morning digest, push notifications
- **Pivot:** Something was wrong; rethink

### 6.4 Long-term vision (reference, not scope)

24-month steady state: 5 integrated products (Screener, Advisor, Portfolio Builder, Mirror, Wheel + Options Suite), 10,000+ users, securities counsel engaged, live trading gated and safe, multi-broker support. This is the direction of travel, not a Phase 1 commitment.

---

## 7. Regulatory posture (MVP)

Paper trading only + personal network of < 50 users = pre-regulatory space.

**Self-imposed line in the sand** — securities counsel MUST be engaged before:
1. Accepting any user outside founder's personal network
2. Enabling live trading (real money) for any user
3. Accepting any payment from users
4. Making any performance claim publicly
5. Expanding beyond US market

Until any of those triggers, folio.e8e operates as a paper-only beta.

**Required disclaimers on every user-facing AI surface:**
> "folio.e8e is in beta. Paper trading only. Not investment advice. For educational and testing purposes. You remain responsible for any real investment decisions."

---

## 8. Budget envelope (Phase 1)

| Item | Cost |
|---|---|
| Vercel + Supabase (already provisioned) | $0 marginal |
| Opus compute (Claude Max subscription) | $0 marginal |
| Data vendors (Benzinga, Polygon, FMP) | ~$400/mo |
| Anthropic API for Advisor production | ~$150/mo |
| AWS KMS | ~$10/mo |
| Misc buffer (domain renewals, etc) | $500 one-time |
| **Total Phase 1** | **~$500 one-time + ~$560/mo ongoing** |

Cumulative spend to end of Phase 2 (15 weeks): ~$2,500.

---

## 9. Success criteria summary

**Phase 1 ships successfully if:**
- All HANDOFF_02 task acceptance criteria met
- 25+ users signed up, active paper trading
- Zero P0 incidents
- Core moats seeded (memory capture working, retrospectives generating)

**MVP bet confirmed if (end of Phase 2):**
- Continue signal met (15+ weekly active, 8+ name folio.e8e first)
- Qualitative feedback positive on differentiation
- Users can articulate what makes folio.e8e different from ChatGPT/Claude

**Bet disconfirmed if:**
- Pivot signal triggered
- Users treat the product as a nice demo, not a tool they need

---

## 10. Conventions for Opus

### 10.1 Coding

- **TypeScript strict mode.** No `any` except where unavoidable; justify in a comment.
- **Zod for all external data boundaries.** API requests, LLM outputs, third-party responses.
- **No ORMs.** Direct SQL via `@supabase/supabase-js` or raw `postgres.js` for performance-critical paths.
- **Server Actions over API routes** where appropriate (React 19 + Next 15 patterns).
- **Error handling is explicit.** Every external call (Alpaca, Anthropic, FMP) has a timeout, a retry policy, and a graceful failure mode.

### 10.2 Testing

- **Unit tests for all business logic.** Vitest preferred.
- **Integration tests for every external adapter.** Mocked for unit runs, live for pre-release.
- **End-to-end tests for critical flows** via Playwright on web; Maestro or Detox on mobile.
- **Target coverage: 85% on new code.**

### 10.3 File organization

Follow Next.js App Router + feature-based convention:

```
/app              — Next.js routes
/components       — Shared React components (design system)
/features         — Feature modules (advisor, screener, retrospectives)
  /advisor
    /api
    /components
    /lib
    /types.ts
/lib              — Shared utilities (supabase client, anthropic client, etc)
/workers          — Background jobs (cron handlers)
/types            — Shared TypeScript types
/mobile           — Expo React Native app (sibling to /app)
```

### 10.4 Monorepo tooling

- **pnpm workspaces only for Phase 1.** No Turborepo.
- Turborepo's value (task caching, pipeline orchestration) doesn't justify its cost at our scale (3 packages, fast builds). Revisit if package count exceeds 6 or CI times become a bottleneck.
- Document this choice in the monorepo README so future maintainers understand the rationale.

### 10.5 Commit and branching

- Main branch is always deployable
- **For HANDOFF_02 tasks:** branch named `task/<task-id>-short-description` (e.g., `task/T1.2-database-schema`). This preserves traceability back to the task specification.
- **For work outside HANDOFF_02** (bug fixes during a phase, dependency bumps, experiments): use Conventional Commits prefixes per the global CLAUDE.md (`feat/`, `fix/`, `chore/`).
- Commits are descriptive, not "fix stuff"
- PR description references the task ID and the acceptance criteria checklist

### 10.6 When Opus is unsure

If a specification is ambiguous or a reasonable decision could go two ways, Opus:

1. Picks the simpler path
2. Favors principles over cleverness
3. Leaves a `// TODO(review):` comment explaining the choice and what the alternative would be
4. Flags in the PR description

Over-engineering is a worse failure than leaving a clean TODO.

---

## 11. Reference files

All files are in `/mnt/user-data/outputs/`:

| File | Purpose |
|---|---|
| `HANDOFF_01_overview.md` | This file |
| `HANDOFF_02_phase1_tasks.md` | Week-by-week task breakdown with acceptance criteria |
| `HANDOFF_03_design_system.md` | Design tokens, component library, mobile-first UI rules |
| `folio.e8e_Architecture_v1.1.docx` | Full technical architecture reference |
| `folio.e8e_Architecture_Diagrams.md` | 10 Mermaid diagrams |
| `folio.e8e_design_walkthrough_v2.1.html` | 20-screen visual source of truth |
| `folio.e8e_user_journey.html` | Paper-to-live journey flow |

---

**End of HANDOFF_01. Proceed to HANDOFF_02 for task execution.**
