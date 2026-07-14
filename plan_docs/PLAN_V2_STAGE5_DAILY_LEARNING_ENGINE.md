# Words Learning App For Mimi V2 Stage 5: Daily Learning Engine

Created: 2026-07-14 15:09 AEST
Last updated: 2026-07-14 16:07 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md`
- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`
- `plan_docs/PLAN_V2_STAGE3_1_REVIEW_INTERACTION_CONTEXT_WORD_ACTIONS.md`
- `plan_docs/PLAN_V2_STAGE4_MOBILE_FOUNDATION_COPY.md`
- `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`
- `ARCHITECTURE.md`
- the user's confirmed V2 daily-learning, reset, goal, and safety decisions through 2026-07-14

Scope:

- Connect the accepted V2-1 daily-learning contract to the browser-local and Postgres repository paths without introducing another persisted schema version.
- Resolve one immutable person-day window and one Daily Plan（每日计划）per Review Profile（复习配置）using the learner timezone.
- Show the four accepted plan values per Track: `Added today`, `Suggested review`, `Review goal`, and `New-word goal`.
- Show the two accepted actual values per Track: `Reviewed today` and `Learned today`.
- Build independent Recognition `Review` and `New Words` zones that never borrow capacity from each other.
- Permit exact user-selected daily goals from `0` through `2,147,483,647` while keeping each queue page bounded to at most 100 entries.
- Add today-only goal editing on Study and future default-goal/timezone editing in Settings.
- Derive Library learning stage as `New` or `In review` independently by Review Profile.
- Replace the current one-gate Recognition-only daily reset with the accepted two-gate whole-day reset, while preserving `回退1词`.
- Add one strict study command API（应用程序接口）and opaque prompt/cursor evidence for server-backed runtime commands.
- Keep all work local in this batch and synchronize tests, architecture, master plan, changelog, and governance log.

Non-Scope:

- No V2-6 Active practice modes, Active FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）, state rebuild, dictation, spelling, speech scoring, microphone, or Speech Recognition（语音识别）.
- No V2-7 Gemini call, AI generation, external API, quota usage, paid request, WAF（防火墙）, or Kill Switch（紧急关闭开关）activation.
- No V2-8 chart, prediction, final Dashboard visualization, release migration, or Production acceptance.
- No Schema Version 7, backup-version increase, new SQL migration, or execution of the existing unexecuted Schema Version 6 migration.
- No SSO（Single Sign-On，单点登录）, confidential multi-user isolation, public registration, PTE/IELTS switch, writing question type, or speaking question type.
- No credential creation, environment-variable read/write, remote database access, Production data mutation, Vercel change, deployment, commit, push, pull request, or merge.

Exit criteria:

- The first daily read or rating command resolves both Review Profile plans for the same server-owned person-day window.
- The four plan values and two actual values are computed from accepted facts, are separated per Track, and never display a false zero for unavailable data.
- A word, phrase, or fixed collocation stored as one vocabulary entry contributes at most one distinct unit to each applicable daily value.
- `Added today` remains stable after archive or ordinary hard delete and is removed only by the accepted whole-batch reversal semantics.
- `Suggested review` is frozen at plan creation, includes distinct previously learned entries ready before the day end, and is never truncated by the user's goal.
- Today goals and future defaults accept only decimal whole numbers from `0` through `2,147,483,647`; invalid input is rejected without rounding, clamping, or replacement.
- Recognition `Review` and `New Words` have separate remaining goals, bounded pagination, stale-plan protection, and no cross-filling.
- Library shows `New` / `In review` from retained Recognition and Active evidence independently, without reusing lifecycle status.
- Rating, goal update, and reset commands validate person, plan, version, local date, profile/zone, server time, opaque evidence, and idempotency before writing.
- The two reset gates display the exact accepted meaning, and no data write occurs before the second confirmation.
- Whole-day reset preserves daily plans, goals, frozen suggestions, vocabulary, creation facts, AI content, and unrelated dates; `回退1词` remains available for the bounded session action.
- If the target day contains an Active event before V2-6 provides an Active rebuild path, reset fails closed with no mutation and gives the learner a clear message.
- Local and Postgres adapters follow the same contract; route and domain tests jointly cover authentication, malformed input, stale evidence, and replay conflicts.
- Full local validation and the accepted responsive browser matrix pass without reading secrets or connecting to a remote service.

