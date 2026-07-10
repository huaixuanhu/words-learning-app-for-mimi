# Words Learning App For Mimi PLAN V1 Master

Created: 2026-07-02 23:30 AEST
Last updated: 2026-07-08 23:52 AEST

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
- Support manual entry and batch import. The current Stage 7.11 user-facing import shape is Single input plus Batch JSON import; older `.txt` parser behavior remains compatibility code.
- Record creation time and review history.
- Let the user input self-rated rarity, while keeping it separate from proficiency.
- Use Spaced Repetition（间隔重复）and a practical Forgetting Curve（遗忘曲线）model to schedule Recognition Vocabulary（阅读词汇）review.
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

Status: Stage 5A local export and backup implemented locally on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5A_LOCAL_EXPORT_BACKUP.md`. Stage 5B storage provider decision and multi-person data model documented on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5B_STORAGE_PROVIDER_DECISION.md`. Stage 5C local person adapter implemented on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5C_LOCAL_PERSON_ADAPTER.md`. Stage 5D durable storage readiness implemented on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5D_DURABLE_STORAGE_READINESS.md`. Stage 5E Neon execution gate documented on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5E_NEON_EXECUTION_GATE.md`. Stage 5F development / preview Vercel and Neon bootstrap executed on 2026-07-05 in `plan_docs/PLAN_V1_STAGE5F_DEV_PREVIEW_NEON_BOOTSTRAP.md`. Stage 5G preview deployment boundary is documented in `plan_docs/PLAN_V1_STAGE5G_PREVIEW_DEPLOYMENT_BOUNDARY.md`. Stage 5H runtime Postgres adapter design is documented in `plan_docs/PLAN_V1_STAGE5H_RUNTIME_POSTGRES_ADAPTER_DESIGN.md`. Stage 5I runtime Postgres adapter implementation is documented in `plan_docs/PLAN_V1_STAGE5I_RUNTIME_POSTGRES_ADAPTER_IMPLEMENTATION.md`. Stage 5J Postgres adapter read-only verification is documented in `plan_docs/PLAN_V1_STAGE5J_POSTGRES_ADAPTER_READ_ONLY_VERIFICATION.md`. Stage 5K controlled write smoke is documented in `plan_docs/PLAN_V1_STAGE5K_CONTROLLED_WRITE_SMOKE.md`. Stage 5L backup import harness and smoke cleanup is documented in `plan_docs/PLAN_V1_STAGE5L_BACKUP_IMPORT_HARNESS_AND_SMOKE_CLEANUP.md`. Stage 5M user backup import and UI runtime cutover is documented in `plan_docs/PLAN_V1_STAGE5M_USER_BACKUP_IMPORT_AND_UI_RUNTIME_CUTOVER.md`. Stage 5N Preview UI runtime verification is documented in `plan_docs/PLAN_V1_STAGE5N_PREVIEW_UI_RUNTIME_VERIFICATION.md`. Stage 6A Production release gate design is documented in `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`. Stage 7 UI visual design is documented in `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`, with Stage 7.2 refinement documented in `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md`, Stage 7.3 ChillRound font trial documented in `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md`, Stage 7.4 theme toggle documented in `plan_docs/PLAN_V1_STAGE7_4_THEME_TOGGLE.md`, Stage 7.5 soft click sound trial documented in `plan_docs/PLAN_V1_STAGE7_5_SOFT_CLICK_SOUND_TRIAL.md`, Stage 7.6 sound design documented in `plan_docs/PLAN_V1_STAGE7_6_SOUND_DESIGN.md`, Stage 7.7 final acceptance documented in `plan_docs/PLAN_V1_STAGE7_7_FINAL_ACCEPTANCE.md`, Stage 7.8 dual-track UI refinement documented in `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`, Stage 7.9 dual-track data/import refinement documented in `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`, Stage 7.10 Library / Review controls documented in `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md`, Stage 7.11 Review rollback / auto-refresh documented in `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md`, Stage 6B formal Production execution planning documented in `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`, Stage 6B-P1 Postgres Production runtime planning documented in `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`, Stage 6B-P1-G Production handoff documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md`, Stage 6B-P1-G-C human decision packet documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`, Stage 6B-P1-G-C-1 provider supplement documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`, and Stage 8 Review Memory Algorithm planning documented in `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`.

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

