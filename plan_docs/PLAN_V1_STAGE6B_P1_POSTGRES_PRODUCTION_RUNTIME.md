# Words Learning App For Mimi Stage 6B-P1: Postgres Production Runtime

Created: 2026-07-08 00:25 AEST
Last updated: 2026-07-11 01:06 AEST

Source plan: `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`
Derived from: `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`, `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`, `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md`, `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md`, `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`, `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`, `ARCHITECTURE.md`, `db/migrations/0001_initial.sql`, `src/lib/storage/runtime-mode.ts`, `src/app/api/storage/data/route.ts`, `src/lib/storage/postgres/repository.ts`, and the 2026-07-08 user decision to make V1's formal release fully cloud-backed instead of browser-local.
Scope: plan and track the implementation of a real `postgres-production` runtime（运行模式）for V1 after Stage 8 is accepted, including schema version 5 or later database migration（数据库迁移）, server-only Production（生产环境）runtime gating, API（应用程序接口）read/write behavior, repository parity with browser-local features, backup import（备份导入）, non-production Neon branch（分支）verification, Production migration/import/deploy sequence, rollback（回滚）, and validation. Stage 6B-P1-B has implemented the local schema migration draft and static tests. Stage 6B-P1-C has implemented the local runtime / API contract. Stage 6B-P1-D has implemented local repository parity code and tests. Stage 6B-P1-E has implemented local backup import version 5 planning, fixture, script, and tests. Stage 6B-P1-F has applied and validated the schema version 5 migration on the approved non-production development database. Stage 6B-P1-G-A has documented the Production execution handoff and the confirmed empty-Production-start decision. Stage 6B-P1-G-B has completed the approved read-only Vercel / Neon inventory and found that no Production database target is configured. Stage 6B-P1-G-C-0 has added the documentation-only human decision packet in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`. Stage 6B-P1-G-C-1 has added the read-only provider supplement in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`. Stage 6B-P1-G-C-2 has added the evidence route decision in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md`. Stage 6B-P1-G-C-3 has added the approved read-only Neon dashboard evidence in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_3_DASHBOARD_EVIDENCE.md`. Stage 6B-P1-G-C-4 has added the documentation-only branch/environment execution decision in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_4_BRANCH_ENVIRONMENT_EXECUTION_DECISION.md`.
Non-Scope: no GitHub push, no pull request, no merge（合并）to `main`, no Vercel command, no Neon management command, no credential value printing, no Production env var change, no Production database mutation, no formal user backup import, no Production deployment, no authentication（认证）implementation, no AI API（人工智能接口）, no dictation engine（听写引擎）, no spelling checker（拼写检查器）, no writing feedback model, no external vocabulary source, no analytics（分析追踪）, no notification, no email, and no 付费/扣款 feature. P1-F did read ignored `.env.local` and mutate only the approved non-production development database after explicit human confirmation.
Exit criteria: Stage 6B-P1 implementation plan exists, parent docs and logs link to it, the required schema/runtime/API/backup validation sequence is explicit, and every future remote / credential / Production action remains behind explicit human approval.

## Decision Record

On 2026-07-08, the user chose the full cloud-backed V1 path:

- Do not use browser-local Production as the formal V1 release route.
- Build Postgres（关系型数据库）Production support first.
- Treat V1 formal launch as complete only when the app can run against cloud Postgres in Production.

This means Stage 6B formal release is blocked until this Stage 6B-P1 runtime and migration work is designed, implemented, validated, and explicitly accepted.

On 2026-07-08, the user added a required precondition: Stage 8 Review Memory Algorithm must be designed first. Stage 6B-P1 must not freeze a Production schema that still assumes the placeholder Stage 4 fixed interval scheduler.

On 2026-07-10, the user accepted Stage 8.5 Data Lifecycle and environment strategy as another required precondition. It selects one Neon project for the current private small-app phase: `main` becomes Production after separation checks, `staging` becomes the long-lived non-production baseline, and temporary logical `preview/*` branches derive from `staging`. A separate Production Neon project is deferred until an architecture-upgrade trigger appears.

Stage 8-F handoff update on 2026-07-08:

- Stage 8-B installed and calibrated `ts-fsrs@5.4.1`.
- Stage 8-C made failed Recognition ratings repeat inside the same session.
- Stage 8-D replaced the cross-day scheduler with Recognition-only FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）scheduling.
- Stage 8-D keeps exact `dueAt` timestamps but uses local natural-day bucket（本地自然日分桶）queue due checks.
- Stage 8-E confirmed schema version 5 is sufficient; no local schema version 6 is required for V1 FSRS state.
- Stage 8-E tightened backup restore so Active Vocabulary review states / events are rejected as V1-impossible data.

Stage 8 implications for this plan:

- V1 scheduler state applies only to Recognition Vocabulary（阅读词汇）.
- Active Vocabulary（输出词汇） must stay stored, exportable, and importable, but must not enter review queue（复习队列）, review state（复习状态）, or review event（复习事件）creation in V1.
- `review_states.difficulty` and `review_states.stability` should stay neutral field names because V2 may add separate Active scheduler dimensions.
- `review_states.due_at` remains an exact timestamp for audit（审计）/ compatibility; queue due semantics are application-level local date bucket checks.
- Stage 8 does not require a `scheduled_days`, scheduler metadata, or scheduler version column in V1 review rows.
- Future Active scheduling should use a separate dimension such as `review_profile`, `skill_type`, or `activity_type`, rather than sharing a single state row with Recognition.
- Any Production migration plan must incorporate the accepted Stage 8 state shape before remote execution.

Stage 8-G acceptance update on 2026-07-08:

- Stage 8 is now accepted locally after the full validation ladder and a browser review-flow smoke check.
- The accepted Stage 8 behavior is ready to be carried into Stage 6B-P1 implementation.
- Stage 6B-P1 is still a separate implementation stage and still requires explicit approval before running `0002_schema5_production_runtime.sql`, touching Neon, changing Vercel environment variables（环境变量）, importing backups（备份）, or deploying Production.

## Reference Check

Checked on 2026-07-08:

- Vercel environments documentation: `https://vercel.com/docs/deployments/environments`
- Vercel environment variables documentation: `https://vercel.com/docs/environment-variables`
- Neon / Vercel integration overview: `https://neon.com/docs/guides/vercel-overview`
- Neon branching documentation: `https://neon.com/docs/introduction/branching`

Planning implications:

- Vercel separates Local, Preview, and Production environments; Production is the live user-facing site.
- Vercel environment variables are scoped by environment and apply to new deployments, so Production runtime variables must be configured before the deployment that uses them.
- Neon branches are isolated and copy-on-write, so schema and import trials should run on a non-production branch before touching the Production target.
- Production database work must never print or commit connection strings, tokens, or generated credentials.

## Current Gaps

Runtime:

- `src/lib/storage/runtime-mode.ts` now supports `local`, `postgres-preview`, and `postgres-production`.
- `postgres-preview` remains blocked in Vercel Production.
- `postgres-production` is accepted only when `VERCEL_ENV=production`.
- `/api/storage/health` and `/api/storage/data` now have local code paths for `postgres-production`, but those paths have not been exercised against any database.
- Preview write flags are named and designed for development / Preview only.

Database schema:

- `db/migrations/0001_initial.sql` is the Stage 5F development / Preview schema.
- It does not persist schema version 5 fields as first-class data:
  - `learningTrack`
  - nullable `tags`
  - multiple `meaningsZh`
  - multiple `examples`
  - separate `recognitionSessionLimit` / `activeSessionLimit`
- `import_batches.source_type` and `vocabulary_items.source` currently allow the older text sources only.
- `backup_imports.schema_version` currently supports older backup versions, not the current schema version 5 backup path.
- The Stage 8 scheduler state shape is now defined locally, but `0001_initial.sql` is still the historical development / Preview schema and has not been promoted or migrated for Production schema version 5.
- Stage 6B-P1-B added `db/migrations/0002_schema5_production_runtime.sql` as a local static migration draft for schema version 5.
- Stage 6B-P1-F applied `0002_schema5_production_runtime.sql` only to the approved non-production development database and verified the schema version 5 columns, constraints, index, triggers, fixture import paths, repository integration behavior, and final zero business-row cleanup.
- `0002_schema5_production_runtime.sql` has not been applied to Production.

Repository / API behavior:

- Stage 6B-P1-D updated the local Postgres repository code to read/write schema version 5 `meanings_zh`, `examples`, `learning_track`, `tags`, JSON import source types, and separate Recognition / Active daily limits.
- Stage 6B-P1-D added local repository/API operations for hard delete, JSON batch rollback, reset-today Review rebuild, and one-word Review rollback rebuild.
- Stage 6B-P1-D removed the UI blocks for these now-supported Postgres parity mutations.
- The P1-D code has now been validated against the migrated non-production development database in P1-F.
- Stage 6B-P1-E updated local backup import planning and scripts to accept schema version 5, preserve dual-track fields, and reject impossible Active review rows before any database write.

Access boundary:

- `person_id` separates learner data but is not security isolation.
- A public Production URL without authentication is not a privacy boundary.
- Before durable Production writes, the user must either explicitly accept no-credential private-URL risk or approve a separate access-gate stage.

## Proposed Production Data Shape

Stage 6B-P1-B created the local migration draft `db/migrations/0002_schema5_production_runtime.sql`.

Recommended V1 database shape:

- `vocabulary_items.learning_track text not null default 'recognition'`
- `vocabulary_items.tags jsonb null`
- `vocabulary_items.meanings_zh jsonb not null default '[]'::jsonb`
- `vocabulary_items.examples jsonb not null default '[]'::jsonb`
- `review_settings.recognition_session_limit integer not null`
- `review_settings.active_session_limit integer not null`
- `import_batches.source_type` allows `txt_file`, `pasted_text`, `json_file`, and `json_paste`
- `vocabulary_items.source` allows `manual`, `txt_file`, `pasted_text`, `json_file`, and `json_paste`
- `backup_imports.schema_version` supports schema version 5
- `review_states.difficulty` and `review_states.stability` remain neutral FSRS-compatible fields, documented as V1-used only by Recognition
- `review_states.due_at` remains exact `timestamptz`; daily queue eligibility is computed from local date buckets in application code
- no V1 `scheduled_days`, scheduler version, `recognition_difficulty`, or `recognition_stability` columns
- Active vocabulary rows are persisted in `vocabulary_items`, but no V1 migration should create Active `review_states` or Active `review_events`
- Production import / repository paths must reject Active `review_states` and Active `review_events`; a database trigger should be considered for direct SQL write protection because ordinary check constraints cannot reference `vocabulary_items.learning_track`

For V1, JSONB（JSON 二进制存储）arrays are preferred over new child tables because:

- the local and backup data shape already stores `tags`, `meaningsZh`, and `examples` as arrays;
- the app mainly reads and displays the arrays rather than querying individual meanings/examples as relational entities;
- it keeps the migration smaller before first Production release.

Future search or analytics can normalize meanings/examples into child tables later if real query needs justify it.

## Runtime Design

Add a new runtime mode:

```ts
type StorageRuntimeMode = "local" | "postgres-preview" | "postgres-production";
```

Rules:

- `local` remains the default when `MIMI_STORAGE_RUNTIME` is missing.
- `postgres-preview` stays valid only in local development / Preview contexts.
- `postgres-production` is valid only when `VERCEL_ENV=production`.
- `postgres-preview` must continue to be rejected in Production.
- `postgres-production` must be rejected outside Production unless an explicit non-production test harness uses a separate guard.
- Production must not use `MIMI_ENABLE_STORAGE_UI_WRITES` or `MIMI_ENABLE_STORAGE_SMOKE_WRITES`.

Expected Production env var shape:

- `MIMI_STORAGE_RUNTIME=postgres-production`
- one server-only database connection variable from the accepted Neon / Vercel integration path
- no `NEXT_PUBLIC_` database secret

Exact env var names and scopes must be verified from Vercel / Neon before execution and must not be printed in logs.

## API Design

`/api/storage/health`:

- allow Production health when `postgres-production` is configured;
- report mode and readiness without exposing secrets;
- avoid overly detailed public counts unless the access boundary is accepted.

`/api/storage/data`:

- allow GET in `postgres-production` only after runtime and schema checks pass;
- allow POST mutations in `postgres-production` as normal app behavior, not through Preview smoke flags;
- validate selected `personId` on every read/write;
- reject unknown mutation types;
- reject destructive mutations until matching repository behavior is implemented;
- never accept preview-only write confirmation headers as a Production permission model.

Production write behavior must be a real runtime contract, not a temporary smoke switch.

## Repository Parity Requirements

Production Postgres must match V1 browser-local behavior before formal release:

- list people and select person
- add person
- add vocabulary item
- update vocabulary item
- archive / restore vocabulary item
- hard delete vocabulary item and matching review records
- commit JSON import candidates without source down-mapping
- rollback JSON import batch and matching review records
- list Recognition / Active items
- create Recognition-only review queue
- record review event
- apply the accepted Stage 8 Recognition scheduler behavior
- rebuild Recognition review state deterministically from review events for rollback / reset
- reset today's selected-person review events and rebuild affected review states
- rollback one selected review event and rebuild the affected review state
- read / update Recognition and Active daily limits
- export current runtime snapshot as schema version 5 JSON

If any parity item is deferred, it must be explicitly removed from V1 Production scope or blocked in the UI with clear documentation.

## Backup Import Plan

Stage 6B-P1 must update backup import tooling for schema version 5:

- accept schema version 5 backup files;
- preserve `learningTrack`, nullable `tags`, all `meaningsZh`, and all `examples`;
- preserve JSON import batch source types;
- preserve Recognition / Active daily limits;
- preserve Recognition review events and review states with person scoping;
- reject or quarantine impossible V1 combinations such as Active item review states / events;
- validate metadata counts before writing;
- validate every selected-person reference before writing;
- dry run first;
- transaction rollback trial before commit;
- guarded commit with explicit confirmation flags;
- record backup import mappings for rollback and audit.

The 2026-07-10 initial-launch decision skips formal user backup import because the current development state contains no valuable data and formal data should begin only after cloud-backed V1 launch. The import tooling remains available for future recovery or a later explicitly approved migration.

## Access Boundary Decision

Before enabling Production writes, the user must choose one:

1. Accept no-credential private-URL risk for a trusted private group.
2. Add a separate access gate before Production database writes.

This plan does not choose on behalf of the user.

If option 1 is chosen, the docs must record that a public URL is not true authorization and that `person_id` is not security isolation.

If option 2 is chosen, create a child plan before Production writes. A minimal gate could be a simple shared passcode or a provider-backed auth flow, but that would be new product/security scope.

## Implementation Sequence

### P1-A Documentation And Gate Alignment

- Add this plan.
- Update Stage 6B plan to mark shared Postgres Production as the selected path.
- Update this plan after Stage 8 acceptance with the final Recognition scheduler state shape.
- Sync `AGENTS.md`, `ARCHITECTURE.md`, `README.md`, `CHANGELOG.md`, master plan, and AI log.
- Run `git diff --check` and `npm run governance:preflight`.

### P1-B Local Schema And Static Tests

Status: implemented locally on 2026-07-08 after explicit approval.

Completed:

- Added `db/migrations/0002_schema5_production_runtime.sql` as the schema version 5 Production runtime migration draft.
- Kept `db/migrations/0001_initial.sql` historical and did not rewrite applied migration history.
- Added schema version 5 fields for `learning_track`, nullable `tags`, `meanings_zh`, `examples`, `recognition_session_limit`, and `active_session_limit`.
- Added JSON source type support for `json_file` and `json_paste` in `import_batches.source_type` and `vocabulary_items.source`.
- Added backup import schema version 5 support in the migration draft.
- Preserved neutral Stage 8 FSRS state fields by not adding `scheduled_days`, scheduler version, `recognition_difficulty`, `recognition_stability`, `active_difficulty`, or `active_stability`.
- Added database-level trigger guards so direct SQL inserts / updates to `review_states` or `review_events` reject vocabulary items whose `learning_track` is not `recognition`.
- Updated static schema tests for schema version 5 fields, JSON source types, dual limits, backup schema support, neutral review state shape, and Active review row guards.

Stage 8-F local handoff added a static test that pins the existing neutral `review_states` / `review_events` shape in `0001_initial.sql`; P1-B extended these tests to the new `0002` Production migration before any remote database action.

Boundary:

- P1-B did not execute the migration, inspect a remote database, read or change `.env`, run Vercel / Neon commands, import a backup, or deploy Production.
- The new `0002` migration must still be applied and inspected first on an explicitly confirmed non-production database target in a later approved stage.

### P1-C Runtime And API Contract

Status: implemented locally on 2026-07-09 after explicit approval.

Completed:

- Added `postgres-production` to `StorageRuntimeMode`.
- Added guard functions so `postgres-preview` is valid only outside Vercel Production and `postgres-production` is valid only in Vercel Production.
- Updated the server-only Postgres client to accept the shared guarded Postgres runtime path without moving credentials into client code.
- Updated `/api/storage/health` so Production with `postgres-production` can run a readiness probe without returning public table counts; Preview still returns development / preview counts.
- Updated `/api/storage/data` so Production requires `postgres-production`, non-Production rejects `postgres-production`, Preview writes still require the development / preview UI write flag and confirmation header, and Production does not use the Preview confirmation header as its permission model.
- Updated the browser data hook to recognize `postgres-production` distinctly instead of mislabeling it as `postgres-preview`.
- Kept hard delete, JSON batch rollback, reset-today Review, and one-word Review rollback disabled for all Postgres runtime modes until P1-D repository parity is implemented.
- Added local runtime / route contract tests for the accepted and rejected environment shapes.

Boundary:

- P1-C did not execute a database command, inspect a remote database, read or change `.env`, run Vercel / Neon commands, import a backup, deploy Production, or validate `postgres-production` against a real database.
- P1-C does not complete formal Production readiness because repository parity, backup import version 5, non-production database verification, access-boundary decision, and formal Production execution remain later stages.

### P1-D Repository Parity

Status: implemented locally on 2026-07-09 after explicit approval.

Completed:

- Updated Postgres mappers and repository SQL for schema version 5 vocabulary fields: `learning_track`, nullable `tags`, `meanings_zh`, and `examples`.
- Updated Postgres review settings read/write SQL for separate `recognition_session_limit` and `active_session_limit` while keeping legacy `session_limit` synchronized.
- Preserved JSON import source types by removing the old `json_file` / `json_paste` down-mapping to pasted text.
- Added repository operations for hard delete vocabulary item, JSON import batch rollback, reset-today Review event deletion plus affected state rebuild, and one-word Review event rollback plus affected state rebuild.
- Kept reset / rollback rebuilds aligned with Stage 8 by replaying remaining Recognition review events through `scheduleNextReview()` and using Mimi's local timezone date bucket for reset-today selection.
- Connected the new operations through `/api/storage/data` mutations.
- Opened Library hard delete, JSON batch rollback, Review reset-today, and Review `回退1词` for Postgres runtimes.
- Updated Review session bookkeeping so `回退1词` uses the persisted review event id returned in the current runtime snapshot.
- Added local mapper, route mock, and static repository parity tests without connecting to a database.

Boundary:

- P1-D did not execute a database command, inspect a remote database, read or change `.env`, run Vercel / Neon commands, import a backup, deploy Production, or validate the repository code against a migrated database.
- P1-D depends on `0002_schema5_production_runtime.sql` being applied before real Postgres runtime verification because the repository now reads/writes schema version 5 columns.
- Backup import version 5 is implemented locally in P1-E, but no real database import has run.
- Real database verification completed in P1-F against the approved non-production development database.

### P1-E Backup Import Version 5

Status: implemented locally on 2026-07-09 after explicit approval.

Completed:

- Updated `scripts/backup-import-plan.mjs` to accept schema version 3, 4, and 5 workspace backups, while preserving compatibility with the existing schema version 3 fixture.
- Added schema version 5 validation for `learningTrack`, nullable `tags`, `meaningsZh`, `examples`, JSON import source types, and separate `recognitionSessionLimit` / `activeSessionLimit`.
- Added an explicit V1 guard so schema version 4 / 5 backup import plans reject `reviewStates` or `reviewEvents` that target Active Vocabulary.
- Updated Postgres insert planning for `vocabulary_items.learning_track`, `vocabulary_items.tags`, `vocabulary_items.meanings_zh`, `vocabulary_items.examples`, and dual review settings columns.
- Kept legacy `session_limit` synchronized to the Recognition daily limit for compatibility.
- Added `test_fixtures/stage6b-p1e-schema5-backup.json` with a JSON import batch, one Recognition item with review state / event history, one Active item with no review rows, multiple meanings/examples, nullable rarity support, tags, and dual limits.
- Added `npm run backup:dry-run:schema5-fixture` for local no-database dry-run validation.
- Updated backup import plan tests for schema version 5 mapping, v3 fallback defaults, and Active review row rejection.

Boundary:

- P1-E did not execute a database command, inspect a remote database, read or change `.env`, run Vercel / Neon commands, import a real backup, mutate any database, deploy Production, or run a rollback trial against a database.
- The `--trial-rollback` and `--commit` paths now have schema version 5 SQL shape, but they still require P1-F non-production database verification after explicit approval and after `0002_schema5_production_runtime.sql` is applied to the confirmed target.

### P1-F Non-Production Neon Branch Verification

Status: implemented on 2026-07-09 after explicit approval.

Completed:

- Used the already configured non-production development database target guarded by `STAGE5F_DATABASE_TARGET=development`.
- Confirmed the database started from the Stage 5F `0001` schema with zero business rows.
- Added `scripts/inspect-database-schema5.mjs` and `npm run db:inspect:schema5:dev` to verify schema version 5 columns, constraints, index, triggers, and row counts without printing credentials.
- Added `npm run db:migrate:schema5:dev` and applied `db/migrations/0002_schema5_production_runtime.sql` to the non-production development database.
- Verified schema version 5 database shape: 6 schema version 5 columns, 9 constraints, 1 index, and 2 Active-review guard triggers.
- Added `scripts/verify-schema5-active-review-guard.mjs` and `npm run db:verify:schema5-active-guard:dev`; verified direct Active Vocabulary review state and review event writes are rejected by the database triggers and rolled back.
- Ran both schema version 3 and schema version 5 fixture transaction rollback trials; both inserted expected rows inside a transaction and returned to zero rows after rollback.
- Ran guarded schema version 5 fixture commit, inspected the committed row counts, and then cleaned the fixture rows with `npm run db:cleanup-fixture:dev`.
- Added `src/lib/storage/postgres/repository.integration.test.ts` and `npm run db:test:repository:dev`; verified actual Postgres repository behavior against the migrated development database for schema version 5 vocabulary fields, dual limits, Active review rejection, review record / rollback / reset, JSON import / rollback, hard delete, and snapshot export.
- Confirmed final development database counts returned to zero for core learning tables and backup import tables.

Boundary:

- P1-F did not run a Vercel command, Neon management command, Production migration, Production import, Production deployment, formal user backup import, or Production env var change.
- P1-F did read ignored `.env.local` through explicit `dotenv -e .env.local` commands and connected only to the approved non-production development database.
- P1-F did mutate the non-production development database by applying `0002_schema5_production_runtime.sql` and temporarily writing fixture / integration rows that were cleaned before handoff.
- P1-F did not create a new Neon branch; it reused the already approved development / preview database resource documented from Stage 5F.

### P1-G Production Execution Handoff

Status: P1-G-A documentation, P1-G-B read-only Production inventory, P1-G-C-0 documentation-only decision packet, P1-G-C-1 read-only provider supplement, P1-G-C-2 evidence route decision, P1-G-C-3 read-only Neon dashboard evidence, and P1-G-C-4 branch/environment execution decision are completed after separate explicit approvals. Existing Stage 5F / 5J / 5K / 5L / 5N and P1-F evidence confirms the Development / Preview Neon resource is operational. Stage 8.5 closes the policy-level target strategy as one Neon project with Production `main`, non-production `staging`, and temporary logical `preview/*` children of `staging`. P1-G-C remains open for separately approved live branch/environment actions and the remaining access / merge / deployment / first-write decisions.

Detailed handoff: `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md`.
Detailed P1-G-C decision packet: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`.
Detailed P1-G-C-1 provider supplement: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`.
Detailed P1-G-C-2 evidence route decision: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md`.
Detailed P1-G-C-3 dashboard evidence: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_3_DASHBOARD_EVIDENCE.md`.
Detailed P1-G-C-4 branch/environment execution decision: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_4_BRANCH_ENVIRONMENT_EXECUTION_DECISION.md`.

P1-G-A completed:

- accepted the P1-F non-production evidence;
- recorded that the development database contains no valuable data;
- selected an empty Production database start with no development data copy and no formal backup import for first launch;
- defined the empty-database bootstrap acceptance checks;
- split read-only account inventory, human decisions, and live Production actions into separately approved slices;
- defined Production-specific migration guard, rollback, and stop-condition requirements.

P1-G-B completed:

- confirmed `V1` is clean, pushed, and at commit `553d91a7888f940f1b1a986455f7c718ee1530ac`;
- confirmed Vercel team/project identity and `main` as the configured Production branch;
- confirmed the current Ready Production deployment remains the historical non-official `V1` artifact, while the current commit has a Ready Preview deployment;
- confirmed Production has no environment variables and Development / Preview alone hold the encrypted Neon/Postgres keys;
- confirmed the canonical Production domain is publicly reachable, so the access boundary remains unresolved;
- confirmed no Production database target is configured;
- confirmed prior Stage 5F / 5J / 5K / 5L / 5N and P1-F evidence that the Development / Preview Neon resource has supported migration, read, write, cleanup, Preview UI persistence, and schema version 5 repository verification;
- reached Neon Console through provider SSO but encountered an `Almost there` email-activation screen, leaving that management route and branch/recovery capability unresolved without invalidating the existing resource evidence;
- performed no SQL, database connection, remote mutation, env change, deployment, alias change, merge, or secret output.

P1-G-C-0 completed:

- converted the remaining P1-G-C choices into an explicit decision packet;
- listed recommended defaults and accepted alternatives for provider-management evidence, Production target, access boundary, merge path, deployment mechanism, first-write acceptance, and the historical non-official Production deployment;
- defined `P1-G-C-1 Provider Supplement` as the next separately approved read-only evidence slice;
- did not read `.env`, run a Vercel / Neon command, connect to a database, change env vars, migrate, merge, deploy, or write Production data.

P1-G-C-1 completed:

- used read-only Vercel CLI 55.0.0 project, env, integration, resource, installation, and deployment-list metadata;
- confirmed the Vercel-managed Neon resource is owned, available, and connected to the project for Development / Preview only;
- confirmed the resource is on the Vercel Marketplace `free_v3` Free plan;
- confirmed Production still has no database environment variables;
- confirmed this Vercel Marketplace metadata path does not expose branch names, database labels, role labels, restore window, or an exact empty Production target;
- did not read `.env`, connect to a database, run SQL, create/delete branches, restore, change env vars, merge, deploy, promote, roll back, open provider SSO, or perform an email action.

P1-G-C-2 completed:

- selected human dashboard evidence as the recommended next route;
- defined the exact non-secret metadata needed for branch / database / recovery evidence;
- defined redaction rules for connection strings, hostnames, passwords, tokens, and environment variable values;
- kept browser SSO and Neon CLI / API paths behind separate approval;
- did not run Vercel / Neon commands, read `.env`, connect to a database, inspect a provider dashboard, change env vars, migrate, merge, deploy, or write Production data.

P1-G-C-3 completed:

- used the user-approved direct Neon dashboard inspection path;
- confirmed the existing Neon project `words-learning-app-for-mimi-neon` has only one `main` Default branch;
- confirmed visible database / role labels `neondb` / `neondb_owner`;
- confirmed Sydney region, Postgres 17, and a 6-hour restore window;
- confirmed no child branches and no visible distinct empty Production branch / database;
- did not open the `Connect` modal, reveal/copy secrets, run SQL, connect to a database, create/delete branches, restore, create snapshots, change env vars, migrate, merge, deploy, or write Production data.

Remaining before formal Stage 6B execution:

- separately approve and perform live branch/environment setup following P1-G-C-4: create `staging` from verified clean `main`, move Development / Preview away from `main`, and connect Production-only runtime variables to `main`;
- confirm exact empty Production `main` target and recovery capability after any approved branch/environment change;
- confirm access boundary;
- confirm merge path, deployment mechanism, and first Production write acceptance method;
- confirm all Production business and backup-import counts are zero after migration;
- merge / deploy only after explicit approval.

## Validation Plan

Documentation step:

```bash
git diff --check
npm run governance:preflight
```

Implementation step:

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run build
git diff --check
```

Database validation, after explicit approval only:

```bash
npm run db:inspect:dev
npm run db:migrate:schema5:dev
npm run db:inspect:schema5:dev
npm run db:verify:schema5-active-guard:dev
npm run db:import-fixture-trial:dev
npm run db:import-schema5-fixture-trial:dev
npm run db:import-schema5-fixture-commit:dev
npm run db:cleanup-fixture:dev
npm run db:test:repository:dev
```

These database commands require explicit approval because they read ignored `.env.local` values and connect to the non-production database.

## Stop Conditions

Stop immediately if:

- a command would read or print `.env` / secrets without explicit approval;
- Vercel project or Neon target is ambiguous;
- the migration target is not confirmed non-production during tests;
- any schema version 5 field cannot round trip;
- the accepted Stage 8 scheduler state shape cannot round trip;
- JSON import source types would be down-mapped silently;
- Active Vocabulary would receive review state or review event rows in V1;
- destructive controls are available in Production without tested Postgres behavior;
- `person_id` scoping cannot be verified;
- Production writes are requested before the access boundary decision is recorded;
- validation fails;
- the user pauses or changes direction.

## Open Decisions

Before live Production execution:

- separately approve live branch/environment setup that follows P1-G-C-4;
- whether Production writes will launch with no-credential private-URL risk acceptance or a separate access gate;
- whether `main` merge should happen by direct merge or pull request after P1 passes;
- whether the first real user write should serve as Production write acceptance or a separate smallest-possible smoke write should be approved;
- whether to keep or archive the existing non-official Production deployment after formal release.

Closed on 2026-07-10:

- Formal user backup import is not required for first launch. Production starts with schema-only empty tables, and formal data begins after cloud-backed V1 launch.
- Production target strategy uses the existing Neon project with `main` for Production, `staging` for long-lived non-production, and temporary logical `preview/*` branches derived from `staging`. A separate Production project is deferred under Stage 8.5 upgrade triggers.

## P1 Result

Stage 6B-P1 is the required database/runtime bridge between the accepted local V1 app and the desired fully cloud-backed V1 launch. Stage 8-G accepted the final V1 Recognition review memory behavior and handoff shape. P1-B added the local schema version 5 migration draft plus static tests. P1-C added the local `postgres-production` runtime / API contract and safety tests. P1-D added local Postgres repository parity code and tests. P1-E added local backup import version 5 script support, fixture coverage, and no-database dry-run validation. P1-F applied and validated the schema version 5 migration on the approved non-production development database and cleaned all fixture rows afterward. P1-G-A records the empty Production launch, no-import decision, first durable data boundary, and separately approved Production execution slices. P1-G-B records the live read-only Vercel / Neon inventory, including the absence of Production env vars/target and the operational Development / Preview resource baseline. P1-G-C-0 records the human decision packet. P1-G-C-1 records the read-only Vercel Marketplace provider supplement. P1-G-C-2 records the evidence route decision. P1-G-C-3 records the approved read-only Neon dashboard evidence: only `main` is visible, `neondb` / `neondb_owner` are the current database / role labels, no child branch or distinct Production target is visible, and the restore window is 6 hours. Stage 8.5 closes target strategy at the policy level. P1-G-C-4 records the branch/environment execution decision, including `staging`, Development / Preview retargeting, Preview parentage, Production `main`, and already-applied migration handling. P1-G-C still cannot close until live branch/environment actions are separately approved or deferred and the access, merge/deployment, and first-write decisions are recorded.

No Production release should proceed until live execution follows P1-G-C-4, exact `main` / `staging` branch-environment evidence and recovery path are recorded, and P1-G-C records the access-boundary decision, merge/deployment mechanism, and first-write acceptance method. The policy topology is accepted, the current environment scopes are inventoried, the Development / Preview resource is proven operational, P1-G-C-4 is documented, and the first-launch backup/import choice is closed as `skip`.
