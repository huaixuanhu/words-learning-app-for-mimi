# Words Learning App For Mimi V2 Stage 5.1: Daily Episode Scheduling Repair

Created: 2026-07-15 AEST
Last updated: 2026-07-15 16:20 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md`

Derived from:

- `plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md`
- `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`
- `ARCHITECTURE.md`
- Mimi's 2026-07-15 learning feedback and the user's confirmed decision to include the repair in V2 without a V1 Hotfix

Scope:

- Introduce one Learning Episode（每日学习回合）per vocabulary entry, Review Profile（复习配置）, and persisted Daily Plan（每日计划）window.
- Keep every raw Recognition rating event while allowing only the first attempt in one episode to update cross-day FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）state.
- Treat both `forgot` and `hard` as unsuccessful recall for the episode's cross-day scheduling anchor, while retaining their distinct raw ratings and counts.
- Require a next-local-day consolidation checkpoint for a new entry that is not immediately rated `remembered`, and for any existing Review entry whose first attempt is `forgot` or `hard`.
- Count `Learned today` and `Reviewed today` only after the episode contains a passing `vague` or `remembered` attempt.
- Restore an unfinished failed entry to its original `New Words` or `Review` zone after refresh or route re-entry.
- Use retained `forgot` and `hard` counts to prioritize equally due consolidation entries without inventing an uncalibrated interval formula.
- Keep local and Postgres application paths, rollback, whole-day reset, backup semantics, and deterministic tests aligned.

Non-Scope:

- No V1 Hotfix, live V1 behavior change, Production data rewrite, historical Production rescheduling, migration, deployment, commit, push, or merge.
- No Schema Version 7, JSON backup-version increase, new SQL migration, or execution/change of `0003_v2_schema6_data_model.sql`.
- No change to the four visible rating labels, same-session insertion distance, keyboard controls, card motion, reduced-motion behavior, pronunciation, context actions, Active practice, AI, or Dashboard scope.
- No arbitrary weighted proficiency score, personalized FSRS optimizer, changed global `request_retention`, or enabled library short-term learning steps.
- No automatic rewrite of pre-V2 events that have no matching persisted Daily Plan.

Exit criteria:

- One persisted Daily Plan window defines one deterministic episode for each Recognition entry.
- The first episode attempt is the only Scheduling Anchor（调度锚点）; later same-day attempts remain auditable but do not advance due date, stability, difficulty, review count, lapse count, or `lastReviewedAt` again.
- `hard` keeps its raw event value but uses the same unsuccessful-recall scheduling input as `forgot` when it is the anchor.
- A new entry rated directly `vague`, or any entry whose anchor is `forgot` / `hard`, is due at the start of the next local day represented by `dayEndsAt`.
- A new entry rated directly `remembered`, and an existing Review entry rated directly `vague` / `remembered`, retain the corresponding normal FSRS interval.
- A failed-only episode does not increase the two distinct completion actuals and remains recoverable in its original zone after refresh.
- After a later same-day pass, the entry counts once as completed while its anchor-owned next-day schedule remains unchanged.
- Equal-checkpoint entries are ordered by descending `forgot` count, then descending `hard` count, then the existing stable queue tie-breakers.
- Rolling back the passing attempt reopens the unfinished episode; rolling back the only attempt removes the new state; whole-day reset removes all target-day attempts and rebuilds the earlier state.
- Events without a matching Daily Plan retain the legacy sequential replay rule; no historical timestamp is guessed into an episode.
- Local and Postgres paths pass focused parity tests, followed by the full local validation gate without remote access or secret inspection.

Status: complete locally on branch `V2` as of 2026-07-15 16:20 AEST. Documentation preceded code. No V1 or Production action occurred.

## Problem Confirmed

The existing product has two separate time scales but currently feeds both through the same update path:

- inside one session, `forgot` and `hard` repeat until the learner reaches `vague` or `remembered`;
- across days, every click is currently applied as another complete FSRS update.

This makes the required final pass extend the due date even when the same word was repeatedly forgotten minutes earlier. Deterministic checks against the installed `ts-fsrs@5.4.1` path reproduced the mismatch: weak sequences such as `forgot -> vague` and `forgot -> forgot -> remembered` can end approximately three or four days later.

There is also a durability gap. The current daily queue treats any event as completion. A learner who records only a failed attempt and then refreshes can lose the item from both visible zones for the rest of that plan, even though the in-memory session correctly intended to repeat it.

## Accepted Episode Model

Episode identity is derived from persisted facts:

```text
personId + reviewProfile + vocabularyItemId + Daily Plan window
```

The Daily Plan owns an inclusive `dayStartsAt` and exclusive `dayEndsAt`. This keeps 23-hour and 25-hour days deterministic and avoids regrouping V2 events with the learner's current timezone setting. If a later timezone change creates overlapping stored windows, an event belongs to the matching plan with the latest `calculatedAt` that is not after the event. Equal activation timestamps fail closed as ambiguous.

For one episode:

- every click remains one immutable `ReviewEvent`;
- the earliest event by `reviewedAt`, then event id, is the Scheduling Anchor;
- later events are recovery attempts and do not update the cross-day state again;
- `forgotCount` and `hardCount` are derived from raw events rather than stored as mutable counters;
- the episode is complete only when at least one event is `vague` or `remembered`.

The existing Review State（复习状态）and Review Event fields remain sufficient. Daily Plans already persist the exact episode window, so this repair does not add a database or backup field.

## Scheduling Decision Table

| Original zone | First attempt | Same-day result | Cross-day scheduling |
| --- | --- | --- | --- |
| `New Words` | `remembered` | pass | normal FSRS `Easy` |
| `New Words` | `vague` | pass | FSRS `Good` state, due capped to `dayEndsAt` |
| `New Words` | `forgot` / `hard` | repeat until pass | unsuccessful-recall anchor, due capped to `dayEndsAt` |
| `Review` | `remembered` | pass | normal FSRS `Easy` |
| `Review` | `vague` | pass | normal FSRS `Good` |
| `Review` | `forgot` / `hard` | repeat until pass | unsuccessful-recall anchor, due capped to `dayEndsAt` |

For scheduling only, a `hard` anchor uses the FSRS `Again` input because this product defines `hard` as an unsuccessful attempt that cannot complete the card. The event still stores `rating: "hard"`; counts, audit, UI meaning, and future calibration therefore preserve the distinction.

`dayEndsAt` is the next local midnight for the frozen plan. Capping the due time there guarantees that the checkpoint enters the next local day's Review zone even across Daylight Saving Time（夏令时）changes.

## Completion And Queue Rules

- `attemptsToday` counts every unique retained event.
- `Learned today` and `Reviewed today` count distinct entries with at least one retained passing event in the plan.
- An item with only failed attempts remains unfinished.
- Its original zone is determined from evidence before `dayStartsAt`: no earlier profile history means `New Words`; retained earlier history means `Review`.
- Library learning stage may already show `In review` after the first attempt, while the unfinished card remains recoverable in its original daily zone. These represent different questions: retained history versus today's completion.
- Same-session repeats continue to use the existing bounded client queue. A fresh queue read also returns unfinished entries, which closes the refresh/re-entry gap.
- A completed episode remains excluded from both zones for the rest of the plan.

## Weakness Priority

The first repair deliberately avoids an unvalidated score such as `2 * forgot + hard`.

When two Review entries share the same due checkpoint, ordering uses:

1. larger `forgotCount` first;
2. then larger `hardCount`;
3. then the existing `dueAt`, immutable creation time, and vocabulary id tie-breakers.

The counts therefore affect how soon a weak entry is seen within the due queue, while the presence of any failed anchor already controls the next-day checkpoint. A future personalized calibration may use richer history only after enough real evidence exists and a separate accepted plan defines it.

## Rebuild, Rollback, And Legacy Rules

- V2 replay groups events only when one persisted Daily Plan can be selected from person, Review Profile, timestamp window, and plan activation time.
- The first event in each group updates FSRS; later events leave the episode state unchanged.
- Events with no matching plan use the existing sequential legacy replay. This preserves V1 history without pretending that an old natural-day boundary was recorded.
- `回退1词` removes the selected event and rebuilds the item. If a passing recovery event is removed while failures remain, the item becomes unfinished and returns to the active session/zone.
- Whole-day reset removes every Recognition event inside the paired plan window, then rebuilds only from earlier retained history.
- Imported `legacy_unknown` state keeps the existing conservative baseline restoration behavior.

## Implementation Batches

### Batch A: pure episode contract and tests

- Add pure helpers for pass detection, plan membership, anchor selection, episode counts, due capping, and replay grouping.
- Freeze sequences for clean pass, weak pass, repeated failure, refresh before pass, rollback, reset, and Daylight Saving Time boundaries.

### Batch B: local daily runtime

- Route V2 local `recordRating` through episode-aware scheduling.
- Make daily actuals require a pass.
- Return failed-only items to their original zone after a new queue read.
- Keep existing prompt, idempotency, same-session repeat, and keyboard behavior unchanged.

### Batch C: Postgres parity

- Apply the same episode decision inside the existing rating transaction after the Daily Plan row is locked.
- Rebuild rollback/reset state with persisted Daily Plan windows.
- Use deterministic repository/query mocks only; do not connect to a remote database.

### Batch D: documentation and validation

- Synchronize the parent Stage 5 plan, V2 master, architecture, README, changelog, AGENTS context, and AI agent log.
- Run focused tests, full Vitest, ESLint, TypeScript, backup dry-runs, Production build, governance preflight, and `git diff --check`.

## Completion Record

Implemented behavior:

- Added one shared pure Daily Episode policy for plan ownership, attempt summaries, first-attempt scheduling, failed-anchor normalization, and next-local-day due capping.
- Routed the V2 browser-local and guarded Postgres rating paths through that policy. Every click remains a `ReviewEvent`; recovery attempts retain the anchor-owned state instead of advancing FSRS again.
- Rebuilt Recognition state by persisted plan-owned episodes for rollback and whole-day reset. Events with no matching plan retain the sequential legacy path.
- Changed daily actuals to require a retained `vague` or `remembered` pass and made failed-only entries readable again from their original `New Words` or `Review` zone.
- Added descending `forgot` / `hard` priority for equal checkpoints and carried both values in the signed Review cursor so pagination preserves the same order.
- Resolved overlapping stored windows after a timezone change through the latest plan `calculatedAt` not after the event; an equal activation timestamp fails closed.
- Kept Schema Version 6, JSON backup version 3, all four visible ratings, same-session repeat distance, keyboard behavior, motion, and reduced-motion behavior unchanged.

Acceptance evidence:

- Focused Daily Episode, daily contract/runtime, and Postgres parity suite: 4 files / 47 tests passed.
- Full Vitest: 40 files / 265 tests passed; the existing Postgres integration file/test remained intentionally skipped.
- ESLint and TypeScript passed.
- Schema 3, Schema 5, and Schema 6 backup dry-runs passed.
- Next.js Production build, Tier 3 governance preflight, and `git diff --check` passed.
- No separate browser visual pass was required because this stage changed scheduling and queue facts without changing rendered layout, copy, motion, or control behavior; the existing keyboard/browser batch remains intact.

## Safety Boundary

- Use only repository files, deterministic clocks, fixtures, and isolated local state.
- Do not read `.env`, credentials, Vercel configuration, or database connection strings.
- Do not call Gemini or another provider.
- Do not connect to Development, Staging, Preview, or Production databases.
- Do not execute SQL migrations or change Schema Version / backup version.
- Do not modify live V1 or reschedule historical Production words.
- Stop before deployment, commit, push, pull request, merge, or any remote action.
