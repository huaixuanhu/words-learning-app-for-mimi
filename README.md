# Words Learning App For Mimi

Stage 5A local vocabulary, text import, review scheduler, flashcards, and local export / backup for a mobile-first PTE vocabulary app.

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
- Browser `localStorage`（本地浏览器存储）only; this is local convenience storage, not durable production persistence.
- No database, production deployment, authentication, external API, analytics, or remote study-data mutation yet.

Project rules live in `AGENTS.md`. Stage plans live in `plan_docs/`.
