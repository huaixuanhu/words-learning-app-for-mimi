# Words Learning App For Mimi Stage 5N: Preview UI Runtime Verification

Created: 2026-07-05 23:25 AEST
Last updated: 2026-07-05 23:45 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `README.md`
- `plan_docs/PLAN_V1_STAGE5M_USER_BACKUP_IMPORT_AND_UI_RUNTIME_CUTOVER.md`
- `src/app/api/storage/data/route.ts`
- `src/components/vocabulary/use-vocabulary-data.ts`
- Vercel Preview deployment and environment state checked through Vercel CLI（命令行工具）.

Scope:

- Verify the Stage 5M UI runtime cutover（界面运行时切换）in Vercel Preview（预览环境） without enabling UI writes.
- Create a new Preview deployment from the committed `V1` branch.
- Confirm the deployment target is Preview, not Production（生产环境）.
- Confirm `/api/storage/health` and `/api/storage/data` can read the Postgres（关系型数据库）runtime in Preview.
- Confirm `/api/storage/data` write attempts are blocked because `MIMI_ENABLE_STORAGE_UI_WRITES` is absent.
- Confirm normal app routes return HTTP 200.
- Confirm no error logs and no database rows were created.

Non-Scope:

- No Production deployment, promotion, alias change, env var, migration, or data import.
- No persistent `MIMI_ENABLE_STORAGE_UI_WRITES` in Vercel Preview.
- No Preview write smoke outside the explicitly confirmed Stage 5N-B window.
- No real user backup import.
- No authentication（认证）, analytics（分析追踪）, AI generation, embedding（向量嵌入）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, email, notification, or 付费/扣款 feature.

Safety / Side Effects:

- This stage is Tier 3 because it verifies remote deployment and persistent storage boundaries.
- Stage 5N-A is read-only for database data.
- Stage 5N-B temporarily enables Preview UI writes, writes one controlled smoke row set, cleans it, removes the write flag, redeploys disabled Preview, and removes the temporary write-enabled deployment.
- Preview deployment is allowed; Production remains untouched.
- Vercel environment variable inspection must not print secret values.
- Any write-path verification beyond the disabled-write check requires a separate confirmation for Stage 5N-B.

Exit Criteria:

- New Preview deployment is created and inspected as `target=preview`.
- Preview `/api/storage/health` returns `postgres-preview` and zero counts.
- Preview `/api/storage/data` returns `postgres-preview`, schema version 3, and zero study records.
- Preview `/api/storage/data` POST returns `ui-writes-not-enabled`.
- App routes `/`, `/add`, `/import`, `/library`, `/review`, `/export`, and `/settings` return HTTP 200.
- Preview error logs show no error records for the checked window.
- Vercel Preview env still lacks `MIMI_ENABLE_STORAGE_UI_WRITES`.
- Development database remains empty after verification.
- Documentation and AI agent log reflect actual results.

Stage 5N-A Implementation Results:

- Created Preview deployment `dpl_HpcPDb5B2su2BLPWJVsYZjPDnWSg`.
- Preview URL: `https://words-learning-app-for-mimi-kb5b08c5v-anorias-projects.vercel.app`.
- Vercel inspect reported `target=preview` and `readyState=READY`.
- Preview alias reported by Vercel inspect: `words-learning-app-for-mimi-hemerocallys-anorias-projects.vercel.app`.
- Preview `/api/storage/health` returned `status=ready`, runtime `postgres-preview`, and counts `people=0`, `vocabularyItems=0`, `reviewEvents=0`.
- Preview `/api/storage/data` returned `status=ready`, runtime `postgres-preview`, schema version 3, default empty `Mimi` snapshot, and no study records.
- Preview `/api/storage/data` POST with the UI confirmation header returned reason `ui-writes-not-enabled`.
- App routes returned HTTP 200 for `/`, `/add`, `/import`, `/library`, `/review`, `/export`, and `/settings`.
- Preview error log query returned no error records.
- `npm run db:inspect:dev` after verification still reported zero rows in core study tables.

Stage 5N-B Implementation Results:

- Added a narrow cleanup command:
  - `npm run db:cleanup-stage5n-ui-smoke:dev`
- The cleanup command only removes the Stage 5N UI smoke shape: slug `mimi`, one vocabulary item with normalized text `stage five n preview ui write`, one review settings row, and no import/review/backup rows.
- Temporarily added `MIMI_ENABLE_STORAGE_UI_WRITES=true` to Vercel Preview only.
- Confirmed Production env remained empty.
- Created write-enabled Preview deployment `dpl_JgKNc9zuAqgMsy5w13gbZoqkEhnY`.
- Write-enabled Preview URL: `https://words-learning-app-for-mimi-8r2cn2jko-anorias-projects.vercel.app`.
- Vercel inspect reported `target=preview` and `readyState=READY`.
- Preview `/api/storage/health` returned runtime `postgres-preview` with zero counts before the write.
- Preview `/api/storage/data` POST with `x-mimi-ui-storage-write: allow-dev-preview-ui-write` created:
  - person id `020d84d6-6f3c-4cdd-b8fb-682a1de46554`
  - vocabulary item id `b144680c-590a-4855-aff5-d60058f6e415`
  - surface text `stage five n preview ui write`
- Database inspection after write reported `people=1`, `vocabulary_items=1`, `review_settings=1`, and zero import/review event rows.
- Error-log query for the write-enabled deployment returned no error records.
- Ran `npm run db:cleanup-stage5n-ui-smoke:dev`, removing one vocabulary item, one review settings row, and one person.
- Removed `MIMI_ENABLE_STORAGE_UI_WRITES` from Vercel Preview.
- Created disabled Preview deployment `dpl_Athg2hWZK1gV6ereWdbYk1WXG58C`.
- Disabled Preview URL: `https://words-learning-app-for-mimi-6v8azqoaa-anorias-projects.vercel.app`.
- Vercel inspect reported `target=preview` and `readyState=READY`.
- Disabled Preview `/api/storage/health` returned runtime `postgres-preview` with zero counts.
- Disabled Preview `/api/storage/data` POST returned reason `ui-writes-not-enabled`.
- Removed the write-enabled deployment `dpl_JgKNc9zuAqgMsy5w13gbZoqkEhnY`.
- Confirmed Preview env no longer contains `MIMI_ENABLE_STORAGE_UI_WRITES`.
- Confirmed Production env remains empty.
- Confirmed final development database counts are zero.
- App routes returned HTTP 200 on the disabled Preview deployment.

Residual Boundaries:

- No Vercel Preview UI write flag remains.
- No write-enabled Preview deployment remains.
- No database row remains after Stage 5N-B cleanup.
- No Production env var, deployment, promotion, migration, or import was performed.
- Existing non-official Production deployment remains untouched.
