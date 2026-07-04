# Words Learning App For Mimi Architecture

Created: 2026-07-02 23:30 AEST
Last updated: 2026-07-05 00:54 AEST

## Current State

This repository is in Stage 5C local person adapter implementation. It contains collaboration rules, architecture notes, master and stage plans, changelog, AI agent log, a lightweight Tier 1 governance preflight, and a minimal Next.js App Router application with browser-local vocabulary, review mutations, export, restore preview, and selected-person switching.

Current local stack:

- Next.js 16.2.10
- React 19.2.4
- TypeScript 5.9.3
- Tailwind CSS 4.3.2
- ESLint 9.39.4
- Vitest 4.1.9 for vocabulary domain unit tests
- npm with `package-lock.json`
- `lucide-react` 0.562.0 for simple interface icons
- npm `overrides` pins PostCSS（CSS 处理器）to 8.5.16 so the Next.js nested PostCSS copy resolves to the patched version.

Stage 5C stores local study data in browser `localStorage`（本地浏览器存储）under `mimi-pte-vocabulary-v1`, with schema version 3. This enables local add, edit, archive, restore, search, import preview, review sessions, review history, per-person review settings, JSON backup（JSON 备份）, vocabulary CSV（逗号分隔值）export, JSON restore preview, and selected-person switching without remote services.

Stage 5B records the intended durable storage direction: one Neon Postgres（关系型数据库）database for the private group, a `people` table, and `person_id` on all durable learning data. The accepted product model is private person switching without password / credential isolation. This is data separation for trusted users, not security isolation. Actual Neon project creation, credentials, migration execution, authentication（认证）, deployment, and external integrations have not been implemented.

The GitHub repository URL was provided by the user:

- `https://github.com/huaixuanhu/words-learning-app-for-mimi.git`

The local `main` branch now tracks `origin/main`. Remote repository settings have not been audited beyond the local Git connection.

## Product Goal

Build a mobile-first vocabulary web app for PTE preparation. The app should make it easy to add new words during practice, preserve context, and review cards according to Spaced Repetition（间隔重复）and a practical Forgetting Curve（遗忘曲线）model.

The product should optimize for daily use:

- quick word capture
- low-friction flashcard review
- transparent scheduling
- safe persistence of personal study data
- easy export and backup

## Planned Architecture

```text
app shell / routing
  -> word capture
  -> text file import
  -> import preview
  -> vocabulary list
  -> flashcard review
  -> review scheduler
  -> storage adapter
  -> import / export
  -> deployment boundary
```

## Planned Modules

### App Shell

Implemented as a Next.js App Router scaffold under `src/app`.

Responsibilities:

- mobile-first layout
- navigation between add, list, review, and settings views
- private-group study experience with future person switching

Current routes:

- `/`
- `/add`
- `/import`
- `/review`
- `/library`
- `/export`
- `/settings`

### Word Capture

Responsibilities:

- add word or phrase
- add Chinese meaning, example, PTE context, and notes
- record self-rated rarity
- normalize duplicate candidates without losing original user input
- record `created_at` and timezone-aware dates automatically by default
- allow the user to modify added time when backfilling older words, while keeping system-maintained write/update timestamps
- do not ask for initial proficiency; new words start as `new`

Current route: `/add`. It saves manual vocabulary items into local browser storage, records device timezone automatically, defaults added time to the current time, and keeps a “修改添加时间” option for backfilled words.

### Text File Import

Responsibilities:

- read `.txt` files in the first version
- accept pasted text through the same import parser
- parse conservative formats such as one item per line, comma-separated lists, or simple tab-separated rows
- create an import preview before saving
- preserve original row number and raw line for correction
- report invalid rows and duplicate candidates
- defer `.docx`, PDF, OCR, and complex document parsing to later stages

Current route: `/import`. It accepts `.txt` files or pasted text, runs a conservative parser, shows preview rows, reports total/new/duplicate/invalid counts, and saves accepted candidates into a recorded import batch.

### Vocabulary Store

Responsibilities:

- persist vocabulary items
- preserve multiple examples for the same word when needed
- support search, filter, edit, archive, and export
- preserve import batch metadata for batch-created vocabulary items
- keep schema migration behavior explicit once a real database is introduced

Current route: `/library`. It reads from local browser storage and supports search, active/archived/all filters, edit, archive, and restore. Stage 3 intentionally omits hard delete.

### Review Scheduler

Responsibilities:

- calculate review due time
- prioritize overdue cards
- adjust intervals from user feedback
- smooth backlog after missed study days
- expose scheduling decisions in a debuggable way
- treat the first review rating as the starting point for review state

Stage 4 implements an explainable deterministic scheduler for the local MVP. The fixed rules are a bootstrap only. Later scheduling work should evaluate embedding（向量嵌入）for semantic similarity, confusing pairs, and queue ordering, and evaluate FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）for memory scheduling after reviewing data requirements, migration impact, and explainability.

Current route: `/review`. It creates a local review session from due cards first and new cards second, obeys the saved `sessionLimit`, lets the learner flip a card, records one of four ratings, appends `ReviewEvent`, and updates `ReviewState`.

### Flashcard Review

Responsibilities:

- show front and back of a card
- collect four fixed ratings: 完全忘记了, 有点忘记了, 模糊记得, 完全记得
- write review events
- update review state
- avoid overwhelming the user with too many cards in one session

Current implementation keeps a minimal UI frame and exposes session count, completed count, and remaining count. Polished visual design remains deferred.

### Review Settings

Responsibilities:

- store `sessionLimit`
- store local timezone used by review settings
- normalize invalid limits into safe bounds
- make review queue selection obey the saved limit

Current route: `/settings`. It can save session limit and timezone to local browser storage. The default session limit is 24, with safe bounds of 1 to 80.

### Storage Adapter

Development storage currently uses browser `localStorage`（本地浏览器存储）through `src/lib/vocabulary/local-storage-repository.ts`. The local migration path upgrades schema version 1 vocabulary data to schema version 2 by adding `reviewStates`, `reviewEvents`, and `settings`. Production storage should use a Postgres（关系型数据库）provider suitable for Vercel deployment, such as a Vercel Marketplace integration. Provider choice requires a separate plan because storage affects user data and migrations.

Stage 5B storage decision:

- Preferred provider: Neon Postgres through Vercel Marketplace.
- Fallback: Supabase Postgres only if Neon is unavailable or later requirements need Supabase-native auth（认证）, realtime（实时）, or storage（文件存储）.
- Rejected for new work: `@vercel/postgres`, because Vercel Postgres is no longer available for new projects.
- Database client initialization must be lazy in any future implementation, so `next build` does not require database environment variables at module evaluation time.
- Future database implementation must add `person_id` to every learning-data repository method and query.

### People And Person Switching

The app is intended for a small trusted private group, not only one learner. The future durable model should include:

- `people`
- `vocabulary_items.person_id`
- `import_batches.person_id`
- `review_states.person_id`
- `review_events.person_id`
- `review_settings.person_id`
- `backup_imports.person_id`

There is no accepted password, OAuth, or credential-isolation requirement yet. A future UI can offer a simple person switch. Every durable read/write must filter by selected `person_id`. This prevents mixing study histories while keeping the private-project workflow lightweight.

Current local implementation:

- `VocabularyData.schemaVersion` is 3.
- Local data includes `people` and `selectedPersonId`.
- Vocabulary items, import batches, review states, and review events include `personId`.
- Review settings are stored in `settingsByPerson`.
- `/settings` includes a minimal person switch and add-person control.
- Local repository helpers filter active, archived, all-library, duplicate detection, review queues, and review writes by selected person.
- Schema version 1 / 2 local data migrates into version 3 by assigning existing data to the default person.
- JSON backup export uses version 3; JSON backup restore still accepts version 2 and migrates it to version 3.

### Import And Export

Responsibilities:

- export vocabulary and review data to CSV or JSON
- support first-version import from `.txt` files and pasted text
- defer `.docx` and PDF import until a later document-parsing stage
- protect against duplicate imports, malformed rows, and timezone drift

Current route: `/export`. It can download a complete JSON backup with metadata（元数据）, download a vocabulary CSV, parse JSON backup files locally, show restore counts, and restore schema version 2 data after explicit confirmation. JSON restore rejects malformed files, unsupported backup shapes, incomplete required fields, invalid review references, and missing metadata counts before mutating local browser storage.

### Backup Format

Stage 5A uses a local backup envelope:

- `format`
- `backupVersion`
- `metadata`
- `data`

The `data` field contains the current `VocabularyData` schema version 3 shape. The metadata records app name, exported time, timezone, schema version, and counts for people, vocabulary items, archived items, import batches, review states, and review events.

### Deployment Boundary

Deployment is planned for Vercel after the app is locally validated. GitHub and Vercel actions require explicit human approval under `AGENTS.md`.

## Draft Data Model

This is a planning model, not a committed database schema.

### Vocabulary Item

- `id`
- `person_id`
- `surface_text`
- `normalized_text`
- `language`
- `meaning_zh`
- `context`
- `notes`
- `rarity_score`
- `source`
- `import_batch_id`
- `created_at`
- `updated_at`
- `system_created_at`
- `timezone`
- `archived_at`

### Import Batch

- `id`
- `person_id`
- `source_type`
- `file_name`
- `created_at`
- `total_rows`
- `accepted_rows`
- `duplicate_rows`
- `invalid_rows`

### Review State

- `id`
- `person_id`
- `vocabulary_item_id`
- `status`
- `due_at`
- `last_reviewed_at`
- `review_count`
- `lapse_count`
- `interval_minutes`
- `difficulty`
- `stability`
- `updated_at`

### Review Event

- `id`
- `person_id`
- `vocabulary_item_id`
- `reviewed_at`
- `rating`
- `previous_due_at`
- `next_due_at`
- `previous_interval_minutes`
- `next_interval_minutes`
- `elapsed_ms`

### Review Settings

- `person_id`
- `session_limit`
- `timezone`
- `updated_at`

### People

- `id`
- `display_name`
- `slug`
- `is_active`
- `created_at`
- `updated_at`

## Safety And Privacy

- Study data is private by default.
- Durable study data should be separated by `person_id` for each private learner.
- Person switching is convenience separation, not security isolation.
- No analytics, tracking, AI generation, or third-party data sharing should be added without explicit approval.
- Credentials and database URLs must stay out of source control.
- Export should be available before the project depends on production-only persistence.

## Known Edge Cases

- duplicate words with different meanings
- phrase cards versus single-word cards
- `.txt` files with mixed delimiters
- invalid, empty, or duplicated import rows
- case, punctuation, plural forms, and verb tenses
- missed review days and large overdue backlog
- local migration from version 1 to version 2
- self-rated rarity that conflicts with review performance
- backfilled added time that differs from actual write time
- timezone changes between Australia and other regions
- accidental deletion or destructive migration
- invalid, stale, or manually edited JSON backup files
- review history entries pointing to missing vocabulary items
- accidental cross-person reads or writes if `person_id` is not filtered
- person switching without password isolation being misunderstood as security
- offline or slow mobile usage

## Validation Boundary

Current local validation commands:

- `npm run governance:preflight`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm audit --json`
- `npm run dev` plus browser smoke check

Current unit tests cover vocabulary normalization, import parsing, duplicate candidate handling, repository updates, timestamp preservation, archive/restore, import batch commits, local schema migration, person-scoped data separation, per-person review settings, due-first queue selection, scheduler intervals, review event/state updates, JSON backup validation, CSV escaping, invalid backup rejection, broken review-reference rejection, and backup round trip behavior. Later validation should cover:

- duplicate card behavior
- empty deck behavior
- timezone scheduling
- browser-level download and restore interaction checks
- cross-person data separation once Neon persistence is implemented
- embedding or FSRS migration safety when those later stages are explicitly approved
