# Words Learning App For Mimi

Accepted Stage 8 Review Memory Algorithm for Mimi's mobile-first vocabulary app, with local vocabulary, single input, batch JSON import, recognition-only review scheduler, flashcards, local export / backup, local multi-person adapter, durable storage readiness, development / preview Neon bootstrap, server-only runtime Postgres adapter, controlled Preview smoke checks, backup import harness, development / preview UI runtime cutover, read-only Preview UI runtime verification, a locally accepted darker sage visual design pass with Motion for React interaction animation plus Stage 7.2 Mimi brand refinement, Stage 7.3 ChillRoundF font trial, Stage 7.4 light / dark theme toggle, Stage 7.5 soft click sound audition, Stage 7.6 UI-only sound settings, Stage 7.7 final acceptance, Stage 7.8 dual-track UI refinement, Stage 7.9 Recognition / Active data import refinement, Stage 7.10 Library / Review controls, Stage 7.11 Review rollback / auto-refresh controls, Stage 8-B / 8-C / 8-D / 8-E / 8-F / 8-G Recognition Vocabulary（阅读词汇）memory behavior, backup compatibility, Postgres Production handoff, and final local acceptance, plus Stage 6B-P1-B local schema version 5 migration/static tests, Stage 6B-P1-C local `postgres-production` runtime / API contract tests, Stage 6B-P1-D local repository parity, Stage 6B-P1-E local backup import version 5 support, Stage 6B-P1-F non-production database verification, Stage 6B-P1-G-A Production execution handoff documentation, Stage 6B-P1-G-B read-only Production inventory, Stage 6B-P1-G-C-0 human decision packet, Stage 6B-P1-G-C-1 read-only provider supplement, and Stage 6B-P1-G-C-2 evidence route decision for the future Postgres Production runtime path.

