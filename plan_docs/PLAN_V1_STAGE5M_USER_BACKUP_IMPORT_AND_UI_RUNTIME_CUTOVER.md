# Words Learning App For Mimi Stage 5M: User Backup Import And UI Runtime Cutover

Created: 2026-07-05 22:37 AEST
Last updated: 2026-07-05 22:52 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `db/LOCAL_BACKUP_TO_POSTGRES.md`
- `plan_docs/PLAN_V1_STAGE5H_RUNTIME_POSTGRES_ADAPTER_DESIGN.md`
- `plan_docs/PLAN_V1_STAGE5I_RUNTIME_POSTGRES_ADAPTER_IMPLEMENTATION.md`
- `plan_docs/PLAN_V1_STAGE5L_BACKUP_IMPORT_HARNESS_AND_SMOKE_CLEANUP.md`
- `src/components/vocabulary/use-vocabulary-data.ts`
- `src/lib/storage/postgres/repository.ts`
- `scripts/backup-import-plan.mjs`
- `scripts/backup-import-postgres.mjs`

Scope:

- Design and implement formal user backup import（正式用户备份导入）before UI runtime cutover（用户界面运行时切换）.
- Extend the Stage 5L backup import harness from fixture-only to file-backed user backup dry run, rollback trial, and explicit development commit gate.
- Keep formal user backup import limited to non-production development / preview database targets.
- Implement a development / preview-only UI runtime adapter that can read and write through the Postgres runtime adapter when server runtime is `postgres-preview`.
- Keep browser `localStorage`（本地浏览器存储）as the default user-facing runtime.
- Add server API routes for Postgres-backed snapshot read and controlled UI mutations.
- Keep Production（生产）runtime disabled.
- Validate with fixture-backed import and local dev server because no real user backup file is available in this stage.

Non-Scope:

- No Production environment variable.
- No Production deployment, promotion, alias change, database migration, or data import.
- No import of private real user backup data unless a real backup file path is explicitly provided.
- No Vercel Preview env mutation.
- No authentication（认证）, analytics（分析追踪）, AI generation, embedding（向量嵌入）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, email, notification, or 付费/扣款 feature.
- No schema migration changes.
- No deletion of browser `localStorage` after import.

Safety / Side Effects:

- This stage is Tier 3 because it implements formal import and runtime write paths.
- Formal import commit must require a file path, a non-production database target, an empty target database, and an explicit confirmation flag.
- UI Postgres writes must require `MIMI_STORAGE_RUNTIME=postgres-preview` and `MIMI_ENABLE_STORAGE_UI_WRITES=true`.
- UI Postgres runtime must reject Vercel Production via `VERCEL_ENV=production`.
- Tests may write fixture data to the development database only when explicitly running fixture commit / cleanup commands.
- Fixture data used for local UI verification must be cleaned before handoff.
- No secret values should be printed.

Execution Plan:

1. Confirm Git state and empty development database baseline.
2. Add Stage 5M plan document.
3. Extend backup import script to support `--file`, `--dry-run`, `--trial-rollback`, and guarded `--commit`.
4. Add fixture commit / cleanup support for local UI runtime verification.
5. Add Postgres snapshot read helper and person creation helper.
6. Add `/api/storage/data` for development / preview snapshot read and controlled mutations.
7. Update `useVocabularyData()` to prefer Postgres API when server runtime is enabled, otherwise fall back to local storage.
8. Update UI components to pass mutation metadata to the runtime adapter.
9. Validate backup import with fixture dry run, rollback trial, commit, UI API read/write checks, and cleanup.
10. Run local dev server verification on the released local port.
11. Update architecture, master plan, README, changelog, and AI agent log.
12. Run local validation and governance gates.

Expected Final Development Database Counts:

- `people=0`
- `vocabulary_items=0`
- `import_batches=0`
- `review_states=0`
- `review_events=0`
- `review_settings=0`

Exit criteria:

- File-backed user backup dry run exists.
- File-backed rollback trial exists.
- File-backed development commit gate exists and refuses unsafe execution.
- UI runtime can read Postgres snapshot when `postgres-preview` is enabled.
- UI runtime can perform controlled Postgres mutations when UI write flag is enabled.
- Browser `localStorage` remains the default fallback.
- Fixture validation leaves the development database empty at handoff.
- Production remains untouched.
- Documentation and AI agent log are synchronized with actual results.
- Validation commands pass or any failure is documented with the exact blocker.

Implementation Results:

- Added file-backed backup import support:
  - `--file <backup.json> --dry-run`
  - `--file <backup.json> --trial-rollback`
  - `--file <backup.json> --commit --i-confirm-development-import`
- Added `test_fixtures/stage5m-backup.json` to verify the file-backed path without real user data.
- Added `npm run db:import-fixture-commit:dev` and `npm run db:cleanup-fixture:dev`.
- Extended fixture cleanup to remove Stage 5L and Stage 5M fixture rows.
- Added Postgres data snapshot and person creation helpers.
- Added `/api/storage/data` with Production rejection, runtime checks, UI write env flag, and confirmation header.
- Updated `useVocabularyData()` so UI reads Postgres when `postgres-preview` is ready and falls back to browser `localStorage`.
- Updated add word, import save, library edit/archive/restore, review recording, review settings, person switching, person creation, and export restore boundary for the runtime adapter.
- Kept JSON restore browser-local; in `postgres-preview`, formal backup import uses the Stage 5M script path.

Validation Results:

- Passed: `npm run test`, 13 test files and 48 tests.
- Passed: `node scripts/backup-import-postgres.mjs --file test_fixtures/stage5m-backup.json --dry-run`.
- Passed: `npm run db:inspect:dev` before import, reporting zero core study rows.
- Passed: `STAGE5F_DATABASE_TARGET=development ./node_modules/.bin/dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file test_fixtures/stage5m-backup.json --trial-rollback`, inserting the fixture shape and rolling back to zero.
- Passed: `STAGE5F_DATABASE_TARGET=development ./node_modules/.bin/dotenv -e .env.local -- node scripts/backup-import-postgres.mjs --file test_fixtures/stage5m-backup.json --commit --i-confirm-development-import`, inserting one fixture dataset into an empty development database.
- Passed: local `/api/storage/data` GET under `MIMI_STORAGE_RUNTIME=postgres-preview` and `MIMI_ENABLE_STORAGE_UI_WRITES=true`, returning one person and one item.
- Passed: local `/api/storage/data` POST with `x-mimi-ui-storage-write: allow-dev-preview-ui-write`, adding one manual item and returning two items.
- Passed: browser `/library` check, showing both `stage five m import` and `stage five m ui write` with `2 shown / 2 total`.
- Passed: `npm run db:cleanup-fixture:dev`, removing the Stage 5M fixture person and both fixture vocabulary rows.
- Passed: final `npm run db:inspect:dev`, reporting zero core study rows.
- Passed: `npm run typecheck`.
- Passed: `npm run lint`.
- Passed: `git diff --check`.

Residual Boundaries:

- No real user backup file was imported.
- No Vercel environment variable was changed.
- No Preview deployment or Production deployment was created in Stage 5M.
- `MIMI_ENABLE_STORAGE_UI_WRITES` remains only a local / future Preview gate; it was not added to Vercel.
- Development database is empty at handoff.
