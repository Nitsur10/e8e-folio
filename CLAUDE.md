# Project: e8e-folio

## Overview
This project uses a feedback loop architecture with Slack channels for user feedback collection and automated requirement generation.

## Architecture
- **Frontend**: Next.js + TypeScript, deployed on Vercel
- **Database**: Supabase (PostgreSQL) with feedback tracking schema
- **Feedback channels**: Slack (#e8e-folio-feedback for users, #e8e-folio-dev for internal)
- **Automation**: Claude Code routines for feedback classification, PR review, and smoke testing

## Key Tables
- `feedback_items` — raw user feedback from Slack, classified by category/priority/status
- `requirements` — parsed requirements derived from feedback
- `routine_logs` — audit trail of automated routine runs

## Feedback Status Lifecycle
received → triaged → accepted → in_progress → in_review → deployed → confirmed

## Conventions
- All Supabase queries must respect RLS policies
- Use service_role key only in server-side functions, never client-side
- Feature branches: `feat/<description>`
- Bug fix branches: `fix/<description>`
- Claude routine branches: `claude/<description>`
- All PRs must pass the auto-review routine before merge

## Slack Integration
- Feedback widget in the app posts to #e8e-folio-feedback via webhook
- Nightly routine classifies new feedback and posts summaries to #e8e-folio-dev
- Post-deploy routine updates feedback items to status='deployed' and notifies users

## Environment Variables
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — public anon key (client-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only key for routines
- `NEXT_PUBLIC_SUPABASE_URL` — client-side Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client-side anon key
- `SLACK_WEBHOOK_URL` — webhook for posting to Slack
- `SLACK_FEEDBACK_CHANNEL` — name of the feedback channel
- `SLACK_DEV_CHANNEL` — name of the dev channel

## Testing
- Run `npm test` before opening PRs
- Smoke test routine validates production after deploy
