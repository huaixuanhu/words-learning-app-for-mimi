# Words Learning App For Mimi Architecture

Created: 2026-07-02 23:30 AEST
Last updated: 2026-07-07 23:12 AEST

## Current State

This repository is in Stage 7 UI visual design after Stage 6A Production release gate design, with local Stage 7.11 Review rollback / auto-refresh controls completed. It contains collaboration rules, architecture notes, master and stage plans, changelog, AI agent log, a lightweight Tier 1 governance preflight, and a Next.js App Router application with browser-local vocabulary, review mutations, export, restore preview, selected-person switching, local SQL storage, repository adapter contract, approved development / preview Vercel and Neon setup, a server-only development / preview Postgres runtime adapter, guarded backup import dry-run / rollback / commit tooling, a development / preview-only Postgres UI runtime cutover path, verified Preview UI runtime checks, and a local Stage 7 darker sage visual system with Motion for React interaction animation, Stage 7.2 brand refinement, Stage 7.3 ChillRoundF font trial, Stage 7.4 light / dark theme toggle, Stage 7.5 soft click sound audition, Stage 7.6 UI-only sound settings with review-completion feedback, Stage 7.7 final acceptance coverage, Stage 7.8 Today Hub / dual-track information architecture, Stage 7.9 local Recognition Vocabulary（阅读词汇）/ Active Vocabulary（输出词汇）data semantics, Stage 7.10 local hard-delete, batch rollback, and review reset controls, and Stage 7.11 one-word Review rollback plus conservative queue auto-refresh.

Current local stack:

- Next.js 16.2.10
- React 19.2.4
- TypeScript 5.9.3
- Tailwind CSS 4.3.2
- ESLint 9.39.4
- Vitest 4.1.9 for vocabulary domain unit tests
- `@neondatabase/serverless` 1.1.0 for minimal database scripts
- `dotenv-cli` 11.0.0 for explicit `.env.local` loading in database scripts
- npm with `package-lock.json`
- `lucide-react` 0.562.0 for simple interface icons
- npm `overrides` pins PostCSS（CSS 处理器）to 8.5.16 so the Next.js nested PostCSS copy resolves to the patched version.

Stage 7.11 stores local study data in browser `localStorage`（本地浏览器存储）under `mimi-pte-vocabulary-v1`; the 2026-07-07 multi-meaning / multi-example refinement keeps the browser-local and backup shape at schema version 5. This enables local single vocabulary input, batch JSON import（批量 JSON 导入）preview, edit, archive, restore, hard delete, batch import rollback, search, recognition-only review sessions, one-word review rollback, review history, reset of today's local review task, per-person Recognition / Active daily limits, multiple Chinese meanings, multiple examples, JSON backup（JSON 备份）, vocabulary CSV（逗号分隔值）export, JSON restore preview, and selected-person switching without remote services.

Stage 5D added durable storage readiness without connecting to any remote service. The local SQL migration lives at `db/migrations/0001_initial.sql`, the JSON backup to Postgres（关系型数据库）mapping lives at `db/LOCAL_BACKUP_TO_POSTGRES.md`, and the repository adapter contract（仓储适配层接口）lives at `src/lib/storage/durable-repository-contract.ts`.

Stage 5E documented the execution gate for Neon/Vercel work. It defined required human approvals, command sequence, stop conditions, rollback direction, and validation expectations before any remote mutation.

Stage 5F executed the approved development / preview bootstrap. The Vercel project is linked, the Neon resource `words-learning-app-for-mimi-neon` exists for development / preview, ignored `.env.local` values were pulled locally, and `db/migrations/0001_initial.sql` was applied to the non-production development database. Schema inspection verified 8 tables, 11 indexes, 5 key constraints, and zero business rows. A deployment attempt with `--target preview` unexpectedly returned `target: production`; that deployment was removed immediately.

Stage 5G documents a later active Production deployment reported by Vercel: `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD`, with commit ref `V1` and commit `d01719a6bb372c75873d042c657feb7f93d80b3a`. The Vercel API reports the Git link production branch as `main`. The current active Production deployment is not treated as the official V1 production release; formal Production remains deferred until V1 is complete and merged through the agreed branch path. Stage 5G also created and verified Preview deployment `dpl_d5LUb6r1wEXiJBUENb2PACEZMVsu` at `https://words-learning-app-for-mimi-bwfhi5rap-anorias-projects.vercel.app`, and Vercel Git integration later created clean Preview deployment `dpl_EmhfvP8yE9NrxCWPcdK3Qdd8sdk8` at `https://words-learning-app-for-mimi-aczic0spy-anorias-projects.vercel.app`.

