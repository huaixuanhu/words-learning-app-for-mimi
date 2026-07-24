# Words Learning App For Mimi V2.1：Production Duplicate Repair Release

Source plan:

- `plan_docs/PLAN_V2_1_DUPLICATE_IMPORT_DEDUPLICATION.md`

Derived from:

- `plan_docs/PLAN_V2_1_DUPLICATE_IMPORT_DEDUPLICATION.md`
- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- `plan_docs/PLAN_V2_STAGE8_3_GATE3_ENCRYPTED_LOGICAL_BACKUP_RESTORE_REHEARSAL.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`

Scope:

- Record the user-accepted V2.1 Preview result and the exact Production release sequence.
- Add guarded Schema 6 inventory, encrypted backup/restore and `0006` migration tooling.
- Rehearse `0006` on long-lived non-Production `staging`, then remove only the fixed V2.1 synthetic test person.
- Create and restore-verify an encrypted Production backup before any Production mutation.
- Fast-forward `main` to the accepted V2.1 application candidate and verify the exact Vercel Production deployment.
- Present exact selected-person destructive counts before any real Production duplicate cleanup.
- After separate count acceptance, verify zero duplicates, apply `0006`, create a post-change backup and close release documentation.

Non-Scope:

- No semantic merging, stemming or cross-person deduplication.
- No synthetic vocabulary or provider request in Production.
- No AI/TTS credential, quota, model, voice or billing change.
- No Basic Auth, SSO, domain, Firewall or per-person authorization change.
- No automatic loss-accepting rollback after Production cleanup or `0006`.
- No deletion of historical creation facts or retained empty import-batch audit rows.

Exit criteria:

- The exact Preview test person retains 3 items, one visible batch and no duplicate action after cleanup.
- Staging applies the pinned `0006` only after zero duplicate groups, verifies the unique index and removes only the fixed synthetic person.
- The Production pre-change `age` archive is stored outside the repository and restores into isolated PostgreSQL 17 with matching Schema/count/invariant/table-digest evidence.
- The Production application runs the exact accepted `main` commit in `syd1` and passes Basic Auth, storage readiness and error-log checks.
- Real cleanup does not run until the user accepts exact duplicate group/item/history/AI counts.
- Production has zero `(person_id, normalized_text)` duplicates before the pinned `0006` runs.
- The unique index is present, the prior non-unique index is absent, and normal application reads remain healthy.
- A post-change encrypted backup/restore check and release/governance records are complete.

Status: Complete on 2026-07-24. Preview human acceptance, guarded Staging rehearsal/fixture cleanup, pre-change Production backup/restore, exact application deployment, separately confirmed real cleanup, zero-duplicate verification, pinned `0006`, browser/runtime checks and post-change backup/restore all passed.

## Fixed release sequence

1. Add and validate local Schema 6 target, backup, inventory and migration guards.
2. Inspect Staging, apply `0006`, inspect again and delete only person `00000000-0000-4000-8000-000000021001` when its display label still equals `V2.1 Duplicate Test`.
3. Commit and push the exact V2.1 release tooling/evidence update to branch `v2.1`.
4. Create the pre-change encrypted Production backup and verify an isolated local restore.
5. Fast-forward local `main` to `v2.1`, push `main`, then verify the Vercel Production deployment and runtime.
6. Read exact Production duplicate counts. Stop before cleanup and obtain the user's separate destructive-count acceptance.
7. After acceptance, complete selected-person cleanup, verify zero duplicates, apply `0006`, verify the application and scan logs.
8. Create and restore-verify the post-change encrypted Production backup, then update canonical documentation and governance records.

## Recovery boundary

- Before Production cleanup, application deployment can return to deployment `dpl_E1Z4QTRKVMbNAxYWiDnx73FDBtWC` because the database shape is unchanged.
- After cleanup or `0006`, an application-only rollback is not accepted. Default recovery is forward repair with the new encrypted backups. Restoring an older database would require a new incident-specific reconciliation or explicit data-loss decision.
- The migration itself contains no cleanup statement and fails closed when duplicate identities remain.

## Credential handling

- The project-scoped Neon API key stays in macOS Keychain service `mimi-v2-8-3-neon-api-key`.
- The private `age` identity stays in Keychain service `mimi-vocabulary-backup-age-identity-v1`.
- The official Neon `GET /projects/{project_id}/connection_uri` response is held only in process memory. Connection URI, password, API key and private identity are never printed, documented or committed.
- Project identity remains source-pinned only by the existing SHA-256. Runtime discovery must match the pinned project, exact `main`/`staging` topology, one ready read-write endpoint, `aws-ap-southeast-2`, database `neondb` and role `neondb_owner`.

