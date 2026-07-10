# Words Learning App For Mimi Stage 6B-P1-G: Production Execution Handoff

Created: 2026-07-10 13:24 AEST
Last updated: 2026-07-10 19:44 AEST

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

Child decision packet:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md`

Document nature:
This is a derived Production execution handoff（生产执行交接）for Stage 6B-P1. It is not an independent peer plan. P1-G-B account inspection was separately approved and completed read-only. P1-G-C-0 has created a child decision packet for the remaining human choices; this document still does not authorize database mutation, environment changes, import, merge（合并）, or deployment.

## Scope

- Record the accepted P1-F implementation and non-production validation result.
- Record the initial Production data decision: migrate an empty Production target and start formal data creation only after V1 is live.
- Separate documentation, read-only account inventory, human decisions, and live Production actions into independently approved steps.
- Define the required Production target, environment variable（环境变量）, access boundary, validation, rollback（回滚）, and stop-condition evidence.
- Hand the completed Postgres runtime bridge back to Stage 6B formal execution only after every required decision is closed.

## Non-Scope

- No Vercel or Neon mutation command.
- No `.env` change and no credential value output. P1-G-B read only the minimum local environment metadata needed to fingerprint the Development / Preview Neon target.
- No SQL command or database connection.
- No Production database creation, branch creation, migration（迁移）, inspection, write, cleanup, or restore.
- No formal backup import（备份导入）.
- No GitHub push, pull request, merge to `main`, Production deployment, promotion, alias change, or rollback.
- No authentication（认证）or access-gate implementation.
- No Production smoke write.
- No AI API（人工智能接口）, external vocabulary source, analytics（分析追踪）, notification, email, or 付费/扣款 feature.

## Safety / Side Effects

- P1-G-A changes local documentation only.
- P1-G-B used the separately approved read-only Vercel / Neon account inventory path and reported names, ids, scopes, status, and redacted infrastructure fingerprints without printing connection strings, passwords, or tokens.
- Any future Production mutation requires a separate action-specific approval after the exact target and rollback path are recorded.
- Development-only commands guarded by `STAGE5F_DATABASE_TARGET=development` must never be repointed at Production.
- A Production-specific migration/import command path must have its own exact-target guard and confirmation wording before use.

## Exit Criteria

P1-G is complete only when:

- P1-G-A documentation is accepted and synchronized.
- P1-G-B read-only Production inventory records the exact Vercel project/team, Production branch, active deployment/aliases, environment variable names/scopes, and whether a Neon Production target currently exists, without exposing secrets.
- P1-G-C records the exact Neon Production target after an approved provider-management path or equivalent evidence identifies branch / database / recovery capability, plus the access-boundary, merge, deployment, and Production smoke decisions.
- The initial-data decision remains explicit: no development data copy and no formal backup import for first launch.
- The future Stage 6B execution order, rollback paths, and stop conditions are executable and unambiguous.
- The user separately approves each live Production action before it occurs.

## Current Status

- `P1-G-A Documentation`: accepted for execution on 2026-07-10 and completed in this change set.
- `P1-G-B Read-Only Production Inventory`: completed on 2026-07-10 after separate explicit approval, with no Production target configured. The existing Development / Preview Neon resource is proven operational, while the Vercel SSO management route did not expose branch / recovery details.
- `P1-G-C-0 Decision Packet`: completed as documentation only in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`; it lists recommended defaults, accepted alternatives, evidence requirements, and stop conditions.
- `P1-G-C-1 Provider Supplement`: completed read-only in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`; it confirmed the Vercel-managed Neon resource is available, owned, Free-plan, and connected only to Development / Preview for this project, but it did not expose branch / database / recovery details.
- `P1-G-C-2 Evidence Route Decision`: completed as documentation only in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md`; it recommends human dashboard evidence as the next safest route and defines redaction requirements.
- `P1-G-C Human Decision Closure`: still open until the exact Production branch / database / recovery capability is established through human-provided dashboard evidence, callable read-only Neon MCP evidence, separately approved browser SSO inspection, or separately approved Neon CLI / API evidence; the remaining target, access, merge, deployment, first-write, and historical-deployment choices are also pending. Email activation is not an established prerequisite.
- `Stage 6B Formal Production Execution`: blocked until P1-G-C completes.

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
- Neon Vercel integration overview: `https://neon.com/docs/guides/vercel-overview`
- Neon Vercel-managed integration: `https://neon.com/docs/guides/vercel-managed-integration`
- Neon manual Vercel setup: `https://neon.com/docs/guides/vercel-manual`
- Neon branching and backup / restore: `https://neon.com/docs/introduction/branching` and `https://neon.com/docs/manage/backups`

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
| Production database target | Not configured / blocked | Production has no database env vars; identify the existing resource's branch / recovery options through an approved management path, then choose a distinct empty target |
| Environment variable scopes | Inspected | Production has no variables; Neon/Postgres variables remain Development / Preview only |
| Access boundary | Pending with public evidence | Canonical Production domain returns HTTP `200`; choose an access gate or explicitly accept public unauthenticated writes |
| Merge path | Pending | Pull request review or explicitly approved direct merge to `main` |
| Deployment mechanism | Pending | Git integration or explicitly approved CLI/dashboard execution |
| Production write acceptance | Pending | First real user write, or a separately approved smallest-possible smoke write with cleanup |
| Existing non-official deployment | Confirmed, treatment pending | Keep current Ready deployment as history / recovery candidate until the formal release decision |