Stage 5I implements the runtime Postgres adapter（运行时 Postgres 适配层）for development / preview verification. The app runtime still uses browser `localStorage`; the Postgres adapter is gated by `MIMI_STORAGE_RUNTIME=postgres-preview`, Production（生产）Postgres runtime is rejected, smoke writes are disabled by default, and backup import, production database migration, authentication（认证）, and external integrations have not been implemented.

Stage 5J verifies the runtime Postgres adapter read-only path. Local default `/api/storage/health` returns disabled without Postgres, local `postgres-preview` health reads the development Neon database with zero core rows, and Preview deployment `dpl_CFeC2VwRKtMSAjBiGGtyStsFw2tr` at `https://words-learning-app-for-mimi-dbkkkow3d-anorias-projects.vercel.app` returns read-only health successfully. `MIMI_STORAGE_RUNTIME=postgres-preview` is scoped to Preview only. `MIMI_ENABLE_STORAGE_SMOKE_WRITES` was not added.

Stage 5K verifies the runtime Postgres adapter write path with one controlled smoke write. `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` was added to Preview only, Preview deployment `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv` executed one `/api/storage/smoke` write, and the development database now contains one smoke person, one vocabulary item, one review state, one review event, and one review settings row. The write flag was removed from Preview after the test, follow-up Preview deployment `dpl_BJn1pFAbLiiY4LgCyThKx2vDTSar` at `https://words-learning-app-for-mimi-7bzktk5uc-anorias-projects.vercel.app` verifies `/api/storage/smoke` is disabled again, and the smoke-enabled deployment was removed. Smoke rows remain in the development database under person id `00000000-0000-4000-8000-0000000005f1`.

Stage 5L adds a backup import dry-run harness and cleans the Stage 5K smoke rows from the development database. `scripts/backup-import-plan.mjs` validates schema version 3 JSON backup structure, metadata counts, person-scoped references, and target UUID mapping. `scripts/backup-import-postgres.mjs` can run a fixture dry run, remove the fixed smoke row set, and run a fixture transaction trial that rolls back. The development database fixture trial inserted one person, import batch, vocabulary item, review state, review event, review settings row, backup import row, and six backup import mappings inside a transaction, then rolled back and verified no fixture rows persisted. The development database now has zero rows in core study tables after smoke cleanup.

Stage 5M extends backup import and cuts over the UI runtime for development / preview only. `scripts/backup-import-postgres.mjs` now supports file-backed `--file <backup.json>` dry runs, rollback trials, and guarded development commits with `--i-confirm-development-import`. `test_fixtures/stage5m-backup.json` covers the file-backed path without real user data. `/api/storage/data` reads Postgres snapshots when `MIMI_STORAGE_RUNTIME=postgres-preview` and accepts controlled UI mutations only when `MIMI_ENABLE_STORAGE_UI_WRITES=true` plus `x-mimi-ui-storage-write: allow-dev-preview-ui-write` are present. Browser `localStorage` remains the default runtime and restore target. Production remains disabled. Stage 5M committed a fixture backup to the development database, verified the UI read/write path locally, and cleaned all fixture rows; the development database is empty again.

Stage 5N verifies the Stage 5M UI runtime in Vercel Preview. Stage 5N-A deployed read-only Preview `dpl_HpcPDb5B2su2BLPWJVsYZjPDnWSg` at `https://words-learning-app-for-mimi-kb5b08c5v-anorias-projects.vercel.app`, confirmed `target=preview`, read `postgres-preview` health/data successfully, and confirmed writes were blocked. Stage 5N-B temporarily enabled `MIMI_ENABLE_STORAGE_UI_WRITES=true` in Preview, deployed write-enabled Preview `dpl_JgKNc9zuAqgMsy5w13gbZoqkEhnY`, wrote one controlled UI smoke vocabulary row, cleaned the row set, removed the write flag, deployed disabled Preview `dpl_Athg2hWZK1gV6ereWdbYk1WXG58C` at `https://words-learning-app-for-mimi-6v8azqoaa-anorias-projects.vercel.app`, verified writes are disabled again, and removed the temporary write-enabled deployment. The development database is empty after cleanup.

The confirmed release sequence is Stage 6A Production（生产环境）release gate design, Stage 7 UI（用户界面）/ visual design and optional PWA（Progressive Web App，渐进式 Web 应用）work, then Stage 6B formal merge（合并）to `main` and Production execution after explicit approval. Formal Production should not proceed before Stage 7 visual design is accepted.

Stage 6A documents the Production release gate. It confirms that current `person_id` behavior separates learner data but does not provide security isolation, that `postgres-preview` must not be used as a Production runtime mode, and that Stage 6B must either keep first Production browser-local or introduce a separate accepted Production runtime before durable shared writes.

