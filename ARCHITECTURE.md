# Words Learning App For Mimi Architecture

Created: 2026-07-02 23:30 AEST
Last updated: 2026-07-03 01:15 AEST

## Current State

This repository is in governance and product-design bootstrap. It currently contains collaboration rules, architecture notes, a master plan, a Stage 1 MVP product plan, changelog, and AI agent log. Application code has not been scaffolded yet.

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

Likely Next.js with TypeScript. The exact framework version and routing mode must be confirmed from current official docs before scaffold.

Responsibilities:

- mobile-first layout
- navigation between add, list, review, and settings views
- private-by-default study experience

### Word Capture

Responsibilities:

- add word or phrase
- add Chinese meaning, example, PTE context, and notes
- record self-rated rarity
- normalize duplicate candidates without losing original user input
- record `created_at` and timezone-aware dates
- do not ask for initial proficiency; new words start as `new`

### Text File Import

Responsibilities:

- read `.txt` files in the first version
- accept pasted text through the same import parser
- parse conservative formats such as one item per line, comma-separated lists, or simple tab-separated rows
- create an import preview before saving
- preserve original row number and raw line for correction
- report invalid rows and duplicate candidates
- defer `.docx`, PDF, OCR, and complex document parsing to later stages

### Vocabulary Store

Responsibilities:

- persist vocabulary items
- preserve multiple examples for the same word when needed
- support search, filter, edit, archive, and export
- preserve import batch metadata for batch-created vocabulary items
- keep schema migration behavior explicit once a real database is introduced

### Review Scheduler

Responsibilities:

- calculate review due time
- prioritize overdue cards
- adjust intervals from user feedback
- smooth backlog after missed study days
- expose scheduling decisions in a debuggable way
- treat the first review rating as the starting point for review state

Initial scheduler should be explainable and deterministic. FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）can be evaluated after enough review history exists or if a TypeScript library is chosen deliberately.

### Flashcard Review

Responsibilities:

- show front and back of a card
- collect four fixed ratings: 完全忘记了, 有点忘记了, 模糊记得, 完全记得
- write review events
- update review state
- avoid overwhelming the user with too many cards in one session

### Storage Adapter

Development storage can start local and simple. Production storage should use a Postgres（关系型数据库）provider suitable for Vercel deployment, such as a Vercel Marketplace integration. Provider choice requires a separate plan because storage affects user data and migrations.

### Import And Export

Responsibilities:

- export vocabulary and review data to CSV or JSON
- support first-version import from `.txt` files and pasted text
- defer `.docx` and PDF import until a later document-parsing stage
- protect against duplicate imports, malformed rows, and timezone drift

### Deployment Boundary

Deployment is planned for Vercel after the app is locally validated. GitHub and Vercel actions require explicit human approval under `AGENTS.md`.

## Draft Data Model

This is a planning model, not a committed database schema.

### Vocabulary Item

- `id`
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
- `archived_at`

### Import Batch

- `id`
- `source_type`
- `file_name`
- `created_at`
- `total_rows`
- `accepted_rows`
- `duplicate_rows`
- `invalid_rows`

### Review State

- `id`
- `vocabulary_item_id`
- `status`
- `due_at`
- `last_reviewed_at`
- `review_count`
- `lapse_count`
- `difficulty`
- `stability`

### Review Event

- `id`
- `vocabulary_item_id`
- `reviewed_at`
- `rating`
- `previous_due_at`
- `next_due_at`
- `elapsed_ms`

## Safety And Privacy

- Study data is private by default.
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
- self-rated rarity that conflicts with review performance
- timezone changes between Australia and other regions
- accidental deletion or destructive migration
- offline or slow mobile usage

## Validation Boundary

No application validation exists yet. Current validation is file inventory only. Once the app exists, validation should cover:

- duplicate card behavior
- empty deck behavior
- due card selection
- timezone scheduling
- import and export round trip
- import preview and duplicate handling
- first review rating creation of review state
- storage migration safety
