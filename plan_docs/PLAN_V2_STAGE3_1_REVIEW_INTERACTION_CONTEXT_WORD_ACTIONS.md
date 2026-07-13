# Words Learning App For Mimi V2 Stage 3.1: Review Interaction And Context Word Actions

Created: 2026-07-14 01:32 AEST
Last updated: 2026-07-14 02:03 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`
- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`
- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md`
- `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md`
- `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`
- `ARCHITECTURE.md`
- the user's 2026-07-14 Review-card and example-word-action request

Scope:

- Let a pointer tap/click on the Recognition review card body reveal or hide the answer repeatedly while retaining a smaller accessible `Show answer` / `Hide answer` control.
- Give the four existing memory ratings a calm color progression without changing their labels, values, same-session repeat rules, or FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）mapping.
- Make actionable English tokens inside revealed examples open a mobile bottom sheet or compact desktop action panel.
- Implement browser-only `Listen` for the selected example token and a manually editable `Add to learning` flow with duplicate protection.
- Add the strict `context_explain_v1` public request, server-trusted source, structured-result, lineage, and temporary Cache（缓存）contracts needed by the later protected Gemini route.
- Correct Gemini 3.1 Flash-Lite cost estimates to the current Standard synchronous `generateContent` price while preserving the originally recorded Stage 2 evidence values as historical runner output.
- Add focused tests and synchronize the V2 master, architecture, README, changelog, AGENTS, and AI log.

Non-Scope:

- No Gemini request, external API call, paid usage, Production credential, AI response UI, WAF（防火墙）change, provider activation, or automatic AI save.
- No microphone, Speech Recognition（语音识别）, pronunciation scoring, multi-word drag selection, writing/speaking question type, or external dictionary.
- No change to Recognition FSRS parameters, queue ordering, rating values, review event/state meaning, rollback, or reset behavior.
- No Active practice engine, Recognition-card headword `Listen` button, Dashboard, mobile-navigation rebuild, or visualization; those remain in V2-4 through V2-8.
- No automatic relation creation for a manually added example token. Accepted AI relations remain V2-7 work.
- No remote database connection, migration, import, restore, user-data mutation, Vercel change, deployment, commit, push, pull request, or merge.
- No SSO（Single Sign-On，单点登录）or confidential multi-user isolation.

Exit criteria:

- Card-body pointer interaction toggles the answer repeatedly; selecting text or using a nested action does not toggle it; the explicit keyboard-accessible fallback remains visible.
- The first reveal timestamp is retained for that card across later hide/reveal cycles and resets only when the active card/session context changes.
- All four ratings remain text-labelled and use distinct, low-pressure color tones with readable focus, hover, disabled, light-theme, and dark-theme states.
- Example segmentation preserves exact UTF-16 offsets, supports apostrophes and hyphenated words, keeps punctuation as non-action text, and has a tested fallback when `Intl.Segmenter` is unavailable.
- `Listen` uses only browser SpeechSynthesis（浏览器文字转语音）and creates no study, review, AI, or persistence side effect.
- `Add to learning` prefills the selected token and full source example, requires an explicit save with a visible Track choice, allows editing, and blocks an existing normalized entry for the selected person, including archived entries.
- `AI explain` is visibly unavailable in this local stage and never returns fixture text as if it were generated. The later request can carry only entry id, example index, selected offsets, fixed feature/disclosure versions, and an Idempotency Key（幂等键）.
- The server-trusted contract re-reads the stored example and accepts only an exact actionable token span. The structured result is length-bounded and contains only the frozen context-explanation fields.
- Schema Version 6 reserves `context_explain_v1` AI lineage and a temporary context Cache table. Cache rows and unreferenced context runs stay outside user JSON backup/restore.
- Standard synchronous pricing is US$0.25 / 1M text-input tokens and US$1.50 / 1M output/thinking tokens as checked on 2026-07-14; corrected estimates are covered by tests and no paid runner is executed.
- Local lint, typecheck, tests, AI dry-run, all backup fixture dry-runs, build, browser interaction checks, governance preflight, and diff checks pass.

Status: local implementation complete on 2026-07-14. No external-service, remote-database, credential, or Production action was performed or authorized.

## Decision Summary

V2-3.1 is a bounded bridge between the completed Schema Version 6 data layer and the larger mobile/daily-learning stages. It fixes immediate Review friction now, makes example context useful without a provider, and reserves one narrow AI feature contract so V2-7 does not later introduce a raw-text or client-owned Prompt path.

The current Review remains Recognition-only. Every rating still calls the same `recordReview()` path, uses the same `ReviewRating`, writes the same evidence, and maps to the same Recognition FSRS result. Visual tone is not a new memory score.

## Local Implementation Outcome

- Recognition cards now accept a short primary-pointer tap on non-interactive content. Movement above 8 px, text selection, buttons, links, fields, and marked nested actions are excluded; the compact native `Show answer` / `Hide answer` button remains.
- The first reveal time survives later hide/reveal cycles for the same card. A pure state helper and tests lock that behavior while existing next-card, rollback, reset, and person/session resets retain ownership of clearing it.
- Both rating surfaces use the accepted muted terracotta, warm honey, pale olive, and soft sage scale. Labels, values, interval hints, queue behavior, and FSRS calls are unchanged.
- Revealed examples are segmented into exact-offset actionable tokens. Selecting one opens a responsive action panel with browser `Listen`, resting `AI explain`, and a manual `Add to learning` form.
- Manual addition reuses the ordinary `vocabulary.add` path with `source = manual`, editable meaning/example/Track, and selected-person duplicate protection that includes archived entries.
- `context_explain_v1` now has strict public-request, trusted-source, and structured-result validators. The unexecuted Schema Version 6 draft accepts its run lineage and defines an expiring operational Cache table that stays outside application snapshots and backups.
- Gemini price constants and runner version 5 now use Standard synchronous pricing. The local dry-run reports US$0.186 reserved for 120 attempts; the historical US$0.10 live ceiling therefore rejects another batch.

## Review Card Interaction

### Toggle rules

- A pointer tap/click on non-interactive card content toggles `answer hidden -> answer shown -> answer hidden` without a limit.
- `Show answer` / `Hide answer` remains a compact real button for keyboard, switch-control, and screen-reader use.
- Rating buttons remain disabled whenever the answer is hidden and become enabled while it is shown, preserving the existing review rule.
- The first reveal records one elapsed-time start for the current card. Hiding and revealing again does not reset or restart it.
- Moving to another card, rolling back, resetting the session, or changing person clears the timestamp with the existing card state.
- Pointer events originating from a button, link, form control, or element marked as a card-toggle exclusion do not bubble into the card toggle.
- If the browser currently has a non-empty text selection, the card does not toggle. This preserves copy/select behavior.

The card body is a pointer convenience, while the explicit button remains the semantic keyboard action. This avoids nesting interactive example-word buttons inside another HTML button.

### Four-tone scale

| Existing value | Existing label | Tone | Meaning of color |
| --- | --- | --- | --- |
| `forgot` | 完全忘记了 | muted terracotta | warm low end of the scale, without alarm-red styling |
| `hard` | 有点忘记了 | warm honey | slightly lighter transition |
| `vague` | 模糊记得 | pale olive | middle-to-positive transition |
| `remembered` | 完全记得 | soft sage | calm positive end |

Text labels and interval hints remain primary. Color is supplementary and cannot be the only way to distinguish a choice. The tones must keep readable text/border contrast in both app themes and avoid punishment copy, countdowns, or overdue language.

## Example Token And Action Design

### Segmentation

The primary segmenter is `Intl.Segmenter("en", { granularity: "word" })`. MDN records that `Intl.Segmenter` is available across current browsers but may be absent on older devices, so the app also keeps a Unicode-aware fallback.

Each emitted segment keeps:

```text
text
start            inclusive UTF-16 string offset
end              exclusive UTF-16 string offset
isActionable
```

Rules:

- punctuation and whitespace remain visible non-action text;
- word-like segments containing letters are actionable;
- an apostrophe or hyphen directly joining two word-like pieces is merged into one actionable token, such as `don't` or `well-known`;
- no free-form multi-word selection is sent to the AI contract in this stage;
- exact offsets always refer to the stored full example string, not to a normalized copy.

