# Project Bootstrap Template

A reusable template that sets up a complete project with an automated feedback loop in under 5 minutes.

## What you get

When you bootstrap a new project from this template, you get:

- **GitHub repo** from this template with all scaffolding ready
- **Supabase database** with feedback tracking schema (feedback_items, requirements, routine_logs)
- **Vercel project** linked and configured with all environment variables
- **Two Slack channels**: `#projectname-feedback` (user-facing) and `#projectname-dev` (internal)
- **Claude bot** invited to both channels for AI-powered triage
- **Four Claude Code routines**: nightly feedback classifier, PR auto-reviewer, post-deploy smoke tester, and dev agent (build features from Slack)
- **FeedbackWidget component** ready to drop into any page

## Prerequisites (one-time setup)

Before your first bootstrap, complete these one-time steps:

### 1. CLI authentication
```bash
gh auth login --scopes repo,workflow,admin:org
supabase login
vercel login
```

### 2. Master config file
```bash
mkdir -p ~/.project-bootstrap
cat > ~/.project-bootstrap/config.env << 'EOF'
GITHUB_ORG=your-github-username
SUPABASE_ORG_ID=your-supabase-org-id
VERCEL_TEAM=your-vercel-team-slug
DEFAULT_REGION=ap-southeast-2
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
EOF
```

### 3. Slack setup
- Install the Claude app from the Slack App Marketplace
- Create a custom Slack app at api.slack.com/apps with bot scopes: `channels:manage`, `channels:read`, `chat:write`, `users:read`
- Add the bot token to your config.env

### 4. Claude connectors
At claude.ai/settings > Connectors, connect: Slack, GitHub, Vercel

## Usage

### Bootstrap a new project
```bash
./scripts/bootstrap.sh my-new-project
```

### Add to an existing project
Copy the following into your existing repo:
- `supabase/migrations/001_feedback_schema.sql`
- `routines/*.md`
- `src/components/FeedbackWidget.tsx`
- `src/lib/supabase.ts`
- `src/lib/slack.ts`
- `CLAUDE.md`

Then create the Slack channels and routines manually.

### Manual steps after bootstrap
1. Run `/invite @Claude` in both Slack channels
2. Create 4 routines at claude.ai/code/routines using the prompts in `routines/`
3. Wire the smoke test routine's API endpoint to Vercel deploy hooks
4. Run `vercel --prod` for first deployment

## Architecture

```
User feedback (Slack / widget)
        ↓
  #project-feedback channel
        ↓
  Claude in Slack (real-time triage)
  + Nightly classifier routine
        ↓
  Supabase: feedback_items table
        ↓
  #project-dev channel (structured requirements)
        ↓
  Dev agent routine (@Claude in #project-dev)
  → creates branch, writes code, opens PR
        ↓
  PR auto-review routine
        ↓
  Merge → Vercel auto-deploy
        ↓
  Post-deploy smoke test routine
        ↓
  User notified in #project-feedback ✓
```

## File structure

```
├── .claude/
│   ├── settings.json          # Claude Code permissions
│   ├── commands/
│   │   ├── go.md              # Verify → simplify → PR pipeline
│   │   ├── commit-push-pr.md  # Commit, push, and open PR
│   │   └── verify-deploy.md   # Check production health
│   └── agents/
│       ├── code-simplifier.md # Simplify changed code
│       └── verify-app.md      # End-to-end app verification
├── routines/
│   ├── feedback-classifier.md # Nightly scan prompt
│   ├── dev-agent.md            # Build features from Slack
│   ├── pr-reviewer.md         # GitHub PR review prompt
│   └── smoke-test.md          # Post-deploy test prompt
├── scripts/
│   └── bootstrap.sh           # Master orchestrator
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page with FeedbackWidget
│   │   └── api/
│   │       └── health/
│   │           └── route.ts    # Health check endpoint (for smoke tests)
│   ├── components/
│   │   └── FeedbackWidget.tsx  # Drop-in feedback form
│   └── lib/
│       ├── supabase.ts         # DB client + types
│       └── slack.ts            # Slack posting helpers
├── supabase/
│   ├── config.toml             # Supabase local dev config
│   └── migrations/
│       └── 001_feedback_schema.sql
├── CLAUDE.md                   # Project context for Claude Code
├── .env.example                # Environment variable documentation
├── next.config.mjs             # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── vercel.json
├── package.json
└── package-lock.json
```
