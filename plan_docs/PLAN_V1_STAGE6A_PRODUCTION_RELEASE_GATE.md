# Words Learning App For Mimi Stage 6A: Production Release Gate Design

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: Stage 5N Preview UI runtime verification, the confirmed 2026-07-06 release sequence, and the Stage 6 / Stage 7 sections in the master plan.
Scope: define the formal Production（生产环境）release gate, access boundary, environment variable（环境变量）matrix, database migration（数据库迁移）and backup/import/rollback expectations, and future Stage 6B execution checklist.
Non-Scope: no merge（合并）to `main`, no Vercel command, no Neon command, no Production deployment, no Production env var change, no database mutation, no real backup import, no authentication（认证）implementation, no UI（用户界面）visual redesign.
Exit criteria: Stage 6A release gate is documented, master/architecture/readme/logs are synchronized, and local documentation validation passes.

## Reference Check

Checked on 2026-07-06:

- Vercel environments documentation: `https://vercel.com/docs/deployments/environments`
- Vercel Git deployments documentation: `https://vercel.com/docs/git`
- Vercel environment variables documentation: `https://vercel.com/docs/environment-variables`
- Vercel deployments documentation: `https://vercel.com/docs/deployments`
- Neon / Vercel integration overview: `https://neon.com/docs/guides/vercel-overview`
- Neon branching overview: `https://neon.com/docs/introduction/branching`

These references are used for release-gate design only. Stage 6A does not execute any remote action.

## Confirmed Release Sequence

The release sequence is:

1. Stage 6A: Production release gate design.
2. Stage 7: UI / visual design, mobile interaction polish, review-flow comfort, accessibility（可访问性）review, and optional PWA（Progressive Web App，渐进式 Web 应用）evaluation.
3. Stage 6B: formal merge to `main`, Production environment setup, Production database work, and Production smoke test after explicit approval.

Formal Production must not start before Stage 7 is accepted.

## Current Release Facts

- Working branch is `V1`.
- Vercel production branch is intended to remain `main`.
- A previous active Production deployment from branch `V1` is documented as a non-official artifact.
- Vercel Preview has already verified the Postgres read path and one controlled UI write smoke.
- Preview UI write flag was removed after Stage 5N-B.
- Production env remains documented as empty after Stage 5N-B.
- Development database core study tables returned to zero rows after cleanup.
- Current code accepts `local` and `postgres-preview` storage runtime modes only.
- Current code rejects the Postgres preview runtime in Vercel Production.

These are local project facts as of this plan. Stage 6B must re-check all drift-prone deployment and database facts before executing.

## Access Boundary

The accepted product model is a small trusted private group:

- One Neon Postgres（关系型数据库）project/resource path.
- Multiple learners represented by `people`.
- All durable learning data separated by `person_id`.
- No password login, OAuth（开放授权）, or credential isolation in the current accepted model.

Important boundary:

- `person_id` is data separation, not security isolation.
- A public Vercel URL without authentication is not a private security boundary.
- Before enabling durable Production writes, Stage 6B must obtain explicit human confirmation that the small group accepts the no-credential private-URL risk, or Stage 7 / Stage 6B must add a separate access gate first.
- The app must never treat person switching as authorization. Every database read/write must still filter by selected `person_id`.

## Production Runtime Gate

Current runtime modes:

- `local`: default browser `localStorage` runtime.
- `postgres-preview`: development / preview Postgres runtime.

Stage 6A decision:

- Do not set `MIMI_STORAGE_RUNTIME=postgres-preview` in Production.
- Do not reuse `MIMI_ENABLE_STORAGE_UI_WRITES` as a long-lived Production write flag.
- Stage 6B must choose one of these options before formal Production:
  1. Keep first formal Production on browser `localStorage`, with no shared durable Production database runtime.
  2. Add a separate explicit Production runtime design, such as `postgres-production`, with server-only access, Production-specific write gating, backup/import/rollback rules, and new tests.

The second option is required if the first real Production release should share data across the private group.

## Environment Matrix

| Environment | Current / Target State | Allowed In Stage 6A | Stage 6B Gate |
| --- | --- | --- | --- |
| Local development | Uses browser `localStorage` by default; `.env.local` is ignored by Git. | Read docs only. | Re-pull env only after explicit approval if secrets changed. |
| Development DB scripts | Use `STAGE5F_DATABASE_TARGET=development dotenv -e .env.local -- ...`. | No script execution required. | Re-run only if Stage 6B needs a fresh non-production inspection. |
| Vercel Preview | Has `MIMI_STORAGE_RUNTIME=postgres-preview`; UI writes disabled by default. | No Vercel command. | Verify env and deploy Preview before any Production step. |
| Vercel Production current | No formal V1 Production release; existing deployment is non-official. | No change. | Re-check production branch, deployment list, env vars, and aliases. |
| Vercel Production future | Must not use preview-only runtime flags. | Design only. | Configure only after explicit approval and after Stage 7 acceptance. |

