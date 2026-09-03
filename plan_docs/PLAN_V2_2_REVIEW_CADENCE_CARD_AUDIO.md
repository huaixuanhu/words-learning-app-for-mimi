# Words Learning App For Mimi V2.2 Review Cadence, Card And Audio Plan

Created: 2026-09-03 AEST
Last updated: 2026-09-03 AEST

Source plan:
- `plan_docs/PLAN_V2_MASTER.md`

Derived from:
- `plan_docs/PLAN_V2_MASTER.md`
- `ARCHITECTURE.md`
- the user's accepted V2.2 review, card and pronunciation decisions on 2026-09-03

Scope:
- Shorten future Recognition Vocabulary（阅读词汇）and Active Vocabulary（输出词汇）review intervals through versioned FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）parameter sets.
- Keep the first new-word `模糊记得` checkpoint on the next local learning day.
- Let the full muted Recognition card surround reveal or hide the answer while preserving interactive-control and text-selection guards.
- Automatically pronounce each newly active Recognition card and Active `Dictation` card once, while retaining every manual sound button.
- Make `Cloud voice` use `/api/tts` and `Use device voice` use browser speech, with old playback cancelled when the source or card changes.
- Add local migration `0007_v2_2_fsrs_parameter_sets.sql` and keep backup/import/rebuild behavior compatible with V1 and V2 parameter-set history.

Non-Scope:
- No bulk rewrite of existing `dueAt`, Review State（复习状态）, Review Event（复习事件）, or learner data.
- No automatic pronunciation before the answer in Active `Say it` or `Spell it`, because it would reveal the tested English entry.
- No change to TTS provider, voice, rate, pitch, quota, billing, Cache（缓存）, Kill Switch（紧急关闭开关）, or provider fallback policy.
- Release execution is outside this implementation plan and is owned by the derived `plan_docs/PLAN_V2_2_PRODUCTION_RELEASE.md`.

Authority and safety:
- Current capability, target capability, and working classification remain Tier 3.
- The original accepted authority covered local code, tests, documentation, and a forward-only migration file only.
- On 2026-09-03 the user separately accepted `plan_docs/PLAN_V2_2_PRODUCTION_RELEASE.md`, including its bounded Staging, Production, GitHub, Vercel and one-synthetic-word TTS verification actions.
- Cloud autoplay may send the newly shown English entry to the already selected Google Cloud TTS route and consume the existing global TTS quota. The Settings disclosure must state this behavior.

Status:
- `Complete locally; Production release in progress` on 2026-09-03. Remote execution state is recorded only in the derived Production release plan.

## Stage 2.2.1 Plan And Compatibility Boundary

- Add this uniquely named child plan and keep the V2 master as its parent.
- Introduce explicit legacy/current Parameter Set（参数集）identifiers so old history remains explainable and new ratings use V2.2 parameters.
- Exit claim: the plan lineage, local-only authority, retained historical behavior, and release boundary are explicit.

## Stage 2.2.2 Shorter Review Cadence

- Set Recognition `request_retention` to `0.929` under `recognition-fsrs-v2`.
- Set Active `request_retention` to `0.93` under `active-fsrs-v2`.
- Keep `recognition-fsrs-v1` at `0.90` and `active-fsrs-v1` at `0.92` for historical replay and Retrievability（可提取率）calculations.
- New ratings write V2 identifiers. Rebuild replays each event with its recorded identifier and leaves an all-V1 retained history on V1.
- Add `0007` to allow only the explicit V1/V2 identifiers for the matching Review Profile.
- Exit claim: future reviews use the accepted shorter cadence, next-day vague-new behavior remains, and V1/V2 backup plus rebuild compatibility is covered by tests.

## Stage 2.2.3 Recognition Card Click Area

- Move the guarded pointer interaction from the inner white card to the full muted card surround.
- Preserve left-click, movement-distance, interactive element, selected text, and pointer-cancel safeguards.
- Exit claim: clicking either the inner card or its muted surround reveals/hides the answer without stealing button/link/text interactions.

## Stage 2.2.4 Pronunciation Autoplay And Source Routing

- Autoplay each newly active Recognition card once.
- Autoplay each newly active Active `Dictation` card once; keep Active `Say it` and `Spell it` silent before reveal.
- Retain manual word-playback buttons.
- Cancel old Cloud audio, Cloud request, and device speech before each new play and when the Settings source changes.
- Verify that `cloud` requests `/api/tts`, while `device` uses browser speech without a Cloud request.
- Show a short visible message if playback is unavailable or blocked; keep the manual button as the recovery action and do not silently switch sources.
- Update the Cloud disclosure to include automatic playback of newly shown eligible cards.
- Exit claim: source choice and autoplay behavior are deterministic, non-duplicating, visible on failure, and covered by focused tests.

## Stage 2.2.5 Documentation And Validation

- Synchronize `ARCHITECTURE.md`, `plan_docs/PLAN_V2_MASTER.md`, `CHANGELOG.md`, and `governance/AI_AGENT_LOG.md` with the implemented local state.
- Run focused tests for FSRS versions, daily episode scheduling, rebuild, backup/import validation, migration contract, Dashboard, card interaction, source routing, and autoplay contracts.
- Finish with the repository's full local validation: governance, lint, typecheck, tests, three backup dry-runs, build, and diff review.
- Exit claim: every changed behavior and retained safety invariant has current local evidence; remote activation is governed separately by the accepted Production release plan.

Exit criteria:
- Recognition new ratings use `request_retention = 0.929`; Active new ratings use `0.93`.
- The first new-word `模糊记得` result remains due at the next local-day boundary.
- V1 events rebuild with V1 schedulers, mixed history switches only when a V2 event occurs, and imports reject cross-profile or unknown Parameter Set identifiers.
- `0007` is forward-only, transaction-wrapped, credential-free, data-preserving, and accepts only the four approved identifiers.
- The full muted Recognition card surround toggles the answer while protected controls and text selection do not.
- Recognition and Active `Dictation` autoplay once per newly active card; manual buttons remain; Active `Say it` and `Spell it` do not autoplay before reveal.
- `Cloud voice` follows `/api/tts`; `Use device voice` follows browser speech; source changes cancel earlier playback and no silent fallback occurs.
- Current documentation and local validation evidence match the final diff.

## Local Result And Evidence

- Recognition current parameters are `recognition-fsrs-v2` / `0.929`; Active current parameters are `active-fsrs-v2` / `0.93`. V1 adapters remain pinned to `0.90` and `0.92` for retained history.
- New ratings write V2 identifiers. Event replay, Dashboard Retrievability, JSON restore, and backup-import planning accept only matching V1/V2 identifiers and reject unknown or cross-profile values.
- `0007_v2_2_fsrs_parameter_sets.sql` is present, transaction-wrapped, constraint-only, and unexecuted.
- The full muted Recognition surface now owns the guarded pointer handlers. Recognition and Active Dictation use one shared autoplay/replay hook; Say/Spell remain silent before reveal.
- Source routing tests prove Cloud requests `/api/tts`, device speech makes no Cloud request, and switching to device cancels an earlier Cloud request. Browser `NotAllowedError` is reported without source fallback.
- Focused validation passed 12 files / 80 tests. Full Vitest passed 97 files / 599 tests with the existing Postgres integration file/test skipped. ESLint, TypeScript, three backup dry-runs, and the Next.js Production build passed. The Tier 3 governance gate and final diff review are recorded in `governance/AI_AGENT_LOG.md`.
