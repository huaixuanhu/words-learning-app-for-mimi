# Words Learning App For Mimi V2.1：Duplicate Import Repair And One-Click Deduplication

Source plan: `plan_docs/PLAN_V2_MASTER.md`

Derived from:

- `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`
- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- 2026-07-24 user report that the vocabulary Library and `Batch imported` history contain repeated entries

Scope:

- Diagnose the existing single-entry and batch-import duplicate paths without reading credentials or mutating Production.
- Prevent new duplicates across manual add, edit, batch import and concurrent/repeated import submission.
- Add a selected-person, confirmation-gated one-click duplicate cleanup in Library.
- Use the current person-scoped normalized identity to keep one vocabulary item and hard-delete the other copies.
- Keep browser-local and Postgres behavior aligned.
- Add a forward-only uniqueness migration that can run only after duplicate cleanup and zero-duplicate verification.
- Keep the current Schema Version 6 and JSON backup Version 4 shapes unless implementation evidence proves that a shape change is required.

Non-Scope:

- No Production data read, write, cleanup, migration or deployment in this local implementation stage.
- No `.env`, credential, database URL, Basic Auth value, Vercel environment variable or private backup access.
- No GitHub push, pull request or merge.
- No AI provider call, TTS provider call, billing change or external service configuration.
- No stemming, lemmatization or semantic merging. `word`, `words` and `wording` remain distinct.
- No cross-person deduplication. `person_id` remains the data-separation boundary.
- No automatic merging of two independent FSRS histories into one synthetic history.
- No deletion of historical creation facts merely to rewrite past `Added today` results.
- No removal of retained import-batch audit rows from the database solely because their remaining Library count becomes zero.

Exit criteria:

- Preview remains write-free and tests prove that only explicit save can start an import mutation.
- Duplicate candidates cannot be selected or committed as new items.
- Repeated, concurrent or stale import submissions cannot create a second item with the same selected-person normalized identity.
- Manual add and surface-text edit obey the same identity rule.
- Library shows the exact duplicate group and affected-record counts before cleanup.
- Confirmed cleanup leaves exactly one item per `(personId, normalizedText)` group for the selected person.
- The deterministic keeper rule and hard-delete propagation are identical in local and Postgres repositories.
- Empty `Batch imported` rows stop cluttering the normal Library history view while retained database audit facts remain intact.
- The uniqueness migration fails closed while duplicates exist and succeeds only after zero-duplicate verification.
- Focused tests, full tests, lint, typecheck, backup dry-runs, build, governance preflight and diff checks pass.

Status: Accepted and implemented locally on 2026-07-24. The user explicitly approved this plan after the Approval Stop. Preview human acceptance and its post-cleanup read-only check passed. The separately derived Production release gate is `plan_docs/PLAN_V2_1_PRODUCTION_DUPLICATE_REPAIR_RELEASE.md`; its approval does not rewrite this plan's historical local-only boundary.

## Read-Only Audit Result

### 1. The Preview button has not been a write path

Current code and the Git history back to the first import implementation separate the actions:

- `Preview words` calls the local parser and updates React state.
- `Save selected` calls `commitImportCandidates()` and sends the storage mutation.

The audited historical implementations at `f16d9e1c`, `9e441649`, `b707b66d` and `a31c80af` preserve the same separation. Current evidence therefore does not support the hypothesis that each Preview click directly created a batch.

This conclusion is limited to repository history. The exact sequence that produced current Production rows remains unknown until a separately approved read-only inventory or user-exported backup is inspected.

### 2. Confirmed duplicate-creation gaps

The current implementation has several paths that can explain repeated items and batches:

1. `commitImportCandidates()` accepts every checked candidate whose status is not `invalid`; a checked `duplicate` candidate is accepted.
2. The Preview UI disables only invalid checkboxes. A duplicate row can be manually selected.
3. Postgres trusts client-supplied candidate status and does not recompute duplicate identity against current database state inside the write transaction.
4. `Save selected` has no pending-state lock. A fast double click can queue the same stale Preview twice.
5. A stale Preview in another tab can remain `new` after an earlier import succeeds.
6. The database has a non-unique `(person_id, normalized_text)` index, so it cannot stop a race or stale client by itself.
7. The local and Postgres repository test currently demonstrates that a selected duplicate candidate is inserted; this is existing behavior, not the desired V2.1 contract.

The exact relative contribution of these paths to current Production duplicates is not yet proven.

## Proposed Duplicate Identity

One duplicate group uses:

```text
personId + normalizeSurfaceText(surfaceText)
```

The existing normalization performs Unicode NFKC normalization, whitespace collapse, edge-punctuation removal and English lowercase conversion.

Consequences:

- `Allocate`, ` allocate ` and `ALLOCATE` are duplicates for the same person.
- Active, Recognition and archived copies remain duplicates when their normalized text matches.
- The same normalized text owned by another person is not a duplicate.
- Inflected forms and semantically related words are not deduplicated.
- A word with different meanings still belongs to one duplicate group because V2 already supports multiple meanings and examples on one item.

## Proposed Keeper And Deletion Rule

The cleanup is destructive and uses one deterministic rule. Within each selected-person duplicate group, retain the first item after sorting by:

1. highest retained review-event count;
2. presence of a review state;
3. active item before archived item;
4. richer saved learning content;
5. earliest `systemCreatedAt`;
6. stable item id as the final tie-breaker.

Every other item in the group is removed through the existing ordinary hard-delete propagation:

- remove its review states and review events;
- remove its item-scoped AI drafts and vocabulary relations;
- set surviving AI run source references to `null` where the existing Postgres foreign-key behavior requires it;
- keep historical vocabulary creation facts;
- keep unrelated items, settings, daily plans, other people and provider accounting unchanged.

The confirmation dialog must show:

- number of duplicate groups;
- number of vocabulary items to remove;
- number of review states and review events to remove;
- number of affected import batches;
- whether any group has study history on more than one copy.

If the user cancels, the mutation writes nothing. The server recomputes the plan inside the transaction and rejects a stale confirmation whose counts or keeper ids no longer match.

This rule follows the user's requested direct deletion. It deliberately avoids fabricating a merged FSRS timeline from previously independent copies. Human agreement is required because review history on discarded copies will be lost.

## Batch History Rule

`import_batches` is historical action metadata. It does not contain a content hash, so matching file name, timestamp proximity and row counts are insufficient evidence that two batch rows are semantically identical.

V2.1 will therefore:

- prevent new empty or duplicate-only batch commits;
- keep existing batch audit rows in storage and backups;
- show normal `Batch imported` history only when a batch still owns at least one Library item;
- keep `acceptedRows originally saved` as historical information for visible batches;
- avoid labelling two old batch rows as identical without item-level evidence.

After duplicate items are removed, a repeated batch that owns no retained item disappears from the normal Library history view. Its retained creation facts continue to preserve the accepted historical `Added today` contract.

## Prevention Design

### Client

- Duplicate and invalid Preview rows cannot be checked.
- `acceptedIds` is reconciled whenever an edited row changes duplicate/valid status.
- `Save selected` enters a visible pending state immediately and cannot be submitted again until completion.
- A successful save clears the Preview; a stale/duplicate-only response explains that no new item was written.

### Local repository

- Manual add rejects an existing selected-person normalized identity.
- Surface-text edit rejects collision with another selected-person item.
- Import recomputes candidate status against the latest local snapshot.
- Import commits only candidates whose recomputed status is `new`.
- Zero-new-item import creates no batch.
- The one-click cleanup uses the same detector and keeper rule as Postgres.

### Postgres repository

- Manual add, edit and import re-check current database state inside their transaction.
- Import status from the browser is treated only as display input, never as write authority.
- Per-person normalized identities use deterministic transaction locking until the unique index is active.
- Zero-new-item import creates no batch.
- The cleanup locks the selected person's duplicate rows, recomputes the cleanup plan, verifies the client confirmation fingerprint and applies all deletions atomically.

### Database constraint

Add a forward-only `0006` migration containing a unique index on:

```sql
(person_id, normalized_text)
```

The migration must not auto-delete rows. It first checks for duplicate groups and raises an explicit error when any remain. Production application of `0006` is a later approval-gated operation after:

1. an independent encrypted pre-change backup;
2. read-only duplicate/count evidence;
3. the user-triggered cleanup;
4. read-only zero-duplicate verification;
5. non-Production migration rehearsal.

## Implementation Slices

### Slice A — Pure detector and local contract

- Add duplicate-group, cleanup-plan and confirmation-fingerprint types.
- Add deterministic keeper selection and affected-record counts.
- Add focused boundary tests for people, Track, archive, content, history and tie-breaking.

### Slice B — Import prevention

- Reconcile Preview selection state.
- Block duplicate checkbox selection.
- Add save pending state.
- Revalidate add/edit/import writes in local and Postgres repositories.
- Prevent zero-new-item batch creation.
- Add concurrent/repeated/stale submission tests.

### Slice C — One-click cleanup

- Add a Library action visible only when the selected person has duplicate groups.
- Add the destructive confirmation summary.
- Add one storage mutation for local and Postgres parity.
- Reject stale cleanup plans and cross-person input.
- Hide zero-remaining-item batches from the normal Library history panel.

### Slice D — Forward-only uniqueness migration

