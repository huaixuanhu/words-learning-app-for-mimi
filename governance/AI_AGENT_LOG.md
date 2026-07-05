# AI Agent Log

## 2026-07-05 13:09 AEST

- Task: execute Stage 5F development / preview Vercel and Neon bootstrap after the user supplied approvals and asked to continue after token refresh.
- Plan agreed: yes. The user approved Vercel link/project creation, Neon creation through the Vercel path, development / preview env handling, minimal database packages, non-production migration dry run, schema inspection, and smoke testing. Production migration, production import, and production deployment still require separate confirmation.
- Changed files:
  - `.env.example`
  - `.gitignore`
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `README.md`
  - `db/migrations/0001_initial.sql`
  - `governance/AI_AGENT_LOG.md`
  - `package-lock.json`
  - `package.json`
  - `plan_docs/PLAN_V1_MASTER.md`
  - `plan_docs/PLAN_V1_STAGE5F_DEV_PREVIEW_NEON_BOOTSTRAP.md`
  - `scripts/db-connection.mjs`
  - `scripts/inspect-database-schema.mjs`
  - `scripts/run-sql-migration.mjs`
  - `src/lib/storage/durable-schema.test.ts`
- Reason: complete the accepted non-production remote dry run for the Neon Postgres direction while preserving the browser-local runtime and keeping production data/deployment boundaries explicit.
- Implementation notes:
  - Verified the Vercel user/project boundary and created/linked `anorias-projects/words-learning-app-for-mimi`.
  - Created Neon resource `words-learning-app-for-mimi-neon` for Development and Preview through the Vercel Marketplace path after the user accepted Marketplace terms.
  - Pulled generated env vars into ignored `.env.local` without printing values.
  - Added `.env.example` with placeholder connection URL names only and kept `.env.local` / `.vercel` ignored.
  - Installed `@neondatabase/serverless` and `dotenv-cli`; no ORM was added.
  - Added guarded `db:migrate:dev` and `db:inspect:dev` scripts requiring `STAGE5F_DATABASE_TARGET=development`.
  - Updated the SQL migration header from Stage 5D draft language to Stage 5F non-production execution language.
  - Applied `db/migrations/0001_initial.sql` to the development Neon database.
  - Added read-only schema inspection for expected tables, indexes, constraints, and empty business-table counts.
  - Updated docs to state that the app runtime still uses browser `localStorage` and that the runtime Postgres adapter remains future work.
  - Attempted a preview deployment with `npx vercel@latest --yes --target preview`; Vercel CLI returned `target: production` and assigned production aliases. The unexpected deployment `dpl_Hgn5b9j7TD3GEEiZjzvNh8Mvoe5b` was removed immediately, and follow-up inspection reported no deployments.
- Validation:
  - Passed: `npm run db:migrate:dev`
  - Passed: `npm run db:inspect:dev`, reporting 8 tables, 11 indexes, 5 key constraints, and zero rows in core business tables.
  - Passed: `npm run test` with 10 test files and 35 tests.
  - Passed: `npm run typecheck`
  - Passed: `npm run lint`
  - Passed: `npm run build`
  - Passed: `npm audit --json` with 0 vulnerabilities.
  - Passed: local browser smoke test for settings/person switching, manual add, pasted-text import, library edit/archive, review recording, JSON backup button, CSV button, and browser console errors.
  - Passed: Vercel read-only deployment cleanup checks; removed deployment id and production alias were not found, and `npx vercel@latest ls words-learning-app-for-mimi` reported no deployments.
  - Passed: `npx vercel@latest env ls` confirmed the database env vars are scoped to Development and Preview only.
- Safety notes: remote work was intended for development / preview only. Secret values were not printed or committed. No backup import was performed because the user confirmed local storage is empty. No production database migration, production import, runtime Postgres adapter, authentication implementation, analytics, AI generation, email, payment, notification, GitHub push, or active Vercel deployment remains. Preview deployment is paused until the Vercel CLI target mismatch and project production-branch behavior are checked in a separate step.

## 2026-07-05 01:29 AEST

