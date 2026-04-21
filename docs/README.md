# docs/

Source of truth for architecture, design, planning, and review outputs. Everything here is in git so any Claude that clones the repo (Slack routines, GitHub Actions, local dev) can read it.

## Layout

```
docs/
├── architecture/   Product + system specs (HANDOFF_01/02, diagrams, v1.1 architecture doc)
├── design/         Design system, design walkthrough
├── plans/          Dated implementation plans (YYYY-MM-DD-<slug>.md)
└── reviews/        Dated review outputs from Slack/GitHub @Claude requests
```

## Conventions

- Name new plans and reviews with a date prefix: `YYYY-MM-DD-<slug>.md`
- Update in-place when a doc evolves; use git history for the diff
- Architecture docs here are the authoritative version — `files_v3/` and `files_2/` at repo root are local scratch copies and are gitignored
- The `dev-agent` routine writes REVIEW outputs into `docs/reviews/` when findings exceed a Slack thread

## Adding a new handoff

1. Drop the new file(s) into the appropriate subfolder (`architecture/`, `design/`, or `plans/`)
2. If it supersedes an existing doc, overwrite it — keep `git log` as the history
3. Open a PR labelled `docs`
