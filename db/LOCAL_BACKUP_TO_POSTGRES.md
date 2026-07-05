# Local Backup To Postgres Migration Mapping

Created: 2026-07-05 01:08 AEST
Last updated: 2026-07-05 15:45 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `plan_docs/PLAN_V1_STAGE5A_LOCAL_EXPORT_BACKUP.md`
- `plan_docs/PLAN_V1_STAGE5B_STORAGE_PROVIDER_DECISION.md`
- `plan_docs/PLAN_V1_STAGE5C_LOCAL_PERSON_ADAPTER.md`
- `plan_docs/PLAN_V1_STAGE5D_DURABLE_STORAGE_READINESS.md`

Scope:

- Map schema version 3 JSON backup（JSON 备份）data into the future Neon Postgres（关系型数据库）schema.
- Preserve person separation through `person_id`.
- Define validation and rollback expectations before a remote migration（迁移）is executed.
- Document the Stage 5L dry-run and rollback-trial harness.

Non-Scope:

- No formal user backup import.
- No Production（生产）database execution.
- No `.env`, credential, or remote database value exposure.
- No deletion of browser `localStorage`（本地浏览器存储）after migration.

## Stage 5L Harness Status

Stage 5L added a guarded import harness without opening formal user-data import:

- `scripts/backup-import-plan.mjs` validates schema version 3 backup shape, metadata counts, person-scoped references, and target UUID mapping.
- `scripts/backup-import-postgres.mjs` can run fixture dry run, development smoke cleanup, and a fixture transaction rollback trial.
- `npm run backup:dry-run:fixture` runs without database access.
- `npm run db:import-fixture-trial:dev` writes a fixture-shaped dataset inside a development database transaction and rolls it back.
- Formal import of a real user backup remains pending a separate plan and confirmation.

## Migration Principle

The browser-local schema uses prefixed string ids such as `person_mimi`, `vocab_*`, `batch_*`, and `review_event_*`. The Postgres draft uses UUID primary keys. A real import must therefore create a deterministic in-memory mapping from each source id to a target UUID during one transaction.

Current JSON backup is a workspace-level backup and can contain multiple people. A future import can either restore the whole workspace or restore one selected person after explicit user choice. For a workspace restore, create one `backup_imports` row per target person so person-scoped import history and `backup_import_mappings` stay aligned.

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
  - `rarityScore` must be null or between 1 and 5
  - `archivedAt` must agree with `status`

### review_states

- Source: `data.reviewStates[]`
- Target: `review_states`
- Mapping:
  - `id` -> generated UUID, stored in `backup_import_mappings`
  - `personId` -> mapped `people.id`
  - `vocabularyItemId` -> mapped `vocabulary_items.id` for the same person
  - uniqueness is enforced by `(person_id, vocabulary_item_id)`

### review_events

- Source: `data.reviewEvents[]`
- Target: `review_events`
- Mapping:
  - `id` -> generated UUID, stored in `backup_import_mappings`
  - `personId` -> mapped `people.id`
  - `vocabularyItemId` -> mapped `vocabulary_items.id` for the same person
  - rating and interval values must pass database checks

### review_settings

- Source: `data.settingsByPerson[]`
- Target: `review_settings`
- Mapping:
  - `personId` -> mapped `people.id`
  - `sessionLimit` -> `session_limit`
  - `timezone` -> `timezone`
  - `updatedAt` -> `updated_at`

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
- `backup_import_mappings` count covers every remapped source id

## Failure Behavior

- Any invalid reference aborts the transaction.
- Any duplicate target slug aborts unless the user has explicitly approved slug rewriting.
- Any count mismatch aborts the transaction.
- No partial remote data should remain after failure.
- The local JSON backup remains the recovery source.