- Task: start Stage 5E by documenting the Neon execution gate after the user asked to begin the next stage.
- Plan agreed: yes. The bounded next step was documentation-only execution planning before any Tier 3 remote action.
- Changed files:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `README.md`
  - `governance/AI_AGENT_LOG.md`
  - `plan_docs/PLAN_V1_MASTER.md`
  - `plan_docs/PLAN_V1_STAGE5E_NEON_EXECUTION_GATE.md`
- Reason: define the approval gate, future execution sequence, stop conditions, rollback direction, and validation path before any Neon/Vercel credential or remote database work.
- Implementation notes:
  - Checked current official Vercel and Neon docs for Postgres, Neon integration, Next.js access, and environment variable behavior.
  - Recorded that future remote work must upgrade to Tier 3.
  - Recorded required explicit approvals before Vercel/Neon execution.
  - Recorded fresh JSON backup, non-production migration dry run, backup import trial, and person-scoped verification expectations.
  - Recorded stop conditions and rollback direction.
- Validation:
  - Passed: `npm run governance:preflight`
- Safety notes: documentation and planning only. No Neon project creation, Vercel Marketplace installation, Vercel CLI command, database package installation, `.env` editing, credential access, remote migration, remote data mutation, authentication implementation, production deployment, GitHub push, embedding generation, FSRS implementation, analytics, AI generation, email, payment, notification, or production action was performed.

## 2026-07-05 01:12 AEST

- Task: implement Stage 5D durable storage readiness after the user confirmed execution.
- Plan agreed: yes. The accepted scope was local SQL schema draft, repository adapter contract, backup-to-Postgres mapping, static validation, and documentation only, with no Neon project creation, no database package installation, no `.env` work, no remote migration, no deployment, and no authentication implementation.
- Changed files:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `README.md`
  - `db/LOCAL_BACKUP_TO_POSTGRES.md`
  - `db/migrations/0001_initial.sql`
  - `governance/AI_AGENT_LOG.md`
  - `plan_docs/PLAN_V1_MASTER.md`
  - `plan_docs/PLAN_V1_STAGE5D_DURABLE_STORAGE_READINESS.md`
  - `src/lib/storage/durable-repository-contract.ts`
  - `src/lib/storage/durable-schema.test.ts`
- Reason: prepare the database and code boundaries for the accepted one-Neon-Postgres / many-people durable model before any credential, migration, or remote persistence work.
- Implementation notes:
  - Added a local SQL draft with `people`, `import_batches`, `vocabulary_items`, `review_states`, `review_events`, `review_settings`, `backup_imports`, and `backup_import_mappings`.
  - Added `person_id` to every durable learning-data and backup mapping table.
  - Added person-scoped foreign keys, review-state uniqueness by `(person_id, vocabulary_item_id)`, and indexes for the expected query paths.
  - Documented schema version 3 JSON backup import mapping, local string id to database UUID mapping, validation, count checks, and failure behavior.
  - Added a TypeScript repository adapter contract requiring explicit person context.
  - Added Vitest static checks for the SQL draft.
- Validation:
  - Passed: `npm run test` with 10 test files and 35 tests.
  - Passed: `npm run typecheck`
  - Passed: `npm run lint`
  - Passed: `npm run build`
  - Passed: `npm audit --json` with 0 vulnerabilities.
  - Passed: `npm run governance:preflight`
- Safety notes: local source, SQL draft, tests, and documentation only. No Neon project creation, Vercel Marketplace installation, database package installation, `.env` editing, credential access, remote migration, remote data mutation, authentication implementation, production deployment, GitHub push, embedding generation, FSRS implementation, analytics, AI generation, email, payment, notification, or production action was performed. The SQL migration draft was not executed.

## 2026-07-05 00:54 AEST