- Browser-local storage now uses schema version 5 after the Stage 7.9 multi-meaning / multi-example correction.
- Local data includes `people`, `selectedPersonId`, `personId` on learning records, and per-person review settings.
- Local add, import, library, review queue, review events, and settings are scoped to the selected person.
- Schema version 4 added vocabulary `learningTrack`, nullable `tags`, `recognitionSessionLimit`, and `activeSessionLimit`.
- Schema version 5 adds `meaningsZh` and `examples` arrays while preserving legacy `meaningZh` / `example` compatibility display fields.
- JSON backup exports schema version 5 while still restoring schema version 2 / 3 / 4 backups through migration.
- Stage 7.10 adds browser-local hard delete, JSON import batch rollback, and reset-today review controls without changing schema version 5.
- Stage 7.11 adds browser-local one-word review rollback and conservative empty-queue auto-refresh without changing schema version 5.

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

Stage 5M user backup import and UI runtime cutover:

- Added file-backed backup import dry run, transaction rollback trial, and guarded development commit.
- Added `test_fixtures/stage5m-backup.json` to verify file-backed import without real user data.
- Added `/api/storage/data` for development / preview Postgres snapshot read and controlled UI mutations.
- Updated `useVocabularyData()` and UI write flows to use Postgres when `postgres-preview` is enabled, while preserving browser `localStorage` as default.
- UI Postgres writes require `MIMI_ENABLE_STORAGE_UI_WRITES=true` and `x-mimi-ui-storage-write: allow-dev-preview-ui-write`.
- Verified local API read/write and browser library rendering against committed fixture data, then cleaned all fixture rows.
- Final development database core study table counts are zero.
- Production migration, Production deployment, Vercel env mutation, Production import, authentication, embedding, and FSRS remain pending.

Stage 5N Preview UI runtime verification:

- Stage 5N-A created Preview deployment `dpl_HpcPDb5B2su2BLPWJVsYZjPDnWSg`.
- Preview URL is `https://words-learning-app-for-mimi-kb5b08c5v-anorias-projects.vercel.app`.
- Vercel inspect confirmed `target=preview` and `READY`.
- Preview `/api/storage/health` returned `postgres-preview` with zero counts.
- Preview `/api/storage/data` returned an empty schema version 3 snapshot.
- Preview `/api/storage/data` POST was blocked with `ui-writes-not-enabled`.
- All app routes returned HTTP 200 and error-log query returned no error records.
- Stage 5N-B temporarily enabled `MIMI_ENABLE_STORAGE_UI_WRITES=true` in Preview only.
- Stage 5N-B created write-enabled Preview deployment `dpl_JgKNc9zuAqgMsy5w13gbZoqkEhnY`.
- The write-enabled Preview wrote one controlled smoke vocabulary row: `stage five n preview ui write`.
- Stage 5N-B cleaned the smoke person, vocabulary item, and review settings row.
- Stage 5N-B removed `MIMI_ENABLE_STORAGE_UI_WRITES` from Preview and removed the write-enabled deployment.
- Disabled Preview deployment after cleanup is `dpl_Athg2hWZK1gV6ereWdbYk1WXG58C`.
- Disabled Preview URL is `https://words-learning-app-for-mimi-6v8azqoaa-anorias-projects.vercel.app`.
- Final Preview env has no UI write flag, Production env remains empty, and development database counts are zero.

### Stage 6: GitHub And Vercel Deployment

Confirmed release sequence as of 2026-07-08:

- Stage 6A is Production（生产环境）release gate design only. It may define the final deployment checklist, access boundary, environment variable（环境变量）matrix, database migration（数据库迁移）plan, backup/import/rollback path, and smoke test（冒烟测试）criteria, but it must not merge to `main`, mutate Production data, add Production env vars, or create/promote a formal Production deployment.
- Stage 7 must complete UI（用户界面）/ visual design, mobile interaction polish, review-flow comfort, accessibility（可访问性）review, and optional PWA（Progressive Web App，渐进式 Web 应用）evaluation before formal Production.
- Stage 8 has accepted the Recognition Vocabulary（阅读词汇）review memory algorithm before formal Production. It replaces the placeholder fixed scheduler with V1 Recognition-only FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）scheduling, adds same-session repeat for failed Recognition ratings, uses local natural-day bucket（本地自然日分桶）due checks, and explicitly keeps Active Vocabulary（输出词汇）out of review queue（复习队列）, review state（复习状态）, and review event（复习事件）creation.
- Stage 6B is the later formal execution step. Only after Stage 7, Stage 8, and Stage 6B-P1 are accepted should `V1` be merged to `main`, Vercel's production branch remain `main`, Production env vars be configured, Production database work run, and the final Production smoke test be performed.
- The current active Production deployment from branch `V1` remains a documented non-official artifact, not the formal V1 production release.
- Stage 6A is documented in `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`; it confirms that `person_id` is data separation, not security isolation, and that durable Production writes need either explicit no-credential private-URL risk acceptance or a separate access gate.
- Stage 6B execution planning is documented in `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`; on 2026-07-08 the user chose shared Postgres Production for formal V1, so `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md` is the required runtime bridge before merge, Production migration, and deployment. Stage 8 is accepted, Stage 6B-P1-B has added the local schema version 5 migration draft, Stage 6B-P1-C has added the local `postgres-production` runtime / API contract, Stage 6B-P1-D has added local repository parity, Stage 6B-P1-E has added local backup import version 5 support, Stage 6B-P1-F has validated the migrated non-production development database, Stage 6B-P1-G-A has documented the Production handoff, Stage 6B-P1-G-B has completed the read-only account inventory, Stage 6B-P1-G-C-0 has documented the human decision packet in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`, and Stage 6B-P1-G-C-1 has documented the provider supplement in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`. The 2026-07-10 initial-data decision starts Production empty, skips development data copy/formal backup import, and begins formal data only after cloud-backed V1 launch. P1-G-B found no Production env vars/database target and a publicly reachable canonical domain. P1-G-C-1 confirmed the existing Vercel-managed Neon resource is owned, available, Free-plan, and connected only to Development / Preview, but branch / database / recovery evidence remains missing. Email activation is not an established prerequisite.

Exit criteria:

- Local git repository is initialized or connected with human approval.
- Remote push is performed with human approval.
- Vercel project is connected with human approval.
- Deployment environment variables are documented but never committed.
- Production smoke test is completed.

### Stage 7: Polishing And Optional PWA

Status: Stage 7 UI（用户界面）visual design was implemented locally on 2026-07-06 in `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`. Stage 7.2 refinement is documented in `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md`; it replaces the visible `LexiCalm` brand area with the local cat avatar and `咪咪 Vocabulary`, slightly reduces desktop dashboard action-card density, and strengthens hover / tap feedback. Stage 7.3 is documented in `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md`; it self-hosts ChillRoundF 寒蝉全圆体 `v3.200` from Warren2060/ChillRound under OFL-1.1 and uses it for CJK（中日韩文字）UI text before system fallbacks. Stage 7.4 is documented in `plan_docs/PLAN_V1_STAGE7_4_THEME_TOGGLE.md`; it adds local light / dark theme（主题）switching in Settings with `dark` as the default and stores only UI preference under `mimi-ui-theme-v1`. Stage 7.5 is documented in `plan_docs/PLAN_V1_STAGE7_5_SOFT_CLICK_SOUND_TRIAL.md`; it adds one Kenney CC0 soft click asset and a low-volume Settings audition control. Stage 7.6 is documented in `plan_docs/PLAN_V1_STAGE7_6_SOUND_DESIGN.md`; it promotes the accepted soft click to normal app button feedback, stores separate UI-only sound preferences under `mimi-ui-sound-v1`, and adds a review-completion modal that can play the user-provided Mimi completion sound. Stage 7.7 is documented in `plan_docs/PLAN_V1_STAGE7_7_FINAL_ACCEPTANCE.md`; it passes local validation, route / asset checks, API safety smoke checks, and focused Settings browser acceptance. Stage 7.8 is documented in `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`; it refines the dashboard into a Today Hub, adds Recognition Vocabulary（阅读词汇）and Active Vocabulary（输出词汇）UI track cards, adds Study / 学习 and Practice Lab / 练习室 entries, prepares Library filters and mastery-dimension labels, and strengthens the cat Home Brand Button states while keeping the existing soft sage style. Stage 7.9 is documented in `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`; it upgrades local data to schema version 5, makes `/import` the parent entry for Single input（单个输入）and Batch JSON import（批量 JSON 导入）, requires explicit Recognition / Active track choice in the import UI, allows nullable tags, adds `meaningsZh` / `examples` arrays with at least one entry required for batch JSON, adds separate Recognition / Active daily limits, and keeps current review scheduling limited to Recognition Vocabulary. PTE / IELTS persisted exam-mode classification, AI API（人工智能接口）implementation, dictation, spelling, writing feedback, external vocabulary sources, PWA（Progressive Web App，渐进式 Web 应用）, remote database migration, notification behavior, background audio, and Production（生产环境）execution remain out of this substage.

