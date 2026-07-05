# Words Learning App For Mimi Stage 5N: Preview UI Runtime Verification

Created: 2026-07-05 23:25 AEST
Last updated: 2026-07-05 23:25 AEST

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
- No `MIMI_ENABLE_STORAGE_UI_WRITES` change in Vercel Preview.
- No Preview write smoke in Stage 5N-A.
- No real user backup import.
- No authentication（认证）, analytics（分析追踪）, AI generation, embedding（向量嵌入）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, email, notification, or 付费/扣款 feature.

Safety / Side Effects:

- This stage is Tier 3 because it verifies remote deployment and persistent storage boundaries.
- Stage 5N-A is read-only for database data.
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

Implementation Results:

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

Residual Boundaries:

- Stage 5N-B controlled Preview UI write smoke remains pending explicit confirmation.
- No Vercel env var was changed in Stage 5N-A.
- No database row was written in Stage 5N-A.
- Existing non-official Production deployment remains untouched.