Status: complete locally on 2026-07-14 after documentation-first implementation, focused/full automated validation, and isolated responsive browser acceptance. The server-backed token secret remains intentionally unconfigured, Schema Version 6 SQL remains unexecuted, and no remote or Production action occurred.

## Decision Summary

V2-5 turns the V2-1 definitions and V2-3 storage shapes into the first usable daily-learning flow. Recognition becomes the complete working path. Active remains visible only where its persisted facts can be calculated reliably; its practice controls remain unavailable until V2-6.

The persisted schema remains Version 6. `dailyStudyDefaults`, `dailyStudyPlans`, `vocabularyCreationFacts`, `vocabularyCreationReversals`, profile-aware review state/events, and `study_command_idempotency` already provide the required durable facts. This stage adds behavior, queries, commands, and UI around those tables instead of adding another migration.

## Daily Plan And Time Ownership

- The selected learner's `reviewSettings.timezone` is the authoritative timezone.
- The server resolves `now`, `localDate`, inclusive `dayStartsAt`, and exclusive `dayEndsAt` for Postgres runtime. Browser-local runtime uses the same pure resolver with the browser clock as its local authority.
- Natural-day boundaries must support 23-hour and 25-hour days during Daylight Saving Time（夏令时）changes.
- The first Today read or rating command resolves both `recognition` and `active` plans in one logical operation.
- The two plans share the same person-day window and retain independent goals, recommendation, version, and profile identity.
- Existing plans keep their stored timezone/window after a later timezone change. The change applies when the next local date is resolved.
- Concurrent first resolution uses the existing unique `(personId, reviewProfile, localDate)` constraint and reads the winning row after conflict.
- `suggestedReview`, `recommendationVersion`, and `calculatedAt` are frozen after creation. A goal update changes only the selected goals and increments `planVersion`.

## Values Shown To The Learner

Each Track card shows:

| Value | UI owner | Rule |
| --- | --- | --- |
| `Added today` | System | successful creation facts inside the stored day window, grouped by Track at creation |
| `Suggested review` | System | frozen distinct previously learned entries available before the day end; not goal-limited |
| `Review goal` | Learner | today-specific target copied from defaults, then freely editable |
| `New-word goal` | Learner | today-specific first-learning target copied from defaults, then freely editable |
| `Reviewed today` | Actual | distinct entries studied today that had profile evidence before the day start |
| `Learned today` | Actual | distinct entries whose earliest retained valid profile event is inside the day |

Additional rules:

- One vocabulary item id is one unit even when its text contains several words.
- Repeated attempts are available as a secondary count but do not multiply either distinct actual.
- One entry cannot be both `Learned today` and `Reviewed today` for the same profile/day.
- Archive preserves review history and daily actuals. Ordinary hard delete may reduce actuals because its review evidence is removed, but its non-lexical creation fact remains.
- A successful `Batch imported` rollback appends the accepted reversal and removes the action's contribution from `Added today`, including historical dates.
- Active values may be displayed only when every required fact can be computed. A missing/unimplemented Active runtime state is shown as unavailable, never `0`.

## Goal Input Contract

- Accepted values are decimal integers `0..2,147,483,647`.
- `0` is a normal rest choice.
- The interface uses text input with decimal-digit validation so `1e3`, signs, fractions, blanks, infinity, and other notation are rejected.
- Values are stored exactly. There is no `1..80` cap, rounding, or silent fallback.
- Today edits do not change future defaults.
- Settings edits change future defaults and do not rewrite an already-resolved plan unless the learner separately edits today.
- Queue page size remains an internal bounded value `1..100`, independent from a very large goal.
- Optimistic Concurrency Control（乐观并发控制）checks `expectedPlanVersion`; a stale edit reloads current values instead of overwriting them.

