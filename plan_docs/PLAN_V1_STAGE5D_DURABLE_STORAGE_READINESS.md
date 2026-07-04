# Words Learning App For Mimi Stage 5D: Durable Storage Readiness

Created: 2026-07-05 01:08 AEST
Last updated: 2026-07-05 01:12 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE5A_LOCAL_EXPORT_BACKUP.md`
- `plan_docs/PLAN_V1_STAGE5B_STORAGE_PROVIDER_DECISION.md`
- `plan_docs/PLAN_V1_STAGE5C_LOCAL_PERSON_ADAPTER.md`
- User confirmation on 2026-07-05 to execute Stage 5D.
- Official Vercel and Neon documentation checked on 2026-07-05 for current Postgres（关系型数据库）and Marketplace integration（集成）direction.

Scope:

- Prepare a local SQL migration（迁移）draft for future Neon Postgres durable storage.
- Keep the accepted one-database / multiple-people model.
- Require `person_id` on every durable learning-data table.
- Add database constraints（约束）and indexes（索引）for person-scoped reads and writes.
- Add a local repository adapter contract（仓储适配层接口）for future `localStorage` and Postgres implementations.
- Document how schema version 3 JSON backup（JSON 备份）data maps into Postgres tables.
- Add static tests that inspect the SQL draft for person separation and core constraints.
- Synchronize architecture, master plan, changelog, and AI agent log.

Non-Scope:

- No Neon project creation.
- No Vercel Marketplace installation.
- No database package installation.
- No ORM（对象关系映射）selection or installation.
- No `.env`, credential, token, secret, or private account setting read/write.
- No database migration execution.
- No remote data mutation.
- No production deployment, GitHub push, or pull request.
- No password login, OAuth（开放授权）, authentication（认证）, or account-security implementation.
- No polished UI redesign.
- No embedding（向量嵌入）, vector database（向量数据库）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, AI generation, dictionary API（词典接口）, analytics（分析追踪）, email, payment, or notification.

Safety / Side Effects:

- Stage 5D is local source, SQL draft, tests, and documentation only.
- The SQL file is not executed in this stage.
- The app remains browser `localStorage`（本地浏览器存储）backed at runtime.
- Future database code must use lazy initialization so `next build` does not require `DATABASE_URL` at module evaluation time.
- Future remote execution upgrades the active governance gate to Tier 3 before credentials, migration, or remote mutation.
- Local backup files can contain personal study data and should remain private.

Implementation Plan:

1. Add `db/migrations/0001_initial.sql` as an executable draft schema for the future Neon Postgres database.
2. Add a local backup-to-Postgres migration mapping document under `db/`.
3. Add TypeScript repository adapter contracts under `src/lib/storage/`.
4. Add Vitest（单元测试工具）static checks for the SQL schema.
5. Update architecture and stage planning documents.
6. Update changelog and AI agent log.
7. Run local validation.

Exit Criteria:

- SQL draft includes `people`, `vocabulary_items`, `import_batches`, `review_states`, `review_events`, `review_settings`, `backup_imports`, and backup id mapping support.
- Every durable learning-data table includes `person_id`.
- Review state uniqueness is scoped by `(person_id, vocabulary_item_id)`.
- Person-scoped lookup indexes exist for vocabulary, imports, reviews, settings, and backup imports.
- JSON backup schema version 3 to Postgres mapping is documented, including local string id to database UUID mapping.
- Repository adapter contract requires person context for learning-data operations.
- Local tests inspect the SQL draft for the agreed safety boundaries.
- Local validation commands pass.

Validation Plan:

- `npm run governance:preflight`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --json`

Implementation Outcome:

- Added `db/migrations/0001_initial.sql` as the local SQL draft for future Neon Postgres durable storage.
- Added `people`, person-scoped learning tables, review settings, backup imports, and backup import id mappings to the draft schema.
- Added database constraints and indexes for person-scoped vocabulary, import batch, review, settings, and backup access.
- Added `db/LOCAL_BACKUP_TO_POSTGRES.md` to document schema version 3 backup import mapping, UUID mapping, validation, count checks, and rollback expectations.
- Added `src/lib/storage/durable-repository-contract.ts` as the future repository adapter contract with explicit `personId` context.
- Added `src/lib/storage/durable-schema.test.ts` to statically inspect the SQL draft for `person_id`, person-scoped relationships, indexes, and no credential/package coupling.
- Updated architecture, master plan, README, AGENTS, changelog, and AI agent log.

Validation Results:

- Passed: `npm run test` with 10 test files and 35 tests.
- Passed: `npm run typecheck`.
- Passed: `npm run lint`.
- Passed: `npm run build`.
- Passed: `npm audit --json` with 0 vulnerabilities.
- Passed: `npm run governance:preflight`.