- Task: implement Stage 5C local person adapter after the user confirmed execution.
- Plan agreed: yes. The accepted scope was local code preparation for `people` / `personId` separation only, with no Neon project creation, no database package installation, no `.env` work, no deployment, and no authentication implementation.
- Changed files:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `README.md`
  - `governance/AI_AGENT_LOG.md`
  - `plan_docs/PLAN_V1_MASTER.md`
  - `plan_docs/PLAN_V1_STAGE5C_LOCAL_PERSON_ADAPTER.md`
  - `src/app/settings/page.tsx`
  - `src/components/review/review-session.tsx`
  - `src/components/settings/person-settings-form.tsx`
  - `src/components/settings/review-settings-form.tsx`
  - `src/components/vocabulary/home-dashboard.tsx`
  - `src/components/vocabulary/vocabulary-library.tsx`
  - `src/components/export/export-workspace.tsx`
  - `src/lib/backup/csv-export.test.ts`
  - `src/lib/backup/csv-export.ts`
  - `src/lib/backup/json-backup.test.ts`
  - `src/lib/backup/json-backup.ts`
  - `src/lib/backup/types.ts`
  - `src/lib/people/repository.ts`
  - `src/lib/review/repository.test.ts`
  - `src/lib/review/repository.ts`
  - `src/lib/review/scheduler.test.ts`
  - `src/lib/review/scheduler.ts`
  - `src/lib/review/settings.test.ts`
  - `src/lib/review/settings.ts`
  - `src/lib/review/types.ts`
  - `src/lib/vocabulary/local-storage-repository.test.ts`
  - `src/lib/vocabulary/local-storage-repository.ts`
  - `src/lib/vocabulary/repository.ts`
  - `src/lib/vocabulary/types.ts`
- Reason: align local behavior with the accepted future durable model where multiple trusted people share one project but study data is separated by person.
- Implementation notes:
  - Upgraded local data to schema version 3.
  - Added `people`, `selectedPersonId`, and `settingsByPerson`.
  - Added `personId` to vocabulary items, import batches, review states, and review events.
  - Migrated schema version 1 / 2 local data to the default person.
  - Added person-scoped repository, scheduler, review, settings, duplicate detection, CSV export, and JSON backup behavior.
  - Added a minimal person switch and add-person control in `/settings`.
- Validation:
  - Passed: `npm run test` with 9 test files and 30 tests.
  - Passed: `npm run typecheck`
  - Passed: `npm run lint`
  - Passed: `npm run governance:preflight`
  - Passed: `npm run build`
  - Passed: `npm audit --json` with 0 vulnerabilities.
  - Passed: local dev server smoke checks for `/settings`, `/library`, `/review`, and `/export` on `http://localhost:3000`.
- Safety notes: local source, documentation, browser-local schema migration, and local person switching only. No Neon project creation, Vercel Marketplace installation, database package installation, `.env` editing, credential access, remote migration, remote data mutation, authentication implementation, production deployment, GitHub push, embedding generation, FSRS implementation, analytics, AI generation, email, payment, notification, or production action was performed.

## 2026-07-05 00:41 AEST

- Task: document Stage 5B storage provider decision and multi-person data model after the user confirmed the stage and clarified the app will be used by a small private group.
- Plan agreed: yes. The user confirmed Stage 5B and specified one Neon Postgres（关系型数据库）, a `people` table, and `person_id` separation for all learning data, without password / credential isolation.
- Changed files:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `README.md`
  - `governance/AI_AGENT_LOG.md`
  - `plan_docs/PLAN_V1_MASTER.md`
  - `plan_docs/PLAN_V1_STAGE5B_STORAGE_PROVIDER_DECISION.md`
- Reason: convert the durable storage plan from single-person assumptions to private multi-person data separation before any remote database work.
- Implementation notes:
  - Recorded Neon Postgres through Vercel Marketplace as the preferred durable storage provider.
  - Recorded Supabase Postgres as fallback only if later needs justify its larger platform surface.
  - Recorded that `@vercel/postgres` is not the new-project path.
  - Added the future `people` table and `person_id` requirement for vocabulary items, import batches, review states, review events, review settings, and backup imports.
  - Clarified that no-password person switching is convenience separation for trusted private users, not security isolation.
- Validation:
  - Passed: `npm run governance:preflight`.
- Safety notes: documentation and architecture planning only. No Neon project creation, Vercel Marketplace installation, database migration, remote data mutation, package installation, `.env` editing, credential access, authentication implementation, deployment, GitHub push, embedding generation, FSRS implementation, analytics, AI generation, email, payment, notification, or production action was performed.

## 2026-07-05 00:23 AEST

