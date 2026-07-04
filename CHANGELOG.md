# CHANGELOG

## 2026-07-05 01:12 AEST

- Implemented Stage 5D durable storage readiness without creating or connecting to a remote database.
- Added a local SQL migration draft for future Neon Postgres with `people`, person-scoped learning tables, review settings, backup imports, and backup import id mappings.
- Added database constraints and indexes for `person_id` separation, review-state uniqueness, vocabulary lookup, review queues, and backup import traceability.
- Added a local backup-to-Postgres mapping document for schema version 3 JSON backups, including source string id to target UUID mapping.
- Added a repository adapter contract requiring explicit person context for future learning-data operations.
- Added SQL static tests that check table coverage, `person_id`, person-scoped foreign keys, review uniqueness, indexes, and absence of credential/package coupling.
- Reason: prepare the database and adapter boundary for the accepted Neon Postgres path while keeping credentials, remote migrations, deployment, authentication, and remote data mutation out of scope.

## 2026-07-05 00:54 AEST

- Implemented Stage 5C local person adapter on top of browser `localStorage` schema version 3.
- Added local `people`, `selectedPersonId`, `personId` on learning records, and per-person review settings.
- Scoped local add, import duplicate detection, library filters, review queues, review events, and review settings to the selected person.
- Added a minimal `/settings` person switch and add-person control for the trusted private group model.
- Updated JSON backup to export schema version 3, include people counts, and still restore schema version 2 backups through migration.
- Updated vocabulary CSV export to include person id and display name.
- Added tests for schema migration, per-person settings, person-scoped review queues, person-scoped review recording, JSON backup compatibility, and CSV person fields.
- Reason: prepare the codebase for the accepted one-Neon-Postgres / many-people durable model without creating remote infrastructure or adding authentication.

## 2026-07-05 00:41 AEST

- Documented Stage 5B storage provider decision and multi-person data model.
- Accepted one Neon Postgres database as the intended durable storage direction for the private group.
- Added `people` / `person_id` design requirement so each learner's vocabulary, imports, review states, review events, settings, and backup imports stay separated.
- Clarified that future person switching does not require password or credential isolation in the current private-project scope.
- Documented that person switching is convenience data separation, not security isolation.
- Reason: align durable persistence planning with the user's clarification that the app will be used by multiple trusted people, not only one person.

## 2026-07-05 00:23 AEST

- Implemented Stage 5A local export and backup on top of browser `localStorage` schema version 2.
- Added complete JSON backup generation with app metadata, schema version, exported time, timezone, and record counts.
- Added vocabulary CSV export with explicit headers and escaping for commas, quotes, and newlines.
- Added `/export` restore preview for JSON backup files, with validation before writing to local browser storage.
- Added backup validation for malformed JSON, unsupported backup format, missing required fields, metadata counts, and review records referencing missing vocabulary items.
- Added unit tests for JSON backup creation, round trip restore shape, invalid backup rejection, broken review-reference rejection, and CSV escaping.
- Reason: reduce local data-loss risk before durable database provider selection, deployment, authentication, cloud sync, embedding, FSRS, or external integrations.

## 2026-07-04 23:42 AEST

- Implemented Stage 4 local review scheduler and flashcards on top of browser `localStorage` schema version 2.
- Added additive migration from schema version 1 to version 2 with `reviewStates`, `reviewEvents`, and `settings`.
- Added deterministic local review scheduling, due-first queue selection, four-rating review recording, and review event/state updates.
- Added `/settings` support for custom `sessionLimit`, and made `/review` obey the saved limit.
- Documented that fixed Stage 4 scheduler rules are only an MVP bootstrap and that later stages should evaluate embedding（向量嵌入）and FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）before replacing the scheduler.
- Added tests for migration, settings normalization, scheduler behavior, review queue selection, and review event/state updates.
- Reason: complete the agreed local review loop while keeping database, deployment, credentials, external APIs, embedding generation, FSRS implementation, analytics, and destructive data operations out of scope.