- Add `0006` with a precondition check and unique index.
- Update migration-order/static-schema tests.
- Do not execute it remotely in this branch stage.

### Slice E — Documentation and validation

- Update `ARCHITECTURE.md`, `README.md`, `CHANGELOG.md`, `governance/AI_AGENT_LOG.md` and the active validation snapshot.
- Run the complete local gate.

## Expected Files

Likely code and test changes:

- `src/lib/vocabulary/types.ts`
- `src/lib/vocabulary/repository.ts`
- `src/lib/vocabulary/repository.test.ts`
- a focused duplicate-repair module and tests under `src/lib/vocabulary/`
- `src/lib/storage/durable-repository-contract.ts`
- `src/lib/storage/postgres/repository.ts`
- Postgres parity/integration tests
- `src/components/vocabulary/use-vocabulary-data.ts`
- `src/components/vocabulary/import-workspace.tsx`
- `src/components/vocabulary/vocabulary-library.tsx`
- focused UI contract tests
- `src/app/api/storage/data/route.ts`
- route mutation tests
- `db/migrations/0006_v2_1_vocabulary_unique_normalized_text.sql`
- schema/migration-order tests

Required documentation:

- this child plan
- `ARCHITECTURE.md`
- `README.md`
- `CHANGELOG.md`
- `governance/AI_AGENT_LOG.md`
- `AGENTS.md` only if the current project context or validation snapshot materially changes

## Local Validation

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
git diff --check
```

Focused acceptance must cover:

- Preview is write-free.
- Existing and same-batch duplicates cannot be accepted.
- Manual add and edit collisions fail.
- same-person concurrent/stale import cannot produce duplicates.
- different people may retain the same normalized text.
- active/archived and Recognition/Active copies group correctly.
- keeper selection is deterministic.
- cleanup affects only the selected person.
- cleanup shows and applies exact review/AI propagation counts.
- stale confirmation fails without a partial write.
- repeated cleanup is a no-op with no new batch or deletion.
- zero-remaining batches are hidden from the normal UI but remain backup-compatible.
- `0006` refuses dirty data and enforces uniqueness after clean data.

## Production Release Record

Local completion on `v2.1` did not authorize Production repair. The separately accepted Production proposal required:

1. Preview/Staging verification with synthetic duplicate data;
2. pre-change encrypted Production backup and restore evidence;
3. exact Production duplicate inventory without exposing learner text;
4. V2.1 deployment with the deduplication control;
5. the human-confirmed cleanup action and its counts;
6. read-only zero-duplicate verification;
7. `0006` Production migration and post-migration verification;
8. final encrypted backup and rollback record.

That proposal is the completed
`plan_docs/PLAN_V2_1_PRODUCTION_DUPLICATE_REPAIR_RELEASE.md`. Its Staging
rehearsal, pre/post encrypted backups, exact application deployment, separately
confirmed 1,204-copy cleanup, zero-duplicate verification and Production `0006`
evidence are recorded there. Production now retains 282 unique items, 125 review
states, 203 review events and all 38 import-batch audit rows.

## Local Implementation Record

- Added one pure detector/cleanup module shared by local and Postgres paths. It groups only the selected person and uses the accepted review-event/state, active/archive, content, time and stable-id keeper order.
- Manual add and edit now reject normalized collisions. Import status is recomputed from the current repository snapshot, only `new` candidates can commit, same-batch/stale/repeated candidates are rejected and a zero-new attempt writes no batch.
- Import Preview remains write-free. Duplicate/invalid rows cannot be selected and one in-flight save blocks repeated clicks.
- Added `vocabulary.deduplicate` across the client mutation, API route and durable Postgres repository. Confirmation includes the exact keeper/loser fingerprint and all affected counts; Postgres locks, rereads and rejects stale confirmation before deletion.
- Cleanup preserves creation facts and batch audit records, removes loser-linked review/AI data under existing foreign-key semantics and never invents a merged FSRS history.
- Normal Library history now hides batches with zero remaining items.
- Added forward-only migration `0006_v2_1_vocabulary_unique_normalized_text.sql`. It contains no cleanup statement and fails before unique-index creation when duplicates remain.
- Schema Version 6 and JSON backup Version 4 are unchanged.
- Full local validation passes 95 test files / 583 tests, with the existing Postgres integration file/test skipped; lint, typecheck, all three backup dry-runs and Production build pass. Governance and final diff checks are recorded at handoff.

## Approval Record

The user confirmed on 2026-07-24:

1. the duplicate identity is selected person plus normalized text;
2. the deterministic keeper rule is acceptable;
3. discarded copies may lose their own review history and item-scoped AI records;
4. empty historical batch rows remain stored but are hidden from the normal Library history;
5. this branch stage stays local and does not deploy or mutate Production.