Exit criteria:

- Visual design is accepted before formal Production execution.
- Mobile interaction is comfortable.
- PWA installability is evaluated.
- Review session performance is checked.
- Remaining accessibility issues are documented.

### Stage 8: Review Memory Algorithm

Status: Stage 8 Review Memory Algorithm is accepted locally in `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`. Stage 8-B package fit and calibration executed locally on 2026-07-08 with `ts-fsrs@5.4.1`, an isolated Recognition FSRS adapter, deterministic calibration tests, and an Active Vocabulary no-review-state regression test. Stage 8-C implemented same-session repeat for failed Recognition ratings. Stage 8-D replaced the cross-day scheduler with Recognition-only FSRS scheduling, stored FSRS difficulty / stability in neutral state fields, kept reset / rollback deterministic through event replay, and changed Review queue due checks to Mimi's local natural-day bucket. Stage 8-E confirmed schema version 5 remains sufficient and tightened JSON backup restore so Active Vocabulary review states / events are rejected while Active words without review history still round-trip. Stage 8-F handed the final V1 Recognition scheduler state shape to Stage 6B-P1 and added a static SQL regression for the neutral review state/event shape. Stage 8-G ran full local validation plus a local browser review-flow smoke check and accepted Stage 8 for handoff to Stage 6B-P1.

Exit criteria:

- Recognition Vocabulary uses an accepted same-session repeat design for `完全忘记了` and `有点忘记了`.
- Cross-day Recognition scheduling uses an accepted FSRS-6 design or explicitly documented equivalent after library fit validation.
- Active Vocabulary remains stored, exportable, importable, and visible as future Practice Lab scope, but does not enter review queue, does not generate review state, and does not generate review event in V1.
- Backup restore rejects V1-impossible Active Vocabulary review states and review events.
- `review_states.difficulty` and `review_states.stability` remain neutral state field names, with documentation that V1 uses them only for Recognition.
- Future Active scheduling must use separate dimensions such as `review_profile`, `skill_type`, or `activity_type` so Recognition and Active state do not share one row.
- Stage 6B-P1 incorporates the accepted Stage 8 state shape before any Postgres Production migration.
- Stage 6B-P1-B created `0002_schema5_production_runtime.sql` locally, Stage 6B-P1-C added `postgres-production` runtime / API guards locally, Stage 6B-P1-D added repository parity locally, Stage 6B-P1-E added backup import version 5 support locally, Stage 6B-P1-F applied / validated the migration only on the approved non-production development database, Stage 6B-P1-G-A documented the empty Production handoff with no first-launch import, Stage 6B-P1-G-B recorded the live read-only Vercel / Neon inventory without remote mutation, Stage 6B-P1-G-C-0 documented the remaining human decision packet, and Stage 6B-P1-G-C-1 documented read-only Vercel Marketplace provider metadata without `.env`, database, env var, merge, or deployment action.

The fixed Stage 4 scheduler is no longer the active Recognition scheduler. Stage 8 has completed the learning-behavior bridge; the cloud-backed V1 Production path now continues through the separately approved Stage 6B-P1 Production execution handoff and Stage 6B formal release work.

## Scheduling Strategy

MVP scheduler should prioritize clarity:

- New words get short first intervals.
- Correct reviews increase interval.
- Failed reviews shorten interval and increase priority.
- New words do not have initial proficiency.
- The first review rating creates the first meaningful review state.
- Self-rated rarity may help sorting or backlog priority, but it must not pretend to know proficiency.
- Actual review feedback drives scheduling over time.

The V1 Recognition scheduler now uses the Stage 8 FSRS-6 implementation. Embedding（向量嵌入）support for semantic similarity（语义相似度）, confusing pairs, and review queue ordering remains a later optional direction.

## Data And Privacy Assumptions

- Default user model is a trusted private group with simple person switching.
- Study data includes words, meanings, examples, import batches, self-rated rarity, review timestamps, and performance.
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
