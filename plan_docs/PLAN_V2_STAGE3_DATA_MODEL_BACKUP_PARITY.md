# Words Learning App For Mimi V2 Stage 3: Data Model And Backup Parity

Created: 2026-07-13 23:41 AEST
Last updated: 2026-07-14 02:03 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md`
- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`
- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md`
- `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`
- `ARCHITECTURE.md`

Scope:

- Finalize Schema Version 6（数据结构第 6 版）as the first persisted V2 shape.
- Add a forward-only local SQL migration after `0002_schema5_production_runtime.sql`.
- Connect Review Profile（复习配置）, daily defaults/plans, creation/reversal facts, Active evidence fields, accepted AI lineage, and vocabulary relations across local data, Postgres snapshots, API snapshots, JSON backup/restore, Postgres backup-import planning, fixtures, and tests.
- Add operational quota and idempotency table contracts while keeping those records out of user backup/restore.
- Preserve current V1 Recognition behavior while later V2 stages add the new study routes and Active scheduler.

Non-Scope:

- No remote database connection, Development / Staging / Production migration, data inspection, import, restore, or write.
- No Vercel environment change, credential access, Gemini call, paid usage, WAF change, deployment, GitHub push, pull request, or merge.
- No new Dashboard, mobile UI, Study/Review zones, Active scheduler, Active page, AI route, AI preview UI, or visualization.
- No Recognition/Active parameter calibration. V2-6 must supply an independently calibrated Active parameter set before the first Active review row can be written.
- No SSO（Single Sign-On，单点登录）or confidential multi-user isolation.

Exit criteria:

- Schema Version 6 is the single current local/application snapshot version and versions 1–5 still migrate forward.
- Existing Postgres review rows have an explicit Recognition profile and Recognition parameter-set id without creating Active history.
- Legacy state first-rating history is preserved honestly: use the earliest retained event when available; otherwise use `legacy_unknown` with a null timestamp.
- New item creation and `Batch imported` rollback facts are transactionally represented; ordinary hard delete keeps the non-lexical creation tombstone.
- Daily defaults/plans, profile-aware review rows, accepted AI data, and vocabulary relations round-trip through JSON backup and the Postgres import plan.
- AI quota buckets, unaccepted/temporary drafts, unreferenced AI audit rows, Cache, and study/AI idempotency records are excluded from user backup/restore.
- Vocabulary CSV remains vocabulary-focused and accepts the new `ai_generated` source without exporting operational or review history.
- Local/static migration, repository, backup, API snapshot, and compatibility tests pass; no remote target is touched.

Status: local implementation complete on 2026-07-14. The user authorized this stage after committing Stage 2-B. Schema Version 6, backup version 3, repository parity, migration draft, fixtures, and local compatibility coverage are implemented. Remote migration, database rehearsal, Vercel change, and deployment remain separately gated.

## Local Implementation Outcome

- Local snapshots now normalize schema versions 1–5 into Schema Version 6.
- Existing review history migrates to an explicit Recognition profile. The earliest retained event supplies `firstRatedAt`; missing evidence remains `legacy_unknown` with a null time.
- New single-entry and batch additions append creation facts in the same repository operation. Hard delete keeps the non-lexical fact, and a valid full `Batch imported` rollback appends one reversal.
- Daily defaults/plans, profile-aware review evidence, accepted AI lineage/drafts, and accepted vocabulary relations are represented in local and Postgres repository snapshots.
- JSON backup version 3 round-trips the formal learning subset and continues reading older backup/schema versions. Operational quota, Cache, and idempotency records remain outside user backups.
- `test_fixtures/v2-stage3-schema6-backup.json` provides a deterministic schema 6 import/restore fixture with both Review Profiles and accepted AI lineage.
- `db/migrations/0003_v2_schema6_data_model.sql` is a forward-only local draft. It has not been applied to Development, Staging, Preview, or Production.

## Stage 3.1 Child Amendment

`plan_docs/PLAN_V2_STAGE3_1_REVIEW_INTERACTION_CONTEXT_WORD_ACTIONS.md` later amended the still-unexecuted `0003` draft without changing this stage's formal Schema Version 6 snapshot or backup version:

- `ai_runs.feature` also accepts the reserved `context_explain_v1` feature;
- temporary `ai_context_explanation_cache` rows bind one person/source item, one exact example/token span, one matching succeeded/valid context run, one bounded exact-shape result, and a required expiry;
- enrichment drafts and vocabulary relations explicitly reject context-run lineage and require a matching succeeded/valid `enrichment_v1` source run;
- the temporary Cache and unreferenced context run remain operational and excluded from `VocabularyData`, JSON backup/restore, CSV, and backup-import mappings.

The amendment passed local/static tests only. It did not execute the migration or contact a remote database.

## Decision Summary

### Version choice

Schema Version 6 is required because the current version 5 shape cannot represent profile-isolated review history, immutable daily plans, Active evidence, or accepted AI provenance. Reusing version 5 would make backups and API snapshots ambiguous. Existing `0001` and `0002` remain immutable; the new draft is `db/migrations/0003_v2_schema6_data_model.sql`.

The JSON backup wrapper advances from backup version 2 to backup version 3. Readers continue accepting older wrappers and data schema versions, then normalize them to Schema Version 6 before replacement or import.

### Compatibility stance

- `settingsByPerson` remains during V2 transition so the current V1 settings/UI path continues to compile and behave predictably.
- `dailyStudyDefaults` is added as the future authoritative goal source. Migration seeds Recognition `reviewGoal` from `recognitionSessionLimit`, Active `reviewGoal` from `activeSessionLimit`, and both `newWordGoal` values at `0`.
- The current V1 Recognition repository continues writing Recognition rows, now with the new explicit evidence fields.
- Active storage becomes representable in this stage. Active scheduling and writes remain disabled until V2-6 supplies independent parameters and behavior.
- The existing `/api/storage/data` snapshot becomes Schema Version 6 after the migration is eventually applied. New `/api/study/*` and `/api/ai/*` routes remain later-stage work.

## Schema Version 6 Formal Learning Data

The application snapshot and user JSON backup contain the following formal domains:

```text
people
items
importBatches
settingsByPerson                         transitional V1 settings
dailyStudyDefaults                      per person + Review Profile
dailyStudyPlans                         immutable day window, mutable versioned goals
vocabularyCreationFacts                 non-lexical addition ledger
vocabularyCreationReversals             whole-batch true undo ledger
reviewStates                            profile + parameter + first-rating origin
reviewEvents                            profile + activity + answer evidence
aiRuns                                  only lineage referenced by accepted AI data in backups
aiEnrichmentDrafts                      application snapshot may hold lifecycle; backup keeps accepted only
vocabularyRelations                     accepted source/target learning relations
```

### Daily defaults

```text
personId
reviewProfile = recognition | active
reviewGoal = 0..2,147,483,647
newWordGoal = 0..2,147,483,647
timezone
updatedAt
```

Unique key: `(personId, reviewProfile)`.

### Daily plans

```text
id
personId
reviewProfile
localDate
timezone
dayStartsAt
dayEndsAt
suggestedReview
reviewGoal
newWordGoal
planVersion
recommendationVersion
calculatedAt
updatedAt
```

Unique key: `(personId, reviewProfile, localDate)`. The window and frozen recommendation fields are immutable after creation. A later goal edit checks the expected version and increments `planVersion`.

### Creation and reversal facts

Creation facts use the accepted Stage 1 stable key `(personId, sourceActionId, originalVocabularyItemId)`. They retain only ids, Track at creation, source kind, creation time, and an origin marker:

- `recorded`: written atomically with a V2 successful creation;
- `legacy_backfill`: derived from an existing row during migration because V1 did not keep an event ledger.

For a legacy row, `trackAtCreation` uses the row's current persisted `learningTrack`, the only recoverable evidence. The origin marker prevents that value from being presented as independently observed historical truth. A legacy import uses its `importBatchId` as `sourceActionId`; another legacy row uses its item id.

Reversals remain unique on `(personId, sourceActionId, reason)`, with `reason = batch_rollback`. Ordinary hard delete leaves creation facts in place. Full batch rollback appends the reversal before deleting live batch items/history.

### Review state migration

Every version 5 `review_states` row becomes:

```text
reviewProfile = recognition
parameterSetId = recognition-fsrs-v1
firstRatedAt = earliest retained event for the same person/item, otherwise null
historyOrigin = recorded when firstRatedAt exists, otherwise legacy_unknown
```

The unique key becomes `(personId, vocabularyItemId, reviewProfile)`. Existing Active vocabulary does not receive a state.

### Review event migration

Every version 5 `review_events` row becomes:

```text
promptId = null                         allowed only for migrated V1 history
reviewProfile = recognition
activityType = recognition_card
answerOutcome = self_rated
answerNormalizationVersion = null
targetRevision = null
parameterSetId = recognition-fsrs-v1
```

New Recognition events use the same evidence values and a non-empty trusted `promptId` once V2-5 connects prompt tokens. Active events require `say | spell | dictation`, `active-fsrs-v1` or a later independently versioned Active id, and the Stage 1 target/evidence constraints. The database migration removes the V1 Recognition-only triggers and replaces them with profile/activity/evidence constraints that permit retained history after an explicit Track transition.

## AI Data Classification

### Minimal run lineage

`ai_runs` stores no credential, raw Prompt, raw provider body, private note, full study history, Authorization header, or raw network identity. It records only bounded lineage/accounting fields:

```text
id, personId, sourceVocabularyItemId nullable after hard delete
feature, provider, model, modelLabel
promptVersion, sourceHash, outputSchemaVersion, disclosureVersion
idempotencyKeyHash, cacheKeyHash
status, structureValidationStatus
providerResponseId nullable
inputTokens, outputTokens, thinkingTokens, totalTokens
latencyMs, estimatedCostUsd, createdAt, completedAt nullable
```

The application database may retain a minimal audit row according to the later V2-7 retention rule. A user backup includes only a succeeded run referenced by accepted enrichment or a vocabulary relation. Unreferenced, failed, and rejected run rows are operational evidence and are not restored.

### Draft lifecycle

`ai_enrichment_drafts` stores one strict structured draft and an optional user-edited accepted payload. Lifecycle is `draft | accepted | rejected`.

- `draft` and `rejected` are temporary application data and are excluded from user backup.
- `accepted` stores the final accepted structured payload, acceptance time, source item, and run lineage; it is formal learning data and is backed up.
- Raw provider bodies remain absent.
- Hard deletion of the source vocabulary item removes its drafts. A restore does not recreate deleted temporary drafts.

### Vocabulary relations

Accepted `Add to learning` relations store:

```text
id, personId
sourceVocabularyItemId, targetVocabularyItemId
relationType = similar | spelling | sound | usage
differenceZh, examplePair
aiRunId, createdAt
```

Both item references are person-scoped. Deleting either live entry removes the relation. Backup/restore remaps both item ids and the accepted AI run id. The created target vocabulary item uses `source = ai_generated` and receives its own creation fact with `sourceKind = ai_add_to_learning`.

## Operational Data Excluded From User Backup

The SQL migration reserves these server-owned domains:

- `ai_usage_buckets`: atomic global-day, global-month, person-day, and concurrency reservations;
- `study_command_idempotency`: seven-day study/reset replay protection from Stage 1;
- AI idempotency/Cache identity in the minimal run ledger;
- future Cache payloads and WAF/provider-side counters.

These records are not learner-authored content and restoring them could replay stale commands or incorrectly consume/release quota. They are therefore excluded from `VocabularyData`, `/api/storage/data`, JSON backup, and backup import mappings. V2-7 must implement reservation/reconciliation transactions before activating a provider route; this stage supplies only the constrained storage contract and static tests.

## Mutation And Deletion Rules

| Action | Creation facts | Review state/events | AI draft/relations | Operational quota/idempotency |
| --- | --- | --- | --- | --- |
| Archive / restore | preserved | preserved | preserved | unchanged |
| Ordinary hard delete | preserved as non-lexical tombstone | removed for that item | item-scoped records removed | submitted usage remains |
| Full `Batch imported` rollback | preserved plus one reversal fact | removed with batch items | item-scoped records removed | submitted usage remains |
| Whole-day reset | preserved | matching day events removed; states rebuilt per profile | accepted AI data preserved | reset idempotency retained until expiry |
| JSON restore/import | restored/remapped | restored/remapped | accepted formal subset restored/remapped | never restored |

## Local And Postgres Parity

### Local fallback

- `migrateVocabularyData()` accepts versions 1–6 and emits version 6.
- Existing rows receive explicit Recognition evidence and deterministic legacy creation facts.
- New single additions/imports write creation facts in the returned immutable snapshot.
- Batch rollback writes a reversal and removes item-scoped formal data.
- Current V1 review functions continue Recognition-only behavior with version 6 fields.

### Postgres

- `0003_v2_schema6_data_model.sql` is transaction-wrapped, credential-free, and forward-only.
- Existing review rows are updated before new non-null constraints are applied.
- Existing item rows receive legacy creation facts with original `system_created_at`, never migration execution time.
- Existing review settings seed two daily-default rows per person.
- Snapshot queries and row mappers include all formal Schema Version 6 domains.
- New item/import writes insert creation facts in the same database transaction.
- New-person creation inserts both daily defaults in the same transaction.
- No SQL is executed remotely in this stage.

### API snapshot

`GET /api/storage/data` remains the transitional whole-workspace endpoint and returns the Schema Version 6 formal snapshot after database migration. The mutation parser stays limited to current operations. Later strict `/api/study/*` and `/api/ai/*` endpoints cannot accept client-owned timestamps, parameter ids, remaining counts, raw Prompt text, provider/model choice, or quota values.

## Backup And Restore Contract

- Backup version 3 exports Schema Version 6.
- Older backup wrapper/data versions remain readable and migrate forward without inventing Active history.
- Metadata counts cover every formal top-level collection so truncated files are detected.
- Referential checks cover person ownership, item/profile pairing, plan/default uniqueness, creation/reversal actions, AI run/draft lineage, and both ends of vocabulary relations.
- Active state/event rows are valid only under the new profile/evidence constraints. Schema 4/5 backups continue rejecting impossible Active review rows.
- Restore/import remaps every formal id. Non-lexical creation tombstones whose item no longer exists remain valid and are remapped independently.
- Vocabulary CSV remains one row per vocabulary entry. It does not flatten daily plans, review history, AI drafts, relations, quota, or idempotency records.

## Implemented Files

Primary additions/changes:

- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`
- `db/migrations/0003_v2_schema6_data_model.sql`
- `src/lib/vocabulary/types.ts`
- `src/lib/vocabulary/repository.ts`
- `src/lib/vocabulary/local-storage-repository.ts`
- `src/lib/review/types.ts`
- `src/lib/review/repository.ts`
- `src/lib/review/settings.ts`
- `src/lib/storage/v2-data-model.ts`
- `src/lib/storage/durable-repository-contract.ts`
- `src/lib/storage/postgres/mappers.ts`
- `src/lib/storage/postgres/repository.ts`
- `src/lib/backup/types.ts`
- `src/lib/backup/json-backup.ts`
- `scripts/backup-import-plan.mjs`
- `scripts/backup-import-postgres.mjs`
- `test_fixtures/v2-stage3-schema6-backup.json`
- focused migration, repository, backup, mapper, API snapshot, fixture, and compatibility tests
- `package.json`, `db/LOCAL_BACKUP_TO_POSTGRES.md`, `README.md`, `ARCHITECTURE.md`, `AGENTS.md`, `CHANGELOG.md`, `governance/preflight.py`, and `governance/AI_AGENT_LOG.md`

Existing migration files and historical evidence remain unchanged.

## Validation Plan

Local/static checks:

```bash
git diff --check
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
```

Focused assertions include:

- version 1–5 local data migrates to version 6;
- old review rows become Recognition only and no Active history is fabricated;
- earliest retained event versus `legacy_unknown` first-rating behavior;
- phrase/fixed-collocation creation still counts as one entry;
- single/import creation fact atomicity and hard-delete preservation;
- full batch rollback reversal uniqueness;
- independent profile state/event uniqueness and Active evidence combinations;
- free goals including `0` and large signed-integer values;
- backup version 3 round trip and older-backup forward compatibility;
- accepted AI lineage/relation inclusion and temporary/operational exclusion;
- schema 6 backup-import id remapping and dry-run counts;
- CSV vocabulary-only behavior with `ai_generated` source;
- SQL contains the required tables/constraints/backfill and no secret or remote-execution assumption;
- `/api/storage/data` route tests continue to enforce runtime and Basic Auth boundaries.

Validation completed on 2026-07-14:

- `npm run lint`: passed;
- `npm run typecheck`: passed;
- `npm run test`: 25 test files passed, 1 Postgres integration file intentionally skipped; 182 tests passed, 1 intentionally skipped;
- all schema 3, schema 5, and schema 6 backup dry-runs passed;
- the schema 6 fixture planned 1 person, 2 vocabulary items, 2 profile-specific states, 2 events, 2 daily plans, 3 creation facts, 1 reversal, 1 accepted AI run/draft/relation chain, and 19 import mappings;
- `npm run build`: passed without a database connection or provider call.

## Deferred Live Rehearsal

The V2 master allows only approved Development / Staging rehearsals. No such remote execution is implied by starting this local stage. After the local/static stage passes, a separate human-approved child stage must:

1. verify the exact `staging` target without printing credentials;
2. create/verify the required non-production backup or disposable branch state;
3. apply `0003` only to the approved non-production target;
4. inspect constraints/backfill and run fixture import inside a rollback-safe boundary;
5. confirm zero Production crossover;
6. document rollback/rebuild behavior before any Production proposal.

## Stop Conditions

Stop and request a new decision if:

- an existing current file contradicts the frozen Stage 1/2 contract;
- a migration would infer Active history or copy Recognition parameter values into Active;
- a legacy first-rating timestamp cannot be represented without fabrication;
- creation facts would cascade-delete with vocabulary rows;
- temporary/operational AI records cannot be separated from accepted formal data;
- backup/restore cannot represent every destructive-data consequence;
- a command would read credentials, connect to a remote database, call a provider, mutate Production, deploy, or charge money;
- local validation fails and the failure cannot be resolved inside this agreed data-model scope.