### Action panel

Selecting one token opens:

- mobile: a bottom sheet above the Safe Area（安全区）;
- desktop: the same dialog content in a compact centered panel.

The panel shows the selected token and three actions:

1. `Listen`: speak the token through `window.speechSynthesis`. Cancel an earlier app-owned utterance before speaking the new one. Unsupported browsers show a short local message and do not fall back to AI.
2. `AI explain`: remain disabled/resting in Stage 3.1 with `AI explanation is resting for now`. No generated-looking placeholder is shown.
3. `Add to learning`: open a manual form prefilled with the token and full source example.

### Manual addition

The user may edit:

- `Word or phrase`;
- Chinese meaning;
- source example;
- `Recognition` or `Active` Track.

The resulting entry uses `source = manual` and the ordinary single-entry creation fact. It stores no AI run or vocabulary relation. Before save, the normalized text is checked against every selected-person item, including archived items. A duplicate is blocked with calm `Already in Library` copy; the user may edit the headword and try again.

## `context_explain_v1` Contract

### Public request

The future browser request has exact fields only:

```ts
{
  vocabularyEntryId: string;
  exampleIndex: number;
  selectedStart: number;
  selectedEnd: number;
  feature: "context_explain_v1";
  disclosureVersion: "ai-disclosure-v1";
  idempotencyKey: string;
}
```

