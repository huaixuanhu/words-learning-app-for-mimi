# Words Learning App For Mimi Stage 8: Review Memory Algorithm

Created: 2026-07-08 12:45 AEST
Last updated: 2026-07-08 18:44 AEST

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE4_REVIEW_SCHEDULER_FLASHCARDS.md`, `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`, `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md`, `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md`, `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`, `ARCHITECTURE.md`, `src/lib/review/scheduler.ts`, `src/lib/review/repository.ts`, `src/components/review/review-session.tsx`, and the 2026-07-08 user decision to replace the placeholder review algorithm before formal V1 Production（生产环境）launch.
Scope: design the V1 Recognition Vocabulary（阅读词汇）review memory algorithm, including same-session repeat behavior, cross-day FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）scheduling, local data migration, future Postgres（关系型数据库）schema compatibility, backup（备份）semantics, rollback（回退）/ reset rebuild behavior, tests, and documentation.
Non-Scope: no code implementation in this documentation step, no package installation, no Vercel command, no Neon command, no `.env` or credential read/change, no remote database migration（数据库迁移）, no Production deployment, no Production data mutation, no Active Vocabulary（输出词汇）scheduler, no AI API（人工智能接口）, no dictation engine（听写引擎）, no spelling checker（拼写检查器）, no writing feedback model, no external vocabulary source, no analytics（分析追踪）, no notification, no email, and no 付费/扣款 feature.
Exit criteria: Stage 8 plan exists, V1 Recognition-only scheduling boundaries are explicit, Active Vocabulary remains stored/exported/imported without scheduling behavior, Stage 6B-P1 is marked blocked on Stage 8, implementation slices and validation gates are clear, and every future package / code / schema / database action remains behind explicit human approval.

## Decision Record

On 2026-07-08, the user identified that the current Stage 4 review scheduler is still a placeholder linear interval model. The user accepted a separate Stage 8 before formal V1 cloud launch.

Accepted V1 direction:

- Same-day review sessions must repeat Recognition words rated `完全忘记了` or `有点忘记了` inside the current session.
- A Recognition word leaves the current session only after the learner selects `模糊记得` or `完全记得`.
- Cross-day scheduling should borrow from FSRS-6 rather than keep the fixed Stage 4 interval table.
- Active Vocabulary must not share the Recognition scheduler or state model in V1.
- Stage 6B-P1 Postgres Production runtime implementation must wait until Stage 8 data/state design is accepted, so Production does not persist the wrong memory state shape.

## Reference Check

Checked on 2026-07-08:

- Open Spaced Repetition organization: `https://github.com/open-spaced-repetition`
- FSRS algorithm page: `https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm`
- `ts-fsrs` documentation: `https://open-spaced-repetition.github.io/ts-fsrs/`

Planning implications:

- Open Spaced Repetition identifies itself as the creator / maintainer community for FSRS.
- FSRS is based on the DSR（Difficulty, Stability, Retrievability，难度/稳定性/可提取率）memory model.
- `ts-fsrs` is the relevant TypeScript（类型脚本）package for this Next.js app and requires Node.js（运行时）`>=20.0.0`.
- `ts-fsrs` supports `repeat` to preview four outcomes, `next` to apply a chosen rating, `request_retention`, `maximum_interval`, `learning_steps`, `relearning_steps`, `get_retrievability`, and history helpers such as rollback / reschedule.
- Implementation must inspect the installed package's actual types before changing local or Postgres schemas.

## Current Local Facts

The current scheduler lives in `src/lib/review/scheduler.ts`:

- Stage 8-D replaced the fixed Stage 4 interval table with `ts-fsrs` scheduling for Recognition.
- V1 ratings map through `src/lib/review/fsrs-recognition.ts`.
- FSRS writes neutral `difficulty` and `stability` values into `ReviewState`.
- Exact `dueAt` timestamps remain stored, while Review queue due checks use local natural-day bucket（本地自然日分桶）semantics.

The current Review session lives in `src/components/review/review-session.tsx`:

- Every rating records one event.
- `forgot` and `hard` repeat later inside the current Recognition session.
- `vague` and `remembered` are the only ratings that pass the word for the current session.
- `回退1词` can remove the previous completed review event and place that word back at the front of the session.

The current repository behavior lives in `src/lib/review/repository.ts`:

- `recordReview()` rejects non-Recognition items.
- `resetTodayReviewTask()` and `rollbackReviewEvent()` rebuild `ReviewState` from historical `ReviewEvent` rows using the FSRS-backed scheduler.
- The future Postgres repository path also rejects non-Recognition review recording.

The current data model already has neutral `difficulty` and `stability` fields in `ReviewState` and `review_states`. These names should stay neutral because V2 may add non-Recognition practice modes with separate state rows.

## V1 Recognition Boundary

