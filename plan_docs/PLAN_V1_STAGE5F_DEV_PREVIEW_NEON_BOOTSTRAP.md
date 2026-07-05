# Words Learning App For Mimi Stage 5F: Development / Preview Neon Bootstrap

Created: 2026-07-05 02:31 AEST
Last updated: 2026-07-05 13:09 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `db/LOCAL_BACKUP_TO_POSTGRES.md`
- `db/migrations/0001_initial.sql`
- `plan_docs/PLAN_V1_STAGE5B_STORAGE_PROVIDER_DECISION.md`
- `plan_docs/PLAN_V1_STAGE5C_LOCAL_PERSON_ADAPTER.md`
- `plan_docs/PLAN_V1_STAGE5D_DURABLE_STORAGE_READINESS.md`
- `plan_docs/PLAN_V1_STAGE5E_NEON_EXECUTION_GATE.md`
- User approvals on 2026-07-05 for development / preview Vercel and Neon bootstrap.

Scope:

- Link this local repository to a new Vercel project under the user's personal Vercel account.
- Create or connect a new Neon Postgres（关系型数据库）resource through the Vercel / Neon path.
- Limit all remote work to development / preview scope.
- Install the smallest accepted database client and migration helper packages.
- Keep ORM（对象关系映射）out of scope.
- Pull development environment variables（环境变量）into local `.env.local` if required.
- Add env-safe migration（迁移）scripts that explicitly load `.env.local`.
- Execute `db/migrations/0001_initial.sql` only against a non-production database branch / environment.
- Verify the empty schema after migration.
- Run complete smoke tests for add, import, library, review, settings, export, and restore behavior.
- Update docs and governance logs with actual results.

Non-Scope:

- No production deployment.
- No production database migration.
- No import of local JSON backup（JSON 备份）data, because the user confirmed local storage is currently empty and not yet used.
- No deletion or mutation of browser `localStorage`（本地浏览器存储）as part of remote bootstrap.
- No password login, OAuth（开放授权）, authentication（认证）, or account-security implementation.
- No preview branch database isolation beyond the simplified development / preview setup accepted by the user.
- No embedding（向量嵌入）, vector database（向量数据库）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, AI generation, dictionary API（词典接口）, analytics（分析追踪）, email, payment, or notification.

Safety / Side Effects:

- This stage upgrades the working gate to Tier 3 for the execution session.
- The user approved Vercel project creation/linking, Neon creation, `.env.local` creation/overwrite, package installation, and non-production migration dry run.
- Production migration, production deployment, and production import still require a second explicit confirmation.
- Secrets must not be printed into source files, committed, or exposed through `NEXT_PUBLIC_`.
- If `.env.local` exists unexpectedly or contains custom variables, stop before overwriting.
- If the Vercel account, project, Neon project, database branch, or role is ambiguous, stop before remote mutation.
- If any validation fails, stop and document the failure before continuing.

Confirmed User Decisions:

- Vercel scope: personal Vercel account.
- GitHub connection: the relevant GitHub account is already connected to Vercel.
- Vercel project: create a new project for this repo.
- Vercel link: allowed.
- Deployment scope: development / preview only.
- Neon project: none exists yet; create a new one.
- Database branches: enabled.
- Preview branches: keep simple for now; no separate preview database branches yet.
- Production branch: keep empty until dry run succeeds and user gives a second confirmation.
- Env handling: allowed, including local `.env.local`.
- Package installation: allowed.
- Database client: minimal direct Neon client, no ORM.
- Non-production migration dry run: allowed.
- Read-only schema inspection: allowed.
- Data import: skipped for now because local storage is empty.
- Smoke test: run a complete smoke test.
- Unspecified later choices: choose conservative defaults.

Conservative Defaults:

- Project name: `words-learning-app-for-mimi`.
- Database access from app code: server-side only.
- Database client initialization: lazy, never at module evaluation.
- Migration tooling: minimal direct SQL execution, explicit env loading.
- Runtime source of truth during early bootstrap: keep `localStorage` fallback until Postgres adapter is proven.
- Production: do not touch without second confirmation.

Execution Results:

- Vercel CLI（命令行工具）was run through `npx vercel@latest`.
- Vercel user boundary was verified as the user's personal Vercel setup, with default scope `anorias-projects`.
- Vercel project `anorias-projects/words-learning-app-for-mimi` was created and linked to this local repository.
- The Vercel project is connected to `https://github.com/huaixuanhu/words-learning-app-for-mimi`.
- Neon Marketplace terms were accepted by the user in the browser.
- Neon resource `words-learning-app-for-mimi-neon` was created for development / preview only.
- Neon resource id: `store_D1OyAmdX2Ccd0xYR`.
- External Neon project id from Vercel integration metadata: `lucky-bread-29481598`.
- Local `.env.local` was created / overwritten by Vercel CLI and remains ignored by Git.
- Vercel env listing confirmed database variables are scoped to Development and Preview, not Production.
- Installed minimal packages: `@neondatabase/serverless` and `dotenv-cli`.
- Added `npm run db:migrate:dev` and `npm run db:inspect:dev`.
- Added `.env.example` with placeholder connection URL names only.
- Executed `npm run db:migrate:dev` against the non-production development database.
- Executed `npm run db:inspect:dev`; inspection found 8 tables, 11 indexes, 5 key constraints, and zero rows in the core business tables.
- Local browser smoke test passed for settings/person switching, manual add, pasted-text import, library edit/archive, review, JSON backup button, CSV button, and browser console error check.
- A preview deployment attempt was made with `npx vercel@latest --yes --target preview`, but Vercel CLI returned `target: production` and assigned production aliases.
- The unexpected production-target deployment `dpl_Hgn5b9j7TD3GEEiZjzvNh8Mvoe5b` was removed immediately with `npx vercel@latest remove ... --yes`.
- Read-only follow-up checks confirmed the removed deployment id and production alias were not found, and `npx vercel@latest ls words-learning-app-for-mimi` reported no deployments.

Still Pending After Bootstrap:

- Runtime Postgres repository adapter.
- Data import from local backup, currently skipped because local storage is empty.
- Production migration.
- Production deployment.
- Preview deployment, paused pending a separate check of Vercel CLI target behavior / production branch settings.
- Authentication（认证）or password isolation.
- Separate preview database branch strategy.

Exit Criteria:

- Vercel account / project boundary is verified.
- Vercel project is linked or a blocker is documented.
- Neon development / preview resource is created or a blocker is documented.
- Required database env vars are available locally without being committed.
- Minimal database packages and scripts are added if remote setup reaches that point.
- Non-production schema migration dry run succeeds, or a blocker is documented before partial data risk.
- Read-only schema verification succeeds.
- Local validation and smoke checks pass, or failures are documented with next steps.
- Docs and governance logs are synchronized.

Validation Plan:

- `npm run governance:preflight`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --json`
- Vercel / Neon boundary checks.
- Non-production schema inspection after migration.
- Complete smoke test for add, import, library, review, settings, export, and restore behavior.