## Commands

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run db:inspect:dev
npm run db:inspect:schema5:dev
npm run build
npm run dev
```

Database commands require ignored `.env.local` values from the approved Vercel / Neon setup:

```bash
npm run db:migrate:dev
npm run db:migrate:schema5:dev
npm run db:inspect:dev
npm run db:inspect:schema5:dev
npm run db:verify:schema5-active-guard:dev
npm run db:test:repository:dev
npm run db:cleanup-smoke:dev
npm run db:import-fixture-trial:dev
npm run db:import-schema5-fixture-trial:dev
npm run db:import-fixture-commit:dev
npm run db:import-schema5-fixture-commit:dev
npm run db:cleanup-fixture:dev
```

File-backed backup import command shape for development only:

```bash
STAGE5F_DATABASE_TARGET=development dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file <backup.json> --dry-run
STAGE5F_DATABASE_TARGET=development dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file <backup.json> --trial-rollback
STAGE5F_DATABASE_TARGET=development dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file <backup.json> --commit --i-confirm-development-import
```

## Current Scope

- Next.js App Router scaffold.
- Minimal routes for dashboard, study, add, import, review, library, practice lab, export, and settings.
- Local single vocabulary input, library search/edit/archive/restore/hard delete, JSON batch rollback, and `.json` / pasted JSON import preview.
- Local Recognition Vocabulary（阅读词汇）review sessions with four ratings, side-panel rating buttons, review event/state updates, one-word rollback, reset-today review control, conservative empty-queue auto-refresh, customizable Recognition daily limit（每日上限）, same-session repeat for failed ratings, and FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）cross-day scheduling.
- Stage 8-C same-session repeat: `完全忘记了` and `有点忘记了` record attempts and requeue the word within the current Recognition session until the learner chooses `模糊记得` or `完全记得`.
- Stage 8-D scheduler replacement: V1 Recognition reviews use `ts-fsrs` with deterministic calibration, write neutral `difficulty` / `stability` state fields, rebuild state through reset / rollback event replay, and select due cards by Mimi's local natural-day bucket（本地自然日分桶）instead of exact prior-review clock time.
- Stage 8-E backup compatibility: schema version 5 remains sufficient; JSON restore rejects impossible Active Vocabulary review states/events while preserving Active words without review history and Recognition FSRS state values.
- Stage 8-F Postgres Production handoff: Stage 6B-P1 records the final V1 Recognition FSRS state shape and keeps `dueAt` exact with natural-day queue semantics in app code.
- Stage 8-G final acceptance: full local validation and a local browser review-flow smoke check accepted Stage 8; Stage 6B-P1 is now the next separate implementation stage after explicit approval.
- Stage 6B-P1-B local schema and static tests: `db/migrations/0002_schema5_production_runtime.sql` drafts schema version 5 Production persistence with JSONB（JSON 二进制存储）arrays, dual Recognition / Active limits, JSON import sources, backup schema 5 support, and database-level Active review row guards.
- Stage 6B-P1-C local runtime / API contract: `MIMI_STORAGE_RUNTIME=postgres-production` is now parsed and accepted only in Vercel Production; `/api/storage/health` and `/api/storage/data` have guarded Production behavior; Preview UI writes still require development / preview flags. The shared Postgres repository/database behavior has been validated in P1-F, but the `postgres-production` route has not been exercised in Production.
- Stage 6B-P1-D local repository parity: Postgres mappers and repository SQL now target schema version 5 arrays, tracks, tags, JSON import sources, dual limits, hard delete, JSON batch rollback, reset-today Review rebuild, and one-word Review rollback rebuild.
- Stage 6B-P1-E local backup import version 5: backup import planning and Postgres insert scripts now accept schema version 5, preserve multi-meaning / multi-example fields, JSON sources, dual limits, and reject Active Vocabulary review state/event rows before writing.
- Stage 6B-P1-F non-production database verification: `0002_schema5_production_runtime.sql` has been applied only to the approved non-production development database; schema version 5 columns / constraints / trigger guards, fixture rollback/commit/cleanup, and actual Postgres repository integration behavior were verified, with final development database business counts back to zero.
- Stage 6B-P1-G-A / P1-G-B / P1-G-C-0 / P1-G-C-1 / P1-G-C-2 Production handoff: `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md` records an empty Production start, no development-data copy, no formal first-launch backup import, and the completed read-only Vercel / Neon inventory. `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md` records the remaining P1-G-C decision packet. `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md` records that the Vercel-managed Neon resource is owned, available, Free-plan, and connected only to Development / Preview; Production env vars and database target are absent. `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md` recommends human dashboard evidence as the next safest route, with redaction rules for secrets and connection metadata.
- Local Active Vocabulary（输出词汇）classification and lower-volume daily limit setting; Active words are stored, exported, and imported, but V1 must not put them in review queue（复习队列）, create review state（复习状态）, or create review event（复习事件）. Dictation, spelling, writing practice, prompt version（提示词版本）, and AI API（人工智能接口）feedback remain future work.
- Local JSON backup（JSON 备份）download, vocabulary CSV（逗号分隔值）download with `learningTrack` / `tags`, and JSON restore preview.
- Local `people` and selected person switching, with vocabulary, imports, review history, and review settings scoped by `personId`.
- Stage 5B storage decision: future durable storage should use one Neon Postgres（关系型数据库）database with a `people` table and `person_id` separation for each learner's data.
- Stage 5D durable storage readiness: local SQL migration（迁移）draft, backup-to-Postgres mapping, repository adapter contract（仓储适配层接口）, and SQL static tests.
- Stage 5E execution gate: documented approval checklist, remote execution order, stop conditions, and rollback direction before Neon/Vercel action.
- Stage 5F development / preview bootstrap: linked the Vercel project, created the Neon resource for development / preview, pulled ignored local env vars, added minimal database scripts, applied `0001_initial.sql` to the non-production development database, and verified the empty schema.
- Current Vercel Production deployment status is non-official: Vercel reports active deployment `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD` from branch `V1`; keep it documented but do not treat it as the formal V1 production release.
- Verified Preview deployment: `https://words-learning-app-for-mimi-bwfhi5rap-anorias-projects.vercel.app` (`dpl_d5LUb6r1wEXiJBUENb2PACEZMVsu`, inspected as `target=preview`).
- Clean Git integration Preview deployment: `https://words-learning-app-for-mimi-aczic0spy-anorias-projects.vercel.app` (`dpl_EmhfvP8yE9NrxCWPcdK3Qdd8sdk8`, from committed `origin/V1`).
- Stage 5I runtime Postgres adapter: server-only development / preview adapter modules exist for health checks, people, vocabulary, imports, review settings, review queue, review events, and review states.
- Stage 5J read-only verification: Preview deployment `https://words-learning-app-for-mimi-dbkkkow3d-anorias-projects.vercel.app` (`dpl_CFeC2VwRKtMSAjBiGGtyStsFw2tr`) verified `/api/storage/health` with `postgres-preview` and zero database rows.
- Stage 5K controlled write smoke: temporarily enabled `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` in Preview only, ran one `/api/storage/smoke` write, verified exactly one smoke row set in the development database, removed the write flag, deployed disabled Preview `https://words-learning-app-for-mimi-7bzktk5uc-anorias-projects.vercel.app` (`dpl_BJn1pFAbLiiY4LgCyThKx2vDTSar`), and removed the smoke-enabled Preview deployment.
- Stage 5L backup import harness and cleanup: added fixture backup import dry run, development DB fixture transaction trial with rollback, and cleaned the Stage 5K smoke rows. The development database now reports zero rows in core study tables.
- Stage 5M backup import and UI runtime cutover: added file-backed backup dry run, rollback trial, and guarded development commit; added `/api/storage/data`; updated the UI data hook and write flows so development / preview can read/write through Postgres when explicitly enabled.
- Stage 5N Preview UI runtime verification: Stage 5N-A created read-only Preview deployment `https://words-learning-app-for-mimi-kb5b08c5v-anorias-projects.vercel.app` (`dpl_HpcPDb5B2su2BLPWJVsYZjPDnWSg`) and verified the Postgres read path. Stage 5N-B temporarily enabled Preview UI writes, created write-enabled Preview deployment `https://words-learning-app-for-mimi-8r2cn2jko-anorias-projects.vercel.app` (`dpl_JgKNc9zuAqgMsy5w13gbZoqkEhnY`), wrote one controlled smoke row, cleaned it, removed the write flag, removed the write-enabled deployment, and created disabled Preview deployment `https://words-learning-app-for-mimi-6v8azqoaa-anorias-projects.vercel.app` (`dpl_Athg2hWZK1gV6ereWdbYk1WXG58C`).
- Confirmed release sequence: Stage 6A documents the Production（生产环境）release gate only, Stage 7 completes UI（用户界面）/ visual design and optional PWA（Progressive Web App，渐进式 Web 应用）work before formal Production, and Stage 6B later handles merge（合并）to `main` plus formal Production execution after explicit approval.
- Stage 6A release gate: documented the formal Production checklist, access boundary, env matrix, database migration and backup/import/rollback expectations, and the rule that `person_id` separates learning data but is not security isolation.
- Stage 6B Production execution plan: `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md` records the 2026-07-08 user decision to launch formal V1 with shared Postgres Production. `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md` is the required runtime bridge before merge, Production migration, and deployment; Stage 8 is accepted, Stage 6B-P1-B has added the local schema draft, Stage 6B-P1-C has added the local runtime / API contract, Stage 6B-P1-D has added local repository parity, Stage 6B-P1-E has added local backup import version 5 support, Stage 6B-P1-F has validated the migrated non-production development database, Stage 6B-P1-G-A has documented the empty Production handoff, Stage 6B-P1-G-B has completed the read-only account inventory, Stage 6B-P1-G-C-0 has documented the human decision packet, Stage 6B-P1-G-C-1 has completed the read-only provider supplement, and Stage 6B-P1-G-C-2 has selected human dashboard evidence as the recommended next route. The next gate is actual exact Neon branch / database / recovery evidence plus final P1-G-C decisions.
- Stage 8 Review Memory Algorithm: `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md` documents and accepts the Recognition-only FSRS-6 plan, same-session repeat for failed Recognition ratings, Active Vocabulary no-scheduling boundary, neutral `difficulty` / `stability` naming, and V2-compatible separate future Active scheduler dimensions such as `review_profile`, `skill_type`, or `activity_type`.
- Stage 7 UI（用户界面）visual design: added `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`, a darker soft sage palette, Motion for React interaction animation（交互动效）, desktop sidebar navigation, mobile bottom navigation, and redesigned dashboard / flashcard / import / library / export / settings surfaces. Stage 7.2 adds `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md`, the local cat avatar brand area, `咪咪 Vocabulary`, smaller desktop action cards, and stronger hover / tap feedback. Stage 7.3 adds `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md` and self-hosted ChillRoundF 寒蝉全圆体 `v3.200` for CJK（中日韩文字）UI text. Stage 7.4 adds `plan_docs/PLAN_V1_STAGE7_4_THEME_TOGGLE.md`, `dark` / `light` UI theme（主题）switching in Settings, and a separate `mimi-ui-theme-v1` UI preference key. Stage 7.5 adds `plan_docs/PLAN_V1_STAGE7_5_SOFT_CLICK_SOUND_TRIAL.md`, one Kenney CC0 click sound asset, and a low-volume Settings audition control. Stage 7.6 adds `plan_docs/PLAN_V1_STAGE7_6_SOUND_DESIGN.md`, `mimi-ui-sound-v1` UI-only sound settings, app-wide soft button feedback, and a review-completion modal using the user-provided Mimi sound. Stage 7.7 adds `plan_docs/PLAN_V1_STAGE7_7_FINAL_ACCEPTANCE.md`, recording local validation, route / asset checks, API safety smoke checks, and focused Settings browser acceptance. Stage 7.8 adds `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`, a Today Hub, Recognition Vocabulary / Active Vocabulary UI track cards, Study / 学习 and Practice Lab / 练习室 entries, Library filters and mastery labels, and a more intentional cat Home Brand Button. Stage 7.9 adds `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`, schema version 5 `learningTrack` / nullable `tags` / `meaningsZh` / `examples`, `/import` Single input and Batch JSON import, separate Recognition / Active daily limits, nullable `rarityScore`, and Recognition-only review scheduling. Stage 7.10 adds `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md`, interactive side-panel review buttons, Library hard delete, JSON batch rollback, `Batch imported` chips, and reset-today review confirmation. Stage 7.11 adds `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md`, removes confusing Review regenerate buttons, adds conservative empty-queue auto-refresh, and adds browser-local `回退1词`. PTE / IELTS persisted exam-mode classification and AI API implementation remain out of V1 scope.
- Runtime mode stays `local` by default. Development / Preview Postgres UI runtime requires `MIMI_STORAGE_RUNTIME=postgres-preview`; Preview UI writes also require `MIMI_ENABLE_STORAGE_UI_WRITES=true` and `x-mimi-ui-storage-write: allow-dev-preview-ui-write`. Production Postgres runtime requires `MIMI_STORAGE_RUNTIME=postgres-production` in Vercel Production and still needs later database validation before formal launch.
- Vercel Preview currently has `MIMI_STORAGE_RUNTIME=postgres-preview` from Stage 5J, but `MIMI_ENABLE_STORAGE_UI_WRITES` has not been added to Vercel.
- Browser `localStorage`（本地浏览器存储）remains the default fallback and local restore target. In `postgres-preview`, formal backup import uses the guarded Stage 5M script path.
- No Production database migration, Production deployment, authentication, external API, analytics, Production backup import, or Production study-data mutation yet.

Project rules live in `AGENTS.md`. Stage plans live in `plan_docs/`.
