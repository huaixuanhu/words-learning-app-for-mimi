# Words Learning App For Mimi Stage 5L: Backup Import Harness And Smoke Cleanup

Created: 2026-07-05 15:38 AEST
Last updated: 2026-07-05 15:45 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `db/LOCAL_BACKUP_TO_POSTGRES.md`
- `db/migrations/0001_initial.sql`
- `plan_docs/PLAN_V1_STAGE5A_LOCAL_EXPORT_BACKUP.md`
- `plan_docs/PLAN_V1_STAGE5D_DURABLE_STORAGE_READINESS.md`
- `plan_docs/PLAN_V1_STAGE5K_CONTROLLED_WRITE_SMOKE.md`

Scope:

- Implement the Stage 5L-A backup import dry run（备份导入干跑）harness.
- Implement the Stage 5L-B development database trial（开发数据库试跑）and smoke row cleanup.
- Add a deterministic Stage 5L fixture（测试样本）backup.
- Build a backup-to-Postgres import plan without mutating the database.
- Validate backup metadata counts, person separation, references, supported values, and target UUID mapping.
- Add a guarded development / preview script for:
  - fixture dry run,
  - smoke row cleanup,
  - fixture import trial inside a transaction（事务）that rolls back.
- Clean the Stage 5K smoke rows from the development database after user authorization.
- Verify final development database counts after cleanup and rollback trial.

Non-Scope:

- No Production（生产）environment variable.
- No Production deployment, promotion, alias change, or database migration.
- No formal user backup import.
- No import from private real user files.
- No browser `localStorage`（本地浏览器存储）deletion.
- No UI runtime storage cutover.
- No authentication（认证）, analytics（分析追踪）, AI generation, embedding（向量嵌入）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, email, notification, or 付费/扣款 feature.
- No schema migration changes.

Safety / Side Effects:

- This stage is Tier 3 because it touches the development database.
- The only persistent remote data mutation planned is removing the fixed Stage 5K smoke row set.
- The smoke cleanup is allowed because the user explicitly requested cleanup of used smoke test rows.
- Smoke cleanup must match the fixed smoke person id `00000000-0000-4000-8000-0000000005f1` and slug `storage-smoke`.
- Fixture import trial must run in a database transaction and roll back.
- Fixture trial must leave no fixture rows in the development database.
- Scripts must refuse execution unless `STAGE5F_DATABASE_TARGET` is `development` or `preview`.
- Scripts must refuse execution when `VERCEL_ENV=production`.
- No secret values should be printed.

Execution Plan:

1. Confirm current Git state and Stage 5K database baseline.
2. Add a Stage 5L plan document.
3. Add a backup import planning module for schema version 3 JSON backup files.
4. Add unit tests for the fixture plan and rejection behavior.
5. Add guarded npm scripts for fixture dry run, smoke cleanup, and rollback trial.
6. Run the fixture dry run locally without database access.
7. Inspect development database counts before cleanup.
8. Run smoke row cleanup in the development database.
9. Verify development database counts are empty after cleanup.
10. Run fixture import trial in the development database with transaction rollback.
11. Verify fixture rows do not persist after rollback.
12. Update architecture, master plan, README, changelog, and AI agent log.
13. Run local validation and governance gates.

Expected Final Development Database Counts:

- `people=0`
- `vocabulary_items=0`
- `import_batches=0`
- `review_states=0`
- `review_events=0`
- `review_settings=0`

Execution Results:

- Added `scripts/backup-import-plan.mjs`.
- Added `scripts/backup-import-postgres.mjs`.
- Added `scripts/backup-import-plan.test.mjs`.
- Added npm scripts:
  - `npm run backup:dry-run:fixture`
  - `npm run db:cleanup-smoke:dev`
  - `npm run db:import-fixture-trial:dev`
- Fixture dry run result:
  - `people=1`
  - `importBatches=1`
  - `vocabularyItems=1`
  - `reviewStates=1`
  - `reviewEvents=1`
  - `reviewSettings=1`
  - `backupImports=1`
  - `backupImportMappings=6`
- Unit tests added:
  - fixture import plan creates person-scoped target UUID mapping.
  - metadata count mismatch is rejected.
  - cross-person review reference is rejected.
- Pre-cleanup development database inspection:
  - `people=1`
  - `vocabulary_items=1`
  - `import_batches=0`
  - `review_states=1`
  - `review_events=1`
  - `review_settings=1`
- Smoke cleanup result:
  - removed `people=1`
  - removed `vocabulary_items=1`
  - removed `review_states=1`
  - removed `review_events=1`
  - removed `review_settings=1`
  - removed `import_batches=0`
  - removed `backup_imports=0`
  - removed `backup_import_mappings=0`
- Post-cleanup development database counts:
  - `people=0`
  - `vocabulary_items=0`
  - `import_batches=0`
  - `review_states=0`
  - `review_events=0`
  - `review_settings=0`
  - `backup_imports=0`
  - `backup_import_mappings=0`
- Fixture transaction trial result:
  - inserted inside transaction: `people=1`, `import_batches=1`, `vocabulary_items=1`, `review_states=1`, `review_events=1`, `review_settings=1`, `backup_imports=1`, `backup_import_mappings=6`
  - rollback verification: all fixture row counts returned to `0`
- Final development database inspection:
  - `tables=8`
  - `indexes=11`
  - `constraints=5`
  - `people=0`
  - `vocabulary_items=0`
  - `import_batches=0`
  - `review_states=0`
  - `review_events=0`
  - `review_settings=0`
- Local validation passed:
  - `npm run backup:dry-run:fixture`
  - `npm run db:import-fixture-trial:dev`
  - `npm run test`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - `npm audit --json`
  - `npm run db:inspect:dev`
  - `git diff --check`
  - `npm run governance:preflight`
  - `python3 governance/preflight.py --tier 3 --require-skill-marker`

Exit criteria:

- Stage 5L plan exists and cites its parent plan.
- Fixture dry run passes without database access.
- Backup import plan validates counts and person-scoped references.
- Unit tests pass for the import plan.
- Smoke rows are removed from the development database.
- Development database counts are empty after cleanup.
- Fixture trial writes inside a transaction and rolls back.
- Fixture rows do not persist after rollback.
- Production remains untouched.
- Documentation and AI agent log are synchronized with actual results.
- Validation commands pass or any failure is documented with the exact blocker.
