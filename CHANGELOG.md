# CHANGELOG

## 2026-07-05 15:21 AEST

- Executed Stage 5K controlled write smoke for the development / preview Postgres adapter.
- Temporarily added `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` to Vercel Preview only.
- Created smoke-enabled Preview deployment `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv` at `https://words-learning-app-for-mimi-kj0qj7l5k-anorias-projects.vercel.app`.
- Verified Preview `/api/storage/health` returned `postgres-preview` with zero counts before the write.
- Called `/api/storage/smoke` once with the required confirmation header and received `ok=true`.
- Verified the development database now has exactly one smoke person, one vocabulary item, one review state, one review event, and one review settings row.
- Verified smoke vocabulary and review rows are scoped to person id `00000000-0000-4000-8000-0000000005f1`.
- Removed `MIMI_ENABLE_STORAGE_SMOKE_WRITES` from Preview after the write.
- Created follow-up disabled Preview deployment `dpl_BJn1pFAbLiiY4LgCyThKx2vDTSar` at `https://words-learning-app-for-mimi-7bzktk5uc-anorias-projects.vercel.app`.
- Verified the disabled Preview `/api/storage/smoke` returns `smoke-writes-not-enabled`.
- Removed the smoke-enabled Preview deployment.
- Reason: prove the runtime Postgres write path exactly once while closing the temporary write surface afterward.

## 2026-07-05 15:04 AEST

- Executed Stage 5J Postgres adapter read-only verification.
- Verified local `/api/storage/health` stays disabled when runtime mode is `local`.
- Verified local and Preview `postgres-preview` health checks can read Neon counts without writing data.
- Added `MIMI_STORAGE_RUNTIME=postgres-preview` to Vercel Preview only.
- Created verified Preview deployment `dpl_CFeC2VwRKtMSAjBiGGtyStsFw2tr` at `https://words-learning-app-for-mimi-dbkkkow3d-anorias-projects.vercel.app`.
- Confirmed Vercel production branch remains `main`, existing Production deployment remains non-official, and Neon core business tables remain empty.
- Reason: prove read-only adapter wiring in real Preview before considering smoke writes, backup import, UI cutover, or Production work.

## 2026-07-05 14:48 AEST

- Implemented Stage 5I runtime Postgres adapter for development / preview verification.
- Added server-only Postgres runtime mode, lazy Neon Pool creation, row mappers, and a `DurableRepositoryPort` implementation for people, vocabulary, imports, review settings, review queue, review events, and review states.
- Added `/api/storage/health` as a read-only storage health route and `/api/storage/smoke` as an opt-in write smoke route that is disabled by default.
- Added runtime mode and mapper tests.
- Kept browser `localStorage` as the user-facing runtime and kept Production Postgres runtime, backup import, and storage cutover out of scope.
- Reason: prove the database adapter boundary before any user-facing storage switch or Production work.

## 2026-07-05 14:26 AEST

- Updated Stage 5G deployment facts after Vercel Git integration created a clean Preview deployment from committed `origin/V1`.
- Documented Preview deployment `dpl_EmhfvP8yE9NrxCWPcdK3Qdd8sdk8` at `https://words-learning-app-for-mimi-aczic0spy-anorias-projects.vercel.app`.
- Added Stage 5H runtime Postgres adapter design.
- Recorded that the future runtime Postgres adapter should stay server-only, development / preview first, and disabled for Production until a separate formal gate.
- Reason: prepare the next persistence implementation safely without changing the current `localStorage` runtime or exposing public Production write paths.

## 2026-07-05 14:00 AEST

- Documented Stage 5G preview deployment boundary after confirming the current active Production deployment should remain but not be treated as formal V1 production.
- Verified Vercel project Git link production branch as `main` through read-only Vercel API output.
- Documented active Production deployment `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD` from branch `V1` as a non-official artifact.
- Created Preview deployment `dpl_d5LUb6r1wEXiJBUENb2PACEZMVsu` using standard `vercel deploy` without `--prod`.
- Verified the Preview deployment with `vercel inspect`, Vercel API OIDC claims, route-level `vercel curl` checks, and preview error-log query.
- Reason: remove deployment-state ambiguity while preserving the user's boundary that formal Production should wait until V1 is complete and merged.

## 2026-07-05 12:56 AEST

- Executed Stage 5F development / preview Vercel and Neon bootstrap after explicit user approval.
- Created and linked the Vercel project for this repository and connected it to the user's GitHub repository through the existing Vercel/GitHub account setup.
- Created the Neon resource through Vercel Marketplace for Development and Preview only, after the user accepted Marketplace terms in the browser.
- Pulled Vercel/Neon generated env vars into ignored `.env.local` without printing or committing secret values.
- Installed minimal database tooling with `@neondatabase/serverless` and `dotenv-cli`, with no ORM.
- Added guarded development database scripts and `.env.example` placeholders.
- Applied `db/migrations/0001_initial.sql` to the non-production development database and verified an empty schema with 8 tables, 11 indexes, and 5 key constraints.
- Ran local browser smoke checks for person/settings, add, import, library edit/archive, review, export buttons, and console errors.
- Attempted a preview deployment with `--target preview`; Vercel CLI returned `target: production`, so the unexpected deployment was removed immediately and follow-up inspection reported no deployments.
- Reason: complete the approved remote dry run for the accepted Neon Postgres direction while keeping active production deployment, production migration, backup import, authentication, runtime Postgres persistence, and production study-data mutation out of scope.

## 2026-07-05 01:29 AEST

- Documented Stage 5E Neon execution gate before any real remote storage work.
- Added the approval checklist for Vercel project scope, Neon project path, env handling, package installation, migration execution, backup import, and deployment scope.
- Documented future execution order for Tier 3 gate, fresh JSON backup, Vercel/Neon setup, env sync, migration dry run, backup import trial, adapter trial, and production promotion.
- Documented stop conditions and rollback direction for remote migration and import work.
- Reason: prepare the next real Neon Postgres step without touching credentials, env files, remote databases, migrations, deployment, or production data.

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