Stage 7 implements the local UI（用户界面）visual design pass. `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md` records the design guardrails, including the darker soft sage palette, Motion for React dependency, reduced-motion boundary, mobile / desktop layout expectations, and the explicit decision not to implement a PTE / IELTS toggle in V1. `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md` records the accepted brand and interaction refinement: visible brand surfaces now use the local cat avatar and `咪咪 Vocabulary`, desktop dashboard action cards are slightly smaller, and hover / tap feedback is stronger. `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md` records the typography follow-up: the app self-hosts ChillRoundF 寒蝉全圆体 `v3.200` from Warren2060/ChillRound under OFL-1.1 and uses it for CJK（中日韩文字）UI text before system fallbacks. `plan_docs/PLAN_V1_STAGE7_4_THEME_TOGGLE.md` records the local light / dark theme（主题）toggle: `dark` remains the default, `light` is a warm sage paper version, the selected theme is stored only as UI preference under `mimi-ui-theme-v1`, and a body-first boot script applies the stored theme before the main UI renders. `plan_docs/PLAN_V1_STAGE7_5_SOFT_CLICK_SOUND_TRIAL.md` records the sound audition: the app stores one Kenney CC0 click sound in OGG（Ogg Vorbis 音频格式）and M4A（MPEG-4 音频格式）forms, keeps the license note in `public/sounds/`, and exposed a low-volume Settings preview through a low-pass filter（低通滤波器）before global use. `plan_docs/PLAN_V1_STAGE7_6_SOUND_DESIGN.md` records the accepted sound layer: the generated soft click is used for normal button feedback through a client sound provider, Settings stores separate button / review-completion sound preferences under `mimi-ui-sound-v1`, and the review flow shows a calm `已完成今日复习任务` modal whose `确定` button can play the user-provided Mimi completion sound from `public/sounds/mimi-review-complete.m4a`. `plan_docs/PLAN_V1_STAGE7_7_FINAL_ACCEPTANCE.md` records the local final acceptance pass: core local validation, route / asset checks, API safety smoke checks, and a focused in-app browser Settings check passed. `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md` records the dual-track UI refinement: dashboard becomes a Today Hub with Recognition Vocabulary and Active Vocabulary cards, navigation（导航）centers daily learning, `/study` and `/practice-lab` become presentational route entries, Library prepares track filters and mastery labels, and the cat avatar becomes an accessible Home Brand Button. `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md` records the accepted local data refinement: `learningTrack` and nullable `tags` became schema version 4 vocabulary fields, then the multi-meaning / multi-example correction upgrades browser-local data to schema version 5 with `meaningsZh` and `examples`; `/import` is the parent page for Single input and Batch JSON import, `/add` remains a compatibility redirect, Review settings store separate Recognition / Active daily limits, and the current review scheduler uses Recognition Vocabulary only. `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md` records the local Library / Review control follow-up: Review side-panel rating cards are now real buttons, Library can hard-delete vocabulary items, Library can rollback JSON import batches, JSON source chips display `Batch imported`, and Review can reset today's local review task after confirmation. `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md` records the Review refinement: the confusing regenerate/new-session buttons were removed, the empty Review queue refreshes conservatively after local Recognition Vocabulary data changes, and `回退1词` can roll back the previous completed card during a multi-card local session. Theme and sound preferences remain UI-only and are not part of vocabulary data, review history, review settings, JSON backup, CSV export, Postgres tables, API payloads, or Production（生产环境）state. Stage 7.11 did not add AI API（人工智能接口）, dictation, spelling, writing feedback, external vocabulary sources, PTE / IELTS persisted classification, remote database migration, Production import, or Production deployment.

The GitHub repository URL was provided by the user:

- `https://github.com/huaixuanhu/words-learning-app-for-mimi.git`

The local `main` branch now tracks `origin/main`. Remote repository settings have not been audited beyond the local Git connection.

## Product Goal

Build a mobile-first vocabulary web app for PTE preparation. The app should make it easy to add new words during practice, preserve context, and review cards according to Spaced Repetition（间隔重复）and a practical Forgetting Curve（遗忘曲线）model.

The product should optimize for daily use:

- quick word capture
- low-friction flashcard review
- transparent scheduling
- safe persistence of personal study data
- easy export and backup

## Planned Architecture

```text
app shell / routing
  -> word capture
  -> text file import
  -> import preview
  -> vocabulary list
  -> flashcard review
  -> review scheduler
  -> storage adapter
  -> import / export
  -> deployment boundary
```

## Planned Modules

### App Shell

Implemented as a Next.js App Router scaffold under `src/app`.

Responsibilities:

- mobile-first layout
- navigation between dashboard, study, review, library, practice lab, import, and settings views
- private-group study experience with future person switching

Current routes:

- `/`
- `/study`
- `/add`
- `/import`
- `/review`
- `/library`
- `/practice-lab`
- `/export`
- `/settings`

### Word Capture