## P1-G-B Read-Only Inventory Result

Inventory time: 2026-07-10 13:44 AEST.

### Local / Git

- Branch: `V1`.
- Tracking: `origin/V1`.
- Working tree at inventory start: clean.
- Ahead / behind: `0 / 0`.
- Latest commit: `553d91a7888f940f1b1a986455f7c718ee1530ac`.

### Vercel Project / Git Link

- Team: `anorias-projects` (`team_aZlkgVfGEa9rGrdjpshW2KN5`).
- Project: `words-learning-app-for-mimi` (`prj_qGmq7IZXGB2Bx9X2DuZaaYubg6eD`).
- Account plan: Hobby.
- Git repository: `huaixuanhu/words-learning-app-for-mimi`.
- Configured Production branch: `main`.
- Runtime framework: Next.js; Node.js setting: `24.x`.
- Existing cached Vercel CLI login was used through Vercel CLI `54.20.1` after the connected Vercel app returned a scope-specific `403` for `anorias-projects`. No OAuth scope, token, or account setting was changed.

### Deployments / Aliases

Current non-official Production artifact:

- Deployment id: `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD`.
- Target / state: `production` / `READY`.
- Source: branch `V1`, commit `d01719a6bb372c75873d042c657feb7f93d80b3a`.
- Canonical aliases currently point to this deployment:
  - `words-learning-app-for-mimi.vercel.app`
  - `words-learning-app-for-mimi-anorias-projects.vercel.app`
- The canonical Production domain is verified and returned HTTP `200` without application credentials during the read-only check.
- `/api/storage/health` returned HTTP `404` on this historical deployment, which predates the current formal Production runtime path.

Current `V1` Preview evidence:

- Deployment id: `dpl_9a9jharXJof6UUxitFTFHjoFGYht`.
- Target / state: `preview` / `READY`.
- Source: branch `V1`, commit `553d91a7888f940f1b1a986455f7c718ee1530ac`.
- Branch alias `words-learning-app-for-mimi-git-v1-anorias-projects.vercel.app` points to this Preview deployment.
- Deployment-specific Production and Preview URLs returned HTTP `302` under Vercel deployment protection.

### Environment Variable Scopes

Production:

- No project environment variables are configured.
- `MIMI_STORAGE_RUNTIME=postgres-production` is absent.
- All Production Neon/Postgres connection variables are absent.
- Preview-only UI/smoke write flags are absent.

Preview:

- `MIMI_STORAGE_RUNTIME` is configured for Preview only.
- The following encrypted database keys are scoped to Development and Preview, not Production:
  - `DATABASE_URL`
  - `DATABASE_URL_UNPOOLED`
  - `NEON_PROJECT_ID`
  - `PGDATABASE`
  - `PGHOST`
  - `PGHOST_UNPOOLED`
  - `PGPASSWORD`
  - `PGUSER`
  - `POSTGRES_DATABASE`
  - `POSTGRES_HOST`
  - `POSTGRES_PASSWORD`
  - `POSTGRES_PRISMA_URL`
  - `POSTGRES_URL`
  - `POSTGRES_URL_NON_POOLING`
  - `POSTGRES_URL_NO_SSL`
  - `POSTGRES_USER`