The client cannot send the example, selected text, meanings, raw Prompt, model, provider, tools, token limit, price, or Cache key.

### Server-trusted source

The later route must:

1. re-read the selected-person vocabulary entry by id;
2. re-read the stored example by `exampleIndex`;
3. verify the stored example length and the inclusive/exclusive offset bounds;
4. re-segment the stored example and require one exact actionable-token span;
5. derive the selected text with `example.slice(selectedStart, selectedEnd)`;
6. build the provider payload from the selected token, source headword, source meanings, and one stored example only.

This makes edited browser text, arbitrary substrings, and raw Prompt injection fail before quota reservation.

### Structured result

```ts
{
  suggestedHeadword: string;
  meaningInContextZh: string;
  grammarRoleZh: string;
  contextExplanationZh: string;
  phraseInContext: string | null;
}
```

Every field is length-bounded and URL-free. `phraseInContext`, when present, must occur in the trusted example. The later V2-7 result UI must show:

`Generated by Gemini 3.1 Flash-Lite · AI content may be inaccurate. Please review carefully before saving.`

The result remains an editable suggestion. It never becomes a meaning, note, example, or new vocabulary entry without an explicit later save.

### Schema Version 6 reservation

- `ai_runs.feature` accepts `enrichment_v1` and `context_explain_v1`.
- A temporary `ai_context_explanation_cache` table stores a versioned source hash, exact example/token offsets, bounded structured result, run lineage, creation time, and required expiry time.
- The table is person/source-item scoped and cascades away with the live source item.
- A Cache row must point to a succeeded context-explanation run for the same person.
- A context-explanation run cannot satisfy `ai_enrichment_drafts` or `vocabulary_relations`; those formal domains require a matching succeeded/valid `enrichment_v1` run for the same source item.
- V2-7 will choose the exact bounded expiry duration with its route/cost implementation; Stage 3.1 requires `expiresAt > createdAt` and does not activate a cleanup job.
- Cache rows are operational and excluded from `VocabularyData`, `/api/storage/data`, JSON backup, restore, CSV, and Postgres backup-import mappings.
- Unreferenced `context_explain_v1` run rows are likewise excluded from user backup. Existing accepted `enrichment_v1` backup behavior stays unchanged.
- The backup selector defensively removes any draft/relation whose run is not an eligible succeeded/valid `enrichment_v1` run, preventing a feature-mismatched lineage from entering a generated backup.

Because `0003_v2_schema6_data_model.sql` has never been executed in any remote environment, this stage may amend that forward-only local draft without rewriting an executed migration. Any later remote execution remains separately approved.

## Pricing Correction

Official Google evidence checked on 2026-07-14:

- Gemini 3.1 Flash-Lite is Stable and supports Structured Outputs: <https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite>
- Standard paid price is US$0.25 / 1M text-input tokens and US$1.50 / 1M output tokens including thinking: <https://ai.google.dev/gemini-api/docs/pricing>
- Batch and Flex are the separate US$0.125 / US$0.75 paths. The current Stage 2 runner uses synchronous REST `generateContent`, so Standard prices apply.
- Structured JSON output remains supported through JSON Schema: <https://ai.google.dev/gemini-api/docs/structured-output?lang=rest>

Corrected calculations:

```text
400,000 input  * 0.25 / 1,000,000 = US$0.100
140,000 output * 1.50 / 1,000,000 = US$0.210
full reserved day                         US$0.310

Stage 2 first run retained lower bound    US$0.068550
Stage 2 first run bounded upper estimate  US$0.077850
Stage 2-B retained usage estimate         US$0.055886
```

