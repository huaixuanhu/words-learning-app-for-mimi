# Words Learning App For Mimi PLAN V1 Master

Created: 2026-07-02 23:30 AEST
Last updated: 2026-07-05 15:45 AEST

Source plan:

- User request in the current Codex thread on 2026-07-02.

Derived from:

- `/Users/anoria/.codex/skills/human-ai-governance/SKILL.md`
- `/Users/anoria/.codex/skills/human-ai-governance/references/governance-patterns.md`
- `AGENTS.md`
- `ARCHITECTURE.md`

Input evidence:

- User wants a web app for girlfriend's PTE vocabulary study.
- User provided GitHub repository URL: `https://github.com/huaixuanhu/words-learning-app-for-mimi.git`

Consumer / next stage:

- Future product design child plan.
- Future technical implementation child plan.
- Future deployment plan.

Document nature:

This is the parent product and implementation plan. Child plans must cite this file in `Source plan` and state their scope, non-scope, and exit criteria.

## Scope

- Build a vocabulary learning web app for adding words, storing study context, and reviewing flashcards.
- Support both manual entry and first-version `.txt` text file import.
- Record creation time and review history.
- Let the user input self-rated rarity, while keeping it separate from proficiency.
- Use Spaced Repetition（间隔重复）and a practical Forgetting Curve（遗忘曲线）model to schedule review.
- Prepare for GitHub and Vercel deployment after local validation.
- Keep personal study data private, exportable, and separated by learner when multiple private people use the app.

## Non-Scope

- No production deployment without separate approval.
- No remote database migration without separate approval.
- No paid service setup without separate approval.
- No AI-generated definitions or examples until data sharing and quality boundaries are designed.
- No public multi-user social features in the MVP.
- No `.docx` or PDF import in the first version.

## Governance Baseline