Hard rule for Stage 8 implementation:

- V1 FSRS applies only to vocabulary items where `learningTrack === "recognition"`.
- Recognition review queue selection must continue to ignore Active Vocabulary.
- Recognition review events must be person-scoped and item-scoped as today.
- Recognition review state may use neutral `difficulty`, `stability`, `intervalMinutes`, `dueAt`, `reviewCount`, and `lapseCount` fields.
- Documentation must say these neutral state fields are V1-used only by Recognition, even though the names are not Recognition-specific.

## Active Vocabulary Boundary

Active Vocabulary is a future production / usage skill. It asks whether the learner can actively write, say, or use the word correctly. That is a different evidence model from recognition memory.

V1 hard rules:

- Active words do not enter the Review queue（复习队列）.
- Active words do not generate `ReviewState`.
- Active words do not generate `ReviewEvent`.
- Active words do not receive FSRS-6 difficulty / stability updates.
- Active words keep `learningTrack`, `tags`, meanings, examples, source, import batch, backup, export, and import semantics.
- UI may continue to show Active as a future Practice Lab / 练习室 entry.
- UI must not show `今日 Active 到期`, `Active 待复习`, or similar copy that implies Active scheduling already exists.

Reason:

- Future Active review may depend on AI API scoring, answer content, prompt version（提示词版本）, task type（任务类型）, and writing / speaking mode.
- If V1 writes Recognition-style FSRS state for Active words, Production data may later contain misleading state that V2 has to undo.

## V2 Compatibility Boundary

If V2 adds Active scheduler behavior, it must not share the same state row as Recognition memory.

Recommended future dimensions:

- `review_profile`
- `skill_type`
- `activity_type`
- or another explicit state dimension that separates Recognition memory from Active production skill.

Possible future examples:

- one word can have a Recognition state for recognizing the meaning;
- the same word can have a separate spelling state;
- the same word can have a separate speaking / usage state;
- AI-scored writing attempts can store prompt version and task type without polluting Recognition state.

Stage 8 should keep this future path open by preserving neutral state field names and documenting that V1 writes only Recognition rows.

## Same-Session Review Design

Initial session:

- Build a Recognition-only session from due cards first and new cards second.
- Obey `recognitionSessionLimit`.
- Freeze the initial N-card set for the visible session unless reset / rollback changes it.

Rating behavior:

- `forgot` / `完全忘记了`: record the attempt, update Recognition memory state, mark the item as not passed for this session, and requeue the same item later in the current session.
- `hard` / `有点忘记了`: record the attempt, update Recognition memory state, mark the item as not passed for this session, and requeue the same item later in the current session.
- `vague` / `模糊记得`: record the attempt, update Recognition memory state, mark the item as passed for this session, and remove it from the current session.
- `remembered` / `完全记得`: record the attempt, update Recognition memory state, mark the item as passed for this session, and remove it from the current session.

Requeue rules:

- Avoid immediate repetition when other cards are available.
- Prefer placing a failed item after at least 2 other pending cards, or at the end of the current pending queue if fewer cards remain.
- If the session has only one word, repeat it directly after answer reveal and rating feedback.
- Do not create duplicate pending copies for the same failed item if it is already waiting to repeat.

Completion rules:

- A session completes when every initial item has received a pass rating in that session.
- Attempt count and passed-word count should be distinct in the implementation and UI copy.
- Completion sound / modal should trigger only after all required repeats have passed.

Safety rules:

- Leaving the page must not corrupt study data; recorded attempts remain valid.
- The implementation may add a calm pause / finish-later path later, but it must not mark a failed word as passed.
- `回退1词` must handle repeated cards by rolling back the selected previous event and rebuilding that word's state.
- `重置今日复习任务` must still remove today's selected-person review events and rebuild from earlier history.

## Cross-Day FSRS Design

Stage 8 should use `ts-fsrs` rather than hand-writing FSRS formulas.

Rating mapping:

| V1 rating | UI label | FSRS rating |
| --- | --- | --- |
| `forgot` | 完全忘记了 | `Rating.Again` |
| `hard` | 有点忘记了 | `Rating.Hard` |
| `vague` | 模糊记得 | `Rating.Good` |
| `remembered` | 完全记得 | `Rating.Easy` |

Scheduling expectations:

- Keep `request_retention` explicit and documented. Initial candidate: `0.9`, pending calibration.
- Keep `maximum_interval` explicit and documented. Initial candidate: large enough for long-term vocabulary retention, pending calibration.
- Decide whether to enable `enable_fuzz` only after tests define deterministic behavior. Unit tests should disable fuzz.
- Decide whether `learning_steps` / `relearning_steps` should be used directly or whether the app's same-session repeat loop should own short-term behavior.
- Store the scheduler version and parameter assumptions in docs, and add data fields only after inspecting the installed package shape.