Responsibilities:

- add word or phrase
- add one or more Chinese meanings, one or more examples, PTE context, and notes
- record self-rated rarity
- explicitly choose Recognition Vocabulary or Active Vocabulary at input time
- allow nullable soft tags such as PTE, IELTS, Listening, Writing, and Spelling Risk
- normalize duplicate candidates without losing original user input
- record `created_at` and timezone-aware dates automatically by default
- allow the user to modify added time when backfilling older words, while keeping system-maintained write/update timestamps
- do not ask for initial proficiency; new words start as `new`

Current route: `/import`, Single input. It saves manual vocabulary items into local browser storage, requires an explicit Recognition / Active track choice, accepts nullable tags, records device timezone automatically, and keeps `createdAt` system-maintained by default. `/add` remains as a compatibility route that redirects to `/import`.

### Batch JSON Import

Responsibilities:

- read `.json` files in the current Stage 7.9 import path
- accept pasted JSON through the same import parser
- require each batch item to declare `track` as `recognition` or `active`
- accept `tags` as an array, `null`, or omitted input normalized to `null`
- provide a JSON sample that can be given to conversation AI（对话式 AI）so the returned file can be directly read and stored by the app
- create an import preview before saving
- preserve row number and raw JSON fragment for correction
- report invalid JSON, unsupported track values, invalid tags, invalid rows, and duplicate candidates
- defer `.docx`, PDF, OCR, and complex document parsing to later stages

Current route: `/import`, Batch JSON import. It accepts `.json` files or pasted JSON, shows preview rows, reports total/new/duplicate/invalid counts, lets the user correct track / tags / fields before saving, and saves accepted candidates into a recorded import batch. The older text parser remains in code for backward compatibility, but the user-facing batch entry is JSON.

### Vocabulary Store

Responsibilities:

- persist vocabulary items
- preserve multiple examples for the same word when needed
- support search, filter, edit, archive, and export
- preserve import batch metadata for batch-created vocabulary items
- keep schema migration behavior explicit once a real database is introduced

Current route: `/library`. It reads from local browser storage and supports search, All / Recognition / Active / Weak Words / Archived filters, edit, archive, restore, hard delete, and JSON batch rollback. Hard delete and rollback also remove matching local review states and review events for the selected person. In `postgres-preview` runtime, these new destructive controls are intentionally blocked until a later accepted database-control stage adds matching API and adapter behavior.

### Review Scheduler

Responsibilities:

- calculate review due time
- prioritize overdue cards
- adjust intervals from user feedback
- smooth backlog after missed study days
- expose scheduling decisions in a debuggable way
- treat the first review rating as the starting point for review state

Stage 4 implements an explainable deterministic scheduler for the local MVP. The fixed rules are a bootstrap only. Later scheduling work should evaluate embedding（向量嵌入）for semantic similarity, confusing pairs, and queue ordering, and evaluate FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）for memory scheduling after reviewing data requirements, migration impact, and explainability.

Current route: `/review`. It creates a local Recognition Vocabulary review session from due cards first and new cards second, obeys the saved `recognitionSessionLimit`, lets the learner flip a card, records one of four ratings from either the main card controls or the right Session panel, appends `ReviewEvent`, and updates `ReviewState`. It can roll back the previous completed card with `回退1词` during a multi-card local session by removing that event and rebuilding that word's state from earlier history. It can also reset today's local review task after confirmation by removing only today's selected-person review events and rebuilding affected review states from earlier history. Active Vocabulary items are stored and visible in Library, but they are not scheduled into the current V1 recognition review queue.

### Flashcard Review

Responsibilities:

- show front and back of a card
- collect four fixed ratings: 完全忘记了, 有点忘记了, 模糊记得, 完全记得
- write review events
- update review state
- avoid overwhelming the user with too many cards in one session

Current implementation uses the Stage 7 soft sage UI, exposes session count, completed count, remaining count, answer reveal, mirrored rating controls, one-word rollback while a current later card exists, a review-completion modal, and a confirmed reset-today control. Empty queues refresh automatically after local Recognition Vocabulary data changes without interrupting an active card.

### Review Settings

Responsibilities:

- store legacy `sessionLimit` for compatibility
- store `recognitionSessionLimit`
- store `activeSessionLimit`
- store local timezone used by review settings
- normalize invalid limits into safe bounds
- make Recognition review queue selection obey the saved Recognition limit

Current route: `/settings`. It can save separate Recognition / Active daily limits and timezone to local browser storage. The default Recognition limit is 24, the default Active limit is 8, and both use safe bounds of 1 to 80.

### Storage Adapter