- Task: implement Stage 5A local export and backup after the user confirmed execution.
- Plan agreed: yes. The user confirmed the Stage 5A plan, which keeps durable database provider selection, deployment, credentials, cloud sync, embedding（向量嵌入）, and FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）out of scope.
- Changed files:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `README.md`
  - `governance/AI_AGENT_LOG.md`
  - `plan_docs/PLAN_V1_MASTER.md`
  - `plan_docs/PLAN_V1_STAGE5A_LOCAL_EXPORT_BACKUP.md`
  - `src/app/export/page.tsx`
  - `src/components/export/export-workspace.tsx`
  - `src/lib/backup/csv-export.test.ts`
  - `src/lib/backup/csv-export.ts`
  - `src/lib/backup/json-backup.test.ts`
  - `src/lib/backup/json-backup.ts`
  - `src/lib/backup/types.ts`
- Reason: provide a local backup and restore path before remote persistence, deployment, or production-only storage.
- Implementation notes:
  - Added a JSON backup envelope with `format`, `backupVersion`, `metadata`, and schema version 2 `data`.
  - Added metadata counts for vocabulary items, archived items, import batches, review states, and review events.
  - Added vocabulary CSV export with stable headers and CSV escaping.
  - Added `/export` actions for JSON backup download, CSV download, JSON backup file parsing, restore preview, and explicit local restore.
  - Added validation that rejects malformed JSON, unsupported backup shapes, missing required fields, missing metadata counts, and review records that reference missing vocabulary items.
- Validation:
  - Passed: `npm run test` with 9 test files and 26 tests.
  - Passed: `npm run typecheck`
  - Passed: `npm run lint`
  - Passed: `npm run governance:preflight`
  - Passed: `npm run build`
  - Passed: `npm audit --json` with 0 vulnerabilities.
  - Passed: local dev server smoke check for `/export` on `http://localhost:3000`.
- Safety notes: local source, documentation, browser-local export, and browser-local restore preview only. No database creation, remote migration, production data mutation, Vercel deployment, GitHub push, credential access, `.env` editing, external API integration, cloud sync, embedding generation, FSRS implementation, analytics, AI generation, email, payment, notification, or production action was performed. JSON backup files can contain personal study data and should be kept private.

## 2026-07-04 23:42 AEST

- Task: implement Stage 4 local review scheduler, flashcards, and customizable session limit after the user confirmed the revised Stage 4 plan.
- Plan agreed: yes. The user confirmed Stage 4 execution and added that future embedding（向量嵌入）/ FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）direction must be documented, while `sessionLimit` must be user-customizable and actually affect review.
- Changed files:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `README.md`
  - `governance/AI_AGENT_LOG.md`
  - `plan_docs/PLAN_V1_MASTER.md`
  - `plan_docs/PLAN_V1_STAGE4_REVIEW_SCHEDULER_FLASHCARDS.md`
  - `src/app/page.tsx`
  - `src/app/review/page.tsx`
  - `src/app/settings/page.tsx`
  - `src/components/review/review-session.tsx`
  - `src/components/settings/review-settings-form.tsx`
  - `src/components/vocabulary/home-dashboard.tsx`
  - `src/lib/review/repository.ts`
  - `src/lib/review/repository.test.ts`
  - `src/lib/review/scheduler.ts`
  - `src/lib/review/scheduler.test.ts`
  - `src/lib/review/settings.ts`
  - `src/lib/review/settings.test.ts`
  - `src/lib/review/types.ts`
  - `src/lib/stage-two-data.ts`
  - `src/lib/vocabulary/local-storage-repository.ts`
  - `src/lib/vocabulary/local-storage-repository.test.ts`
  - `src/lib/vocabulary/repository.ts`
  - `src/lib/vocabulary/types.ts`