State rebuild:

- Reset / rollback must rebuild the current Recognition `ReviewState` by replaying earlier selected-person Recognition events in chronological order.
- If `ts-fsrs` history helpers are used, tests must prove they produce the same state as normal sequential review.
- If custom event replay is used, tests must freeze time and verify due time, stability, difficulty, review count, and lapse count.

## Data And Schema Plan

Local data:

- Preserve schema version 5 unless Stage 8 implementation requires a new local schema version.
- If new fields are needed, create a schema version 6 migration that is backward-compatible from versions 1 to 5.
- Do not create review state or review events for Active items during migration.
- Existing Active items remain stored, searchable, editable, exportable, importable, and excluded from scheduling.

Postgres:

- Stage 6B-P1 must incorporate the final Stage 8 review state shape before any Production migration.
- `review_states.difficulty` and `review_states.stability` should stay neutral names.
- Any additional scheduler metadata should be neutral or explicitly profile-scoped.
- A future Active scheduler must use separate state dimensions such as `review_profile`, `skill_type`, or `activity_type`.

Backup / export:

- Backup must preserve `learningTrack` for every vocabulary item.
- Backup must preserve Recognition review states and events only for Recognition items.
- Backup import must reject or quarantine impossible combinations, such as Active item review events created by a broken or future-incompatible export.
- Schema docs must explain that Active has storage semantics in V1 but no scheduler semantics.

## UI And Copy Plan

Recognition Review:

- Show progress based on passed words and pending repeats.
- Consider separate subtle attempt feedback if repeated failed attempts make the count confusing.
- Keep the calm wording and avoid punishment / streak pressure.
- Explain repeated failed words as a normal part of review, not an error.

Active UI:

- Keep Active Vocabulary visible as a stored track and future Practice Lab direction.
- Do not show Active due counts.
- Do not show Active review workload, overdue, or scheduler confidence.
- Settings can keep `activeSessionLimit` as a lightweight future preference, but copy must not imply it is currently active scheduling.

## Implementation Sequence

### Stage 8-A Documentation And Gate Alignment

- Add this plan.
- Sync `PLAN_V1_MASTER.md`, `ARCHITECTURE.md`, `README.md`, `AGENTS.md`, `CHANGELOG.md`, `AI_AGENT_LOG.md`, Stage 6B, and Stage 6B-P1.
- Run `git diff --check`.
- Run `npm run governance:preflight`.

### Stage 8-B Package Fit And Calibration

Status: executed locally on 2026-07-08 after explicit approval.

Completed:

- Confirmed local Node.js version is `v25.3.0`.
- Installed `ts-fsrs@5.4.1`; package metadata reports Node.js `>=20.0.0`, MIT license, ESM / CJS outputs, and TypeScript（类型脚本）types.
- Inspected the installed `dist/index.d.ts` type shape before writing code.
- Added `src/lib/review/fsrs-recognition.ts` as an isolated Recognition FSRS adapter.
- Added `src/lib/review/fsrs-recognition.test.ts` with deterministic calibration tests.
- Added an Active Vocabulary boundary regression test in `src/lib/review/repository.test.ts`.

Candidate calibration parameters:

- `request_retention: 0.9`
- `maximum_interval: 36500`
- `enable_fuzz: false`
- `enable_short_term: false`
- `learning_steps: []`
- `relearning_steps: []`

Rationale:

- `enable_fuzz: false` keeps unit tests deterministic.
- `enable_short_term: false` keeps short-term failed-card repetition owned by the app's same-session repeat loop rather than by FSRS learning steps.
- First-review calibration outputs for Again / Hard / Good / Easy are 1 / 2 / 3 / 8 scheduled days from the frozen test time.

Boundary:

- This substage does not replace `src/lib/review/scheduler.ts`.
- This substage does not change Review UI behavior.
- This substage does not change local storage schema or Postgres schema.
- This substage does not create Active review state or Active review events.

### Stage 8-C Recognition Session Loop

Status: implemented locally on 2026-07-08.

Completed:

- Added `src/lib/review/session-queue.ts` as a pure queue helper.
- Added `src/lib/review/session-queue.test.ts` for pass / repeat / duplicate / rollback queue behavior.
- Updated Review session UI behavior so `forgot` and `hard` record the attempt but requeue the word later in the same session.
- Kept `vague` and `remembered` as the only ratings that count the word as passed for the current session.
- Kept `回退1词` coherent with repeated attempts by moving the rolled-back word to the front and removing any queued duplicate.
- Kept `重置今日复习任务` behavior unchanged.

Boundary:

- This substage changes same-session queue behavior only.
- It does not replace the cross-day Stage 4 scheduler.
- It does not change local storage schema or Postgres schema.
- It does not add Active Vocabulary scheduling.

