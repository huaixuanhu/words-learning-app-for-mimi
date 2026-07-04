# Words Learning App For Mimi Stage 5A: Local Export And Backup

Created: 2026-07-05 00:08 AEST
Last updated: 2026-07-05 00:08 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE4_REVIEW_SCHEDULER_FLASHCARDS.md`
- User confirmation on 2026-07-05 to execute Stage 5A.

Scope:

- Make `/export` usable for local export and backup.
- Generate a complete JSON backup（JSON 备份）for current browser-local study data.
- Include metadata（元数据）in JSON backup: app name, backup version, exported time, schema version, timezone, and record counts.
- Export vocabulary items to CSV（逗号分隔值）for spreadsheet use.
- Parse JSON backup files locally in the browser and show a restore preview（恢复预览）before writing data.
- Restore from valid JSON backup only after explicit user action.
- Validate backup shape before restore, including schema version, arrays, settings, and required root fields.
- Preserve Stage 4 schema version 2 as the accepted local data shape.
- Add unit tests for backup creation, CSV escaping, invalid backup rejection, and JSON export/import round trip.
- Keep all work local-first and browser-only.

Non-Scope:

- No production database, Postgres（关系型数据库）, remote migration（远程迁移）, or cloud sync（云同步）implementation.
- No Vercel deployment, GitHub push, domain setup, or production smoke test.
- No authentication, account provider, credential, `.env`, OAuth（开放授权）, or secrets work.
- No embedding（向量嵌入）, vector database（向量数据库）, similarity search（相似度搜索）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, AI generation, dictionary API（词典接口）, analytics（分析追踪）, email, payment, or notification.
- No destructive restore by default. Stage 5A restore replaces local browser data only after preview and explicit button click.
- No polished final visual redesign.

Safety / Side Effects:

- Stage 5A reads and writes only browser `localStorage`（本地浏览器存储）through the existing local repository path.
- JSON backup download and CSV export happen in the browser without contacting remote services.
- Restore writes personal study data locally, so the UI must show counts before confirmation.
- Invalid, malformed, unsupported, or incomplete backup files must not mutate existing local data.
- Backup files may contain personal study data, including examples, notes, review history, and timestamps.

Exit Criteria:

- `/export` can download a complete JSON backup.
- `/export` can download vocabulary CSV.
- `/export` can read a JSON backup file and show counts before restore.
- Valid JSON backup restore writes schema version 2 data into local storage.
- Invalid backup restore does not mutate existing data.
- CSV output escapes commas, quotes, and newlines correctly.
- JSON backup round trip preserves vocabulary, import batches, review state, review events, settings, and schema version.
- Documentation and governance logs are updated.
- Local validation commands pass.

Implementation Plan:

1. Add backup domain files:
   - `src/lib/backup/types.ts`
   - `src/lib/backup/json-backup.ts`
   - `src/lib/backup/csv-export.ts`
2. Add export UI:
   - `src/components/export/export-workspace.tsx`
   - update `src/app/export/page.tsx`
3. Add unit tests:
   - JSON backup creation and parse validation.
   - CSV escaping and vocabulary field coverage.
   - Round trip restore safety.
4. Update docs:
   - `ARCHITECTURE.md`
   - `PLAN_V1_MASTER.md`
   - `CHANGELOG.md`
   - `README.md`
   - `AGENTS.md`
   - `governance/AI_AGENT_LOG.md`

Validation Plan:

- `npm run governance:preflight`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm audit --json`
- Local dev server smoke check for `/export`.

Implementation Outcome:

- Added backup domain types, JSON backup creation, JSON backup parsing, validation, and CSV export helpers.
- Added `/export` UI for current data counts, JSON backup download, vocabulary CSV download, JSON backup file preview, and explicit local restore.
- Added validation for backup format, backup version, metadata counts, schema version 2 data, required array fields, settings, and review records that reference missing vocabulary items.
- Added unit tests for JSON backup metadata, round trip behavior, malformed backup rejection, broken review-reference rejection, CSV escaping, and stable CSV headers.
- Updated project docs and governance logs to record Stage 5A boundaries.

Validation Results:

- Passed: `npm run test` with 9 test files and 26 tests.
- Passed: `npm run typecheck`.
- Passed: `npm run lint`.
- Passed: `npm run governance:preflight`.
- Passed: `npm run build`.
- Passed: `npm audit --json` with 0 vulnerabilities.
- Passed: local dev server smoke check for `/export` on `http://localhost:3000`.
