# Words Learning App For Mimi V2 Stage 6: Active Practice Engine

Created: 2026-07-15 AEST
Last updated: 2026-07-15 19:15 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md`
- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`
- `plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md`
- `plan_docs/PLAN_V2_STAGE5_1_DAILY_EPISODE_SCHEDULING_REPAIR.md`
- `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`
- `ARCHITECTURE.md`
- The user's confirmed 2026-07-15 Stage 6 execution boundary and explicit reminder that Active scheduling must not repeat the Stage 5.1 final-rating mismatch

Scope:

- Activate separate Active `Review` and `New Words` zones for `Say it`, `Spell it`, and `Dictation`.
- Add one independent Active FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）adapter, Parameter Set（参数集）, state/event writer, replay, rollback, and whole-day rebuild path.
- Apply the accepted Daily Episode（当日学习回合）model independently to Active: the first attempt is the only cross-day scheduling input and later same-day attempts remain recovery evidence.
- Keep `forgot` and `hard` as unsuccessful Active scheduling anchors while retaining their different raw event values and counts.
- Store deterministic answer outcomes for `Spell it` and `Dictation`, keep learner memory ratings independent, and never retain the raw typed answer.
- Bind Active queue, prompt, refresh, repeat, rollback, and rating evidence to one selected activity and a non-lexical target revision.
- Use browser SpeechSynthesis（浏览器文字转语音）for Dictation and revealed-answer playback without an AI or remote lexical call.
- Add the explicit `Start fresh in the other Track` transition for a history-bearing vocabulary entry while retaining the old profile history as read-only evidence.
- Preserve Schema Version 6, JSON backup version 3, accepted motion, reduced-motion, mobile, and English-first UI rules.

Non-Scope:

- No Automated Speech Recognition（自动语音识别）, microphone capture/upload, AI pronunciation scoring, cloud speech, or pronunciation correctness claim.
- No separate FSRS profile for each Active activity, cross-mode mastery score, answer-dependent automatic memory rating, fuzzy match, spell correction, synonym acceptance, or raw answer persistence.
- No AI enrichment, Gemini call, external dictionary, Dashboard visualization, exam writing/speaking question type, or question bank.
- No Schema Version 7, JSON backup-version increase, new SQL migration, execution/change of `0003_v2_schema6_data_model.sql`, or remote database connection.
- No V1 or Production behavior change, credential read/change, server token-secret configuration, deployment, commit, push, pull request, or merge.
- No change to current card motion, rating tone scale, reduced-motion behavior, or Recognition scheduling parameters.

Exit criteria:

- Active has separate bounded `Review` and `New Words` queues, with one selected activity bound to every issued cursor/prompt and same-session repeat.
- `Say it` reveals the target before rating and stores `self_rated` without audio or transcript.
- `Spell it` and `Dictation` use `active-answer-v1`, store only `exact | normalized_match | different | revealed_without_answer`, and leave all four memory ratings available.
- Active uses `active-fsrs-v1` through an adapter and parameter snapshot that never imports or falls back to Recognition parameters.
- For each Active entry/profile/plan episode, only the earliest event updates cross-day state. A later same-day pass completes the episode once without changing the anchor-owned due date, stability, difficulty, counts, or last-review time.
- A new Active `vague`, or any Active `forgot` / `hard` anchor, receives the accepted next-local-day checkpoint; a direct new `remembered` retains its normal Active FSRS result.
- Failed-only Active episodes return to their original zone after refresh and are prioritized by retained `forgot`, then `hard`, counts when due checkpoints are equal.
- Active rollback and the two-gate whole-day reset rebuild Recognition and Active independently from retained Daily Plan-owned episodes.
- Active target edits make an issued card stale; refresh/retry occurs without login navigation or loss of already saved progress.
- Active entries without a Chinese meaning are excluded from practice with a short Library repair path; their vocabulary/history remains intact.
- A history-bearing Track change requires the explicit start-fresh action, preserves old profile rows, creates no target-profile history, and copies no scheduler state.
- Local and guarded Postgres application paths share the same domain rules and deterministic tests. No remote Postgres integration test runs in this stage.
- Mobile, keyboard, light/dark theme, SpeechSynthesis failure, backup round-trip, lint, TypeScript, Vitest, build, governance, and diff checks pass locally.

