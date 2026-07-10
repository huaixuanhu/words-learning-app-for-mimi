# Words Learning App For Mimi Stage 6B-P1-G: Production Execution Handoff

Created: 2026-07-10 13:24 AEST
Last updated: 2026-07-10 13:24 AEST

Source plan:
- `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`

Derived from:
- `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`
- `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`
- `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`
- `ARCHITECTURE.md`
- the Stage 6B-P1-F non-production database verification completed on 2026-07-09
- the 2026-07-10 user confirmation that the current development database contains no valuable data and formal data should begin only after the fully cloud-backed V1 launch

Input evidence:
- `db/migrations/0001_initial.sql`
- `db/migrations/0002_schema5_production_runtime.sql`
- `scripts/inspect-database-schema5.mjs`
- `scripts/verify-schema5-active-review-guard.mjs`
- `src/lib/storage/postgres/repository.integration.test.ts`
- `governance/AI_AGENT_LOG.md`

Consumer / next stage:
- `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`

Document nature:
This is a derived Production execution handoff（生产执行交接）for Stage 6B-P1. It is not an independent peer plan and does not itself authorize account inspection, credentials access, database mutation, import, merge（合并）, or deployment.

## Scope

- Record the accepted P1-F implementation and non-production validation result.
- Record the initial Production data decision: migrate an empty Production target and start formal data creation only after V1 is live.
- Separate documentation, read-only account inventory, human decisions, and live Production actions into independently approved steps.
- Define the required Production target, environment variable（环境变量）, access boundary, validation, rollback（回滚）, and stop-condition evidence.
- Hand the completed Postgres runtime bridge back to Stage 6B formal execution only after every required decision is closed.

## Non-Scope

- No Vercel or Neon account command.
- No `.env` or credential read/change.
- No Production database creation, branch creation, migration（迁移）, inspection, write, cleanup, or restore.
- No formal backup import（备份导入）.
- No GitHub push, pull request, merge to `main`, Production deployment, promotion, alias change, or rollback.
- No authentication（认证）or access-gate implementation.
- No Production smoke write.
- No AI API（人工智能接口）, external vocabulary source, analytics（分析追踪）, notification, email, or 付费/扣款 feature.

## Safety / Side Effects

- P1-G-A changes local documentation only.
- Any future Vercel / Neon account inspection requires a separate explicit approval and must report names, ids, scopes, and readiness without printing secret values or connection strings.
- Any future Production mutation requires a separate action-specific approval after the exact target and rollback path are recorded.
- Development-only commands guarded by `STAGE5F_DATABASE_TARGET=development` must never be repointed at Production.
- A Production-specific migration/import command path must have its own exact-target guard and confirmation wording before use.

## Exit Criteria

P1-G is complete only when:

- P1-G-A documentation is accepted and synchronized.
- P1-G-B read-only Production inventory records the exact Vercel project/team, Production branch, active deployment/aliases, environment variable names/scopes, and exact Neon Production target without exposing secrets.
- P1-G-C records the access-boundary, merge, deployment, and Production smoke decisions.
- The initial-data decision remains explicit: no development data copy and no formal backup import for first launch.
- The future Stage 6B execution order, rollback paths, and stop conditions are executable and unambiguous.
- The user separately approves each live Production action before it occurs.

## Current Status

- `P1-G-A Documentation`: accepted for execution on 2026-07-10 and completed in this change set.
- `P1-G-B Read-Only Production Inventory`: pending separate explicit approval.
- `P1-G-C Human Decision Closure`: pending the P1-G-B evidence and explicit user choices.
- `Stage 6B Formal Production Execution`: blocked until P1-G-B and P1-G-C complete.

## Confirmed Decisions

### Runtime

- Formal V1 launches with shared `postgres-production` cloud persistence.
- Browser `localStorage`（本地浏览器存储）is not the formal V1 Production data source.
- `postgres-preview` must not be used in Vercel Production.

### Initial Data

The user confirmed on 2026-07-10:

- the current development database contains no valuable data;
- the current development state is fresh;
- no development dataset needs promotion or copying;
- no formal user backup needs import for first launch;
- formal vocabulary and review data should begin only after the fully cloud-backed V1 starts running.

Operational consequence:

- The exact Production database target must be distinct and explicitly confirmed before migration.
- After `0001_initial.sql` and `0002_schema5_production_runtime.sql` are applied, all learning and backup-import table counts must be `0` before runtime cutover.
- No `backup_imports` or `backup_import_mappings` rows are expected for first launch.
- Existing fixture and backup-import tooling remains available for future recovery or an explicitly approved later migration, but is skipped for initial Production launch.
- Development database contents must not be cloned, promoted, or treated as seed data.

### Empty-Database Bootstrap

The current code supports an empty Postgres start:

- a read from a database with no `people` rows returns the app's empty/default Mimi workspace shape;
- the first valid Postgres mutation can create the first durable Mimi `people` row;
- subsequent data remains scoped by that database UUID `person_id`.

Formal Production acceptance must verify:

1. Read-only empty-state load succeeds without falling back silently to browser-local runtime.
2. Before the first real write, all business table counts remain `0`.
3. The first approved real user action creates the first durable learner record and intended data only.
4. A page refresh reads the same durable data from `postgres-production`.
5. A second learner, if added later, remains separated by `person_id`.

The preferred first-launch path is to avoid synthetic Production test vocabulary. Whether the first real user write itself serves as the write acceptance check remains a P1-G-C decision.

## P1-F Accepted Evidence

P1-F verified on the approved non-production development database:

- schema version 5 migration completed;
- schema inspection reported 6 version-5 columns, 9 constraints, 1 index, and 2 Active-review guard triggers;
- direct Active Vocabulary（输出词汇）review state and review event writes were rejected;
- schema version 3 and version 5 fixture rollback trials returned to zero rows;
- schema version 5 fixture commit and cleanup returned to zero rows;
- Postgres repository integration covered dual limits, Recognition / Active storage, Active review rejection, Recognition review state/event behavior, reset, rollback, JSON import rollback, hard delete, and schema version 5 snapshot export;
- final non-production business and backup-import counts were `0`.

This evidence proves the implementation against the approved development target. It does not prove the identity, schema, environment variables, access policy, or runtime behavior of the future Production target.

## Reference Check

Re-checked on 2026-07-10:

- Vercel Git deployments: `https://vercel.com/docs/git`
- Vercel environment variables: `https://vercel.com/docs/environment-variables`
- Vercel Production promotion: `https://vercel.com/docs/deployments/promoting-a-deployment`
- Vercel Instant Rollback: `https://vercel.com/docs/instant-rollback`
- Neon Vercel connection guide: `https://neon.com/docs/guides/vercel-manual`
- Neon branching / restore references: `https://neon.com/docs/introduction/branching` and `https://neon.com/docs/changelog/2024-02-23`

Execution implications:

- Production-branch changes can create a Production deployment, so merge approval and deployment approval must be treated as connected when Git integration is active.
- Vercel environment variable changes apply to new deployments, so required Production variables must be confirmed before the intended deployment.
- Deployment rollback and environment-variable rollback are separate concerns; rolling back a deployment does not rebuild it with newly changed variables.
- Neon branch, restore, snapshot, and history capabilities must be checked against the actual project and plan before they are named as an available rollback mechanism.

## Decision Register

| Decision | Current State | Required Evidence / Choice |
| --- | --- | --- |
| Formal runtime | Confirmed | `postgres-production` |
| Initial data source | Confirmed | Empty Production start; no development copy and no formal backup import |
| Production database target | Pending | Exact Neon project, branch, database, role path, and confirmation that business counts are zero |
| Environment variable scopes | Pending | Production variable names/scopes only; no values in docs or logs |
| Access boundary | Pending | Accept no-credential private-URL risk or implement a separate access gate before writes |
| Merge path | Pending | Pull request review or explicitly approved direct merge to `main` |
| Deployment mechanism | Pending | Git integration or explicitly approved CLI/dashboard execution |
| Production write acceptance | Pending | First real user write, or a separately approved smallest-possible smoke write with cleanup |
| Existing non-official deployment | Pending | Keep as history, archive/remove later, or replace through formal release |

## P1-G Execution Slices

### P1-G-A Documentation

Allowed now:

- create this handoff;
- synchronize parent plans, architecture, README, project context, changelog, and AI log;
- run local documentation validation;
- record the user's empty-Production-start decision.