- Reason: close the local review loop before durable persistence, export/backup, deployment, polished visual design, or advanced scheduling.
- Implementation notes:
  - Upgraded local browser storage shape to schema version 2 with additive migration from version 1.
  - Added `reviewStates`, `reviewEvents`, and `settings` while preserving existing vocabulary and import batches.
  - Added a deterministic Stage 4 scheduler with due-first queue selection, new-card fallback, and saved `sessionLimit` enforcement.
  - Added `/review` session UI for card reveal, four-rating submission, review event creation, review state updates, and next-card progression.
  - Added `/settings` session limit and timezone saving, with safe session limit normalization.
  - Documented that fixed rules are an MVP bootstrap and later scheduling should evaluate embedding and FSRS through a separate explicit plan.
- Validation:
  - Passed: `npm run test` with 7 test files and 20 tests.
  - Passed: `npm run typecheck`
  - Passed: `npm run lint`
  - Passed: `npm run build`
  - Passed: `npm audit --json` with 0 vulnerabilities.
  - Passed: `npm run governance:preflight`
  - Passed: local dev server smoke checks for `/`, `/review`, and `/settings` on `http://localhost:3000`.
- Safety notes: local source, documentation, and browser-local study-data code only. No database creation, remote migration, remote persistent data mutation, Vercel deployment, GitHub push, credential access, `.env` editing, external API integration, embedding generation, FSRS implementation, analytics, AI generation, email, payment, notification, or production action was performed. Stage 4 review history remains browser `localStorage`, so it is not a durable backup or cross-device storage.

## 2026-07-04 01:14 AEST

- Task: implement Stage 3 local vocabulary CRUD and `.txt` / pasted text import after the user confirmed the Stage 3 design.
- Plan agreed: yes. The user confirmed the Stage 3 design and requested rigorous implementation according to the agreed plan and rules.
- Changed files:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `README.md`
  - `package.json`
  - `package-lock.json`
  - `vitest.config.ts`
  - `plan_docs/PLAN_V1_MASTER.md`
  - `plan_docs/PLAN_V1_STAGE3_VOCABULARY_CRUD_IMPORT.md`
  - `src/app/page.tsx`
  - `src/app/import/page.tsx`
  - `src/app/library/page.tsx`
  - `src/app/review/page.tsx`
  - `src/components/add-word-form.tsx`
  - `src/components/vocabulary/home-dashboard.tsx`
  - `src/components/vocabulary/import-workspace.tsx`
  - `src/components/vocabulary/use-vocabulary-data.ts`
  - `src/components/vocabulary/vocabulary-library.tsx`
  - `src/lib/stage-two-data.ts`
  - `src/lib/vocabulary/import-parser.ts`
  - `src/lib/vocabulary/import-parser.test.ts`
  - `src/lib/vocabulary/local-storage-repository.ts`
  - `src/lib/vocabulary/normalize.ts`
  - `src/lib/vocabulary/normalize.test.ts`
  - `src/lib/vocabulary/repository.ts`
  - `src/lib/vocabulary/repository.test.ts`
  - `src/lib/vocabulary/types.ts`
- Reason: complete Stage 3's local feature layer before scheduler, durable persistence, export, deployment, or polished visual design work.
- Implementation notes:
  - Added browser `localStorage` storage under `mimi-pte-vocabulary-v1`.
  - Manual add now saves real local vocabulary items and records editable `createdAt`, system-maintained `systemCreatedAt`, `updatedAt`, and timezone.
  - Import preview now parses `.txt` files and pasted text, marks duplicate/invalid rows, allows candidate edits, and records import batches.
  - Library supports search, active/archived/all filters, edit, archive, and restore. Hard delete remains omitted.
  - Review page reads the first active local item but does not implement Stage 4 scheduling.
- Validation:
  - Passed: `npm run lint`
  - Passed: `npm run typecheck`
  - Passed: `npm run test` with 3 test files and 9 tests.
  - Passed: `npm run build`
  - Passed: `npm audit --json` with 0 total vulnerabilities.
  - Passed: `npm run governance:preflight`
  - Passed: local dev server smoke check for `/`, `/add`, `/import`, `/library`, and `/review` at `http://localhost:3000`.
- Safety notes: local source, documentation, package metadata, and browser-local study-data code only. No database creation, migration, remote persistent data mutation, Vercel deployment, GitHub push, credential access, `.env` editing, external API integration, analytics, AI generation, email, payment, or production action was performed. Stage 3 data is local browser `localStorage`, so it is not a durable backup or cross-device storage.

