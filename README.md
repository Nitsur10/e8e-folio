# folio.e8e

AI-assisted research and paper-trading platform for technically literate retail investors. Transparent factor-based screening, AI-driven single-stock analysis, and 30-day retrospectives — all routed through Alpaca paper trading in the MVP.

**Phase 1 status:** scaffolding. See `files_v3/HANDOFF_02_phase1_tasks.md` for the full task breakdown.

---

## Monorepo layout

```
/web            — Next.js 15 web app (App Router, TypeScript strict)
/mobile         — Expo SDK 52 React Native app
/shared         — Design tokens, types, and constants shared between clients
/supabase       — Postgres migrations, seed data, generated types
/routines       — Claude Code routines (feedback loop for Phase 2 learning)
/scripts        — Dev utilities
/files_v3       — Handoff package (reference; gitignored)
```

Packages are wired with **pnpm workspaces**. Turborepo is deliberately not used in Phase 1 — revisit if package count exceeds six or CI times become a bottleneck (see `HANDOFF_01` §10.4).

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`corepack enable` then `corepack prepare pnpm@9.15.0 --activate`)
- For mobile: Xcode (iOS Simulator) and/or Android Studio (Android Emulator), plus Expo Go on a physical device if preferred

## First-time setup

```bash
pnpm install
cp .env.example .env.local
# Fill in the values in .env.local
```

## Running locally

```bash
pnpm dev              # web + mobile in parallel
pnpm dev:web          # web only (http://localhost:3000)
pnpm dev:mobile       # mobile only (Expo DevTools)
```

## Build

```bash
pnpm build            # production build of /web
pnpm typecheck        # type-check all workspaces
pnpm lint             # lint all workspaces
```

## Deployment

- **Web:** Vercel. Root of repo connects to Vercel; the root `vercel.json` dispatches the workspace build. Set env vars in the Vercel dashboard.
- **Mobile:** Expo EAS Build. See `mobile/app.json` for bundle identifiers.

## Conventions

- TypeScript strict mode everywhere; no `any` without justification.
- Branch naming: `task/T<x.y>-<slug>` for HANDOFF_02 work; `feat/`, `fix/`, `chore/` otherwise.
- Commits: conventional commits.
- Design tokens live in `@folio/shared/design-tokens`. Do not hardcode hex values or font family strings in feature code.
- Every Advisor UI must show "Beta. Paper only. Not investment advice."

## Handoff docs

The authoritative product / architecture / design specs live in `files_v3/` (and the design walkthrough in `files_2/`). These are gitignored; keep local copies in sync with the canonical source.

| File | Purpose |
|---|---|
| `files_v3/HANDOFF_01_overview.md` | Product context, principles, conventions |
| `files_v3/HANDOFF_02_phase1_tasks.md` | Week-by-week task breakdown (T1.1 → T12.3) |
| `files_2/HANDOFF_03_design_system.md` | Design tokens, component library, mobile-first rules |
| `files_v3/folio.e8e_Architecture_v1.1.docx` | Full technical architecture |
| `files_v3/folio.e8e_Architecture_Diagrams.md` | 10 Mermaid diagrams |
| `files_2/folio.e8e_design_walkthrough_v2.1.html` | Visual source of truth (20 screens) |
| `folio.e8e_user_journey.html` | Paper-to-live journey flow |

## Feedback loop (Phase 2 prep)

The Slack feedback widget and routines from the bootstrap template are retained for Phase 2's learning phase — structured feedback capture from day one.

- Feedback widget: `web/components/FeedbackWidget.tsx`
- Supabase client: `web/lib/supabase.ts`
- Slack helpers: `web/lib/slack.ts`
- Routines: `routines/*.md`
- Schema: `supabase/migrations/001_feedback_schema.sql`