Status: complete locally on branch `V2` as of 2026-07-15 19:15 AEST. Documentation preceded implementation.

## Fixed Product Flow

### Zone and mode entry

Study exposes two Active actions:

- `Review`
- `New Words`

Both open Practice Lab with a frozen zone. The learner selects one activity for that session:

| Activity | Prompt | Answer step | Reveal step |
| --- | --- | --- | --- |
| `Say it` | Chinese meanings | Say the complete English entry aloud without recording | Reveal English, optionally listen, then self-rate |
| `Spell it` | Chinese meanings | Type the complete English entry | Check or reveal without an answer, show the comparison result, then self-rate |
| `Dictation` | No lexical target before checking | Explicitly play/replay the complete English entry and type it | Show comparison result, English target, and Chinese meanings, then self-rate |

One session keeps its selected activity. All activities write to the same Active Review Profile; `activityType` remains on every event.

### Meaning eligibility

An Active prompt needs at least one non-blank Chinese meaning. An ineligible entry remains in the Library and keeps all prior history, but is omitted from the queue until repaired. The empty/underfilled state uses short copy and links to Library. It does not invent a translation or send the entry to AI.

### Keyboard boundary

- `Say it`: `Space` reveals/hides; Arrow keys select inside the existing non-wrapping 2-by-2 rating grid; `Enter` confirms.
- `Spell it` / `Dictation`: while the answer input is focused, `Enter` checks the answer and `Space` remains a normal typed space. After a result is visible, Arrow keys select a rating and `Enter` confirms.
- Global shortcuts ignore editable elements, IME（Input Method Editor，输入法）composition, modifier combinations, held-key repeats where applicable, open dialogs, and ordinary focused controls.
- Mouse/touch actions remain immediately usable and reuse the accepted hover/selection appearance.

## Independent Active Scheduler

The first Active Parameter Set is `active-fsrs-v1`:

```text
request_retention = 0.92
maximum_interval = 36500
enable_fuzz = false
enable_short_term = false
learning_steps = []
relearning_steps = []
```

This is a conservative first-generation seed, not a claim of personalized optimality. It is intentionally declared in a separate Active module. The current installed `ts-fsrs@5.4.1` deterministic check gives an approximately six-day first `Good` interval with this seed; focused tests freeze the actual local package behavior before runtime wiring.

Recognition keeps `recognition-fsrs-v1` and its existing `request_retention = 0.90`. No shared constant, import fallback, or state reinterpretation is permitted between the two adapters.

## Active Daily Episode Rule

Episode identity remains:

```text
personId + reviewProfile=active + vocabularyItemId + persisted Daily Plan window
```

For Active:

- every submitted memory rating appends one immutable event;
- the earliest event by `reviewedAt`, then event id, is the Scheduling Anchor（调度锚点）;
- only that anchor calls the Active FSRS adapter;
- a `hard` anchor retains `rating = hard` in the event but uses Active FSRS `Again` for cross-day scheduling, matching the accepted unsuccessful-recall product meaning;
- later same-day ratings do not advance FSRS state again;
- the episode completes only after at least one `vague` or `remembered` event;
- answer outcome and activity type do not override the learner's selected memory rating;
- `forgotCount` and `hardCount` remain derived audit evidence and queue priority inputs.

This is the hard regression boundary for the user's latest clarification. Tests must explicitly cover:

```text
forgot -> vague
forgot -> forgot -> remembered
hard -> vague
different + forgot -> exact + remembered
dictation forgot -> spell vague inside the same profile/day
refresh after failed-only episode
rollback of the recovery pass
whole-day reset and replay
```

In every mixed sequence, the final pass may close the daily episode but must not replace or advance the first-attempt-owned cross-day schedule.

## Target Revision And Raw Answer Boundary

- The issued Active prompt carries a non-lexical revision derived from the vocabulary identity and last accepted edit revision; it contains no word, meaning, example, or raw answer.
- Server-backed issuance signs that revision inside the existing opaque prompt token and rechecks the current item inside the rating write boundary.
- Browser-local runtime keeps equivalent operational claims in session-only storage excluded from backup.
- Editing the English target after card issuance invalidates the card. Changing examples alone may also invalidate it when the shared item revision changes; this conservative behavior is accepted for the first version.
- Raw typed answers live only in component state and are cleared when the card advances, session changes, or component unmounts.

## Track Transition

Direct editing remains available when neither Review Profile has state or events. When history exists:

1. the ordinary radio change remains guarded;
2. Library shows `Start fresh in Active` or `Start fresh in Recognition`;
3. the confirmation states that old history remains read-only and the target Track starts with no progress;
4. the vocabulary item's Track changes in one local or Postgres write;
5. old states/events are retained unchanged;
6. no target state/event is created, copied, or reinterpreted.

Because the item is no longer available in the old Track, old history remains exportable and rebuildable but does not enter that Track's queue.

## Implementation Batches

### Batch A: independent scheduler and episode contract

- Add the standalone Active FSRS adapter and frozen parameter tests.
- Generalize Daily Episode helpers by Review Profile while dispatching through independent schedulers.
- Add mixed failure/pass, cross-mode, next-day, rollback, reset, and legacy replay tests.

### Batch B: queue, prompts, and local write path

- Bind queue requests/cursors/prompts to the selected activity.
- Add Active target revision creation and stale-target validation.
- Generalize local prompt refresh, rating, repeat, rollback, and reset to both profiles.
- Preserve Recognition wrappers and regression tests.

### Batch C: guarded Postgres parity

- Generalize profile-scoped state/event queries and transaction helpers.
- Re-read and lock the current Active target during rating.
- Write accepted Active evidence columns and `active-fsrs-v1` state.
- Rebuild both profiles during rollback and whole-day reset.
- Use query mocks/static parity tests only; do not connect to a remote database or execute SQL.

### Batch D: Practice Lab and Track transition UI

- Add a focused Active session client component below the App Router page.
- Add Study `Review` / `New Words` links, activity selection, answer/reveal flow, SpeechSynthesis fallback, rating controls, progress, rollback, and completion states.
- Add the explicit Library start-fresh confirmation and local/Postgres mutation path.
- Keep `use client` limited to interactive components and retain semantic buttons/inputs.

### Batch E: documentation and acceptance

- Synchronize Master Plan, Architecture, README, AGENTS context, Changelog, and AI Agent Log with the completed behavior.
- Run focused tests first, then the full local gate.
- Run localhost browser checks at 320, 375, 390, 768, 820, 1023, 1024, 1280, and representative desktop width; include light/dark, no-overflow, touch targets, keyboard, and SpeechSynthesis fallback.
- Produce representative phone screenshots after the visible flow is stable.

## Validation Matrix

Pure/domain:

- Active parameter snapshot differs from Recognition and never calls the Recognition adapter.
- New direct `remembered`, new direct `vague`, Review direct pass, `forgot`/`hard` anchors, repeated failures, later pass, and cross-mode recovery.
- One entry means one for a single word, phrase, or fixed collocation.
- `exact`, normalized apostrophe/dash/whitespace/case match, punctuation difference, blank reveal, maximum length, and raw-answer absence.
- Missing Chinese meaning exclusion without vocabulary/history deletion.
- Track/Profile isolation and explicit start-fresh behavior.