## 2026-07-04 00:27 AEST

- Task: upgrade the repository governance setup to `human-ai-governance v0.2.0` with version markers and a light preflight scaffold.
- Plan agreed: yes. The user confirmed the proposed migration plan after read-only inspection.
- Changed files:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `README.md`
  - `governance/AI_AGENT_LOG.md`
  - `governance/preflight.py`
  - `package.json`
  - `plan_docs/PLAN_V1_STAGE2_APP_SCAFFOLD.md`
- Reason: record the current human-ai-governance skill version in a durable local governance file and add a Tier 1 preflight command without over-governing the local scaffold.
- Validation:
  - Passed: `npm run governance:preflight`
  - Passed: `npm run lint`
  - Passed: `npm run typecheck`
  - Passed: `npm run build`
- Safety notes: local governance files, package scripts, and documentation only. No durable study-data mutation, database migration, Vercel deployment, GitHub push, credential access, `.env` editing, external API integration, analytics, AI generation, email, payment, or production action was performed.

## 2026-07-03 19:23 AEST

- Task: fix the residual npm security risk from `next -> postcss`.
- Plan agreed: yes. The user explicitly requested fixing the current residual risk.
- Changed files:
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `governance/AI_AGENT_LOG.md`
  - `package.json`
  - `package-lock.json`
  - `plan_docs/PLAN_V1_STAGE2_APP_SCAFFOLD.md`
- Reason: remove the moderate PostCSS audit finding while staying on stable `next@16.2.10`.
- Investigation:
  - `npm audit --json` identified GHSA-qx2v-qp2m-jg93 / CVE-2026-41305 through `next -> postcss@8.4.31`.
  - GitHub advisory and CVE sources identify patched PostCSS versions as 8.5.10 and later.
  - `npm view next version` returned `16.2.10`; `npm view next@latest dependencies.postcss` returned `8.4.31`.
  - `npm view next@canary dependencies.postcss` returned `8.5.10`, but canary was avoided for this stable scaffold.
  - npm official documentation supports root `overrides` for replacing vulnerable transitive dependencies.
- Validation:
  - Passed: `npm install` with `found 0 vulnerabilities`
  - Passed: `npm audit --json` with 0 total vulnerabilities
  - Passed: `npm ls next postcss @tailwindcss/postcss tailwindcss --all`, showing `next@16.2.10 -> postcss@8.5.16 deduped`
  - Passed: `npm run lint`
  - Passed: `npm run typecheck`
  - Passed: `npm run build`
- Safety notes: local dependency metadata and documentation only. No app feature behavior, database, persistent study-data mutation, Vercel deployment, GitHub push, credential access, `.env` editing, external API integration, analytics, AI generation, email, payment, or production action was performed.

## 2026-07-03 02:21 AEST

- Task: implement Stage 2 local app scaffold with minimal UI frame only.
- Plan agreed: yes. The user confirmed Stage 2 implementation and clarified that UI should remain a simplest framework, with polished visual design deferred to a later dedicated stage.
- Changed files:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `README.md`
  - `.gitignore`
  - `eslint.config.mjs`
  - `next.config.ts`
  - `package.json`
  - `package-lock.json`
  - `postcss.config.mjs`
  - `tsconfig.json`
  - `plan_docs/PLAN_V1_STAGE2_APP_SCAFFOLD.md`
  - `src/app/**`
  - `src/components/**`
  - `src/lib/**`
- Reason: create a runnable local Next.js app shell that reflects the agreed Stage 1 product boundaries before later CRUD, scheduler, persistence, and visual-design stages.
- Validation:
  - Passed: `npm run lint`
  - Passed: `npm run typecheck`
  - Passed: `npm run build`
  - Passed: HTTP smoke checks for `/`, `/add`, `/import`, and `/review`
  - Passed: Chrome smoke check for homepage and `/add`
  - Passed: “修改添加时间” expands `Created at` and `Timezone`, with timezone detected as `Australia/Melbourne`
  - Residual: `npm audit --json` reports 2 moderate severity findings through `next -> postcss`; npm audit only offered a semver-major downgrade to old Next.js, so no force fix was applied.