## Recognition Study Zones

### Review

- Contains active Recognition entries with retained Recognition state/history and `dueAt < dayEndsAt`.
- Sort order is `dueAt`, immutable creation time, then vocabulary item id.
- Remaining distinct target is `max(0, reviewGoal - reviewedToday)`.
- Excludes entries already completed as distinct Recognition Review during the current plan.

### New Words

- Contains active Recognition entries with no valid Recognition state or event.
- Sort order is immutable creation time, then vocabulary item id.
- Remaining distinct target is `max(0, newWordGoal - learnedToday)`.
- A first valid rating moves the item to `In review` for Recognition and removes it from the New Words zone.

### Shared behavior

- One zone never fills unused capacity from the other.
- Main-zone pages exclude same-session repeat entries. The accepted failed-card repeat remains an explicit in-session subflow.
- Cursor and prompt evidence are opaque to the client and bind the learner, plan, version, profile, zone, vocabulary id, activity, and expiry as applicable.
- If the plan version or distinct progress changes during queue construction, the stale cursor fails and the queue restarts from current facts.
- The server stops paging after it selects the remaining distinct target, regardless of a larger inventory.
- Recognition cards preserve the Stage 3.1 card-body reveal/hide behavior, rating color scale, example actions, and `回退1词`.

## Strict Study Command Boundary

One `POST /api/study` Route Handler accepts a discriminated `operation` value. Supported operations in V2-5 are:

- `resolveToday`
- `readQueue`
- `updateTodayGoals`
- `updateDefaults`
- `recordRating`
- `rollbackRating`
- `resetToday`

Rules:

- The handler rechecks Basic Auth even though the app proxy also protects the route.
- Runtime identity comes from the selected person in the trusted repository snapshot; commands cannot substitute another person's facts.
- Unknown fields, unknown operations, malformed ids, mismatched plan/profile/zone, expired evidence, stale versions, dates outside the active plan, and conflicting idempotency replays are rejected.
- The server owns timestamps, review-state scheduling inputs, and final persisted event fields.
- Rating and reset writes use `study_command_idempotency` in Postgres and a separate operational store in browser-local runtime. These records are excluded from JSON backup.
- A command id replay with an identical payload returns the stored result. The same id with different content returns a conflict.
- Operational idempotency rows may expire after the accepted seven-day retention window.

## Opaque Evidence And Secret Boundary

- Server-backed cursor/prompt evidence uses an authenticated opaque token codec with a separate future `MIMI_STUDY_TOKEN_SECRET` boundary.
- Secret lookup occurs only at request time; importing a module must not read an environment variable.
- Missing or invalid secret configuration fails closed for server-backed issuance/validation.
- Unit tests inject a disposable test-only secret directly and never read `.env`.
- Browser-local runtime uses a separate non-lexical operational token registry that is not exported in study backups and may be recreated after refresh.
- This stage creates the code boundary only. It does not create, inspect, print, hash, configure, or deploy a real secret.

## Library Learning Stage

- Lifecycle `active | archived` remains separate from learning stage.
- Recognition `New` means no valid Recognition state or retained event; otherwise it is `In review`.
- Active `New` / `In review` uses only Active evidence and never Recognition evidence.
- A phrase or fixed collocation remains one Library entry and one learning-stage unit.
- Library filters and labels remain concise English-first copy.

## Whole-Day Reset

Entry point: Study's Today area. The old Review-page single-confirmation reset is removed.

Gate 1:

- Message: `Reset today’s progress?`
- Actions: `NO` and `YES`

Gate 2:

- Message: `真的要确定清空本日记录吗？这里不可以撤销哦`
- Actions: `返回` and `确认清空`

