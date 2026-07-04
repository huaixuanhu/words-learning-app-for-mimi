# Words Learning App For Mimi Stage 4: Review Scheduler And Flashcards

Created: 2026-07-04 23:36 AEST
Last updated: 2026-07-04 23:42 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE1_PRODUCT_MVP.md`
- `plan_docs/PLAN_V1_STAGE3_VOCABULARY_CRUD_IMPORT.md`
- User confirmation on 2026-07-04 that Stage 4 should document future embedding（向量嵌入）direction and make session limit（单次复习上限）customizable.

Scope:

- Implement local flashcard review for active vocabulary items.
- Upgrade browser `localStorage`（本地浏览器存储）schema from version 1 to version 2 without deleting existing vocabulary or import batches.
- Add `reviewStates`, `reviewEvents`, and `settings` to the local data model.
- Let `/review` select due cards and new cards deterministically.
- Let the learner flip a card, submit one of four fixed ratings, write a `ReviewEvent`, update `ReviewState`, and move to the next card.
- Make `sessionLimit` configurable in `/settings` and make `/review` actually obey the saved value.
- Keep Stage 4 scheduler rules simple, deterministic（确定性）, transparent, and unit-tested.
- Document that the fixed scheduler is a local MVP bootstrap, not the intended long-term learning strategy.
- Document future evaluation of embedding（向量嵌入）and FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）for later stages.

Non-Scope:

- No production database, Postgres（关系型数据库）, remote migration（迁移）, or remote study-data mutation.
- No Vercel deployment, GitHub push, domain setup, or production smoke test.
- No authentication, multi-user sync, account provider, credential, or `.env` work.
- No AI-generated definitions, dictionary API（词典接口）, analytics（分析追踪）, email, payment, notification, or third-party data sharing.
- No embedding generation, vector database, similarity search, or FSRS implementation in Stage 4.
- No export / backup implementation; Stage 5 owns durable persistence, export, and backup.
- No final visual redesign; Stage 4 keeps the minimal scaffold style.

Safety / Side Effects:

- Stage 4 mutates local browser `localStorage` only.
- Migration from schema version 1 to 2 is additive: existing `items` and `importBatches` are preserved.
- Review history and settings are personal study data, so no remote services are contacted.
- Hard delete remains omitted.
- Stage 5 must provide CSV/JSON export and durable backup before relying on production-only storage.

Exit Criteria:

- `ReviewState`, `ReviewEvent`, and `ReviewSettings` types exist.
- Local data schema version 2 can migrate version 1 data without losing vocabulary or import batches.
- `/settings` can save a valid custom `sessionLimit`.
- Invalid, empty, too-small, or too-large session limits normalize to safe bounds.
- `/review` uses the saved `sessionLimit`.
- Due cards are selected before new cards.
- Archived vocabulary items are excluded from review.
- Four review ratings create review events and update next due time.
- Empty deck and completed session states render clearly.
- Unit tests cover scheduler, migration, settings, and review repository behavior.
- Local validation commands pass.

Implementation Plan:

1. Add review domain files:
   - `src/lib/review/types.ts`
   - `src/lib/review/scheduler.ts`
   - `src/lib/review/repository.ts`
   - `src/lib/review/settings.ts`
2. Upgrade storage schema:
   - update `src/lib/vocabulary/types.ts`
   - update `src/lib/vocabulary/repository.ts`
   - update `src/lib/vocabulary/local-storage-repository.ts`
3. Add review and settings UI components:
   - `src/components/review/review-session.tsx`
   - `src/components/settings/review-settings-form.tsx`
4. Upgrade routes:
   - `/review`
   - `/settings`
5. Add unit tests for scheduler, migration, settings, and review repository.
6. Update `ARCHITECTURE.md`, `CHANGELOG.md`, `README.md`, `AGENTS.md`, `PLAN_V1_MASTER.md`, and `governance/AI_AGENT_LOG.md`.

Implementation Outcome:

- Added review domain types, settings normalization, deterministic scheduler, and review repository.
- Upgraded local storage schema to version 2 with additive migration from version 1.
- Added `reviewStates`, `reviewEvents`, and `settings` to local study data.
- Added `/settings` form for custom `sessionLimit` and timezone.
- Added `/review` session UI that creates a fixed session queue, flips cards, records ratings, writes review events, updates review states, and moves to the next card.
- Updated homepage session limit display to read the saved setting.
- Removed the old static `defaultSessionLimit` constant from Stage 2 data.
- Added unit tests for scheduler behavior, session limit normalization, settings update, schema migration, and review event/state updates.

Stage 4 Scheduler Notes:

- The Stage 4 scheduler is intentionally simple:
  - 完全忘记了: next review in 10 minutes.
  - 有点忘记了: next review in 1 day.
  - 模糊记得: next review in 3 days.
  - 完全记得: next review in 7 days.
- Later reviews may use existing interval information for deterministic ordering, but Stage 4 should avoid hidden magic.
- Missed-day backlog should be smoothed by session limit and due-first ordering, not by hiding overdue cards.

Future Scheduling Direction:

- Fixed rules are not the intended long-term strategy.
- A later stage should evaluate embedding（向量嵌入）support for semantic similarity, confusing pairs, synonyms / near-synonyms, context similarity, and review queue ordering.
- FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）remains a candidate for memory scheduling, but should be evaluated together with data requirements, migration impact, and explainability.
- Embedding or FSRS work must stay explicit opt-in because it may introduce external services, model costs, vector storage, privacy concerns, and new validation requirements.

Validation Plan:

- `npm run governance:preflight`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm audit --json`
- Local dev server smoke check for `/review` and `/settings`.

Validation Results:

- Passed: `npm run test` with 7 test files and 20 tests.
- Passed: `npm run typecheck`.
- Passed: `npm run lint`.
- Passed: `npm run build`.
- Passed: `npm audit --json` with 0 vulnerabilities.
- Passed: `npm run governance:preflight`.
- Passed: local dev server smoke checks for `/`, `/review`, and `/settings` on `http://localhost:3000`.
