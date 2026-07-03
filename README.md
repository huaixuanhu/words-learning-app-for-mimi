# Words Learning App For Mimi

Stage 3 local vocabulary CRUD and text import scaffold for a mobile-first PTE vocabulary flashcard app.

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
- Browser `localStorage` only; this is local convenience storage, not durable production persistence.
- No database, production deployment, authentication, external API, analytics, or remote study-data mutation yet.

Project rules live in `AGENTS.md`. Stage plans live in `plan_docs/`.
