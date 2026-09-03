# Words Learning App For Mimi V2.2 Production Release

Created: 2026-09-03 AEST
Last updated: 2026-09-04 AEST

Source plan:

- `plan_docs/PLAN_V2_2_REVIEW_CADENCE_CARD_AUDIO.md`

Derived from:

- `plan_docs/PLAN_V2_2_REVIEW_CADENCE_CARD_AUDIO.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`

Scope:

- Freeze and validate one exact V2.2 release candidate.
- Resolve any newly reported release-blocking dependency advisory with the smallest compatible patch-level lockfile/override change and require zero current npm audit findings before remote activation.
- Add a digest-pinned, target-pinned runner for the constraint-only `0007_v2_2_fsrs_parameter_sets.sql` migration.
- Rehearse `0007` on the protected Neon `staging` branch and prove that study-data counts and table digests are unchanged.
- Create and isolated-restore-verify an encrypted Production backup before the Production migration.
- Apply the same pinned `0007` migration to the guarded Neon `main` branch before the V2.2 application is released.
- Push the exact candidate to GitHub branch `v2.2`, fast-forward `main` without force, and verify the Git-triggered Vercel Production deployment.
- Verify Basic Auth（基础认证）, core pages, storage readiness, the Cloud TTS route with at most one neutral synthetic `review` request, and post-release error logs.
- Create and isolated-restore-verify a post-release encrypted Production backup, then close the canonical release evidence.

Non-Scope:

- No rewrite of existing `due_at`, Review State（复习状态）, Review Event（复习事件）, vocabulary, import, person, AI, or TTS rows.
- No Production learner-data create, update, delete, cleanup, import, restore, or synthetic fixture.
- No Gemini request and no more than one authenticated Cloud TTS request using the neutral word `review`; a Cache（缓存）hit is acceptable and must not be bypassed.
- No provider, quota, billing, credential, `.env`, Basic Auth, domain, Firewall（防火墙）, Neon topology, or Vercel project-setting change.
- No force push, Git-history rewrite, pull request, tag, branch deletion, deployment deletion, or old-backup deletion.
- No major framework/runtime upgrade or unrelated dependency modernization.

Exit criteria:

- The exact `0007` file matches pinned SHA-256 `ad518068b59c41f8c71c8ea4e00d8e582cb4d5d2bb7f2a4400005b15f4a2efe4`.
- Staging and Production both retain Schema 6, the expected Sydney target identity, zero checked structural/orphan/in-flight invariants, and matching before/after study-data digests.
- Both `review_states_parameter_set_profile_valid` and `review_events_profile_evidence_consistent` accept only the matching V1/V2 Parameter Set（参数集）identifiers after migration.
- The pre-change and post-release encrypted archives remain outside Git, use permission `0600`, and each passes isolated PostgreSQL 17 restore equality.
- GitHub `v2.2`, GitHub `main`, the Vercel Production deployment and the verified local commit resolve to the same exact release commit at application activation.
- The canonical Production domain is protected by Basic Auth, authenticated core pages and storage health succeed, `/api/tts` returns valid audio for the bounded synthetic request, and the release error scan finds no V2.2 failure.
- Release documents distinguish committed, pushed, migrated, deployed and activated state and contain no credential, connection URI, learner content, raw provider body, or private backup identity.
- Full and Production-only npm audit reports contain zero current findings for the exact lockfile.

Status:

- `Stage 2.2.6 candidate validation complete; Staging execution pending` on 2026-09-04 AEST. The user explicitly confirmed the V2.2 change and asked Codex to continue through Production release. Full Vitest passes 98 files / 607 tests with the existing Postgres integration file/test skipped; ESLint, TypeScript, three backup dry-runs, Production build, governance and zero-finding full/Production npm audits pass on the prepared candidate.

## Stage 2.2.6 Candidate Freeze And Release Guards

1. Record this release plan before any remote mutation.
2. Add a V2.2-specific command contract that pins the migration digest, exact target, exact command flag, Staging verification evidence, pre-change backup evidence and exact clean Git commit.
3. Add read-only inventory and migration commands. Inventory reports only safe aggregate/schema evidence. Migration compares before/after counts and table digests and fails if any row-level digest changes.
4. Reuse the already validated Schema 6 encrypted backup/restore runner. Its historical V2.1 filename does not change the archive contents or Schema 6 equality contract; the V2.2 plan records each new evidence digest explicitly.
5. Run the full local release-candidate validation, review the diff, commit the candidate, and require a clean worktree before remote execution.
6. If the current audit database reports a release-blocking advisory, verify the official patched floor, apply only compatible dependency updates, and repeat every affected local gate.

Exit claim: one clean, validated, digest-pinned candidate exists, and no remote state has changed.

## Stage 2.2.7 Staging Rehearsal