Development storage currently uses browser `localStorage`（本地浏览器存储）through `src/lib/vocabulary/local-storage-repository.ts`. The local migration path upgrades schema version 1 / 2 / 3 / 4 vocabulary data to schema version 5 by adding review data, `people`, `selectedPersonId`, person-scoped learning records, per-person settings, `learningTrack`, nullable `tags`, `meaningsZh`, `examples`, and separate Recognition / Active limits. Existing vocabulary items default to `learningTrack: "recognition"` and `tags: null`; `meaningsZh` and `examples` are derived from legacy `meaningZh` / `example` strings when present. Production storage should use a Postgres provider suitable for Vercel deployment, specifically the accepted Neon Postgres path through Vercel Marketplace.

Stage 5B storage decision:

- Preferred provider: Neon Postgres through Vercel Marketplace.
- Fallback: Supabase Postgres only if Neon is unavailable or later requirements need Supabase-native auth（认证）, realtime（实时）, or storage（文件存储）.
- Rejected for new work: `@vercel/postgres`, because Vercel Postgres is no longer available for new projects.
- Database client initialization must be lazy in any future implementation, so `next build` does not require database environment variables at module evaluation time.
- Future database implementation must add `person_id` to every learning-data repository method and query.

Stage 5D local readiness:

- `db/migrations/0001_initial.sql` is the current SQL migration. It has been applied to the non-production development Neon database only.
- The draft uses UUID database primary keys, while local backup string ids are mapped during import.
- `db/LOCAL_BACKUP_TO_POSTGRES.md` documents v3 JSON backup import validation, id mapping, count checks, and failure behavior.
- `src/lib/storage/durable-repository-contract.ts` defines future adapter boundaries and requires explicit person context for learning-data operations.
- `src/lib/storage/durable-schema.test.ts` statically checks `person_id`, person-scoped foreign keys, review uniqueness, indexes, and absence of credential/package coupling.

Stage 5E execution gate:

- Future remote work must start by switching the active working gate to Tier 3.
- The user must explicitly approve Vercel project, Vercel account scope, Neon account/project path, environment variable handling, package installation, migration execution, backup import, and deployment scope.
- A fresh JSON backup from `/export` is required before any remote import.
- Migration must be run against a non-production branch first.
- Any `person_id` leak, count mismatch, missing env var, wrong project, failed validation, or user pause request stops execution.

Stage 5F development / preview bootstrap:

- Vercel project: `anorias-projects/words-learning-app-for-mimi`.
- Neon resource: `words-learning-app-for-mimi-neon`, development / preview only.
- Local env file: `.env.local`, ignored by Git and never committed.
- Env example file: `.env.example`, placeholder names only.
- Database packages: `@neondatabase/serverless` and `dotenv-cli`.
- Database commands:
  - `npm run db:migrate:dev`
  - `npm run db:inspect:dev`
- Deployment status: Vercel currently has an active non-official Production deployment from branch `V1`, a manual verified Preview deployment, and a clean Git integration Preview deployment. Standard `vercel deploy` without `--prod` produced `target=preview`.
- Production migration, production import, production deployment, runtime storage cutover, backup import, and authentication remain out of scope until a later accepted plan.

Stage 5H runtime Postgres adapter design:

- Adapter must be server-only.
- App runtime remains `localStorage` by default.
- Development / preview can opt into Postgres after adapter tests.
- Production Postgres runtime remains disabled until formal V1 Production and access-boundary planning.
- Public write endpoints must not be exposed on the current non-official Production deployment.

Stage 5I runtime Postgres adapter implementation:

- `src/lib/storage/runtime-mode.ts` keeps `localStorage` as the default runtime and accepts only `local` or `postgres-preview`.
- `src/lib/storage/postgres/client.ts` lazily creates a Neon `Pool` only after runtime checks pass.
- `src/lib/storage/postgres/mappers.ts` maps snake_case Postgres rows into current domain types.
- `src/lib/storage/postgres/repository.ts` implements `DurableRepositoryPort` for people, review settings, vocabulary, imports, review queue, review events, and review states.
- `/api/storage/health` is a read-only development / preview health route.
- `/api/storage/smoke` is an opt-in write-path smoke route requiring `MIMI_STORAGE_RUNTIME=postgres-preview`, `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true`, and `x-mimi-storage-smoke: allow-dev-preview-write`.
- The Stage 5I implementation does not switch the UI runtime from browser `localStorage`.

Stage 5J read-only verification:

- `MIMI_STORAGE_RUNTIME=postgres-preview` is configured in Vercel Preview only.
- New verified Preview deployment: `dpl_CFeC2VwRKtMSAjBiGGtyStsFw2tr`.
- Preview health URL: `https://words-learning-app-for-mimi-dbkkkow3d-anorias-projects.vercel.app/api/storage/health`.
- Preview health returned `status=ready`, runtime `postgres-preview`, and zero counts for `people`, `vocabularyItems`, and `reviewEvents`.
- Development database inspection after verification still showed zero core business rows.
- `/api/storage/smoke` was not called and no write flag was enabled.

