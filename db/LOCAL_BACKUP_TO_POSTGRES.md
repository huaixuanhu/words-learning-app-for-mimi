# Local Backup To Postgres Migration Mapping

Created: 2026-07-05 01:08 AEST
Last updated: 2026-07-20 00:22 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`

Derived from:

- `plan_docs/PLAN_V1_STAGE5A_LOCAL_EXPORT_BACKUP.md`
- `plan_docs/PLAN_V1_STAGE5B_STORAGE_PROVIDER_DECISION.md`
- `plan_docs/PLAN_V1_STAGE5C_LOCAL_PERSON_ADAPTER.md`
- `plan_docs/PLAN_V1_STAGE5D_DURABLE_STORAGE_READINESS.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md`
- `plan_docs/PLAN_V2_STAGE7B_1_FORMAL_AI_LOCAL_ORCHESTRATION.md`
- `plan_docs/PLAN_V2_STAGE7B_2_NONPRODUCTION_PROVIDER_PROOF.md`
- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- `plan_docs/PLAN_V2_STAGE8_2_2_REVIEW_AUDIO_BILINGUAL_EXAMPLES.md`

Scope:

- Map schema version 3 through 6 JSON backup（JSON 备份）data, including wrapper Versions 1–4, into the current V2 Postgres（关系型数据库）draft.
- Preserve person separation through `person_id`.
- Define validation and rollback expectations before a remote migration（迁移）is executed.
- Document the Stage 5L dry-run and rollback-trial harness.

Non-Scope:

- No formal user backup import.
- No Production（生产）database execution.
- No `.env`, credential, or remote database value exposure.
- No deletion of browser `localStorage`（本地浏览器存储）after migration.

Lifecycle policy note:

- This file defines backup-import mapping and transaction validation. It does not define the recurring Production backup schedule.
- Stage 8.5 is the canonical recurring-backup policy: after formal Production data begins, target one encrypted logical backup per week, retain the most recent eight weekly backups, and create an additional backup before high-risk Production data changes.
- Backup format, encryption method, storage destination, restore drill, and automation require a separately approved implementation slice.

## Harness Status

Stage 5L added a guarded import harness without opening formal user-data import:

- `scripts/backup-import-plan.mjs` validates schema version 3 / 4 / 5 backup shape, metadata counts, person-scoped references, and target UUID mapping.
- `scripts/backup-import-postgres.mjs` can run fixture dry run, development smoke cleanup, and a fixture transaction rollback trial.
- `npm run backup:dry-run:fixture` runs without database access.
- `npm run db:import-fixture-trial:dev` writes a fixture-shaped dataset inside a development database transaction and rolls it back.
- Formal import of a real user backup remains pending a separate plan and confirmation.

Stage 6B-P1-E extends the harness for schema version 5:

- `npm run backup:dry-run:schema5-fixture` runs without database access.
- `test_fixtures/stage6b-p1e-schema5-backup.json` covers a JSON import batch, multiple meanings/examples, nullable rarity, tags, dual Recognition / Active daily limits, one Recognition item with review history, and one Active item without review rows.
- Import planning now preserves `learningTrack`, `tags`, `meaningsZh`, `examples`, `json_file` / `json_paste` sources, and `recognitionSessionLimit` / `activeSessionLimit`.
- Import planning rejects schema version 4 / 5 review states or review events that target Active Vocabulary because V1 scheduling is Recognition-only.
- Stage 6B-P1-F has executed schema version 5 `--trial-rollback`, guarded fixture `--commit`, and cleanup against the approved non-production development database after applying `db/migrations/0002_schema5_production_runtime.sql`.
- Formal user backup import or Production import still requires a separately confirmed target, fresh backup file, expected counts, rollback plan, and explicit human approval.

V2 Stage 3 extends the local harness to Schema Version 6 and backup wrapper version 3:

- `npm run backup:dry-run:schema6-fixture` runs without database access.
- `test_fixtures/v2-stage3-schema6-backup.json` covers both Review Profiles, daily defaults/plans, a deleted-item creation tombstone, a batch reversal, and one accepted AI run/draft/relation chain.
- Schema versions 3–5 normalize forward to version 6 by deriving Recognition-only review evidence, two daily defaults per person, and legacy creation facts without inventing Active history or a first-rating time.
- Schema Version 6 remaps every formal id and retains creation facts even when the original vocabulary item has already been deleted.
- Quota buckets, study/AI idempotency rows, Cache, temporary/rejected drafts, and unreferenced AI audit rows are operational data and are not imported from a user backup.
- `db/migrations/0003_v2_schema6_data_model.sql` and the Schema 6 fixture have passed local/static validation only. No Development, Staging, Preview, or Production migration/import has been executed for Stage 3.

V2-8-2.2 advances new JSON backup wrappers to Version 4 while keeping Versions 1–3 readable. Each vocabulary item now maps aligned `examples` and `exampleTranslationsZh`; legacy wrappers normalize missing Chinese text to same-length empty positions, which remain visible as incomplete. `db/migrations/0004_v2_bilingual_examples.sql` adds `vocabulary_items.example_translations_zh` plus JSON-array and equal-length constraints. It is an additive Schema Version 6 migration and has not been executed on any remote target. The V2-8-3 forward path pins and executes `0003` then `0004`; it cannot treat a database containing only `0003` as current V2-8-2.2 readiness.

V2 Stage 3.1 later reserves `context_explain_v1` in that same unexecuted `0003` draft and adds `ai_context_explanation_cache`. This table is expiring operational data tied to one exact stored example-token span and a matching successful context run. It has no JSON backup collection or `backup_import_mappings` entity type, and the backup selector excludes context runs plus any formal draft/relation carrying feature-mismatched lineage. Enrichment drafts and vocabulary relations continue requiring a matching succeeded/valid `enrichment_v1` run. Stage 3.1 did not execute SQL remotely.

V2-7B-1 extends the same draft with `ai_disclosure_confirmations`, `ai_request_idempotency`, a bounded processing lease, same-Cache in-flight ownership, and `ai_runs.terminal_category`. These are operational safety/diagnostic records and remain excluded from JSON backup and `backup_import_mappings`. Accepted enrichment content, its successful source run, and referenced learning relations continue using the existing backup version 3 collections. V2-7B-2 later permits historical `ai-disclosure-v1` / `ai-disclosure-v2` lineage while requiring `ai-disclosure-v3` for new formal confirmation. Restore never creates a current Disclosure confirmation, request replay record, Cache owner, quota reservation, or browser session.

V2-7B-2 executed `0003_v2_schema6_data_model.sql` once on an approved schema-only child of `staging`. Migration preflight found every core table empty; the disposable target then received one synthetic person and two fixed vocabulary entries. Schema 6 inspection, two provider attempts, Replay/Cache, the database attempt cap, and Kill Switch passed. The child branch/role and local environment file were deleted after evidence capture. Long-term `staging`, Production, and formal user backup import remain untouched and still require separate approval.

V2-8-3 Gate 1 adds a separate non-empty Production migration contract without changing the historical empty-target tools. `scripts/v2-stage8-3-db.mjs` can inventory Schema 5, migrate a confirmed Production clone or `main`, inspect Schema 6, and compare a supplied pre-migration artifact. Every path requires an exact command flag and, before a Postgres connection, authenticated read-only GETs to Neon's fixed official control-plane API for the target/main endpoints and branches. The live response must bind project, endpoint, branch, parent, branch state, clone source type and target mode; a local JSON/hash or operator label cannot substitute. A second code-owned pin binds the verified Production project itself: it intentionally remains `null` in Gate 1, so every real command stays dormant until Gate 2 independently confirms the project and a reviewed code change records its SHA-256. Database/role/URL checks, the independently pinned `0003` and `0004` SHA-256 values, and a non-empty learning inventory remain separate guards. The `main` migration additionally requires verified encrypted-backup evidence, a distinct Schema 5 recovery point, a completed non-empty clone rehearsal, an active write-free window, independent proof that the old V1 runtime write path is blocked, and a no-in-flight-write confirmation. Output is allowlisted to counts, invariants, and digests; it omits API response bodies, project id, learning text, person labels/ids and connection details.

`scripts/v2-stage8-3-cutover-manifest.mjs` creates and validates a separate secret-free cutover record. It binds the exact app artifacts, Schema 5/6 inventory hashes, encrypted logical-backup and recovery evidence, complete write-window chronology, the initial four-attempt AI ledger boundary, and a paired V1/Schema 5 rollback packet. After the first V2 write, rollback validation requires window id/start/end, an explicit reconciliation choice and its evidence; approved loss requires an additional acceptance hash. These scripts are dormant local tooling in the present tranche: they have not read Production, run `0003` on `main`, selected a backup/encryption tool, or created a real backup/recovery resource.

## Migration Principle

The browser-local schema uses prefixed string ids such as `person_mimi`, `vocab_*`, `batch_*`, and `review_event_*`. The Postgres draft uses UUID primary keys. A real import must therefore create a deterministic in-memory mapping from each source id to a target UUID during one transaction.

Current JSON backup wrapper Version 4 contains a Schema Version 6 workspace and can contain multiple people. The reader also accepts older supported wrappers/data versions and normalizes them before planning. A future import can either restore the whole workspace or restore one selected person after explicit user choice. For a workspace restore, create one `backup_imports` row per target person so person-scoped import history and `backup_import_mappings` stay aligned.

## Required Preflight

- User exports a fresh JSON backup from `/export`.
- Import script validates the backup with the same rules as the app restore preview.
- Import script rejects unsupported backup versions.
- Import script verifies that every learning record has a valid `personId`.
- Import script builds source-to-target id maps before any insert.
- Import script runs all inserts inside a single transaction.
- Import script compares inserted counts against backup metadata before commit.
- Browser-local data is not deleted automatically after successful import.

## Mapping

### people

- Source: `data.people[]`
- Target: `people`
- Mapping:
  - `id` -> generated UUID, stored in `backup_import_mappings`
  - `displayName` -> `display_name`
  - `slug` -> `slug`, with database unique validation
  - `isActive` -> `is_active`
  - `createdAt` -> `created_at`
  - `updatedAt` -> `updated_at`

### import_batches

- Source: `data.importBatches[]`
- Target: `import_batches`
- Mapping:
  - `id` -> generated UUID, stored in `backup_import_mappings`
  - `personId` -> mapped `people.id`
  - `sourceType` -> `source_type`
  - schema version 5 preserves `json_file` and `json_paste` source types
  - `fileName` -> `file_name`
  - count fields map directly after non-negative validation

### vocabulary_items

- Source: `data.items[]`
- Target: `vocabulary_items`
- Mapping:
  - `id` -> generated UUID, stored in `backup_import_mappings`
  - `personId` -> mapped `people.id`
  - `importBatchId` -> mapped `import_batches.id`, or null
  - camelCase fields map to snake_case columns
  - `learningTrack` -> `learning_track`; schema version 3 defaults to `recognition`
  - `tags` -> `tags` JSONB（JSON 二进制存储）array or null
  - `meaningsZh` -> `meanings_zh`; schema version 3 falls back from `meaningZh`
  - `examples` -> `examples`; schema version 3 falls back from `example`
  - `exampleTranslationsZh` -> `example_translations_zh`; legacy backup versions create one explicit empty position per English example
  - `rarityScore` must be null or between 1 and 5
  - `archivedAt` must agree with `status`

Schema version 3–5 backup import must not create review state or review event rows for Active Vocabulary. Schema Version 6 may carry Active evidence only when its independent profile, activity, outcome, target revision, and parameter-set constraints are valid.

### review_states

- Source: `data.reviewStates[]`
- Target: `review_states`
- Mapping:
  - `id` -> generated UUID, stored in `backup_import_mappings`
  - `personId` -> mapped `people.id`
  - `vocabularyItemId` -> mapped `vocabulary_items.id` for the same person
  - `reviewProfile` -> `review_profile`
  - `parameterSetId` -> `parameter_set_id`
  - `firstRatedAt` -> `first_rated_at`
  - `historyOrigin` -> `history_origin`
  - uniqueness is enforced by `(person_id, vocabulary_item_id, review_profile)`
  - schema version 3–5 rows normalize to Recognition with `recognition-fsrs-v1`; earliest retained evidence supplies `firstRatedAt`, otherwise origin remains `legacy_unknown`
  - schema version 6 accepts only `recognition-fsrs-v1|v2` for Recognition and `active-fsrs-v1|v2` for Active; unknown or cross-profile identifiers fail validation

### review_events

- Source: `data.reviewEvents[]`
- Target: `review_events`
- Mapping:
  - `id` -> generated UUID, stored in `backup_import_mappings`
  - `personId` -> mapped `people.id`
  - `vocabularyItemId` -> mapped `vocabulary_items.id` for the same person
  - rating and interval values must pass database checks
  - `promptId`, `reviewProfile`, `activityType`, `answerOutcome`, `answerNormalizationVersion`, `targetRevision`, and `parameterSetId` map to their snake_case evidence columns
  - schema version 3–5 rows normalize to Recognition `recognition_card` / `self_rated` evidence and reject review rows targeting Active items
  - schema version 6 requires the same explicit matching-profile V1/V2 Parameter Set identifiers as `review_states`

### review_settings

- Source: `data.settingsByPerson[]`
- Target: `review_settings`
- Mapping:
  - `personId` -> mapped `people.id`
  - `recognitionSessionLimit` -> `recognition_session_limit`
  - `activeSessionLimit` -> `active_session_limit`
  - `sessionLimit` -> `session_limit`, synchronized to the Recognition daily limit
  - `timezone` -> `timezone`
  - `updatedAt` -> `updated_at`

### daily_study_defaults and daily_study_plans

- Source: `data.dailyStudyDefaults[]` and `data.dailyStudyPlans[]`
- Target: matching snake_case tables
- Mapping:
  - generated UUID mappings are retained for daily plans; defaults use the mapped person plus profile key
  - every person has one Recognition and one Active default
  - plan person/profile/date uniqueness, timezone, inclusive/exclusive day window, goal values, recommendation values, and versions are validated before insert
  - schema versions 3–5 derive defaults from legacy settings and have no historical daily plans

### vocabulary_creation_facts and vocabulary_creation_reversals

- Source: `data.vocabularyCreationFacts[]` and `data.vocabularyCreationReversals[]`
- Target: matching append-only tables
- Mapping:
  - source action, original item id, Track at creation, source kind, timestamp, and fact origin remain immutable evidence
  - an original item id is remapped independently even when no live vocabulary row remains
  - reversal source action must match a creation action for the same person and is unique per reason
  - schema versions 3–5 derive `legacy_backfill` facts from retained items; no reversal is invented

### ai_runs and ai_enrichment_drafts

- Source: only backup-retained `data.aiRuns[]` and accepted `data.aiEnrichmentDrafts[]`
- Target: `ai_runs` and `ai_enrichment_drafts`
- Mapping:
  - person, optional source item, run/draft ids, versioned provider/model lineage, bounded usage, lifecycle state, and accepted structured fields map directly after validation
  - every restored run must be succeeded and referenced by accepted formal data
  - temporary, rejected, failed, or unreferenced operational rows are absent from the user backup

### vocabulary_relations

- Source: `data.vocabularyRelations[]`
- Target: `vocabulary_relations`
- Mapping:
  - source item, target item, AI run, relation type, Chinese difference, and example pairs are remapped within one person
  - both vocabulary endpoints and the accepted AI lineage must exist before insert

### backup_imports

- Source: validated backup metadata
- Target: `backup_imports`
- Mapping:
  - create one row per target person for workspace imports
  - create one row for the selected person for selected-person imports
  - `schemaVersion` -> `schema_version`
  - item and review-event counts should be person-scoped for each row
  - source file name and exported time are copied from import context and backup metadata when available

### backup_import_mappings

- Source: all generated source id to target UUID mappings
- Target: `backup_import_mappings`
- Mapping:
  - `personId` -> mapped `people.id`
  - `backup_import_id` -> the import row for that same person
  - `entity_type` identifies the source collection
  - `source_id` stores the original local id
  - `target_id` stores the inserted database UUID

## Count Validation

Before commit, a future migration script should check:

- `people` count equals `data.people.length`
- `vocabulary_items` count equals `data.items.length`
- `import_batches` count equals `data.importBatches.length`
- `review_states` count equals `data.reviewStates.length`
- `review_events` count equals `data.reviewEvents.length`
  - `review_settings` count equals `data.settingsByPerson.length`
  - `daily_study_defaults` count equals `data.dailyStudyDefaults.length`
  - `daily_study_plans` count equals `data.dailyStudyPlans.length`
  - creation fact/reversal counts equal their formal backup collections, including tombstones
  - retained AI run/draft and vocabulary-relation counts equal their formal backup collections
  - `backup_import_mappings` count covers every remapped source id

## Failure Behavior

- Any invalid reference aborts the transaction.
- Any duplicate target slug aborts unless the user has explicitly approved slug rewriting.
- Any count mismatch aborts the transaction.
- No partial remote data should remain after failure.
- The local JSON backup remains the recovery source.
