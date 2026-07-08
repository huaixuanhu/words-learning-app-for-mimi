# Words Learning App For Mimi Stage 6B-P1: Postgres Production Runtime

Created: 2026-07-08 00:25 AEST
Last updated: 2026-07-08 12:45 AEST

Source plan: `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`
Derived from: `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`, `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`, `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md`, `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md`, `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`, `ARCHITECTURE.md`, `db/migrations/0001_initial.sql`, `src/lib/storage/runtime-mode.ts`, `src/app/api/storage/data/route.ts`, `src/lib/storage/postgres/repository.ts`, and the 2026-07-08 user decision to make V1's formal release fully cloud-backed instead of browser-local.
Scope: plan the implementation of a real `postgres-production` runtime（运行模式）for V1 after Stage 8 is accepted, including schema version 5 or later database migration（数据库迁移）, server-only Production（生产环境）runtime gating, API（应用程序接口）read/write behavior, repository parity with browser-local features, backup import（备份导入）, non-production Neon branch（分支）verification, Production migration/import/deploy sequence, rollback（回滚）, and validation.
Non-Scope: no code implementation in this document-only step, no GitHub push, no pull request, no merge（合并）to `main`, no Vercel command, no Neon command, no `.env` or credential read/change, no Production env var change, no database mutation, no backup import, no Production deployment, no authentication（认证）implementation, no AI API（人工智能接口）, no dictation engine（听写引擎）, no spelling checker（拼写检查器）, no writing feedback model, no external vocabulary source, no analytics（分析追踪）, no notification, no email, and no 付费/扣款 feature.
Exit criteria: Stage 6B-P1 implementation plan exists, parent docs and logs link to it, the required schema/runtime/API/backup validation sequence is explicit, and every future remote / credential / Production action remains behind explicit human approval.

## Decision Record

On 2026-07-08, the user chose the full cloud-backed V1 path:

- Do not use browser-local Production as the formal V1 release route.
- Build Postgres（关系型数据库）Production support first.
- Treat V1 formal launch as complete only when the app can run against cloud Postgres in Production.

This means Stage 6B formal release is blocked until this Stage 6B-P1 runtime and migration work is designed, implemented, validated, and explicitly accepted.

On 2026-07-08, the user added a required precondition: Stage 8 Review Memory Algorithm must be designed first. Stage 6B-P1 must not freeze a Production schema that still assumes the placeholder Stage 4 fixed interval scheduler.

Stage 8 implications for this plan:

- V1 scheduler state applies only to Recognition Vocabulary（阅读词汇）.
- Active Vocabulary（输出词汇） must stay stored, exportable, and importable, but must not enter review queue（复习队列）, review state（复习状态）, or review event（复习事件）creation in V1.
- `review_states.difficulty` and `review_states.stability` should stay neutral field names because V2 may add separate Active scheduler dimensions.
- Future Active scheduling should use a separate dimension such as `review_profile`, `skill_type`, or `activity_type`, rather than sharing a single state row with Recognition.
- Any Production migration plan must incorporate the accepted Stage 8 state shape before remote execution.

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

- `src/lib/storage/runtime-mode.ts` currently supports only `local` and `postgres-preview`.
- `postgres-preview` is intentionally blocked in Vercel Production.
- `/api/storage/data` currently returns disabled in Vercel Production.
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
- Current review scheduler data still reflects the Stage 4 placeholder interval model and must not be frozen into Production before Stage 8 acceptance.

Repository / API behavior:

- Postgres Preview maps only the first meaning/example through `meaning_zh` and `example`.
- JSON imports are down-mapped to legacy source types in the existing Postgres path.
- Browser-local Library hard delete, JSON batch rollback, reset-today Review, and one-word Review rollback do not yet have matching Postgres API / repository operations.
- Stage 8 same-session repeat and FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）state rebuild behavior do not yet have matching Postgres API / repository operations.

Access boundary:

- `person_id` separates learner data but is not security isolation.
- A public Production URL without authentication is not a privacy boundary.
- Before durable Production writes, the user must either explicitly accept no-credential private-URL risk or approve a separate access-gate stage.

## Proposed Production Data Shape

Stage 6B-P1 should create a new migration, tentatively `db/migrations/0002_schema5_production_runtime.sql`.

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
- Active vocabulary rows are persisted in `vocabulary_items`, but no V1 migration should create Active `review_states` or Active `review_events`

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

Formal user backup import remains a later Stage 6B action after the implementation passes non-production validation.

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

- Add `0002_schema5_production_runtime.sql`.
- Update static schema tests for schema version 5 fields and constraints.
- Keep `0001_initial.sql` historical and avoid rewriting applied migration history.
- Add fixture expectations for JSON source types and Recognition / Active limits.
- Add fixture expectations that Active vocabulary persists without review state or review event rows.
- Add fixture expectations for the accepted Stage 8 Recognition scheduler state fields.

### P1-C Runtime And API Contract

- Add `postgres-production` runtime parsing and guards.
- Add tests that:
  - reject `postgres-preview` in Production;
  - reject `postgres-production` outside Production;
  - accept `postgres-production` only with the intended environment shape;
  - keep missing runtime defaulting to `local`.
- Update health/data route behavior for Production.
- Keep secrets server-only.

### P1-D Repository Parity

- Update Postgres mappers and repository writes for schema version 5.
- Add Postgres operations for hard delete, import rollback, reset-today review, and one-word review rollback.
- Add Postgres-compatible behavior for Stage 8 Recognition scheduler updates, same-session repeated attempts, and state rebuild from events.
- Add unit/static tests where possible without connecting to a remote database.
- Keep remote integration tests behind explicit database approval.

### P1-E Backup Import Version 5

- Update backup import planning and Postgres commit scripts for schema version 5.
- Add schema version 5 fixtures with multiple meanings/examples, JSON import batch, Active item, Recognition review events, and dual limits.
- Verify dry run and rollback trial locally where no secrets are required.

### P1-F Non-Production Neon Branch Verification

Only after explicit approval:

- identify or create a non-production Neon branch;
- apply migrations there;
- inspect schema and counts;
- run fixture import dry run / rollback / guarded commit;
- deploy or use Preview with `postgres-production` test behavior only if the guard design allows it safely, or verify via dedicated scripts;
- clean all fixture rows after testing.

### P1-G Production Execution Handoff

After P1 passes:

- return to Stage 6B formal execution;
- confirm exact Production database target;
- confirm env var scopes;
- confirm access boundary;
- confirm backup file and expected counts if importing;
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
npm run build
git diff --check
```

Database validation, after explicit approval only:

```bash
npm run db:inspect:dev
```

Additional Stage 6B-P1 commands should be added only after implementation creates the matching scripts and confirmation flags.

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

Before code implementation:

- whether to use JSONB arrays for `tags`, `meaningsZh`, and `examples` as proposed here;
- final Stage 8 scheduler state fields and whether a local schema version 6 is required;
- whether Production writes will launch with no-credential private-URL risk acceptance or a separate access gate;
- whether formal user backup import is required before first Production use, given the user has deleted test words;
- whether `main` merge should happen by direct merge or pull request after P1 passes;
- whether to keep or archive the existing non-official Production deployment after formal release.

## P1 Result

Stage 6B-P1 is the required database/runtime bridge between the accepted local V1 app and the desired fully cloud-backed V1 launch, but it must wait for Stage 8 to define the final Recognition review memory state.

No Production release should proceed until P1 has passed local validation, non-production database verification, and explicit human acceptance.