Secrets rules:

- Never commit `.env.local`.
- Never print database URLs or tokens in logs.
- Avoid `NEXT_PUBLIC_` for secrets because browser-exposed variables are public.
- Production env vars must be added through Vercel env management or dashboard after explicit approval.

## Database Gate

Stage 6B must identify the exact Production database target before any migration:

- Confirm whether Production uses a Neon branch, database, or separate connection string distinct from the current development / preview target.
- Do not reuse the current development / preview database as Production unless the user explicitly accepts that decision.
- Verify `db/migrations/0001_initial.sql` is the intended first Production migration.
- Apply migrations first to a non-production target or branch.
- Inspect schema and counts after migration.
- Stop on any table, index, constraint, count, or `person_id` mismatch.

## Backup And Import Gate

Before any real user data import:

- Export a fresh JSON backup from `/export`.
- Keep the backup private because it can contain study history and personal learning data.
- Validate the backup shape and metadata counts.
- Run a dry run first.
- Run a rollback trial before commit.
- Commit to Production only after explicit confirmation of the exact backup file, target database, target environment, and expected counts.
- For an empty local-storage project, importing real user data can remain skipped.

## Stage 7 Handoff Requirements

Stage 7 should complete:

- Visual design suitable for the actual PTE vocabulary workflow.
- Mobile-first navigation and touch ergonomics.
- Add/import/library/review/export/settings flows that feel coherent as one product.
- Review session comfort, including card state, rating controls, and session completion.
- Person switching that makes the selected learner visible and hard to confuse.
- Basic accessibility review for contrast, focus states, labels, and keyboard behavior.
- Optional PWA evaluation.

Stage 7 may deploy Preview builds for design review after explicit approval, but it must not promote Production.

## Stage 6B Execution Checklist

Stage 6B should be a separate accepted plan before execution.

Pre-execution:

- Confirm Stage 7 is accepted.
- Confirm `git status --short --branch --untracked-files=all` is clean.
- Confirm `V1` is fully pushed and reviewed.
- Confirm Vercel production branch is `main`.
- Confirm current active Production deployment state and classify non-official artifacts.
- Confirm exact Production database target.
- Confirm exact env var names and environment scopes.
- Confirm whether first Production uses browser-local runtime or shared Postgres runtime.
- Confirm whether no-credential private-URL risk is accepted.

Local validation:

- `npm run governance:preflight`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run backup:dry-run:fixture`
- `npm run build`
- `git diff --check`

Preview validation:

- Create or use a clean Preview deployment from the final `V1` commit.
- Verify `target=preview`.
- Verify app routes return HTTP 200.
- Verify storage health/read path matches the selected runtime.
- If Preview writes are temporarily enabled, write only a controlled smoke row and clean it.
- Confirm Preview write flags are removed after the smoke window.

Production execution:

- Merge `V1` to `main` only after explicit approval.
- Configure Production env vars only after explicit approval.
- Run Production database migration only after explicit approval.
- Deploy or allow Git integration Production deployment only after explicit approval.
- Inspect the resulting deployment and verify `target=production`.
- Run the Production smoke test.

Production smoke test:

- Home/add/import/library/review/export/settings routes load.
- Storage mode is the expected mode.
- No preview-only write flag is present.
- Person switching does not mix people.
- Backup/export path works.
- Error logs show no new relevant server errors.
- If a Production write smoke is approved, write the smallest possible controlled row set and clean it unless the user asks to keep it.

Rollback:

- If deployment fails, do not continue to database import.
- If migration fails, stop before deploy/import and preserve error output without secrets.
- If Production smoke fails, prefer rollback or alias restoration before further changes.
- If data import partially succeeds, stop and use the backup/import mapping plus database transaction notes to decide rollback.

## Stop Conditions

Stop immediately if:

- The deployment target is not the expected environment.
- Vercel project scope or Git production branch does not match expectations.
- Production env vars appear in source control.
- Secret values would be printed.
- Production database target is ambiguous.
- A migration or import count differs from expected counts.
- `person_id` separation cannot be verified.
- The user pauses or changes the release decision.
- Stage 7 visual design has not been accepted.

## Stage 6A Result

Stage 6A completes when:

- This plan exists and is linked from the master plan.
- Architecture, README, changelog, and AI agent log all reflect the Stage 6A gate.
- No remote command, env mutation, database mutation, or Production deployment was performed.
- Documentation validation passes.
