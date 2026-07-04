# Words Learning App For Mimi

Stage 5E local vocabulary, text import, review scheduler, flashcards, local export / backup, local multi-person adapter, durable storage readiness, and Neon execution gate planning for a mobile-first PTE vocabulary app.

## Commands

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
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
- Stage 5E execution gate: documented approval checklist, remote execution order, stop conditions, and rollback direction before any Neon/Vercel action.
- Browser `localStorage`（本地浏览器存储）only; this is local convenience storage, not durable production persistence.
- No database, production deployment, authentication, external API, analytics, or remote study-data mutation yet.

Project rules live in `AGENTS.md`. Stage plans live in `plan_docs/`.