Stage 5K controlled write smoke:

- `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` was temporarily configured in Vercel Preview only.
- Smoke-enabled Preview deployment: `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv`.
- The smoke route wrote one fixed smoke person, one vocabulary item, one review state, one review event, and one review settings row.
- The smoke person id is `00000000-0000-4000-8000-0000000005f1`, slug `storage-smoke`.
- Person-scoping checks confirmed the smoke vocabulary, review state, and review event share the smoke `person_id`.
- `MIMI_ENABLE_STORAGE_SMOKE_WRITES` was removed from Preview after the write.
- Current verified disabled Preview deployment: `dpl_BJn1pFAbLiiY4LgCyThKx2vDTSar`.
- Current disabled Preview URL: `https://words-learning-app-for-mimi-7bzktk5uc-anorias-projects.vercel.app`.
- `/api/storage/smoke` on the disabled Preview returns reason `smoke-writes-not-enabled`.
- Smoke-enabled Preview deployment `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv` was removed.
- Production env vars, Production deployment, backup import, UI runtime cutover, and smoke row cleanup were not performed.

Stage 5L backup import harness and smoke cleanup:

- `scripts/backup-import-plan.mjs` builds a schema version 3 JSON backup import plan without database access.
- `scripts/backup-import-postgres.mjs` provides guarded fixture dry run, smoke cleanup, file-backed import dry run, rollback trial, guarded development commit, and fixture cleanup commands.
- `scripts/backup-import-plan.test.mjs` covers fixture mapping, metadata count rejection, and cross-person review reference rejection.
- New commands:
  - `npm run backup:dry-run:fixture`
  - `npm run db:cleanup-smoke:dev`
  - `npm run db:import-fixture-trial:dev`
  - `npm run db:import-fixture-commit:dev`
  - `npm run db:cleanup-fixture:dev`
- File-backed user backup command shape:
  - `STAGE5F_DATABASE_TARGET=development dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file <backup.json> --dry-run`
  - `STAGE5F_DATABASE_TARGET=development dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file <backup.json> --trial-rollback`
  - `STAGE5F_DATABASE_TARGET=development dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file <backup.json> --commit --i-confirm-development-import`
- Stage 5K smoke rows under person id `00000000-0000-4000-8000-0000000005f1` were cleaned from the development database.
- Fixture transaction trial inserted and rolled back `people=1`, `import_batches=1`, `vocabulary_items=1`, `review_states=1`, `review_events=1`, `review_settings=1`, `backup_imports=1`, and `backup_import_mappings=6`.
- Stage 5M file-backed fixture dry run and rollback trial inserted and rolled back the same shape, using `test_fixtures/stage5m-backup.json`.
- Stage 5M guarded file-backed commit required an empty development database and explicit `--i-confirm-development-import`.
- Stage 5M local UI runtime verification read the committed fixture through `/api/storage/data`, wrote one manual item through the same route, and then cleaned the fixture rows.
- Final development database inspection reports zero rows in core study tables.
- Production env vars, Production deployment, Production import, and Vercel Preview env mutation were not performed.

Stage 5M UI runtime cutover:

- Browser `localStorage` remains the default runtime.
- `useVocabularyData()` attempts `/api/storage/data` and switches to `postgres-preview` only when the server route reports ready.
- In `postgres-preview`, UI writes require mutation metadata and are sent to `/api/storage/data`.
- The Postgres UI write path is disabled unless `MIMI_ENABLE_STORAGE_UI_WRITES=true`.
- The API requires `x-mimi-ui-storage-write: allow-dev-preview-ui-write` for mutations.
- Vercel Production rejects the Postgres UI runtime.
- If the Postgres database is empty, the first write can create the default `Mimi` person; if people already exist, mutations require a valid selected database UUID.
- `/export` can still download the current runtime snapshot. JSON restore remains browser-local only; in `postgres-preview`, formal backup import should use the Stage 5M script path.

Stage 5N-A Preview read-only verification:

- Deployment: `dpl_HpcPDb5B2su2BLPWJVsYZjPDnWSg`.
- Preview URL: `https://words-learning-app-for-mimi-kb5b08c5v-anorias-projects.vercel.app`.
- Vercel inspect reported `target=preview`.
- Preview env still contains `MIMI_STORAGE_RUNTIME` and Neon variables, and still lacks `MIMI_ENABLE_STORAGE_UI_WRITES`.
- Production env remains empty.
- Preview storage health returned zero counts.
- Preview UI write attempt was blocked before request-body parsing because UI writes are disabled.
- Final development database inspection still reports zero rows in core study tables.

Stage 5N-B Preview controlled UI write smoke:

