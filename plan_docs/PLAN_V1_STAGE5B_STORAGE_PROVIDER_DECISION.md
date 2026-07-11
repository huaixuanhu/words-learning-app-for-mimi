# Words Learning App For Mimi Stage 5B: Storage Provider Decision And Multi-Person Data Model

Created: 2026-07-05 00:41 AEST
Last updated: 2026-07-05 00:41 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE5A_LOCAL_EXPORT_BACKUP.md`
- User confirmation on 2026-07-05 that the next stage should proceed.
- User clarification on 2026-07-05 that the app is for a small private group, should support different people, does not need password / credential isolation, and should use one Neon Postgres（关系型数据库）with a `people` table and `person_id` separation for all study data.

Scope:

- Decide the intended durable storage provider.
- Record why Neon Postgres is the preferred provider.
- Record why the project should not use `@vercel/postgres` for new work.
- Define a private multi-person model with a `people` table.
- Require all learning data tables to include `person_id`.
- Define a no-password user switch model for a trusted private group.
- Draft the future database schema（数据库结构）for vocabulary, import batches, review states, review events, review settings, and backup imports.
- Define repository adapter（仓储适配层）boundaries for a later implementation stage.
- Define migration（迁移）path from current JSON backup / browser `localStorage`（本地浏览器存储）schema version 2 into Neon Postgres.
- Define Tier 3 gate conditions before any real database creation, remote migration, credential work, or deployment.

Non-Scope:

- No Neon project creation.
- No Vercel Marketplace installation.
- No database migration execution.
- No package installation.
- No `.env`, credential, token, secret, or private account setting read/write.
- No production deployment.
- No GitHub push or pull request.
- No authentication, password login, OAuth（开放授权）, or account-security implementation.
- No remote data mutation.
- No embedding（向量嵌入）, vector database（向量数据库）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, AI generation, dictionary API（词典接口）, analytics（分析追踪）, email, payment, or notification.
- No UI redesign beyond documenting the future person switch.

Safety / Side Effects:

- Stage 5B is documentation and architecture planning only.
- The accepted durable storage direction is one Neon Postgres database for the private project.
- The accepted app-level user model is `people`, not credential-backed accounts.
- Because there is no password or credential isolation, the future app should treat person switching as convenience separation inside a trusted private group, not as security isolation.
- `person_id` must be included in every table that stores learning data or per-person settings.
- Future remote database work upgrades the active governance gate to Tier 3 before execution.

Decision:

- Preferred provider: Neon Postgres through Vercel Marketplace.
- Fallback provider: Supabase Postgres through Vercel Marketplace only if Neon is unavailable or if later requirements need Supabase-native auth / realtime / storage.
- Rejected for new work: `@vercel/postgres`, because Vercel Postgres is no longer available for new projects and new Postgres projects should use Marketplace integrations.
- Not suitable as primary storage:
  - Vercel Blob: useful for future files, not relational learning data.
  - Edge Config: useful for configuration, not personal study data.
  - Upstash Redis: useful for cache / rate limiting, not canonical study records.
  - MongoDB / Convex / Turso: possible alternatives, but less aligned with the current Postgres-compatible target and future SQL migration needs.

Multi-Person Model:

- The app should support multiple private learners, such as the user, Mimi, and friends.
- The model is not public multi-tenant SaaS（软件即服务）.
- There is no password boundary in the current accepted scope.
- The app should expose a simple person switch in a future UI stage.
- The selected person should be stored locally in browser state, such as local storage, and sent with reads/writes.
- Every read/write path must filter by `person_id`.
- Backups should include person information or be scoped to the selected person, with the exact backup mode decided in the implementation stage.

Draft Database Schema:

This is a design draft, not an executed migration.

### people

- `id uuid primary key`
- `display_name text not null`
- `slug text not null unique`
- `is_active boolean not null default true`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### vocabulary_items

- `id uuid primary key`
- `person_id uuid not null references people(id)`
- `surface_text text not null`
- `normalized_text text not null`
- `meaning_zh text not null default ''`
- `example text not null default ''`
- `notes text not null default ''`
- `rarity_score integer null`
- `source text not null`
- `import_batch_id uuid null references import_batches(id)`
- `status text not null`
- `created_at timestamptz not null`
- `system_created_at timestamptz not null`
- `updated_at timestamptz not null`
- `timezone text not null`
- `archived_at timestamptz null`

Recommended indexes:

- `(person_id, normalized_text)`
- `(person_id, status)`
- `(person_id, created_at)`

### import_batches

- `id uuid primary key`
- `person_id uuid not null references people(id)`
- `source_type text not null`
- `file_name text null`
- `created_at timestamptz not null`
- `total_rows integer not null`
- `accepted_rows integer not null`
- `duplicate_rows integer not null`
- `invalid_rows integer not null`

Recommended indexes:

- `(person_id, created_at)`

### review_states

- `id uuid primary key`
- `person_id uuid not null references people(id)`
- `vocabulary_item_id uuid not null references vocabulary_items(id)`
- `status text not null`
- `due_at timestamptz not null`
- `last_reviewed_at timestamptz null`
- `review_count integer not null`
- `lapse_count integer not null`
- `interval_minutes integer not null`
- `difficulty double precision null`
- `stability double precision null`
- `updated_at timestamptz not null`

Recommended constraints / indexes:

- `unique (person_id, vocabulary_item_id)`
- `(person_id, due_at)`
- `(person_id, status)`

### review_events

- `id uuid primary key`
- `person_id uuid not null references people(id)`
- `vocabulary_item_id uuid not null references vocabulary_items(id)`
- `reviewed_at timestamptz not null`
- `rating text not null`
- `previous_due_at timestamptz null`
- `next_due_at timestamptz not null`
- `previous_interval_minutes integer null`
- `next_interval_minutes integer not null`
- `elapsed_ms integer not null`

Recommended indexes:

- `(person_id, reviewed_at)`
- `(person_id, vocabulary_item_id, reviewed_at)`

### review_settings

- `person_id uuid primary key references people(id)`
- `session_limit integer not null`
- `timezone text not null`
- `updated_at timestamptz not null`

### backup_imports

- `id uuid primary key`
- `person_id uuid not null references people(id)`
- `source_file_name text null`
- `source_exported_at timestamptz null`
- `imported_at timestamptz not null`
- `schema_version integer not null`
- `item_count integer not null`
- `review_event_count integer not null`
- `notes text not null default ''`

Repository Adapter Direction:

- Keep current browser-local repository as `localStorage` adapter.
- Add a future database adapter after explicit approval.
- UI should call app-level repository functions that require `person_id` or selected person context.
- Database client initialization must be lazy and must not run at module scope.
- Future server mutations should validate `person_id` on every operation.
- Future database writes should use transactions when importing backup data or committing batches.

Migration Direction:

1. Preserve Stage 5A JSON backup as the safety source.
2. Create `people` rows first.
3. For each imported backup, map all vocabulary, imports, review states, events, and settings to the chosen `person_id`.
4. Validate counts before and after migration.
5. Keep local backup export available even after database persistence exists.
6. Do not delete browser-local data automatically after migration.

Open Questions For Future Implementation:

- Should each backup file restore into the currently selected person only, or support multi-person backup files?
- Should person slugs be manually edited, or generated once from display names?
- Should switching person require a confirmation when there are unsaved local edits?
- Should there be a hidden admin-only page for managing `people`, or should settings include a small person manager?
- Should future database row-level security（行级安全）be used even without password login, or should separation stay application-level until auth is introduced?

Exit Criteria:

- Storage provider decision is recorded.
- One Neon Postgres / many people / `person_id` data separation is recorded.
- Draft schema includes `people` and per-person learning data tables.
- No-password private user switch boundary is documented.
- Future Tier 3 execution gates are documented.
- Architecture, master plan, changelog, and AI log are synchronized.
- Local governance validation passes.

Validation Plan:

- `npm run governance:preflight`

Validation Results:

- Passed: `npm run governance:preflight`.
