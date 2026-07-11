# Words Learning App For Mimi Stage 5E: Neon Execution Gate

Created: 2026-07-05 01:29 AEST
Last updated: 2026-07-05 01:29 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `db/LOCAL_BACKUP_TO_POSTGRES.md`
- `db/migrations/0001_initial.sql`
- `plan_docs/PLAN_V1_STAGE5B_STORAGE_PROVIDER_DECISION.md`
- `plan_docs/PLAN_V1_STAGE5C_LOCAL_PERSON_ADAPTER.md`
- `plan_docs/PLAN_V1_STAGE5D_DURABLE_STORAGE_READINESS.md`
- User request on 2026-07-05 to start the next stage.

Official references checked on 2026-07-05:

- Vercel Postgres documentation: `https://vercel.com/docs/postgres`
- Vercel Environment Variables documentation: `https://vercel.com/docs/environment-variables`
- Vercel Manage Across Environments documentation: `https://vercel.com/docs/environment-variables/manage-across-environments`
- Neon Next.js documentation: `https://neon.com/docs/guides/nextjs`
- Neon-managed Vercel integration documentation: `https://neon.com/docs/guides/neon-managed-vercel-integration`

Scope:

- Define the exact gate before any Neon Postgres（关系型数据库）or Vercel execution.
- Define what human approval must explicitly cover.
- Define the future command sequence for Vercel project linking, Neon integration（集成）, environment variables（环境变量）, migration（迁移）, smoke checks, backup import, and rollback.
- Define local and remote validation expectations.
- Define stop conditions that abort execution before data is mutated.
- Keep the current repository in documentation-only planning mode.

Non-Scope:

- No Neon project creation.
- No Vercel Marketplace installation.
- No `vercel link`, `vercel integration add`, `vercel env pull`, or Vercel dashboard mutation.
- No `.env`, `.env.local`, credential, token, secret, or private account setting read/write.
- No database package installation.
- No migration execution.
- No remote data mutation.
- No production deployment.
- No GitHub push or pull request.
- No password login, OAuth（开放授权）, authentication（认证）, or account-security implementation.
- No embedding（向量嵌入）, vector database（向量数据库）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, AI generation, dictionary API（词典接口）, analytics（分析追踪）, email, payment, or notification.

Safety / Side Effects:

- Stage 5E is documentation and execution design only.
- Actual remote execution remains blocked until a later explicit human approval that names the execution scope.
- The active app remains browser `localStorage`（本地浏览器存储）backed.
- JSON backup remains the required safety source before any future import.
- Person switching remains convenience data separation, not security isolation.
- Future remote work upgrades the active gate to Tier 3 before credentials, remote migration, remote mutation, or deployment.

## Current Findings

