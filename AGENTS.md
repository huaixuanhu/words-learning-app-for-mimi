# AGENTS.md

<!-- Generated/adapted from human-ai-governance v0.2.0 -->

## Collaboration

- Use strict low-hallucination mode. If a claim is uncertain and can drift, verify it from a reliable source before treating it as current.
- Plan before material changes. Wait for human agreement when changing project structure, data model, deployment, credentials, or persistent user data.
- Keep changes focused on the agreed scope. Protect user-owned changes and never revert unrelated work without explicit approval.
- Keep project planning documents synchronized with code when architecture, data flow, safety boundary, commands, or user workflow changes.
- When branch plans or child plans are created, write the parent source at the top with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria`.
- Prefer Chinese for planning and handoff documents, while preserving English technical terms with Chinese translation on first mention when useful.
- Reduce repetitive contrast phrasing and keep explanations concrete.

## Project Context

- Project root: `/Users/anoria/Documents/python_coding/small_project/learningWordsformimi`
- User-provided GitHub repository: `https://github.com/huaixuanhu/words-learning-app-for-mimi.git`
- Current stage: Stage 5A local export and backup. Browser-local storage includes vocabulary, import batches, review history, review settings, JSON backup, CSV export, and local restore preview, but no durable database or production deployment exists yet.
- Intended product: a mobile-first vocabulary flashcard web app for PTE study.
- Intended hosting: GitHub plus Vercel, with deployment only after explicit approval.
- Current application stack: Next.js App Router, TypeScript, Tailwind CSS, ESLint, Vitest, npm, and browser `localStorage` for local study data.
- Intended production storage remains Postgres-compatible storage. Final provider choice requires a separate plan agreement.

## Runtime And Environment

- For Python support scripts, use project `venv` or `.venv` first when present.
- For Node.js work, use the package manager recorded by the lockfile once the app is scaffolded.
- Do not assume a package manager, framework version, database provider, or deployment state before checking local files and current official docs.

## Governance Tier

This project starts as Tier 1: durable small app.

Upgrade the working gate to Tier 3 before tasks involving:

- credentials, secrets, OAuth, or auth provider configuration
- production deployment
- production database migrations
- external APIs, account connectors, or paid services
- long-running automation, scheduled jobs, email, messages, or payments
- destructive changes to persistent study data

## Safety Boundaries

Allowed by default:

- Read local project files.
- Write agreed project files under this repository.
- Create local docs, plans, test files, and generated artifacts that stay inside the project tree.
- Run local validation commands.

Require explicit human approval:

- Initialize or rewrite git history.
- Push to GitHub or create pull requests.
- Deploy to Vercel or connect production domains.
- Create, migrate, seed, or delete remote databases.
- Read or modify `.env` values, credentials, tokens, or private account settings.
- Add tracking, analytics, AI generation, or third-party integrations that send user study data outside the app.

Forbidden without explicit approval:

- Mutate production data.
- Send emails, messages, payments, or notifications.
- Store secrets in source control.
- Publicly expose study history, review history, or personal data.

## Data Persistence Policy

- Vocabulary records, timestamps, review history, and self-rated rarity can be personal study data.
- Collect the minimum data required for the flashcard and review workflow.
- Preserve exportability from the beginning, preferably CSV or JSON.
- Before schema migrations or destructive cleanup, plan backup/export behavior.
- Default to private single-user behavior until authentication and sharing are explicitly designed.

## Before Material Changes

1. Read `AGENTS.md`, `ARCHITECTURE.md`, active `plan_docs/` files, `CHANGELOG.md`, and `governance/AI_AGENT_LOG.md` when present.
2. Run `git status --short --untracked-files=all` when the directory is a git repository.
3. Explain scope, non-scope, files likely to change, validation, and safety assumptions.
4. Wait for human agreement when required by this file or by task risk.

## Before Handoff

1. Update docs and logs required by the governance tier.
2. Run the smallest meaningful validation commands available.
3. Review the diff or file inventory.
4. Summarize changed files, validation, safety notes, and residual risks.

## Current Validation

Current local validation is:

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```

The current unit test suite covers vocabulary normalization, import parsing, local repository behavior, timestamp preservation, archive/restore behavior, schema migration, review scheduling, review settings, review event/state updates, JSON backup validation, CSV escaping, and backup round trip behavior.
