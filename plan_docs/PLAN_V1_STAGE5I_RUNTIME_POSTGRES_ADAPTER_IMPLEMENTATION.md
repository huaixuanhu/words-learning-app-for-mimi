# Words Learning App For Mimi Stage 5I: Runtime Postgres Adapter Implementation

Created: 2026-07-05 14:48 AEST
Last updated: 2026-07-05 14:48 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE5H_RUNTIME_POSTGRES_ADAPTER_DESIGN.md`
- `db/migrations/0001_initial.sql`
- `src/lib/storage/durable-repository-contract.ts`
- Current local vocabulary, review, people, backup, and settings modules

Scope:

- Implement a server-only runtime Postgres adapter（运行时 Postgres 适配层）for development / preview verification.
- Add runtime mode（运行时模式）parsing with a default browser-local `localStorage` runtime.
- Add Postgres mappers for snake_case database rows to current domain types.
- Implement `DurableRepositoryPort` for people, review settings, vocabulary items, import batches, review queue selection, review events, and review states.
- Add preview/development storage health and smoke routes under `/api/storage`.
- Add unit tests（单元测试）for runtime mode and row mapping.
- Keep user-facing UI on browser `localStorage`.

Non-Scope:

- No Production database runtime.
- No Production database env vars.
- No Production deployment, promotion, or alias change.
- No GitHub push.
- No formal user-facing storage cutover.
- No backup import implementation.
- No local backup import into Neon.
- No authentication（认证）, password isolation, OAuth, analytics（分析追踪）, AI generation, embedding（向量嵌入）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, email, notification, or 付费/扣款 feature.

Safety / Side Effects:

- `MIMI_STORAGE_RUNTIME` defaults to `local`; missing or invalid values do not connect to Postgres.
- Postgres runtime requires `MIMI_STORAGE_RUNTIME=postgres-preview`.
- Vercel `production` environment rejects Postgres runtime.
- `/api/storage/health` is read-only and returns disabled when runtime mode is local.
- `/api/storage/smoke` is `POST` only, disabled by default, and additionally requires `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` plus `x-mimi-storage-smoke: allow-dev-preview-write`.
- Stage 5I validation does not call the smoke write route and does not mutate Neon data.
- Database credentials remain server-side only and are not printed or committed.

Implementation Notes:

- Added `src/lib/storage/runtime-mode.ts`.
- Added `src/lib/storage/postgres/client.ts`.
- Added `src/lib/storage/postgres/mappers.ts`.
- Added `src/lib/storage/postgres/repository.ts`.
- Added `/api/storage/health` for development / preview read-only adapter status.
- Added `/api/storage/smoke` for opt-in development / preview write-path verification.
- Added `.env.example` placeholders for `MIMI_STORAGE_RUNTIME` and `MIMI_ENABLE_STORAGE_SMOKE_WRITES`.
- Postgres adapter uses database UUIDs as canonical IDs.
- Every learning-data repository method validates or filters by `personId`.
- Review recording writes `review_events` and upserts `review_states` in one transaction.
- Import commit writes the import batch and accepted vocabulary items in one transaction.
- Backup import intentionally throws a Stage 5I unsupported error.

Validation Plan:

- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run db:inspect:dev`
- `npm run build`
- `npm run governance:preflight`
- `python3 governance/preflight.py --tier 3 --require-skill-marker`
- `git diff --check`

Exit Criteria:

- Runtime mode defaults to local and rejects Production Postgres runtime.
- Postgres adapter compiles against `DurableRepositoryPort`.
- Unit tests cover runtime mode and mapper behavior.
- Health and smoke routes exist with development / preview gates.
- User-facing UI remains browser-local.
- No remote database writes are performed during implementation validation.
- Docs and governance log describe the implemented boundaries.