No mutation occurs when the first dialog opens, when `YES` advances to the second dialog, or when either dialog is dismissed. Only `确认清空` submits the command.

The command:

- validates the current person-day and both profile plans;
- locks the affected command/day scope in Postgres runtime;
- detects any retained event in the target window for either profile;
- fails closed with no mutation if an Active event exists, because V2-5 has no accepted Active scheduler/state rebuild;
- otherwise removes today's Recognition events, rebuilds each affected Recognition state from retained earlier events, and deletes a state when no retained evidence remains;
- preserves vocabulary, creation facts/reversals, plan rows, goals, frozen suggestions, defaults, unrelated dates, and AI content;
- recomputes actual values from retained facts;
- records one idempotent command result and commits all changes atomically.

The Active-event guard is expected to be dormant in normal V2-5 usage because Active practice does not yet create events. It prevents a future or imported Active event from being partially destroyed by a Recognition-only rebuild.

`回退1词` remains a separate bounded session command. It does not become another whole-day reset path.

## Implementation Batches

### Batch A: plan and pure domain behavior

- Add timezone-safe person-day resolution.
- Add daily plan resolution, metrics, remaining goals, queue selection, learning-stage derivation, and exact goal parsing around the V2-1 contract.
- Add opaque evidence codec and focused unit tests.

### Batch B: repositories and command service

- Add one daily-study port shared by the app-facing service.
- Implement browser-local plan/default/operational-command behavior without placing operational tokens in backup data.
- Implement Postgres queries/transactions against existing Schema Version 6 tables.
- Add idempotency replay/conflict, optimistic goal update, reset rebuild, and Active-event guard tests.

### Batch C: API and UI

- Add the authenticated strict study route and route tests.
- Replace Home/Study placeholder values with the four plan values and two actuals.
- Add independent Recognition `Review` and `New Words` actions and zone-aware Review sessions.
- Add today goal editing, future defaults/timezone settings, Library learning-stage filters, and the two-gate reset.
- Preserve Stage 3.1 and Stage 4 interaction, mobile, copy, Safe Area, and reduced-motion behavior.

### Batch D: documentation and acceptance

- Synchronize `PLAN_V2_MASTER.md`, `ARCHITECTURE.md`, `README.md` where behavior is user-facing, `CHANGELOG.md`, and `governance/AI_AGENT_LOG.md`.
- Run focused tests first, then the full local gate.
- Run browser acceptance on isolated localhost data and produce phone screenshots when the visible daily flow is stable.

## Validation Matrix

Pure/domain tests:

- ordinary day plus 23-hour and 25-hour Australia/Melbourne plan windows;
- invalid timezone and a timezone change after a plan exists;
- concurrent first resolution and stable frozen recommendation;
- `0`, `2,147,483,647`, and every invalid goal class;
- single word, phrase, and fixed collocation count once;
- first rating, repeated rating, prior legacy state, archive, hard delete, batch reversal, and Track separation;
- separate zone remaining counts, no cross-fill, bounded pages, stale cursor, changed progress, and huge goals;
- prompt mismatch/expiry/tampering and replay conflict;
- reset no-op before gate two, Recognition rebuild, removal of a first-ever state, mixed earlier/today events, Active-event fail-closed, idempotent replay, and retained plan/goals.

Adapter/API tests:

- browser-local and Postgres code paths return the same logical result for equivalent fixtures;
- route rejects missing Basic Auth, unknown operation/field, person/plan/profile/zone mismatch, stale plan, malformed ids, and untrusted timestamps;
- Postgres reset performs one transaction and leaves all rows untouched on the Active guard;
- operational command/token data is excluded from backup/export.

UI/browser acceptance:

- 320, 375, 390, 768, 820, 1023, 1024, and 1280 px;
- dark/light themes, no horizontal overflow, 44 px touch targets, Safe Area clearance, keyboard-reachable goal actions, and reduced-motion continuity;
- correct Home/Study values and independent Review/New Words empty/available/completed states;
- goal `0`, a value above `80`, invalid text, stale-save recovery, and profile separation;
- card-body reveal/hide, rating colors, example actions, `回退1词`, and first-rating movement from New to In review;
- both reset gates, cancel/backdrop/Escape behavior, exact destructive copy, no write before final confirmation, and refreshed values after success/fail-closed result.

Full local gate:

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
git diff --check
```

Development database inspection commands are intentionally excluded from this implementation batch because they would read ignored environment values and connect to a remote database. The existing Schema Version 6 SQL remains unexecuted.

## Completion Record

Completed local behavior:

- Home and Study now resolve two immutable person-day plans and show `Added today`, `Suggested review`, `Review goal`, `New-word goal`, `Reviewed today`, and `Learned today` separately for Recognition and Active.
- Recognition exposes independent `Review` and `New Words` zones. The first valid rating moves an entry from `New` to `In review`; failed ratings can return the same card through a new opaque prompt, and `回退1词` restores the bounded prior card through a replacement prompt.
- Study edits today's two goals per Track. Settings edits four future defaults plus timezone. Exact decimal whole numbers from `0` through `2,147,483,647` are accepted without the former `1..80` limit.
- Recognition cards retain card-body reveal/hide, calm rating colors, example-word actions, and browser `Listen` for the whole word, phrase, or fixed collocation.
- The whole-day reset now uses the two accepted gates. Local and Postgres implementations preserve plans/goals/frozen suggestions and fail closed if current-day Active history cannot yet be rebuilt.
- Library derives `New` / `In review` by Review Profile and keeps lifecycle state separate.
- `POST /api/study` uses strict operation shapes and rechecks runtime/authentication gates. Server prompt/cursor evidence uses request-time HMAC（基于哈希的消息认证码）with a future dedicated secret; prompt evidence is issued only after the selected page is bounded; browser-local operational prompt/replay state stays outside study backups.

Acceptance evidence:

- Focused daily-study/API tests passed: 5 files / 36 tests.
- Full Vitest passed: 37 files passed, 1 file intentionally skipped; 231 tests passed, 1 Postgres integration test intentionally skipped.
- ESLint, TypeScript, all three backup dry-runs, Next.js Production build, Tier 3 governance preflight, and `git diff --check` passed.
- Isolated forced-local browser acceptance covered Home, Study, Review/New Words, Library, Settings, both reset gates, invalid/large goals, first-rating movement, failed-card repeat, `回退1词`, both themes, and 320/375/390/768/820/1023/1024/1280 px layouts. No horizontal overflow, framework overlay, console warning, or console error was observed.
- One disposable phrase was created, rated, rolled back, rated again, and deleted on the isolated `127.0.0.1:3001` origin. Its Recognition new-word goal was restored to `0` after testing.

Residual boundaries:

- `MIMI_STUDY_TOKEN_SECRET` has no configured value. Server-backed `/api/study` issuance therefore remains fail-closed until a later credential/environment plan is separately approved.
- Postgres behavior was covered by deterministic tests, route mocks, and local code validation only. No Development, Staging, Preview, or Production database connection or transaction was executed.
- Active metrics are derived from available persisted facts, while Active practice controls remain resting until V2-6 provides independent scheduling and rebuild behavior.

## Safety Boundary

- Use only repository files, deterministic fixtures, injected test clocks/secrets, and isolated localhost browser data.
- Do not read `.env`, Vercel variables, provider credentials, or database connection strings.
- Do not call Gemini or another external provider.
- Do not connect to Development, Staging, Preview, or Production databases.
- Do not execute any SQL migration or alter remote schema/data.
- Do not reuse the user's existing browser study data for destructive acceptance; use a separate localhost origin and disposable learner data.
- Stop before any deployment, external integration, credential configuration, commit, push, or Production action.
