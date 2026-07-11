# Words Learning App For Mimi Stage 5J: Postgres Adapter Read-Only Verification

Created: 2026-07-05 15:04 AEST
Last updated: 2026-07-05 15:04 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE5H_RUNTIME_POSTGRES_ADAPTER_DESIGN.md`
- `plan_docs/PLAN_V1_STAGE5I_RUNTIME_POSTGRES_ADAPTER_IMPLEMENTATION.md`
- `src/app/api/storage/health/route.ts`
- `src/app/api/storage/smoke/route.ts`
- Vercel CLI 54.20.1 command output from this stage

Scope:

- Verify the Stage 5I runtime Postgres adapter（运行时 Postgres 适配层）through read-only health checks.
- Confirm local default runtime remains `local` and `/api/storage/health` returns disabled without connecting to Postgres.
- Confirm local `postgres-preview` mode can read development Neon schema counts without writing data.
- Inspect Vercel project, deployment, Git production branch, and environment variable（环境变量）scope.
- Add `MIMI_STORAGE_RUNTIME=postgres-preview` to Preview only.
- Create and inspect a new Vercel Preview deployment（预览部署）.
- Verify the Preview `/api/storage/health` endpoint reads Postgres counts successfully.
- Confirm Neon core business tables remain empty after verification.

Non-Scope:

- No `MIMI_ENABLE_STORAGE_SMOKE_WRITES`.
- No `/api/storage/smoke` call.
- No database write.
- No backup import.
- No user-facing storage cutover.
- No Production（生产）environment variable.
- No Production deployment, promotion, alias change, or database migration.
- No authentication（认证）, analytics（分析追踪）, AI generation, embedding（向量嵌入）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, email, notification, or 付费/扣款 feature.

Safety / Side Effects:

- This stage changed one Vercel Preview environment variable: `MIMI_STORAGE_RUNTIME=postgres-preview`.
- The variable is scoped to Preview only.
- `MIMI_ENABLE_STORAGE_SMOKE_WRITES` was not added.
- The new deployment target was verified as Preview before route verification was treated as valid.
- The health route is read-only; it returns counts from `people`, `vocabulary_items`, and `review_events`.
- The development Neon database was inspected after verification and still showed zero core business rows.
- Existing non-official Production deployment remains untouched.

Execution Results:

- Local default health:
  - URL: `http://localhost:3000/api/storage/health`
  - Result: `status=disabled`, runtime `local`, reason `missing`.
- Local `postgres-preview` health:
  - URL: `http://localhost:3008/api/storage/health`
  - Result: `status=ready`, runtime `postgres-preview`, counts `people=0`, `vocabularyItems=0`, `reviewEvents=0`.
- Vercel project:
  - Project: `anorias-projects/words-learning-app-for-mimi`
  - Git provider: GitHub
  - Repository: `huaixuanhu/words-learning-app-for-mimi`
  - Production branch: `main`
- Vercel env scope:
  - `MIMI_STORAGE_RUNTIME` exists in Preview only.
  - Neon/Postgres generated variables remain scoped to Development and Preview.
  - `MIMI_ENABLE_STORAGE_SMOKE_WRITES` does not exist.
- New Preview deployment:
  - URL: `https://words-learning-app-for-mimi-dbkkkow3d-anorias-projects.vercel.app`
  - Deployment id: `dpl_CFeC2VwRKtMSAjBiGGtyStsFw2tr`
  - `vercel inspect` target: `preview`
  - Ready state: `READY`
- Preview health route:
  - Result: `status=ready`, runtime `postgres-preview`, counts `people=0`, `vocabularyItems=0`, `reviewEvents=0`.
- Preview error log query:
  - `vercel logs dpl_CFeC2VwRKtMSAjBiGGtyStsFw2tr --level error --since 10m --json`
  - Result: no error records returned.
- Database inspection after remote verification:
  - `tables=8`
  - `indexes=11`
  - `constraints=5`
  - `people=0`
  - `vocabulary_items=0`
  - `import_batches=0`
  - `review_states=0`
  - `review_events=0`
  - `review_settings=0`

Exit Criteria:

- Local disabled health behavior verified.
- Local read-only Postgres health behavior verified.
- Vercel Preview env scope verified.
- New Preview deployment target verified as Preview.
- Preview read-only health route verified.
- No smoke write route was called.
- Database counts remained empty after verification.
- Production state remained untouched.
