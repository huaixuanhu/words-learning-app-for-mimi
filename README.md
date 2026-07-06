# Words Learning App For Mimi

Stage 7 mobile-first vocabulary app for Mimi, with local vocabulary, text import, review scheduler, flashcards, local export / backup, local multi-person adapter, durable storage readiness, development / preview Neon bootstrap, server-only runtime Postgres adapter, controlled Preview smoke checks, backup import harness, development / preview UI runtime cutover, read-only Preview UI runtime verification, and a darker sage visual design pass with Motion for React interaction animation.

## Commands

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run db:inspect:dev
npm run build
npm run dev
```

Database commands require ignored `.env.local` values from the approved Vercel / Neon setup:

```bash
npm run db:migrate:dev
npm run db:inspect:dev
npm run db:cleanup-smoke:dev
npm run db:import-fixture-trial:dev
npm run db:import-fixture-commit:dev
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
- Minimal routes for add, import, review, library, export, and settings.
- Local manual vocabulary add, library search/edit/archive/restore, and `.txt` / pasted text import preview.
- Local review sessions with four fixed ratings, review event/state updates, and customizable session limit（单次复习上限）.
- Local JSON backup（JSON 备份）download, vocabulary CSV（逗号分隔值）download, and JSON restore preview.
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
- Stage 7 UI（用户界面）visual design: added `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`, a darker soft sage palette, Motion for React interaction animation（交互动效）, desktop sidebar navigation, mobile bottom navigation, and redesigned dashboard / flashcard / import / library / export / settings surfaces. PTE / IELTS toggle implementation remains out of V1 scope.
- Runtime mode stays `local` by default. Postgres UI runtime requires `MIMI_STORAGE_RUNTIME=postgres-preview`; UI writes also require `MIMI_ENABLE_STORAGE_UI_WRITES=true` and `x-mimi-ui-storage-write: allow-dev-preview-ui-write`.
- Vercel Preview currently has `MIMI_STORAGE_RUNTIME=postgres-preview` from Stage 5J, but `MIMI_ENABLE_STORAGE_UI_WRITES` has not been added to Vercel.
- Browser `localStorage`（本地浏览器存储）remains the default fallback and local restore target. In `postgres-preview`, formal backup import uses the guarded Stage 5M script path.
- No production database migration, production deployment, authentication, external API, analytics, production backup import, or production study-data mutation yet.

Project rules live in `AGENTS.md`. Stage plans live in `plan_docs/`.