- Vercel's current new-project Postgres direction is Marketplace-connected external Postgres, not new `@vercel/postgres`.
- Neon is still aligned with Next.js through server-side access using `DATABASE_URL`.
- Neon Vercel integration can inject `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and legacy `PG*` variables.
- The Neon-managed Vercel integration can create a persistent `vercel-dev` branch for development and isolated preview branches for preview deployments.
- Vercel environment variable changes apply only to new deployments.
- Standalone Node migration scripts do not automatically load `.env.local`; they must load env explicitly or run through a tool that loads it.

## Required Human Approval Before Stage 5F Execution

Before any real Neon/Vercel action, the user must explicitly approve all of the following:

- Vercel project to link.
- Vercel team or personal account scope.
- Neon account / project path: Marketplace-created project or existing Neon project.
- Database branch strategy: production branch, `vercel-dev`, and preview branches.
- Whether a local `.env.local` file may be created or overwritten by `vercel env pull`.
- Whether `@neondatabase/serverless` and a migration helper package may be installed.
- Whether `db/migrations/0001_initial.sql` may be executed against a non-production branch first.
- Whether any local JSON backup may be imported into remote Postgres.
- Whether a production deployment is in scope.

## Recommended Stage 5F Execution Sequence

This is a plan only. Do not execute these commands in Stage 5E.

1. Governance gate:
   - Switch the working gate to Tier 3 for the session.
   - Confirm no unexpected working tree changes.
   - Export a fresh JSON backup from `/export`.
   - Store the backup outside source control.

2. Vercel project boundary:
   - Confirm the correct Vercel account and project.
   - Link the local repository only after approval.
   - Audit environment variables before adding or pulling anything.

3. Neon provisioning:
   - Prefer Vercel Marketplace / Neon integration.
   - Enable a development branch such as `vercel-dev` if available.
   - Keep preview branches isolated from production data.
   - Confirm `DATABASE_URL` and `DATABASE_URL_UNPOOLED` exist in Vercel settings after provisioning.

4. Local environment sync:
   - Pull Vercel development env only after approval.
   - Do not commit `.env.local`.
   - Do not expose `DATABASE_URL` through `NEXT_PUBLIC_`.
   - Re-pull env after integration changes.

5. Package and migration tooling:
   - Install the smallest accepted database client/tooling set.
   - Keep database client initialization lazy.
   - Add migration scripts that explicitly load local env.
   - Validate `next build` still passes without requiring runtime database calls at module evaluation time.

6. Migration dry run:
   - Run `0001_initial.sql` against a non-production branch first.
   - Verify table, constraint, and index creation.
   - Run a read-only schema inspection query.
   - Do not import study data until schema verification passes.

7. Backup import trial:
   - Validate the JSON backup locally before remote import.
   - Import into a non-production branch first.
   - Compare counts for people, vocabulary items, import batches, review states, review events, and review settings.
   - Verify person-scoped reads do not mix data.
   - Keep browser-local data intact.

8. Application adapter trial:
   - Add Postgres adapter behind an explicit feature switch.
   - Keep `localStorage` fallback until remote persistence is proven.
   - Test add, import, library, review, settings, export, and restore flows.

9. Production promotion:
   - Promote only after non-production migration and import checks pass.
   - Confirm production database branch is empty or intentionally prepared.
   - Create one final JSON backup before production import.
   - Keep rollback instructions visible before promotion.

## Stop Conditions

Stop immediately and do not mutate remote data if any of these occur:

- Wrong Vercel project or team scope.
- Wrong Neon project, database, branch, or role.
- Missing `DATABASE_URL` after integration.
- `.env.local` would overwrite unknown local custom variables.
- SQL migration fails or partially applies.
- Backup validation fails.
- Count verification differs after import.
- Any query returns data for the wrong `person_id`.
- `next build`, typecheck, lint, test, or governance preflight fails.
- User asks to pause.

## Rollback Direction

- If migration failed before commit, discard the database branch or restore from Neon branch history / point-in-time tooling.
- If import fails, abort the transaction or discard the non-production branch.
- If a production import fails after commit, stop app traffic to the remote adapter, keep `localStorage` fallback, and restore the prior database branch / point in time before retrying.
- Never delete browser-local data automatically after remote import.

## Exit Criteria

- Stage 5F approval checklist is explicit.
- Remote execution sequence is documented.
- Stop conditions are documented.
- Rollback direction is documented.
- Required validation commands are documented.
- No remote service is created or modified.
- No credentials or env files are touched.
- Project docs and governance logs are synchronized.
- Local governance validation passes.

## Validation Plan

- `npm run governance:preflight`

## Implementation Outcome

- Added this Stage 5E execution gate plan.
- Documented required explicit approvals before any Stage 5F remote work.
- Documented the recommended future execution sequence from Tier 3 gate through production promotion.
- Documented stop conditions and rollback direction.
- Synchronized architecture, master plan, README, AGENTS, changelog, and AI agent log.
- Did not create or connect any remote service.
- Did not read, write, create, or pull any env file or credential.

## Validation Results

- Passed: `npm run governance:preflight`.
