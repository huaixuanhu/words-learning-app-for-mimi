# Words Learning App For Mimi Stage 7.10: Library And Review Control Fixes

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`, the accepted Stage 7.9 local dual-track data/import work, and the 2026-07-07 user request to make review rating controls interactive on both sides, add hard delete, add batch import rollback, rename JSON source chips, and add a confirmed reset for today's review task.
Scope: refine local Review（复习）and Library（词库）controls; make both left/bottom and right-side rating buttons submit the same review rating; add hard delete for vocabulary items with related review state/event cleanup; add rollback for Batch JSON import（批量 JSON 导入）batches; show JSON-imported source chips as `Batch imported`; add a confirmed reset for today's review task that rolls selected-person review state back to before today's reviews; update docs, tests, changelog, and AI log.
Non-Scope: no AI API（人工智能接口）, no dictation engine（听写引擎）, no spelling checker（拼写检查器）, no writing feedback model, no external vocabulary source, no schema version change, no remote database migration, no Vercel command, no Neon command, no Production（生产环境）deployment, no Production data mutation, no merge（合并）to `main`, no authentication（认证）, no analytics（分析追踪）, no notification, no background audio, no PWA（Progressive Web App，渐进式 Web 应用）implementation, and no 付费/扣款 feature.
Exit criteria: Review rating choices are clickable from both the main card area and right Session panel after the answer is shown; Library exposes hard delete with confirmation and removes related review records; Library exposes Batch JSON import rollback with confirmation and removes remaining items plus related review records for that batch; JSON source chips read `Batch imported`; Review exposes `重置今日复习任务` with confirmation and restores the selected person's review state to before today's reviews; local tests and validation pass.

## Product Decisions

- Right-side Review rating controls should be real buttons, not passive description cards.
- Rating buttons remain disabled until the answer is shown to preserve the existing recall-first flow.
- Hard delete is intentionally separate from archive. Archive remains a reversible soft action; delete removes the item from local study data and removes related `reviewStates` / `reviewEvents`.
- Batch rollback is scoped by `importBatchId`. It deletes remaining vocabulary items from that batch and removes related review history. If some batch items were already deleted, rollback only removes the items still present.
- JSON imported vocabulary chips should show `Batch imported` instead of internal source values such as `json_paste` or `json_file`.
- Reset today's review task affects only the selected person and only events whose `reviewedAt` falls on the current local day. It rebuilds affected review states from earlier review events; if a word had no earlier review, its review state is removed so it behaves like it did before today's session.
- These controls are implemented for the browser-local runtime. The existing Postgres Preview（预览环境）adapter remains compatibility-only until a later approved database-control stage.

## Data Behavior

Hard delete:

```ts
deleteVocabularyItem(data, vocabularyItemId)
```

- Removes the selected person's matching vocabulary item.
- Removes selected-person review state and review events for that item.
- Leaves import batch metadata intact.

Batch rollback:

```ts
rollbackImportBatch(data, importBatchId)
```

- Finds selected-person vocabulary items with the matching `importBatchId`.
- Removes those items and related review state/events.
- Removes the import batch record.

Reset today review task:

```ts
resetTodayReviewTask(data, now)
```

- Removes today's selected-person review events.
- Rebuilds affected review states from remaining earlier review events using the existing deterministic scheduler.
- Keeps other people, other days, and unrelated vocabulary untouched.

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

- Right-side Review buttons call the same rating submission path as the main buttons.
- Hard delete removes item, review state, and review events.
- Batch rollback removes batch items, related review records, and the import batch.
- Reset today removes today's events and restores previous review state.
- Source chips show `Batch imported` for JSON imported words.