- Temporary write-enabled Preview deployment: `dpl_JgKNc9zuAqgMsy5w13gbZoqkEhnY`.
- Temporary write-enabled URL: `https://words-learning-app-for-mimi-8r2cn2jko-anorias-projects.vercel.app`.
- Controlled write created one person, one vocabulary item, and one review settings row.
- Smoke vocabulary item text: `stage five n preview ui write`.
- Cleanup command: `npm run db:cleanup-stage5n-ui-smoke:dev`.
- Cleanup removed one vocabulary item, one review settings row, and one person.
- Disabled Preview deployment after cleanup: `dpl_Athg2hWZK1gV6ereWdbYk1WXG58C`.
- Disabled Preview URL after cleanup: `https://words-learning-app-for-mimi-6v8azqoaa-anorias-projects.vercel.app`.
- `MIMI_ENABLE_STORAGE_UI_WRITES` was removed from Preview after the write.
- The temporary write-enabled deployment was removed.
- Production env remains empty and existing non-official Production deployment remains untouched.

### People And Person Switching

The app is intended for a small trusted private group, not only one learner. The future durable model should include:

- `people`
- `vocabulary_items.person_id`
- `import_batches.person_id`
- `review_states.person_id`
- `review_events.person_id`
- `review_settings.person_id`
- `backup_imports.person_id`
- `backup_import_mappings.person_id`

There is no accepted password, OAuth, or credential-isolation requirement yet. A future UI can offer a simple person switch. Every durable read/write must filter by selected `person_id`. This prevents mixing study histories while keeping the private-project workflow lightweight.

Current local implementation:

- `VocabularyData.schemaVersion` is 5.
- Local data includes `people` and `selectedPersonId`.
- Vocabulary items, import batches, review states, and review events include `personId`.
- Vocabulary items include required `learningTrack`, nullable `tags`, `meaningsZh`, and `examples`.
- Legacy `meaningZh` and `example` remain as first-entry compatibility display fields for existing views and Postgres preview mapping.
- Review settings are stored in `settingsByPerson` with legacy `sessionLimit`, `recognitionSessionLimit`, and `activeSessionLimit`.
- `/settings` includes a minimal person switch and add-person control.
- Local repository helpers filter active, archived, all-library, duplicate detection, review queues, and review writes by selected person.
- Schema version 1 / 2 / 3 / 4 local data migrates into version 5 by assigning existing data to the default person, defaulting existing words to Recognition Vocabulary with `tags: null`, and deriving `meaningsZh` / `examples` from legacy `meaningZh` / `example` strings.
- JSON backup export uses version 5; JSON backup restore still accepts version 2 / 3 / 4 backups and migrates them to version 5.

### Import And Export

Responsibilities:

- export vocabulary and review data to CSV or JSON
- support user-facing single vocabulary input and batch JSON import from `.json` files or pasted JSON
- defer `.docx` and PDF import until a later document-parsing stage
- protect against duplicate imports, malformed rows, and timezone drift

Current route: `/export`. It can download a complete schema version 5 JSON backup with metadata（元数据）, download a vocabulary CSV that includes `learningTrack`, `tags`, `meaningsZh`, and `examples`, parse JSON backup files locally, show restore counts, and restore schema version 2 / 3 / 4 / 5 data after explicit confirmation when runtime is browser-local. JSON restore rejects malformed files, unsupported backup shapes, incomplete required fields, invalid review references, unsupported track / tag values, invalid multi-meaning / multi-example fields, and missing metadata counts before mutating local browser storage. In `postgres-preview`, UI restore is disabled and formal backup import uses the guarded Stage 5M script path.

### Backup Format

Stage 5A uses a local backup envelope:

- `format`
- `backupVersion`
- `metadata`
- `data`

The `data` field contains the current `VocabularyData` schema version 5 shape. The metadata records app name, exported time, timezone, schema version, and counts for people, vocabulary items, archived items, import batches, review states, and review events. Schema version 5 vocabulary items include `learningTrack`, `tags`, `meaningsZh`, and `examples`, while legacy `meaningZh` / `example` remain for compatibility. Review settings include separate Recognition / Active daily limits.

### Deployment Boundary

The Vercel project is linked for development / preview work after explicit approval. Vercel currently has an active Production deployment from branch `V1`; it remains in place for now but is not the official V1 production release. Formal Production should wait for Stage 6A release gate design, accepted Stage 7 UI / visual design, and a later Stage 6B execution approval. In Stage 6B, `V1` should merge to `main`, and Vercel's production branch should remain `main`. Preview deployment work should use `vercel deploy` without `--prod` and must verify `target=preview`; Stage 5G verified this with Preview deployment `dpl_d5LUb6r1wEXiJBUENb2PACEZMVsu`. Stage 6A's release gate also requires re-checking the Vercel production branch, Production env vars, deployment target, Production database target, and no-credential private-URL risk before any formal Production action.

