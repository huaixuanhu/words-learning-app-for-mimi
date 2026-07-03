# Words Learning App For Mimi Stage 3: Vocabulary CRUD And Text Import

Created: 2026-07-04 01:02 AEST
Last updated: 2026-07-04 01:14 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE1_PRODUCT_MVP.md`
- `plan_docs/PLAN_V1_STAGE2_APP_SCAFFOLD.md`
- Current local scaffold under `src/app`, `src/components`, and `src/lib`

Scope:

- Implement local vocabulary CRUD（增删改查）without remote services.
- Support add, edit, archive, restore, search, filter, and list for vocabulary items.
- Replace Stage 2 static placeholder vocabulary rows with local browser state.
- Implement a conservative `.txt` / paste text（粘贴文本）import parser（导入解析器）.
- Require import preview（导入预览）before saving candidates.
- Show duplicate candidates（重复候选）without silently overwriting existing vocabulary.
- Record user-visible `createdAt`, system-maintained `systemCreatedAt`, `updatedAt`, and `timezone`.
- Add unit tests（单元测试）for normalization, parser behavior, repository behavior, and timestamp boundaries.

Non-Scope:

- No production database, Postgres（关系型数据库）, migration（迁移）, or remote database mutation.
- No Vercel deployment, GitHub push, domain setup, or production smoke test.
- No authentication, multi-user sync, account provider, credential, or `.env` work.
- No AI-generated definitions, dictionary API（词典接口）, analytics（分析追踪）, email, payment, or other third-party service.
- No `.docx`, PDF, OCR（光学字符识别）, or complex document parsing.
- No destructive hard delete for study data; Stage 3 uses archive / restore only.
- No real review scheduler due-time algorithm; Stage 4 owns scheduling and flashcard state updates.
- No final visual redesign; Stage 3 keeps the minimal scaffold style.

Safety / Side Effects:

- Stage 3 stores vocabulary data in browser `localStorage`（本地浏览器存储）under a versioned local key.
- `localStorage` is local-only and avoids remote data sharing, but it is not a durable backup system.
- Browser profile deletion, site data clearing, or another browser/device will not preserve the same Stage 3 data.
- No data leaves the browser during CRUD or import.
- Hard delete is intentionally omitted to reduce accidental study-data loss.
- Stage 5 must revisit backup/export and durable persistence before production-only storage.

Exit Criteria:

- `VocabularyItem`, `ImportBatch`, and `ImportCandidate` types exist.
- Normalization preserves original surface text while creating a stable duplicate key.
- Manual add saves to local browser storage.
- Library page can search, filter, edit, archive, and restore items.
- Import page parses `.txt` and pasted text into preview candidates.
- Import preview shows total, new, duplicate, and invalid counts.
- Confirmed import creates an import batch and accepted vocabulary items.
- Empty, malformed, duplicate, and sentence-like inputs are handled.
- `createdAt` can be modified without losing `systemCreatedAt` and `updatedAt`.
- Unit tests and local validation commands pass.

Implementation Plan:

1. Add vocabulary domain files:
   - `src/lib/vocabulary/types.ts`
   - `src/lib/vocabulary/normalize.ts`
   - `src/lib/vocabulary/import-parser.ts`
   - `src/lib/vocabulary/repository.ts`
   - `src/lib/vocabulary/local-storage-repository.ts`
2. Add local client state hook and UI components:
   - `src/components/vocabulary/use-vocabulary-data.ts`
   - `src/components/vocabulary/home-dashboard.tsx`
   - `src/components/vocabulary/vocabulary-library.tsx`
   - `src/components/vocabulary/import-workspace.tsx`
3. Upgrade existing pages:
   - `/`
   - `/add`
   - `/import`
   - `/library`
   - `/review`
4. Add Vitest（测试框架）and `npm run test`.
5. Update `ARCHITECTURE.md`, `CHANGELOG.md`, `README.md`, `AGENTS.md`, and `governance/AI_AGENT_LOG.md`.

Implementation Outcome:

- Added vocabulary domain types, normalization, import parser, local repository, and browser `localStorage` adapter.
- Replaced Stage 2 static homepage/library/import data with local browser-backed state.
- Added manual save in `/add` with automatic `createdAt`, editable added time, automatic timezone, and system-maintained `systemCreatedAt`.
- Added `/library` search, active/archived/all filters, edit, archive, and restore.
- Added `/import` `.txt` / pasted text parser, preview, duplicate/invalid counts, row editing, and accepted-candidate import commits.
- Updated `/review` to read the first active local vocabulary item while keeping real scheduling for Stage 4.
- Added `Vitest` and domain tests for normalization, parser behavior, duplicate handling, repository mutations, timestamps, archive/restore, and import batch commits.

Validation Plan:

- `npm run governance:preflight`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm audit --json`
- Local dev server smoke check for `/`, `/add`, `/import`, and `/library`.

Validation Results:

- Passed: `npm run lint`
- Passed: `npm run typecheck`
- Passed: `npm run test` with 3 test files and 9 tests.
- Passed: `npm run build`
- Passed: `npm audit --json` with 0 total vulnerabilities.
- Passed: `npm run governance:preflight`
- Passed: local dev server smoke check for `/`, `/add`, `/import`, `/library`, and `/review` at `http://localhost:3000`.

Design Notes:

- Duplicate detection uses `normalizedText`, not raw surface text.
- `surfaceText` keeps the learner-facing input after light whitespace cleanup.
- `systemCreatedAt` is write-time metadata and should not be user-editable.
- `createdAt` is the user-visible added time and may be backfilled.
- Imported duplicate candidates are unchecked by default but can be accepted if the user intentionally wants a separate card.
- Invalid candidates cannot be accepted until edited into valid candidates in a later enhancement; Stage 3 keeps this conservative.