## Execution evidence — pre-Production mutation

- Preview post-cleanup Library shows 3 items, one visible batch, no `Remove duplicates` action and no browser console error.
- The user-approved Staging `0006` rehearsal started from 2 people / 11 vocabulary items / 4 import batches / 9 review states / 16 review events and zero duplicate groups.
- Pinned migration SHA-256 `fefb5cd66916ac6303a83e250e5c9913fd82602113673c6fe5a9e11830624fe8` applied successfully. The unique index is present and unique; the prior non-unique index is absent.
- The fixed synthetic person cleanup removed exactly 1 person, 3 vocabulary items, 3 import batches, 1 review state, 2 review events, 1 settings row, 2 daily defaults, 2 daily plans and its 6 retained creation facts. All checked person-scoped tables are zero afterward.
- Staging final state is 1 retained Preview person, 8 vocabulary items, 1 import batch, 8 review states, 14 review events, zero duplicates and zero submitted/in-flight AI/TTS work.
- Production read-only inventory reports Schema 6, 22 tables, 1 person, 1,486 vocabulary items, 38 import batches, 125 review states, 203 review events and the unchanged 1,854-row parity digest `c269c3133008cc5ae9c30f54f49c88cd792566397ff3aefca5e5fba551f2e794`.
- Production currently contains 75 duplicate normalized identities, 1,279 items inside those groups and 1,204 removable copies, all within one person. The unique index is absent and the historical non-unique index remains.
- All Production orphan/profile/creation/default/provider invariants are zero. This paragraph records the final pre-mutation Approval Stop; the completed execution is recorded below.

## Execution evidence — Production closeout

- Pre-change encrypted archive `mimi-production-schema6-v2-1-20260724T095446Z-c3901cbf5e51.dump.age` is 222,110 bytes with SHA-256 `f173db546d1ba491b1ca13c9e5693a67c9aef33909e272d1f4a639dfa231d534`; evidence SHA-256 is `c94da4b2b31afde855d9f81c3b77dcf0f35268c689cfaaaa60df8daac645975b`. Isolated PostgreSQL 17 restore, 22 table digests, counts, schema and invariants match.
- Exact application commit `c3901cbf5e51f6b4e28700b3c0507cf31fe6c76d` reached Ready Production deployment `dpl_HFofXrqvEQpEHWfcBGDGZ5jZykBC` in `syd1`. Canonical aliases, anonymous Basic Auth `401` checks, authenticated Library load, build logs and initial error/HTTP 500 scans passed.
- The user separately accepted the exact destructive counts: 75 duplicate groups, 1,204 duplicate vocabulary copies, 0 review states, 0 review events, 1 AI draft and 0 vocabulary relations deleted; 2 AI-run source references detached; 38 import-batch audit rows retained.
- Immediate read-only inventory after cleanup reports 282 vocabulary items, zero duplicate groups/removable items, 38 import batches, 125 review states, 203 review events, 1,486 creation facts, 2 AI runs, zero AI drafts and every checked invariant at zero.
- Pinned `0006` SHA-256 `fefb5cd66916ac6303a83e250e5c9913fd82602113673c6fe5a9e11830624fe8` ran only after the zero-duplicate check. The unique index is present/unique, the old non-unique index is absent and the post-migration parity digest is `bf07d65b7345a2189deaa52634961eb014eefc8e0952013fcf82e39ae0d986f4`.
- Authenticated Production Library shows `282 shown / 282 total`, four retained non-empty batch cards and no `Remove duplicates` action. Browser console logs are empty; the deployment's subsequent error and HTTP 500 scans are also empty.
- Post-change encrypted archive `mimi-production-schema6-v2-1-20260724T101648Z-c3901cbf5e51.dump.age` is 180,803 bytes with SHA-256 `ac94d574778a72e848d28f02c215cc6ce03fe8b395a94c584edf935d5c7ead93`; evidence SHA-256 is `66a84e60c746b6b8a8abb1008f39fd4a446c78b7af154e03202b68c7feb492f2`. File permission is `0600`; isolated restore verified the 282-item/zero-duplicate state and no temporary restore directory remains.
- No AI/TTS provider call, Basic Auth change, credential rotation, billing change, semantic merge or cross-person cleanup occurred.