- `MIMI_ENABLE_STORAGE_UI_WRITES` and `MIMI_ENABLE_STORAGE_SMOKE_WRITES` are absent.
- No environment variable value was printed or committed.

### Access Boundary Evidence

- Project SSO deployment protection reports `all_except_custom_domains`.
- Git fork protection is enabled.
- The canonical Production project domain still returned HTTP `200` without application authentication.
- Therefore Vercel deployment protection does not close the accepted V1 access boundary for the canonical Production URL. Durable writes remain blocked until P1-G-C chooses an explicit access model or records explicit risk acceptance.

### Neon Resource / Production Target

Vercel can identify the attached Development / Preview resource:

- Resource: `words-learning-app-for-mimi-neon`.
- Resource id: `store_D1OyAmdX2Ccd0xYR`.
- Resource status: `available`.
- Region observed from the redacted local target: `ap-southeast-2`.
- Database / role labels: `neondb` / `neondb_owner`.
- Redacted Development / Preview target fingerprints:
  - Neon project fingerprint: `sha256:70b4a70d6cfc`.
  - Endpoint fingerprint: `sha256:f1c0c90fa8a4`.

No Production-scoped connection is configured, so this Development / Preview target must not be treated as the Production target.

Prior repository evidence confirms that this Neon resource is real and operational:

- Stage 5F created the Vercel Marketplace Neon resource, pulled Development / Preview environment variables, applied `0001_initial.sql`, and inspected 8 tables with zero core business rows.
- Stage 5J returned `status=ready` from local and Vercel Preview `postgres-preview` health checks against the resource.
- Stage 5K executed one controlled Preview write, Stage 5L cleaned the smoke rows and returned counts to zero, and Stage 5N verified Preview UI persistence.
- Stage 6B-P1-F reused the same approved Development / Preview resource, applied `0002_schema5_production_runtime.sql`, verified schema version 5 and Active-review guards, exercised Postgres repository integration, and returned final business counts to zero.

The Vercel-provided Neon SSO route reached the official Neon Console but displayed an `Almost there` email-activation screen. The user later confirmed no activation email was received. This observation proves only that this particular SSO management route did not expose the provider console; it does not prove that the existing Marketplace resource is absent, unusable, or globally blocked on email activation.

The cause of the management-route mismatch remains unverified. P1-G-B therefore could not inspect:

- Neon branch names or primary-branch status;
- whether a distinct empty Production branch/database already exists inside the resource;
- account plan / history retention window;
- instant restore, snapshot, or point-in-time recovery availability.

No activation email was resent, no provider button was clicked, no branch was created, no SQL was run, and no database connection was opened during the approved P1-G-B inventory.

### Recovery Evidence

- Vercel reports no rollback currently in progress.
- Only one Production deployment is currently listed for this project.
- The team is on the Hobby plan. Current Vercel documentation limits arbitrary rollback to a specified older deployment to Pro / Enterprise, so P1-G must not assume that exact rollback path is available on this account.
- Keep `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD` and its canonical alias mapping intact until the formal deployment and recovery mechanism are explicitly accepted.
- Environment-variable rollback remains separate from deployment recovery.
- Neon recovery capability remains unconfirmed until an approved provider-management path or equivalent account evidence can identify branch, retention, and restore behavior.

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

Status: completed on 2026-07-10 after separate explicit approval.

This slice read private Vercel / Neon account configuration and minimum local target metadata through existing authenticated tools. Secret values and connection strings were neither printed nor committed.

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

Result:

- Vercel identity, Production branch, deployments, aliases, environment variable scopes, access-protection state, account plan, and current rollback status were recorded.
- The exact result for Production database target is `not configured`.
- The existing Neon resource is operational, but the attempted Vercel SSO management route did not expose provider branch / recovery details.
- All P1-G-B side-effect boundaries were preserved.

