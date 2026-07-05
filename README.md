# Words Learning App For Mimi

Stage 5L local vocabulary, text import, review scheduler, flashcards, local export / backup, local multi-person adapter, durable storage readiness, development / preview Neon bootstrap, server-only runtime Postgres adapter, read-only Preview verification, controlled Preview write smoke, and backup import dry-run harness for a mobile-first PTE vocabulary app.

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
- Runtime mode stays `local` by default. Postgres runtime is currently enabled for Vercel Preview only through `MIMI_STORAGE_RUNTIME=postgres-preview`; smoke writes require `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` and `x-mimi-storage-smoke: allow-dev-preview-write`, and the write flag is currently not configured after Stage 5K.
- User-facing runtime still uses browser `localStorage`（本地浏览器存储）; this is local convenience storage, not durable production persistence.
- No production database migration, production deployment, authentication, external API, analytics, formal user backup import, user-facing storage cutover, or production study-data mutation yet.

Project rules live in `AGENTS.md`. Stage plans live in `plan_docs/`.