1. Resolve the source-pinned Neon project, ready `staging` child branch, exact Sydney read-write endpoint, database and role through the guarded control-plane lookup.
2. If the exact retained `staging` branch is automatically archived for inactivity, access its existing endpoint to let Neon unarchive it, then require the same branch/parent/endpoint identity and `ready` state. Do not create, restore, rename or delete a branch.
3. Capture the read-only Schema 6, parameter-set constraint, aggregate count, invariant and table-digest inventory.
4. Apply pinned `0007` once. If the result is ambiguous, run read-only reconciliation before considering any retry.
5. Prove both constraints match the V2.2 contract and all before/after table digests match.
6. Push the exact clean candidate to GitHub `v2.2` only after Staging is compatible.

Exit claim: Staging accepts V1/V2 parameter identifiers without any study-data rewrite, and GitHub `v2.2` points to the rehearsed candidate.

## Stage 2.2.8 Production Recovery Point

1. Reconcile current Production inventory and require zero checked in-flight AI/TTS work.
2. Run the existing Schema 6 Production encrypted backup command from the exact clean candidate.
3. Keep the `age` archive outside the repository and verify it by decrypting and restoring into an isolated local PostgreSQL 17 instance.
4. Bind the Production migration command to the exact backup-evidence SHA-256 and candidate commit.

Exit claim: a current, restorable, external encrypted recovery point exists before `0007` changes Production constraints.

## Stage 2.2.9 Production Migration

1. Re-resolve the guarded Neon `main` target and re-run the read-only precondition inventory.
2. Require the exact Staging evidence, exact pre-change backup evidence, and exact candidate commit.
3. Apply pinned `0007` once. On timeout or uncertain completion, inspect constraints and digests before any further write.
4. Prove the expected constraint definitions and unchanged table counts/digests.

Exit claim: Production remains Schema 6 and data-identical while accepting the V2.2 Parameter Set identifiers.

## Stage 2.2.10 Git And Vercel Production Activation

1. Fetch and verify that remote `main` has not moved outside the accepted linear history.
2. Fast-forward local `main` to the exact V2.2 candidate and push `main` without force.
3. Wait for the Git-linked Vercel Production deployment, then bind deployment id, URL, Git commit, branch, region and Ready status.
4. Verify the canonical Production domain points to that deployment. Do not change the domain or Vercel project settings.

Exit claim: the exact V2.2 candidate is the active Vercel Production application.

## Stage 2.2.11 End-To-End Verification And Closeout

1. Verify anonymous Basic Auth `401` behavior before application/provider logic.
2. With existing approved authentication, verify core pages and read-only storage health.
3. Send at most one authenticated `/api/tts` request containing only `review`; accept either a valid Cache hit or one provider attempt and reconcile TTS in-flight accounting to zero.
4. Scan build/runtime evidence for V2.2 errors and HTTP 500 responses.
5. Create and isolated-restore-verify the post-release encrypted backup.
6. Update the V2.2 plan, master plan, Architecture, Changelog and AI log with exact evidence. Commit and push any documentation-only closeout, wait for its Git-triggered Production deployment, and repeat the exact-commit/domain/error checks.
7. Return the checkout to `v2.2` after `main` and `v2.2` identify the same final history.

Exit claim: V2.2 is verified active in Production, recovery evidence is current, and repository documentation matches the final remote state.

## Recovery Boundary

- Before `0007`, no Production state has changed.
- After `0007` and before the first V2 Parameter Set write, the previous application remains temporarily compatible because the new constraints continue to accept every V1 identifier.
- After any V2 event/state is written, an application-only rollback to code that understands only V1 identifiers is incomplete. Default recovery is forward repair with a V2-compatible artifact. Restoring an older database requires a new incident-specific reconciliation and explicit data-loss decision.
- A failed Vercel build after `0007` leaves the prior V1-writing application usable while deployment is repaired. It does not authorize a database restore or a second migration attempt.
- A timeout or network error during migration is an ambiguous result. Read-only constraint and digest reconciliation is mandatory before any retry.

## Authority And Execution Limits

- Current, target and working classification remain Tier 3.
- Accepted remote targets are only the source-pinned Neon `staging` and `main` branches, GitHub repository `huaixuanhu/words-learning-app-for-mimi`, its `v2.2` and `main` branches, and the already linked Vercel Production project/domain resolved through current read-only evidence.
- The user's 2026-09-03 instruction authorizes the actions in this plan through Production completion. It does not authorize any Non-Scope action.
- Git writes are non-force only. Database writes are limited to one successfully reconciled execution of the pinned constraint-only migration per target. Provider activity is limited to the one neutral TTS acceptance request.
- Completion persistence applies: recover from safe transient failures and continue from verified checkpoints. Stop before any materially different target, destructive learner-data action, credential/configuration change, or irreconcilably ambiguous write.