Completion evidence:

```bash
git diff --check
npm run governance:preflight
```

### P1-G-B Read-Only Production Inventory

Requires separate explicit approval because it reads private Vercel / Neon account configuration and may use locally stored credentials.

Read-only inventory must record:

- local branch, clean status, latest commit, and push parity;
- exact Vercel project and team scope;
- configured Production branch;
- current Production deployment, aliases, and non-official deployment classification;
- Production / Preview environment variable names and scopes, with values redacted and never printed;
- exact Neon project, Production branch/database target, and separation from development / Preview;
- whether the Production target already has any schema or business rows;
- actual rollback/restore capabilities available to the account before migration.

P1-G-B must not change env vars, create/delete branches, run SQL, deploy, promote, merge, or write any data.

### P1-G-C Human Decision Closure

After P1-G-B, the user must explicitly decide:

- access boundary;
- merge path;
- deployment mechanism;
- Production write acceptance method;
- treatment of the existing non-official Production deployment.

Initial backup import is already closed as `skip` for first launch. Reopening import requires a new explicit decision and an exact private backup file/count review.

## Future Stage 6B Execution Order

Each numbered group requires its own explicit approval when it changes remote state.

1. Run the complete local validation gate and verify a clean final `V1` commit.
2. Verify a clean Preview deployment from the final code and keep Preview-only write flags disabled after any approved Preview smoke.
3. Confirm the exact empty Production database target and an account-supported recovery checkpoint or restore direction.
4. Use a Production-specific guarded command path to apply `0001_initial.sql`, inspect, apply `0002_schema5_production_runtime.sql`, inspect again, and verify Active-review triggers.
5. Confirm all Production learning and backup-import counts are `0`; skip formal backup import.
6. Close the access-boundary decision before enabling durable public-url writes.
7. Configure Production-only runtime/database environment variables without Preview-only write flags, then create a new deployment so the variables take effect.
8. Merge/deploy only through the separately approved mechanism and verify `target=production`.
9. Run read-only route, runtime, empty-state, error-log, and person-separation checks.
10. Perform only the approved first-write path, verify persistence after refresh, and record the first formal data boundary.
11. Close out exact deployment id, URL, commit, runtime, database target identity, validation evidence, and rollback direction without secrets.

## Rollback Direction

### Before First Formal Write

- If migration fails, stop before runtime cutover and deployment.
- Because the target is intentionally empty, do not preserve a partially migrated target as the accepted Production database.
- Use only the recovery/recreate direction confirmed for the actual Neon account; never assume a restore feature exists without inventory evidence.
- Re-run migration inspection from a known empty/recovered target before continuing.

### Deployment / Environment

- A failed app deployment should roll back or restore the prior known-good deployment/alias.
- Environment variable changes must be reverted separately and followed by a new deployment when required.
- Do not assume deployment rollback also restores current environment variable settings.

### After Formal Data Begins

- Do not recreate, truncate, reseed, or replace the Production database as an empty target.
- Stop writes first, preserve evidence, and use the confirmed database recovery path only after explicit approval.
- Export/backup and import mappings become relevant only after real durable data exists.

## Stop Conditions

Stop immediately if:

- Vercel project/team, Production branch, deployment target, or Neon target is ambiguous;
- the proposed Production target is the existing development / Preview database without an explicit new decision;
- any Production learning or backup-import table contains unexpected rows before first launch;
- a command would print or persist a secret;
- a development-only guard or Preview-only write flag is reused for Production;
- no Production-specific exact-target migration guard exists;
- the access boundary remains unresolved when durable Production writes would become reachable;
- runtime health reports `local` or `postgres-preview` instead of `postgres-production`;
- schema version 5 fields, Recognition FSRS state, natural-day due behavior, or Active-review guards fail validation;
- `person_id` separation cannot be verified;
- local, Preview, migration, deployment, or smoke validation fails;
- the user pauses or changes direction.

## P1-G-A Result

P1-G-A turns the P1-F result into an explicit Production handoff and records an empty Production launch with no formal backup import. It authorizes local documentation only. P1-G remains open until read-only account inventory and the remaining human decisions are separately approved and completed.
