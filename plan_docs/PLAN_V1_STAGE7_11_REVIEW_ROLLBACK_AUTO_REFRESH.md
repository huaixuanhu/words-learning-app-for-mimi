# Words Learning App For Mimi Stage 7.11: Review Rollback And Auto Refresh

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md`, the accepted Stage 7.10 local Review（复习）controls, and the 2026-07-07 user request to remove confusing review regeneration buttons, add automatic queue refresh, and add one-word rollback for accidental rating taps.
Scope: refine the local Review page; remove `重新生成本次复习` and `新建本次复习`; keep only the confirmed `重置今日复习任务`; add automatic Review queue（复习队列）refresh when local Recognition Vocabulary（阅读词汇）data changes and no card is actively being answered; add a browser-local `回退1词` control that rolls back the previous completed card's review event and restores that word to the front of the current session; update docs, tests, changelog, and AI log.
Non-Scope: no AI API（人工智能接口）, no dictation engine（听写引擎）, no spelling checker（拼写检查器）, no writing feedback model, no external vocabulary source, no schema version change, no review scheduler rewrite, no route change, no remote database migration, no Vercel command, no Neon command, no Production（生产环境）deployment, no Production data mutation, no merge（合并）to `main`, no authentication（认证）, no analytics（分析追踪）, no notification, no background audio, no PWA（Progressive Web App，渐进式 Web 应用）implementation, and no 付费/扣款 feature.
Exit criteria: Review no longer shows the two confusing regenerate/new-session buttons; Review still refreshes its empty queue automatically after local Recognition Vocabulary data changes; `回退1词` appears from the second visible review card onward while a current card exists; the final completed card does not expose rollback after completion; one-word rollback removes the previous card's selected-person review event, rebuilds that word's review state from earlier history, places that word back at the front of the current session, and preserves other session cards; local tests and validation pass.

## Product Decisions

- The old regenerate buttons only re-read the current queue and do not change persisted review history. They are removed because their effect is easy to confuse with the stronger `重置今日复习任务`.
- Automatic queue refresh should be quiet and conservative. It should react to local Recognition Vocabulary item changes when the Review page is empty, but it should not interrupt an active card.
- `回退1词` is a one-step correction affordance for accidental rating taps. It is not a broad undo history.
- The button appears when there is a current card and at least one card has already been completed in this session.
- The final submitted card completes the session directly. The app intentionally does not offer rollback from the completion screen for the final card in this local refinement.
- One-word rollback is browser-local. The existing Postgres Preview（预览环境）runtime should block this control until a later approved database-control stage adds matching API（应用程序接口）and adapter behavior.

## Data Behavior

One-word rollback:

```ts
rollbackReviewEvent(data, reviewEventId, now)
```

- Finds the selected person's matching review event.
- Removes only that review event.
- Rebuilds the affected vocabulary item's `ReviewState` from that person's remaining earlier review events.
- Removes the `ReviewState` if no earlier events remain, so the word behaves like it did before the rolled-back rating.
- Leaves other vocabulary, other people, other events, and the current session list untouched.

Session behavior:

- `recordReview()` still writes exactly one event per submitted rating.
- The UI stores the review event id for completed cards in the current session.
- Clicking `回退1词` rolls back the most recent completed card and places that vocabulary item at the front of the session.
- The current card remains next after the rolled-back card.

## Validation Plan

Local validation:

```bash
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run build
git diff --check
npm run governance:preflight
```

Focused checks:

- Review page no longer renders `重新生成本次复习` or `新建本次复习`.
- `重置今日复习任务` still renders and still uses confirmation.
- `回退1词` is hidden on the first card, visible on later current cards, and hidden after final completion.
- One-word rollback removes the previous review event and restores the previous word to the front of the current session.
- Rolling back a first-ever review removes the affected review state.
- Rolling back a later review rebuilds the affected review state from earlier history.