## Draft Data Model

This is the current development database schema model. It is applied only to the non-production development Neon database so far.

Stage 5F applied `db/migrations/0001_initial.sql` after explicit approval. Production execution still requires a separate confirmation.

Stage 7.9 updates the browser-local and backup JSON data model to schema version 5. The Postgres draft below remains the already-applied Stage 5F development / preview schema; no Stage 7.9 remote database migration was executed. The Postgres preview adapter maps only the first `meaningsZh` / `examples` entry through the existing `meaning_zh` / `example` columns until a later approved database migration exists.

### Vocabulary Item

- `id`
- `person_id`
- `surface_text`
- `normalized_text`
- `language`
- `meaning_zh`
- `context`
- `notes`
- `rarity_score`
- browser-local schema version 5 field: `learningTrack`
- browser-local schema version 5 field: nullable `tags`
- browser-local schema version 5 field: `meaningsZh`
- browser-local schema version 5 field: `examples`
- `source`
- `import_batch_id`
- `created_at`
- `updated_at`
- `system_created_at`
- `timezone`
- `archived_at`

### Import Batch

- `id`
- `person_id`
- `source_type`
- `file_name`
- `created_at`
- `total_rows`
- `accepted_rows`
- `duplicate_rows`
- `invalid_rows`

### Review State

- `id`
- `person_id`
- `vocabulary_item_id`
- `status`
- `due_at`
- `last_reviewed_at`
- `review_count`
- `lapse_count`
- `interval_minutes`
- `difficulty`
- `stability`
- `updated_at`

### Review Event

- `id`
- `person_id`
- `vocabulary_item_id`
- `reviewed_at`
- `rating`
- `previous_due_at`
- `next_due_at`
- `previous_interval_minutes`
- `next_interval_minutes`
- `elapsed_ms`

### Review Settings

- `person_id`
- `session_limit`
- `timezone`
- `updated_at`

### People

- `id`
- `display_name`
- `slug`
- `is_active`
- `created_at`
- `updated_at`

### Backup Import

- `id`
- `person_id`
- `source_file_name`
- `source_exported_at`
- `imported_at`
- `schema_version`
- `item_count`
- `review_event_count`
- `notes`

### Backup Import Mapping

- `id`
- `person_id`
- `backup_import_id`
- `entity_type`
- `source_id`
- `target_id`
- `created_at`

## Safety And Privacy

- Study data is private by default.
- Durable study data should be separated by `person_id` for each private learner.
- Person switching is convenience separation, not security isolation.
- No analytics, tracking, AI generation, or third-party data sharing should be added without explicit approval.
- Credentials and database URLs must stay out of source control.
- Export should be available before the project depends on production-only persistence.

## Known Edge Cases

- duplicate words with different meanings
- phrase cards versus single-word cards
- `.txt` files with mixed delimiters
- JSON import files with unsupported `track` values
- JSON import files with unsupported or non-array `tags`
- invalid, empty, or duplicated import rows
- case, punctuation, plural forms, and verb tenses
- missed review days and large overdue backlog
- local migration from version 1 to version 2
- local migration from version 1 / 2 to version 3
- local migration from version 1 / 2 / 3 to version 4
- local backup string ids needing UUID mapping during future Postgres import
- self-rated rarity that conflicts with review performance
- backfilled added time that differs from actual write time
- timezone changes between Australia and other regions
- accidental deletion or destructive migration
- invalid, stale, or manually edited JSON backup files
- review history entries pointing to missing vocabulary items
- accidental cross-person reads or writes if `person_id` is not filtered
- person switching without password isolation being misunderstood as security
- offline or slow mobile usage

## Validation Boundary

Current local validation commands:

- `npm run governance:preflight`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run db:inspect:dev`
- `npm run build`
- `npm audit --json`
- `npm run dev` plus browser smoke check

Current unit tests cover vocabulary normalization, text and JSON import parsing, nullable tag normalization, duplicate candidate handling, repository updates, timestamp preservation, archive/restore, import batch commits, local schema migration to version 4, person-scoped data separation, per-person Recognition / Active review settings, recognition-only queue selection, scheduler intervals, review event/state updates, JSON backup validation, CSV escaping including `learningTrack` / `tags`, invalid backup rejection, broken review-reference rejection, backup round trip behavior, and Stage 5D SQL static checks. Later validation should cover:

- duplicate card behavior
- empty deck behavior
- timezone scheduling
- browser-level download and restore interaction checks
- cross-person data separation once Neon persistence is implemented
- actual database migration dry run once credentials and Neon setup are explicitly approved
- embedding or FSRS migration safety when those later stages are explicitly approved
