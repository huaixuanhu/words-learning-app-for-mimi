# Words Learning App For Mimi Stage 5C: Local Person Adapter

Created: 2026-07-05 00:47 AEST
Last updated: 2026-07-05 00:47 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE5A_LOCAL_EXPORT_BACKUP.md`
- `plan_docs/PLAN_V1_STAGE5B_STORAGE_PROVIDER_DECISION.md`
- User confirmation on 2026-07-05 to execute Stage 5C.

Scope:

- Upgrade local browser `localStorage`（本地浏览器存储）data from schema version 2 to schema version 3.
- Add local `people` records and `selectedPersonId`.
- Add `personId` to vocabulary items, import batches, review states, and review events.
- Replace single global review settings with per-person review settings.
- Scope local add, import, library, review, and settings behavior to the selected person.
- Add a minimal private person switch and add-person control in `/settings`.
- Keep JSON backup（JSON 备份）and CSV（逗号分隔值）export compatible with schema version 3.
- Preserve restore support for older schema version 2 backups by migrating them into schema version 3.
- Add tests for migration, person switching, per-person settings, person-scoped queues, and backup round trip.

Non-Scope:

- No Neon project creation.
- No Vercel Marketplace installation.
- No database package installation.
- No `.env`, credential, token, secret, or private account setting read/write.
- No remote database migration or remote data mutation.
- No production deployment, GitHub push, or pull request.
- No password login, OAuth（开放授权）, authentication（认证）, or account-security implementation.
- No polished final UI redesign.
- No embedding（向量嵌入）, vector database（向量数据库）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, AI generation, dictionary API（词典接口）, analytics（分析追踪）, email, payment, or notification.

Safety / Side Effects:

- Stage 5C mutates only local browser data after the app writes the migrated schema.
- Migration from schema version 1 or 2 assigns existing local data to the default person.
- Person switching is private convenience separation, not security isolation.
- Every local read/write helper should filter or write by selected `personId`.
- Backup restore must reject invalid person references before replacing local data.
- A Stage 5A JSON backup remains the safety path before future database work.

Exit Criteria:

- Schema version 3 exists in local types and repository creation.
- Schema version 1 / 2 migration assigns legacy data to a default person.
- New vocabulary items and import batches include selected `personId`.
- Review states and review events include selected `personId`.
- Review queue selection uses only the selected person's data.
- Review settings are per-person.
- `/settings` can switch selected person and add a person locally.
- JSON backup exports schema version 3 and can restore schema version 2 backups through migration.
- CSV export includes person information.
- Unit tests cover migration, person-scoped data, settings, review queue behavior, and backup behavior.
- Local validation commands pass.

Implementation Plan:

1. Add person domain helpers.
2. Upgrade vocabulary and review types to schema version 3.
3. Update local migration to v3.
4. Make repository, scheduler, settings, and review recording person-scoped.
5. Add `/settings` person switch / add-person UI.
6. Update backup and CSV export for person metadata.
7. Update tests.
8. Sync docs and governance logs.

Validation Plan:

- `npm run governance:preflight`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --json`
- Local dev server smoke check for `/settings`, `/library`, `/review`, and `/export`.

Implementation Outcome:

- Added local person domain helpers.
- Upgraded local `VocabularyData` to schema version 3.
- Added `people`, `selectedPersonId`, and `settingsByPerson`.
- Added `personId` to vocabulary items, import batches, review states, and review events.
- Migrated schema version 1 / 2 data to the default person.
- Scoped local add, import duplicate detection, library filtering, review queue selection, review event/state writes, and review settings to selected person.
- Added `/settings` controls for selecting and adding a private person.
- Updated JSON backup and CSV export for schema version 3.
- Preserved schema version 2 JSON backup restore through migration.
- Added and updated tests for migration, person scoping, review settings, review queues, backup, and CSV behavior.

Validation Results:

- Passed: `npm run test` with 9 test files and 30 tests.
- Passed: `npm run typecheck`.
- Passed: `npm run lint`.
- Passed: `npm run governance:preflight`.
- Passed: `npm run build`.
- Passed: `npm audit --json` with 0 vulnerabilities.
- Passed: local dev server smoke checks for `/settings`, `/library`, `/review`, and `/export` on `http://localhost:3000`.