### P1-G-C Human Decision Closure

Detailed decision packet: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`.
Provider supplement: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`.
Evidence route decision: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md`.

P1-G-C-0 has been completed as documentation only. P1-G-C-1 has completed a read-only Vercel CLI provider supplement. P1-G-C-2 has selected the next safest evidence route at the documentation level. None of these closes P1-G-C or approves environment changes, database work, merge, deployment, or Production write acceptance.

After P1-G-B, the user must explicitly decide:

- establish an approved management path or equivalent evidence for the existing Neon resource, then rerun read-only branch / recovery inventory before choosing the exact empty Production target;
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
3. Follow the P1-G-C decision packet, establish an approved provider-management path or equivalent evidence for the existing Neon resource, then repeat read-only inventory for branch names, account plan, history retention, and recovery capability.
4. Confirm the exact empty Production database target and an account-supported recovery checkpoint or restore direction.
5. Use a Production-specific guarded command path to apply `0001_initial.sql`, inspect, apply `0002_schema5_production_runtime.sql`, inspect again, and verify Active-review triggers.
6. Confirm all Production learning and backup-import counts are `0`; skip formal backup import.
7. Close the access-boundary decision before enabling durable public-url writes.
8. Configure Production-only runtime/database environment variables without Preview-only write flags, then create a new deployment so the variables take effect.
9. Merge/deploy only through the separately approved mechanism and verify `target=production`.
10. Run read-only route, runtime, empty-state, error-log, and person-separation checks.
11. Perform only the approved first-write path, verify persistence after refresh, and record the first formal data boundary.
12. Close out exact deployment id, URL, commit, runtime, database target identity, validation evidence, and rollback direction without secrets.

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
- branch / recovery capability remains unverified through an approved provider-management path or equivalent evidence;
- Production database environment variables remain absent or point to the Development / Preview target;
- the access boundary remains unresolved when durable Production writes would become reachable;
- runtime health reports `local` or `postgres-preview` instead of `postgres-production`;
- schema version 5 fields, Recognition FSRS state, natural-day due behavior, or Active-review guards fail validation;
- `person_id` separation cannot be verified;
- local, Preview, migration, deployment, or smoke validation fails;
- the user pauses or changes direction.

## P1-G-A Result

P1-G-A turns the P1-F result into an explicit Production handoff and records an empty Production launch with no formal backup import. It authorized local documentation only. P1-G now remains open for the blocked provider supplement and P1-G-C decisions.

## P1-G-B Result

P1-G-B completed the approved read-only inventory without remote mutation. Vercel is fully identified, Production remains on the historical non-official deployment, Production environment variables are empty, the canonical domain is publicly reachable, and no Production database target is configured. Earlier Stage 5F / 5J / 5K / 5L / 5N and P1-F evidence proves the existing Development / Preview Neon resource is operational. P1-G-C cannot close until branch / recovery capability is established through an approved provider-management path or equivalent evidence; Production migration, env setup, merge, and deployment remain unauthorized.

## P1-G-C-0 Result

P1-G-C-0 created `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md` as a documentation-only decision packet. It records the required provider-management evidence, recommended default package, accepted alternatives, and stop conditions for Production target, access boundary, merge path, deployment mechanism, Production write acceptance, and the historical non-official Production deployment. P1-G-C remains open; the next separately approved slice is `P1-G-C-1 Provider Supplement`, read-only evidence gathering only.

## P1-G-C-1 Result

P1-G-C-1 created `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md` and completed the read-only Vercel CLI supplement. Vercel Marketplace metadata confirms the existing Neon resource is owned, available, on the Free `free_v3` plan, and connected to `words-learning-app-for-mimi` only for Development / Preview. Production still has no database env vars. Branch names, primary/root status, database and role labels, restore window, and exact empty Production target remain unavailable through this path. P1-G-C remains open.

## P1-G-C-2 Result

P1-G-C-2 created `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md`. It recommends human dashboard evidence as the next safest route for the missing Neon branch / database / restore metadata, with explicit redaction requirements for connection strings, hostnames, passwords, tokens, and environment variable values. It did not inspect the provider dashboard or close target selection.