### Stage 8-D FSRS Scheduler Replacement

Status: implemented locally on 2026-07-08 after explicit approval.

Completed:

- Replaced the fixed Stage 4 interval table with an FSRS-backed scheduler for Recognition.
- Mapped V1 ratings to FSRS ratings through the Stage 8-B adapter.
- Converted existing neutral `ReviewState` fields into FSRS card input for sequential scheduling.
- Wrote FSRS `difficulty` and `stability` values back into neutral state fields.
- Kept exact `dueAt` timestamps for audit（审计）, compatibility, backup, and future analysis.
- Rebuilt Recognition state from events during reset / rollback using the same scheduler path.
- Preserved person scoping and Recognition-only filtering.
- Added a Postgres repository guard so future durable `recordReview()` rejects non-Recognition items.
- Used local natural-day bucket due semantics for the Review queue.
- Added deterministic tests for first-review scheduling, local bucket due behavior, FSRS state writes, Active no-scheduling, rollback, and reset.

Due-date boundary:

- FSRS is responsible for `scheduled_days`.
- `dueAt` remains stored as an exact timestamp.
- The Review queue decides whether a card is due by comparing local date buckets in the selected person's timezone（时区）.
- Example: if Mimi reviews a word at 23:50 and FSRS returns `scheduled_days = 3`, the word becomes due once the local calendar reaches the third day, even in the morning.
- V1 daily review does not depend on the exact clock time of the previous review.
- Exact `reviewedAt` timestamps remain in review events for audit and future analysis.
- Queue selection no longer hides a card until the exact same clock time arrives once the local due date has started.

### Stage 8-E Data Migration And Backup Compatibility

Status: implemented locally on 2026-07-08 after explicit approval.

Completed:

- Confirmed no local schema version 6 is needed for Stage 8 because schema version 5 already stores neutral `difficulty`, `stability`, `intervalMinutes`, `dueAt`, `reviewCount`, and `lapseCount` fields.
- Kept local migration output at schema version 5.
- Updated JSON backup validation so V1 rejects review states or review events that point to Active Vocabulary items.
- Preserved Active Vocabulary backup / restore round-trip when no review state or review event is attached.
- Preserved Recognition review state / review event backup round-trip, including numeric FSRS `difficulty` and `stability`.
- Added tests for schema 5 staying schema 5, Active no-review-history round-trip, impossible Active review state rejection, impossible Active review event rejection, and FSRS state field preservation.

### Stage 8-F Postgres Production Handoff

- Update Stage 6B-P1 schema plan with final scheduler fields.
- Keep remote migration blocked until explicit Stage 6B-P1 approval.
- Add static SQL tests for the chosen state shape before any remote database action.

### Stage 8-G Acceptance

- Run the full local validation ladder.
- Run browser review-flow smoke checks.
- Update docs and logs with final behavior.
- Only then return to Stage 6B-P1 implementation.

## Validation Plan

Documentation step:

```bash
git diff --check
npm run governance:preflight
```

Implementation step:

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run build
git diff --check
```

Optional runtime smoke after implementation:

```bash
npm run dev
```

Remote database validation remains blocked until a later explicit approval:

```bash
npm run db:inspect:dev
```

## Stop Conditions

Stop immediately if:

- `ts-fsrs` package requirements do not match the local / deployment Node.js runtime.
- the algorithm would create `ReviewState` or `ReviewEvent` for Active Vocabulary in V1;
- Active UI starts showing due / overdue / review workload numbers;
- state fields become Recognition-specific in a way that blocks future Active state separation;
- reset / rollback cannot rebuild the same state deterministically from events;
- backup import would silently create impossible Active review state;
- Stage 6B-P1 tries to design Production schema before Stage 8 state shape is accepted;
- any command would read credentials, mutate a remote database, or deploy Production without explicit approval;
- validation fails;
- the user pauses or changes direction.

## Resolved Decisions

- `request_retention` is explicitly set to `0.9` for V1 candidate calibration.
- `enable_short_term`, `learning_steps`, and `relearning_steps` are disabled / empty so same-session repeat owns short-term failed-card behavior.
- Stage 8 does not require local schema version 6.
- Scheduler parameter metadata remains documented and tested in code; it is not stored per review state/event in V1.
- `activeSessionLimit` remains a lightweight future preference, but Active still has no due queue.

## Remaining Acceptance Checks

- exact UI wording for repeated failed cards and progress count;
- optional browser review-flow smoke check before Stage 8-G acceptance.

## Stage 8 Result

Stage 8 is a required pre-Production learning-behavior stage.

Formal V1 should not proceed to shared Postgres Production until the Recognition review algorithm is accepted and Active Vocabulary remains explicitly unscheduled, stored safely, and V2-compatible.