- Start as Tier 1 durable small app.
- Upgrade to Tier 3 before credentials, production services, external data sharing, or destructive persistent-data operations.
- Keep `AGENTS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, and `governance/AI_AGENT_LOG.md` updated when project boundaries change.

## Product Principles

- Daily capture must be faster than handwriting.
- Review sessions should feel light enough to use on a phone.
- Scheduling should be explainable to the learner.
- The app should preserve context, because PTE vocabulary is often learned from task-specific sentences.
- Export and backup matter from the start.

## Stage Plan

### Stage 0: Governance Bootstrap

Exit criteria:

- `AGENTS.md` exists.
- `ARCHITECTURE.md` exists.
- `CHANGELOG.md` exists.
- `governance/AI_AGENT_LOG.md` exists.
- This master plan exists.

### Stage 1: Product Design And MVP Definition

Exit criteria:

- Define first-screen workflow.
- Define add-word fields.
- Define `.txt` import workflow.
- Define flashcard feedback buttons.
- Define MVP storage strategy.
- Define privacy and export behavior.
- Identify initial validation commands.

### Stage 2: App Scaffold

Exit criteria:

- Local app runs.
- Package manager and framework are locked in.
- Core routes or screens exist.
- Basic visual design supports mobile use.
- First smoke test path is documented.

### Stage 3: Vocabulary CRUD

Status: implemented locally on 2026-07-04 in `plan_docs/PLAN_V1_STAGE3_VOCABULARY_CRUD_IMPORT.md`.

Exit criteria:

- Add, edit, archive, search, and list vocabulary items.
- Import a batch of words from `.txt` or pasted text after preview.
- Record timestamps.
- Handle duplicate candidates.
- Validate empty and malformed input.

### Stage 4: Review Scheduler And Flashcards

Status: implemented locally on 2026-07-04 in `plan_docs/PLAN_V1_STAGE4_REVIEW_SCHEDULER_FLASHCARDS.md`.

Exit criteria:

- Due cards are selected deterministically.
- Review feedback updates next due time.
- Missed-day backlog is smoothed.
- Session limit is customizable and affects review queue selection.
- Edge cases are tested.

### Stage 5: Persistence, Export, And Backup

Status: Stage 5A local export and backup implemented locally on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5A_LOCAL_EXPORT_BACKUP.md`. Stage 5B storage provider decision and multi-person data model documented on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5B_STORAGE_PROVIDER_DECISION.md`. Stage 5C local person adapter implemented on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5C_LOCAL_PERSON_ADAPTER.md`. Stage 5D durable storage readiness implemented on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5D_DURABLE_STORAGE_READINESS.md`. Stage 5E Neon execution gate documented on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5E_NEON_EXECUTION_GATE.md`. Stage 5F development / preview Vercel and Neon bootstrap executed on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5F_DEV_PREVIEW_NEON_BOOTSTRAP.md`. Stage 5G preview deployment boundary is documented in `plan_docs/PLAN_V1_STAGE5G_PREVIEW_DEPLOYMENT_BOUNDARY.md`. Stage 5H runtime Postgres adapter design is documented in `plan_docs/PLAN_V1_STAGE5H_RUNTIME_POSTGRES_ADAPTER_DESIGN.md`. Stage 5I runtime Postgres adapter implementation is documented in `plan_docs/PLAN_V1_STAGE5I_RUNTIME_POSTGRES_ADAPTER_IMPLEMENTATION.md`. Stage 5J Postgres adapter read-only verification is documented in `plan_docs/PLAN_V1_STAGE5J_POSTGRES_ADAPTER_READ_ONLY_VERIFICATION.md`. Stage 5K controlled write smoke is documented in `plan_docs/PLAN_V1_STAGE5K_CONTROLLED_WRITE_SMOKE.md`. Stage 5L backup import harness and smoke cleanup is documented in `plan_docs/PLAN_V1_STAGE5L_BACKUP_IMPORT_HARNESS_AND_SMOKE_CLEANUP.md`. User-facing runtime storage cutover remains pending separate confirmation.

Exit criteria:

- Storage provider is chosen through a documented plan.
- Data model is implemented with migrations if needed.
- CSV or JSON export works.
- Import/export round trip is validated.

Stage 5A local exit criteria:

- Complete JSON backup works.
- Vocabulary CSV export works.
- JSON restore preview validates before writing.
- Invalid backup files do not mutate local data.
- Backup round trip is covered by unit tests.

Stage 5B decision:

- Use one Neon Postgres database as the intended durable storage provider.
- Add a `people` table for the private group.
- Require all learning data tables to include `person_id`.
- Support private user switching without password / credential isolation in the current accepted scope.
- Treat person switching as convenience separation, not security isolation.

Stage 5C local adapter:

- Browser-local storage now uses schema version 3.
- Local data includes `people`, `selectedPersonId`, `personId` on learning records, and per-person review settings.
- Local add, import, library, review queue, review events, and settings are scoped to the selected person.
- JSON backup exports schema version 3 while still restoring schema version 2 backups through migration.

Stage 5D durable storage readiness:

- Local SQL migration draft exists for the future Neon Postgres database.
- SQL draft includes `people`, person-scoped learning tables, review settings, backup imports, and backup id mapping.
- Repository adapter contract requires explicit person context for future learning-data operations.
- Schema version 3 JSON backup to Postgres mapping is documented.
- Static tests inspect the SQL draft for `person_id`, person-scoped relationships, indexes, and no credential/package coupling.

Stage 5E Neon execution gate:

- Future Neon/Vercel execution approval checklist is documented.
- Remote execution sequence is documented without running it.
- Stop conditions and rollback direction are documented.
- No credentials, env files, remote database, migration, or deployment are touched.

Stage 5F development / preview Neon bootstrap:

- New Vercel project is linked for this repository.
- Neon Postgres development / preview resource is created through the Vercel integration path.
- Local `.env.local` is ignored and holds Vercel / Neon generated values.
- Minimal direct SQL tooling is added with no ORM.
- `db/migrations/0001_initial.sql` has been applied to the non-production development database.
- Schema inspection verified 8 tables, 11 indexes, 5 key constraints, and zero business rows.
- Preview deployment is paused because a CLI attempt with `--target preview` returned `target: production`; that deployment was removed and Vercel now reports no deployments for the project.
- App runtime remains browser `localStorage`; production migration, production import, production deployment, and runtime Postgres adapter are not implemented.

Stage 5G preview deployment boundary:

- Vercel API reports the Git link production branch as `main`.
- Vercel currently has active Production deployment `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD` from branch `V1`.
- The active Production deployment is documented as a non-official artifact, not the formal V1 production release.
- Formal Production should wait until V1 is complete and merged through the agreed branch path.
- Standard `vercel deploy` without `--prod` created Preview deployment `dpl_d5LUb6r1wEXiJBUENb2PACEZMVsu`.
- Preview inspection verified `target=preview` and OIDC（OpenID Connect，开放身份连接）environment `preview`.
- Git integration later created clean Preview deployment `dpl_EmhfvP8yE9NrxCWPcdK3Qdd8sdk8` from committed `origin/V1`.

Stage 5H runtime Postgres adapter design:

- Runtime Postgres adapter should be server-only and development / preview first.
- Default user-facing runtime remains browser `localStorage` until adapter tests pass.
- Production database runtime remains disabled until formal Production gate, accepted access boundary, and backup/import/rollback behavior are agreed.

Stage 5I runtime Postgres adapter implementation:

- Server-only runtime Postgres adapter modules now exist for development / preview verification.
- Runtime mode defaults to `local`; Postgres runtime requires `MIMI_STORAGE_RUNTIME=postgres-preview`.
- `/api/storage/health` is read-only; `/api/storage/smoke` write checks are disabled by default and require a separate env flag plus confirmation header.
- UI routes still use browser `localStorage`; backup import and production runtime cutover are not implemented.

Stage 5J Postgres adapter read-only verification:

- Local default health route returns disabled without connecting to Postgres.
- Local and Preview `postgres-preview` health route reads database counts successfully.
- Vercel Preview has `MIMI_STORAGE_RUNTIME=postgres-preview`; Production does not.
- Preview deployment `dpl_CFeC2VwRKtMSAjBiGGtyStsFw2tr` verified `target=preview`.
- Neon development database core business tables remained empty after verification.
- Smoke writes, backup import, UI cutover, and Production work remain pending.

Stage 5K controlled write smoke:

- `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` was temporarily enabled in Vercel Preview only.
- Preview deployment `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv` executed one `/api/storage/smoke` write.
- The development database now has exactly one smoke person, vocabulary item, review state, review event, and review settings row.
- Smoke data is scoped to person id `00000000-0000-4000-8000-0000000005f1`.
- `MIMI_ENABLE_STORAGE_SMOKE_WRITES` was removed from Preview after the write.
- Follow-up Preview deployment `dpl_BJn1pFAbLiiY4LgCyThKx2vDTSar` verified `/api/storage/smoke` is disabled again.
- The smoke-enabled Preview deployment was removed.
- Smoke rows remain in the development database until a separate cleanup decision.
- Backup import, UI cutover, smoke row cleanup, and Production work remain pending.

Stage 5L backup import harness and smoke cleanup:

- Added a schema version 3 backup import dry-run planner.
- Added fixture import plan tests for target UUID mapping, metadata count mismatch rejection, and cross-person reference rejection.
- Added guarded development database commands for fixture dry run, smoke cleanup, and fixture transaction rollback trial.
- Cleaned the Stage 5K smoke row set from the development database.
- Verified the fixture trial can insert one complete backup-shaped dataset plus backup import metadata inside a transaction and roll it back.
- Final development database core study table counts are zero.
- Formal user backup import, UI cutover, Production migration, and Production deployment remain pending.

### Stage 6: GitHub And Vercel Deployment

Exit criteria:

- Local git repository is initialized or connected with human approval.
- Remote push is performed with human approval.
- Vercel project is connected with human approval.
- Deployment environment variables are documented but never committed.
- Production smoke test is completed.

### Stage 7: Polishing And Optional PWA

Exit criteria:

- Mobile interaction is comfortable.
- PWA installability is evaluated.
- Review session performance is checked.
- Remaining accessibility issues are documented.

## Scheduling Strategy

MVP scheduler should prioritize clarity:

- New words get short first intervals.
- Correct reviews increase interval.
- Failed reviews shorten interval and increase priority.
- New words do not have initial proficiency.
- The first review rating creates the first meaningful review state.
- Self-rated rarity may help sorting or backlog priority, but it must not pretend to know proficiency.
- Actual review feedback drives scheduling over time.

The fixed Stage 4 scheduler is only an MVP bootstrap. A later stage should evaluate embedding（向量嵌入）support for semantic similarity（语义相似度）, confusing pairs, and review queue ordering. FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）is also a candidate later, but should be introduced only after reviewing library fit, data requirements, migration impact, privacy, and explainability.

## Data And Privacy Assumptions

- Default user model is a trusted private group with simple person switching.
- Study data includes words, examples, import batches, self-rated rarity, review timestamps, and performance.
- All durable learning data should be scoped by `person_id` once database persistence is implemented.
- No third-party data sharing by default.
- Export should exist before production-only persistence becomes the only storage path.

## Open Questions

- Should the MVP require login or stay single-user behind a private URL first?
- Should definitions be manually entered only, or can a dictionary source be added later?
- Should examples support audio or images in a later stage?
- Should the first database be local SQLite for development, Postgres for production, or a single Postgres path from the start?
- What daily review load feels right for Mimi?
- What `.txt` import shape does Mimi naturally produce: one word per line, comma-separated, or word plus Chinese meaning?

## Child Plan Rule

Every derived plan must begin with:

- `Source plan: plan_docs/PLAN_V1_MASTER.md`
- `Derived from: <relevant docs>`
- `Scope`
- `Non-Scope`
- `Safety / Side Effects`
- `Exit Criteria`