## 2026-07-04 01:14 AEST

- Implemented Stage 3 local vocabulary CRUD and text import using browser `localStorage` under `mimi-pte-vocabulary-v1`.
- Added vocabulary domain types, normalization, conservative `.txt` / pasted text import parsing, duplicate/invalid candidate handling, and local repository operations.
- Enabled manual add, library search/edit/archive/restore, import preview/save, and a local-data-backed review scaffold.
- Added `Vitest` with unit tests for normalization, parser, duplicate handling, repository mutations, timestamps, archive/restore, and import batch commits.
- Updated architecture, README, AGENTS, master plan, and Stage 3 plan to reflect the new local data flow and validation commands.
- Reason: complete the agreed Stage 3 local feature layer while keeping production database, deployment, credentials, external APIs, analytics, and destructive data operations out of scope.

## 2026-07-04 00:27 AEST

- Added the `human-ai-governance v0.2.0` marker to `AGENTS.md`.
- Added a lightweight Tier 1 `governance/preflight.py` scaffold and an npm `governance:preflight` command.
- Updated validation documentation to include the local governance preflight without introducing Tier 2 or Tier 3 requirements.
- Reason: migrate the existing project governance to the updated skill marker and preflight scaffold while keeping this local app scaffold appropriately lightweight.

## 2026-07-03 19:23 AEST

- Fixed the residual `npm audit` moderate findings by adding a root npm `overrides` entry that resolves `postcss` to 8.5.16 across the dependency tree.
- Confirmed `next@latest` is still 16.2.10 and still declares `postcss: 8.4.31`; avoided switching to canary Next.js and avoided npm's unsafe downgrade path.
- Validation now reports 0 vulnerabilities and the app still passes lint, typecheck, and production build.
- Reason: remove the known PostCSS security finding while staying on the stable Next.js release line.

## 2026-07-03 02:12 AEST

- Added Stage 2 app scaffold with Next.js App Router, TypeScript, Tailwind CSS, ESLint, npm, and minimal routes for home, add, import, review, library, export, and settings.
- Added the Stage 2 child plan and updated validation commands from file inventory to `npm run lint`, `npm run typecheck`, `npm run build`, and local dev-server smoke testing.
- Kept UI intentionally minimal so final visual design can be handled in a later dedicated stage.
- Recorded residual `npm audit` moderate findings through `next -> postcss`; no force downgrade was applied.
- Reason: create a runnable local application shell while preserving the agreed Stage 1 product boundaries and governance rules.

## 2026-07-03 01:48 AEST

- Updated the Stage 1 product plan so added time defaults to automatic recording while preserving a “modify added time” option for backfilled words.
- Clarified that timezone defaults to automatic device timezone capture and that actual write/update timestamps should remain system-maintained.
- Reason: reduce daily-entry friction while preserving a safe path for importing or manually adding older vocabulary.

## 2026-07-03 01:15 AEST

- Added Stage 1 product MVP design plan for manual entry, `.txt` batch import, import preview, and four fixed review ratings.
- Updated architecture and master plan to remove initial proficiency assumptions and defer `.docx` and PDF import to later stages.
- Reason: align the first-generation design with the updated user requirement before application scaffolding.

## 2026-07-03 00:16 AEST

- Removed accidental local `.Rhistory` file before Git bootstrap.
- Initialized the project for local Git and GitHub connection.
- Reason: keep the repository clean before the first commit and connect local governance artifacts to the user-provided GitHub repository.

## 2026-07-02 23:30 AEST

- Added initial Human-AI governance structure for the project.
- Added collaboration rules, architecture map, master plan, changelog, and AI agent log.
- Recorded that the project starts as Tier 1 durable small app governance, with Tier 3 gates required before credentials, production deployment, remote database mutation, or persistent user-data risk.
- Reason: establish a safe, resumable collaboration baseline before scaffolding the web app.