The US$0.40 daily ceiling still covers one full daily token envelope. The independent US$2 monthly ceiling represents about 6.45 full-envelope days. The historical runner-recorded US$0.034275–0.038925 and US$0.027943 values remain recorded as estimates produced with the mistakenly selected Batch/Flex rate; current docs must label them rather than silently erasing them.

The Stage 2 live evaluation ceiling remains US$0.10. Under corrected Standard pricing, reserving all 120 historical attempts would be US$0.186, so the runner must now fail closed for another live batch. A future paid evaluation needs a new human-approved cost boundary; Stage 3.1 performs only dry-run and unit tests.

## Implementation Slices

### 3.1-A Documentation and price truth

- Create this child plan before code.
- Insert V2-3.1 into the master sequence and synchronize architecture/current-status docs.
- Correct versioned Standard price constants and label historical estimates.

### 3.1-B Review interaction

- Add card-body pointer toggle guards and first-reveal timing preservation.
- Add the four rating tone tokens/classes and apply them to both rating surfaces.
- Keep all review repository/scheduler calls unchanged.

### 3.1-C Example actions

- Add exact-offset segmentation plus fallback tests.
- Add the responsive action panel, browser `Listen`, and manual-add form.
- Test duplicate detection and SpeechSynthesis side-effect boundaries through pure helpers/static UI assertions plus browser checks.

### 3.1-D AI contract reservation

- Add request/source/result validators and tests.
- Add feature/cache operational types and amend the unexecuted `0003` draft/static schema tests.
- Prove context Cache/run exclusion from user backup.

### 3.1-E Acceptance

- Run the local gate and browser checks.
- Update this plan to `complete`, synchronize project docs/logs, and report any residual browser/API limitations.

## Validation Plan

```bash
git diff --check
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run ai:quality:dry-run
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
```

Browser checks at minimum:

- pointer card reveal/hide/reveal;
- text selection and nested word actions do not flip the card;
- keyboard fallback reveals/hides;
- ratings stay disabled while the answer is hidden and enabled while it is shown;
- all four tones are distinguishable by text and color in light/dark themes;
- action sheet at 320 px, 390 px, and desktop;
- `Listen` support/fallback message;
- duplicate and successful manual add on disposable local test data;
- no horizontal overflow and visible focus states.

Validation outcome:

- ESLint and TypeScript passed. Vitest passed 31 files / 202 tests; the existing Postgres integration file / test remained intentionally skipped.
- The AI runner dry-run passed with runner version 5, the unchanged 120-entry corpus, no tools, and a US$0.186 reservation. No live/provider mode ran.
- Schema 3, Schema 5, and Schema 6 backup fixture dry-runs passed, and the Next.js Production build completed every listed static and dynamic route.
- Tier 3 governance preflight and final diff checks passed after documentation/log synchronization.
- Browser acceptance used a forced `MIMI_STORAGE_RUNTIME=local` server on isolated origin `localhost:3001`. Card reveal/hide/reveal, nested actions, browser speech, duplicate rejection, successful manual Active addition, dark/light tones, 320 / 390 / 1200 px layouts, body scroll lock, and focus containment passed with no error overlay, console warning/error, or horizontal overflow.
- The explicit fallback appeared in the accessibility tree as a native named button; first-reveal timing, segmentation fallback, speech boundaries, backup exclusion, and context contracts are additionally locked by automated tests.

## Residual Limits

- Browser SpeechSynthesis voice and pronunciation quality remain device/browser dependent. Unsupported browsers show a local message.
- `AI explain` is deliberately disabled and displays only the resting message. V2-7 must still implement the protected server route, quota transaction, expiry duration, disclosure, provider call, and editable result UI.
- `0003_v2_schema6_data_model.sql` remains unexecuted. The live V1 database and deployment remain unchanged at Schema Version 5.

## Stop Conditions

Stop and request a new decision if:

- card pointer handling changes rating, queue, or FSRS behavior;
- exact selected offsets cannot be reproduced from the trusted stored example;
- the manual add path would silently create a duplicate or AI relation;
- an AI control would call a provider, expose a credential, or display fabricated fixture output;
- context Cache data enters user backup/restore;
- an executed migration would need rewriting or a remote target would be touched;
- corrected pricing no longer fits the accepted daily ceiling;
- local validation or browser acceptance fails outside this bounded scope.