- Safety notes: local application scaffold and documentation only. No database, persistent study-data mutation, Vercel deployment, GitHub push, credential access, `.env` editing, external API integration, analytics, AI generation, email, payment, or production action was performed.

## 2026-07-03 01:48 AEST

- Task: update Stage 1 time-field rules so added time is recorded automatically by default while retaining a user option to modify added time.
- Plan agreed: yes. The user confirmed the proposed documentation-only update.
- Changed files:
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `governance/AI_AGENT_LOG.md`
  - `plan_docs/PLAN_V1_STAGE1_PRODUCT_MVP.md`
- Reason: align the MVP capture workflow with the user preference for automatic timestamps while supporting backfilled older vocabulary.
- Validation:
  - Passed: `find . -maxdepth 3 -type f | sort`
  - Passed: `rg -n "created_at|timezone|添加时间|modify added time|backfilled|write/update|自动记录|修改添加时间" plan_docs/PLAN_V1_STAGE1_PRODUCT_MVP.md ARCHITECTURE.md CHANGELOG.md governance/AI_AGENT_LOG.md`
- Safety notes: local documentation files only. No application code, database schema, Vercel deployment, credential access, external API calls, or persistent user-data mutation was performed.

## 2026-07-03 01:15 AEST

- Task: create Stage 1 product MVP design for manual entry, `.txt` batch import, import preview, and four fixed review ratings.
- Plan agreed: yes. The user confirmed starting the first design step and clarified that first version should read text files while `.docx` and PDF stay later.
- Changed files:
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `governance/AI_AGENT_LOG.md`
  - `plan_docs/PLAN_V1_MASTER.md`
  - `plan_docs/PLAN_V1_STAGE1_PRODUCT_MVP.md`
- Reason: capture updated requirements before app scaffold and prevent stale initial-proficiency assumptions from drifting into implementation.
- Validation:
  - Passed: `find . -maxdepth 3 -type f | sort`
  - Passed: `rg -n "PLAN_V1_STAGE1_PRODUCT_MVP|txt|docx|PDF|initial proficiency|review rating|Source plan|Derived from" .`
- Safety notes: local documentation files only. No application code, Vercel deployment, credential editing, database creation, external API calls, or persistent user-data mutation was performed.

## 2026-07-03 00:16 AEST

- Task: delete accidental `.Rhistory`, initialize a local Git repository, connect the user-provided GitHub remote, create the first commit, and try to push.
- Plan agreed: yes. The user confirmed the Git bootstrap plan.
- Changed files:
  - `CHANGELOG.md`
  - `governance/AI_AGENT_LOG.md`
  - deleted `.Rhistory`
- Reason: remove accidental local noise and establish version control before continuing product design and app scaffolding.
- Validation:
  - Passed: `git init -b main`
  - Passed: `git remote add origin https://github.com/huaixuanhu/words-learning-app-for-mimi.git`
  - Passed: `git commit -m "Initialize project governance"`
  - Blocked: `GIT_TERMINAL_PROMPT=0 git push -u origin main` because local GitHub HTTPS credentials were not available.
- Safety notes: local cleanup and version-control setup only. No application code, Vercel deployment, credential editing, database creation, or production data mutation was performed. GitHub push was attempted once in non-interactive mode and stopped at credential authentication.

## 2026-07-02 23:30 AEST

- Task: initialize Human-AI governance for the PTE vocabulary flashcard web app.
- Plan agreed: yes. The user confirmed the proposed governance bootstrap scope.
- Changed files:
  - `AGENTS.md`
  - `ARCHITECTURE.md`
  - `CHANGELOG.md`
  - `governance/AI_AGENT_LOG.md`
  - `plan_docs/PLAN_V1_MASTER.md`
- Reason: create a durable collaboration baseline before app scaffolding, data modeling, deployment, or GitHub/Vercel actions.
- Validation:
  - Passed: `find . -maxdepth 3 -type f | sort`
- Safety notes: local documentation files only. No application code, git initialization, push, Vercel deployment, credential access, or database mutation was performed. The GitHub repo URL was user-provided, but remote verification was blocked by missing GitHub credentials in the local environment.