Runtime/API:

- Active and Recognition queue/profile/activity binding, bounded pages, cursor tamper, stale plan, prompt expiry/refresh, changed target, prompt replay, and Idempotency Key（幂等键）conflict.
- Local/Postgres logical parity for Active events/states and mixed episode replay.
- Rollback of anchor/recovery events and whole-day two-profile reset.
- Recognition `Listen` remains side-effect free and Recognition Stage 5/5.1 tests remain unchanged.
- Operational prompt/command records and raw answers remain outside JSON backup.

UI/browser:

- Separate Active zones and all three activities on phone/tablet/desktop.
- `Say it` card flip; typed-mode input/check/reveal; Dictation explicit replay; unsupported speech retry/skip without event.
- Mouse/touch and keyboard parity, IME safety, focus visibility, 44 px actions, no horizontal overflow, light/dark themes, and current motion/reduced-motion continuity.
- Empty, underfilled, loading, stale-card recovery, failed-repeat, rollback, and completion states use short English copy.

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

`npm run db:inspect:dev`, `npm run db:inspect:schema5:dev`, and the Postgres integration test are excluded because they read ignored environment configuration or connect to a remote database.

## Safety Boundary

- Use repository code, deterministic fixtures, injected test secrets, and disposable browser-local data only.
- Do not read or change `.env`, credentials, Vercel settings, Gemini configuration, billing, or provider data.
- Do not connect to Development, Staging, Preview, or Production databases.
- Do not execute or edit the unexecuted Schema Version 6 migration unless a discovered structural mismatch is first reported and separately accepted.
- Stop if implementation needs a schema/backup-version increase, external service, real secret, remote data, or change to the accepted Stage 5.1 scheduling semantics.
- Stop before deployment, commit, push, pull request, merge, or any remote mutation.

## Completion Record

Implemented locally:

- separate Active `Review` and `New Words` entry points with frozen `Say it`, `Spell it`, or `Dictation` activity per session;
- independent `active-fsrs-v1` adapter and profile-scoped state/event/rebuild paths;
- the same first-attempt Daily Episode rule used by Recognition, including mixed `different + forgot -> exact + remembered` regression coverage;
- `active-answer-v1` typed comparison with no raw-answer persistence, `Say it` self-rating with no recording, and browser SpeechSynthesis playback;
- activity/plan/target-revision-bound queue, prompt, refresh, retry, repeat, rollback, and rating paths for local and guarded Postgres application code;
- two-profile whole-day reset/rebuild and explicit history-bearing `Start fresh in the other Track` with no copied state;
- mobile Practice Lab selection/session UI, guarded keyboard controls, mouse/touch rating, empty/meaning-repair states, and unchanged accepted motion rules.

Local acceptance evidence:

- TypeScript, ESLint, 42 passing Vitest files / 277 passing tests, with the existing Postgres integration file/test intentionally skipped;
- schema 3, 5, and 6 backup dry-runs, Next.js Production build, Tier 3 governance preflight, and `git diff --check`;
- browser-local flow: wrong Spell answer, keyboard `forgot`, same-session return, exact recovery, and completion;
- browser-local Say `Space` reveal and Dictation pre-reveal target hiding;
- 320, 375, 390, 768, 820, 1023, 1024, and 1280 px checks with no horizontal overflow or framework overlay;
- light and dark 390 px screenshots produced outside tracked source;
- disposable Active entry, its events, and the temporary daily goal were removed/restored after browser acceptance.

Safety result:

- the dev server was forced to `MIMI_STORAGE_RUNTIME=local`; blocked `/api/storage/data` probes fell back to browser storage and no remote database connection occurred;
- no credential/environment value was read or changed, no Gemini or external provider call occurred, and no migration, Production data action, Vercel action, deployment, commit, push, pull request, or merge occurred;
- the server study-token secret remains intentionally unconfigured and server-backed issuance continues to fail closed.
