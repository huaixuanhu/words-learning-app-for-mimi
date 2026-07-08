# CHANGELOG

## 2026-07-08 18:15 AEST

- Executed Stage 8-D FSRS scheduler replacement locally.
- Replaced the fixed Stage 4 Recognition scheduler with the Stage 8-B `ts-fsrs` adapter.
- Added conversion from existing neutral `ReviewState` fields into FSRS card input, including a compatibility path for older placeholder states without `difficulty` / `stability`.
- Updated local `recordReview()`, reset-today rebuild, and one-word rollback rebuild so Recognition states store FSRS `difficulty` / `stability`.
- Changed Review queue due checks to compare Mimi's local timezone（时区）date buckets, while keeping exact `dueAt` timestamps for audit（审计）and compatibility.
- Added a Postgres repository guard so future durable `recordReview()` rejects Active Vocabulary（输出词汇）items and remains aligned with the V1 no-Active-scheduling boundary.
- Updated scheduler / repository tests for deterministic FSRS first-review output, continuous review output, local natural-day bucket due behavior, reset, rollback, and Active no-scheduling behavior.
- Reason: remove the placeholder linear cross-day scheduler before V1 Production（生产环境）can persist durable review memory state.

## 2026-07-08 18:03 AEST

- Executed Stage 8-C Recognition same-session repeat locally.
- Added `src/lib/review/session-queue.ts` and unit tests for pass / repeat / duplicate / rollback queue behavior.
- Updated Review so `完全忘记了` and `有点忘记了` record the attempt, do not increment the session passed count, and requeue the word later in the same session.
- Kept `模糊记得` and `完全记得` as the only ratings that count a word as passed in the current session.
- Updated `回退1词` so rolling back a repeated attempt moves that word to the front without duplicating an already queued repeat.
- Documented the Stage 8-D natural-day bucket（自然日分桶）boundary: FSRS computes `scheduled_days`, while Review queue due checks should use Mimi's local timezone（时区）date bucket rather than exact clock time.
- Kept the Stage 4 cross-day scheduler unchanged in this substage.
- Reason: make a single Recognition review session behave like active relearning while keeping cross-day scheduler replacement separate.

## 2026-07-08 17:51 AEST

- Executed Stage 8-B package fit and calibration locally.
- Installed `ts-fsrs@5.4.1` and inspected its installed TypeScript（类型脚本）types before writing adapter code.
- Added `src/lib/review/fsrs-recognition.ts` as an isolated Recognition Vocabulary（阅读词汇）FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）adapter.
- Added deterministic calibration tests for package version, V1 rating mapping, fuzz-disabled parameters, and first-review outcomes.
- Added an Active Vocabulary（输出词汇）boundary regression test proving Active words do not enter review queue（复习队列）and cannot create review state（复习状态）or review event（复习事件）through V1 review recording.
- Kept the existing Stage 4 scheduler and Review UI behavior unchanged.
- Reason: validate the FSRS package fit and lock the Recognition / Active boundary before replacing the real scheduler.

## 2026-07-08 12:45 AEST

- Added `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md` as the required review memory algorithm stage before formal V1 Production（生产环境）launch.
- Documented the accepted Recognition Vocabulary（阅读词汇）behavior: `完全忘记了` and `有点忘记了` repeat inside the same session until the learner selects `模糊记得` or `完全记得`.
- Documented the FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）direction for cross-day Recognition scheduling, with `ts-fsrs` as the planned TypeScript（类型脚本）library to validate before implementation.
- Added the Active Vocabulary（输出词汇）boundary: V1 stores, exports, and imports Active words, but Active words do not enter review queue（复习队列）, do not create review state（复习状态）, and do not create review event（复习事件）.
- Documented V2 compatibility guidance: keep `difficulty` / `stability` as neutral state fields and use separate future dimensions such as `review_profile`, `skill_type`, or `activity_type` for Active scheduling.
- Synced `AGENTS.md`, `ARCHITECTURE.md`, `README.md`, `plan_docs/PLAN_V1_MASTER.md`, `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`, `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`, and `governance/AI_AGENT_LOG.md`.
- Reason: prevent the placeholder Recognition scheduler and any accidental Active scheduling state from being frozen into shared Postgres Production data before V1 launch.

## 2026-07-08 00:25 AEST

- Added `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md` after the user chose shared Postgres Production for formal V1.
- Updated `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md` so browser-local Production is now a fallback, and Stage 6B-P1 is the required next stage.
- Documented schema version 5 Production persistence needs, `postgres-production` runtime rules, API/repository parity, backup import version 5, non-production Neon branch verification, access-boundary decision, stop conditions, and validation plan.
- Synced `AGENTS.md`, `ARCHITECTURE.md`, `README.md`, `plan_docs/PLAN_V1_MASTER.md`, and `governance/AI_AGENT_LOG.md`.
- Verified documentation validation: `git diff --check` and `npm run governance:preflight`.
- Reason: align the release plan with the user's preference that V1 formally launch fully cloud-backed rather than browser-local, without executing code changes, reading credentials, mutating databases, or deploying Production（生产环境）.

## 2026-07-07 23:53 AEST

- Added `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md` as a plan-only Stage 6B formal Production execution route.
- Documented the two runtime choices: browser-local Production as the recommended first formal V1 path, and shared Postgres Production only after a separate `postgres-production` implementation stage.
- Re-checked current Vercel / Neon release-planning references from official docs and kept all live actions behind explicit approval.
- Synced `AGENTS.md`, `ARCHITECTURE.md`, `README.md`, `plan_docs/PLAN_V1_MASTER.md`, and `governance/AI_AGENT_LOG.md`.
- Verified documentation validation: `git diff --check` and `npm run governance:preflight`.
- Reason: move from locally accepted Stage 7 into a clear Stage 6B execution plan without merging to `main`, touching credentials, mutating a database, importing backup data, or deploying Production（生产环境）.

## 2026-07-07 23:12 AEST

- Executed Stage 7.11 Review rollback / auto-refresh controls locally.
- Added `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Removed the confusing `重新生成本次复习` and `新建本次复习` buttons from Review.
- Added conservative Review queue auto-refresh when local Recognition Vocabulary data changes while no card is actively being answered.
- Added browser-local `回退1词` for multi-card review sessions; it removes the previous completed card's review event, rebuilds that word's review state from earlier history, and places the word back at the front of the current session.
- Kept the final completed card as direct completion without a completion-screen rollback.
- Kept one-word rollback browser-local; `postgres-preview` remains out of scope for this destructive control until a later approved database-control stage.
- Verified local validation: `npm run typecheck`, `npm run test -- --run`, `npm run lint`, `npm run backup:dry-run:fixture`, `npm run build`, `git diff --check`, and `npm run governance:preflight`.
- Reason: remove unclear session-regeneration controls and give the learner a small, calm correction path after an accidental rating tap without changing schema version 5, scheduler rules, remote database state, or Production（生产环境）scope.

## 2026-07-07 22:39 AEST

- Executed Stage 7.10 Library / Review controls locally.
- Added `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Made the Review side-panel rating cards real interactive buttons while preserving the existing four-rating scheduler behavior.
- Added a confirmed `重置今日复习任务` action that removes today's selected-person review events and rebuilds affected review states from earlier history.
- Added Library hard delete for vocabulary items and JSON batch rollback for batch imported records; both remove matching local review states and review events.
- Changed JSON import source chips from raw `json_paste` / `json_file` display to `Batch imported`.
- Kept the new destructive controls browser-local; `postgres-preview` UI blocks them until a later approved database-control stage adds matching adapter/API behavior.
- Verified local validation: `npm run typecheck`, `npm run test`, `npm run lint`, `npm run backup:dry-run:fixture`, `npm run build`, `git diff --check`, and `npm run governance:preflight`.
- Reason: make imported vocabulary and review sessions recoverable after user mistakes without changing schema version 5, scheduler rules, route contracts, remote database state, or Production（生产环境）scope.

## 2026-07-07 20:02 AEST

- Refined Stage 7.9 batch JSON import semantics after user clarification.
- Upgraded browser-local vocabulary data and JSON backup shape to schema version 5 with `meaningsZh` and `examples` arrays while preserving legacy `meaningZh` / `example` compatibility display fields.
- Batch JSON now requires at least one meaning and one example per item, accepts unlimited entries, accepts legacy single-string fields for compatibility, and keeps `rarityScore` optional / nullable.
- Updated `/import` sample and preview editing so meanings and examples are edited as multi-line lists.
- Updated Library search/edit/display, Review answer display, Latest words summary, JSON backup validation, CSV export, local migration, Postgres preview mapping, and tests for the multi-meaning / multi-example model.
- Kept Review scheduling Recognition-only and did not add AI API（人工智能接口）, dictation, spelling, writing feedback, remote database migration, Production import, Production deployment, or Postgres schema columns.
- Verified local validation: `npm run typecheck`, `npm run test`, `npm run lint`, `npm run backup:dry-run:fixture`, `git diff --check`, `npm run build`, localhost route smoke checks for `/`, `/import`, `/library`, `/review`, and `/export`, and `npm run governance:preflight`.
- Reason: make batch JSON directly support multiple meanings/examples as first-class V1 local data while keeping the current calm UI and existing scheduler / Production boundaries.

## 2026-07-07 16:17 AEST

- Tightened the Dashboard composition after user visual review.
- Reduced Today Hub panel padding, track-card spacing, icon size, progress height, and button height to make the feature frames feel lighter.
- Rebalanced the top dashboard grid to a more compact main area plus a narrower Review schedule column.
- Changed the lower dashboard section into three equal-width compact cards for Latest words, Practice Lab, and Quiet tools.
- Reason: keep the existing soft sage calm style while making the homepage less oversized and more symmetrical.

## 2026-07-07 00:35 AEST

- Executed Stage 7.9 dual-track data/import refinement locally.
- Added `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Upgraded browser-local vocabulary data to schema version 4 with `learningTrack` and nullable `tags`; legacy schema version 1 / 2 / 3 data migrates to Recognition Vocabulary with `tags: null`.
- Changed `/import` into the parent input page with Single input and Batch JSON import; `/add` now remains only as a compatibility redirect to `/import`.
- Replaced the user-facing batch import path with `.json` file / pasted JSON preview, including a sample that can be given to conversation AI（对话式 AI）so the returned JSON can be directly read and stored by the app.
- Added separate Recognition Vocabulary（阅读词汇）and Active Vocabulary（输出词汇）daily limits in Settings.
- Made Library filters and item chips use real Recognition / Active classification and real nullable tags.
- Kept current review scheduling limited to Recognition Vocabulary while storing Active Vocabulary for future Practice Lab work.
- Updated JSON backup and CSV export so schema version 4 includes `learningTrack`, nullable `tags`, and separate Recognition / Active limits.
- Kept AI API（人工智能接口）, dictation, spelling, writing feedback, remote database migration, Production import, Production deployment, and PTE / IELTS exam-mode classification out of scope.
- Verified local validation: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run backup:dry-run:fixture`, `npm run build`, and route smoke checks for `/`, `/study`, `/import`, `/library`, `/review`, `/settings`, `/practice-lab`, and `/add`.
- Browser MCP visual verification was attempted but blocked by a tab session mismatch in the browser backend; route-level localhost smoke checks passed.
- Reason: turn the accepted Stage 7.8 dual-track UI direction into explicit local V1 input, storage, backup/export, settings, and scheduler semantics without starting AI or Production work.

## 2026-07-06 23:39 AEST

- Executed Stage 7.8 dual-track UI refinement locally.
- Added `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Redesigned the dashboard around a Today Hub with separate Recognition Vocabulary（阅读词汇）and Active Vocabulary（输出词汇）track cards.
- Added presentational `/study` and `/practice-lab` route entries while keeping `/add` and `/export` available as quieter tools.
- Reordered main navigation to center daily learning: dashboard, study, review, library, practice lab, import, and settings.
- Refined Library filters and soft tags for All Words, Recognition, Active, Weak Words, Archived, and future mastery dimensions.
- Strengthened the cat Home Brand Button hover / active / focus-visible states while preserving the existing soft sage, calm, fluid interaction style.
- Verified local validation: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run backup:dry-run:fixture`, `npm run build`, route smoke checks, focused in-app browser checks, `git diff --check`, and `npm run governance:preflight`.
- Reason: align V1 UI composition with the future Recognition / Active learning-track direction before any separate Stage 6B merge or Production execution, without changing business logic, storage schema, scheduler behavior, API contracts, or remote state.

## 2026-07-06 23:12 AEST

- Executed Stage 7.7 final acceptance and regression QA locally.
- Added `plan_docs/PLAN_V1_STAGE7_7_FINAL_ACCEPTANCE.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Verified local validation: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run backup:dry-run:fixture`.
- Verified core routes `/`, `/add`, `/import`, `/library`, `/review`, `/export`, and `/settings` return HTTP 200 with expected route-specific text.
- Verified Stage 7 brand, font, and sound assets are reachable over localhost.
- Verified local `/api/storage/health` remains local disabled and POST `/api/storage/smoke` remains blocked by default.
- Verified `/settings` in the in-app browser has no Next.js development overlay, no console errors, visible `咪咪 Vocabulary`, visible sound controls, and no horizontal overflow.
- Reason: close Stage 7 as a locally accepted UI / interaction / sound pass before any separate Stage 6B planning.

## 2026-07-06 22:18 AEST

- Fixed Stage 7.6 global button sound not firing on normal buttons even when button sound was ON.
- Changed the soft-click playback path to schedule Web Audio API（网页音频接口）sound synchronously during pointer / keyboard activation instead of awaiting `AudioContext.resume()` first.
- Expanded global button-sound targeting from buttons and selected styled links to buttons, role buttons, and real links.
- Reason: keep the accepted soft button sound inside the browser user-gesture window and make link-style buttons receive the same feedback.

## 2026-07-06 22:13 AEST

- Fixed a Stage 7.6 `SoundProvider` refresh bug where `useSyncExternalStore` received a new settings object on every `getSnapshot` call.
- Cached the raw `mimi-ui-sound-v1` localStorage value and parsed sound settings so unchanged sound preferences return a stable snapshot object.
- Reason: prevent the Next.js development overlay errors `The result of getSnapshot should be cached to avoid an infinite loop` and `Maximum update depth exceeded` after localhost refresh.

## 2026-07-06 21:55 AEST

- Executed Stage 7.6 sound design locally.
- Added `plan_docs/PLAN_V1_STAGE7_6_SOUND_DESIGN.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Replaced the Settings sound preview-only card with a `Sound` settings form containing separate ON / OFF controls for button sound and review-completion sound.
- Added UI-only sound settings under `mimi-ui-sound-v1`, outside vocabulary data, review history, review settings, JSON backup, CSV export, Postgres tables, API payloads, and Production（生产环境）state.
- Promoted the accepted generated soft click into normal app button feedback through a client sound provider.
- Added the user-provided Mimi completion sound as `public/sounds/mimi-review-complete.m4a`; local inspection showed the uploaded `.WAV` file is actually AAC / m4af audio.
- Added a review-completion modal with `已完成今日复习任务` and a `确定` button that plays the completion sound when review-completion sound is ON.
- Added unit coverage for sound-setting normalization.
- Reason: make the accepted Stage 7.5 click feel part of the whole app while keeping audio preferences local, reversible, and out of study data.

## 2026-07-06 20:46 AEST

- Executed Stage 7.5 soft click sound trial locally.
- Added `plan_docs/PLAN_V1_STAGE7_5_SOFT_CLICK_SOUND_TRIAL.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Added Kenney Interface Sounds `click_001.ogg` as `public/sounds/mimi-soft-click.ogg` and a mobile-friendly derived `public/sounds/mimi-soft-click.m4a`.
- Added the local Kenney CC0 license / provenance note at `public/sounds/KENNEY_INTERFACE_SOUNDS_CC0.txt`.
- Added a Settings sound preview card that plays the click quietly through a low-pass filter（低通滤波器）for a more muted, less sharp feel.
- Moved audition playback to pointer-down timing and made the generated muted click the primary preview path, with Kenney audio-file playback retained as an auxiliary layer / fallback.
- Tuned the generated click away from a wooden knock and toward a softer compressed feel: low-pass `320 Hz`, sine tone glide `118 Hz` to `68 Hz`, longer `0.18` second body, and no normal Kenney audio-file layering.
- Kept the sound as an audition control only; it is not wired to global button clicks yet.
- Reason: let the user hear one soft click candidate before deciding whether to enable audio feedback more broadly.

## 2026-07-06 17:26 AEST

- Executed Stage 7.4 light / dark theme toggle locally.
- Added `plan_docs/PLAN_V1_STAGE7_4_THEME_TOGGLE.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Added a client-side theme（主题）provider that applies `data-mimi-theme` to the document root.
- Added a body-first inline boot script so the stored theme applies before the main UI renders.
- Added a Settings theme selector for `dark` and `light`.
- Added a warm sage light theme through CSS（层叠样式表）variables while keeping `dark` as the default.
- Stored the selected theme only as UI preference under `mimi-ui-theme-v1`, outside vocabulary data, review settings, JSON backup, CSV export, Postgres tables, and API payloads.
- Fixed a browser-caught hydration issue by keeping the theme boot script inside `<body>` instead of as a direct `<html>` child.
- Reason: offer a less dark reading mode without reopening product scope, storage schema, or Production boundaries.

## 2026-07-06 15:22 AEST

- Executed Stage 7.3 ChillRound font trial locally.
- Added `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Added self-hosted ChillRoundF 寒蝉全圆体 `v3.200` regular font asset from Warren2060/ChillRound under `public/fonts/chillround/`.
- Added the upstream OFL-1.1 license next to the font asset.
- Updated the CJK（中日韩文字）font stack so Chinese UI（用户界面）text uses ChillRoundF before system fallbacks.
- Reason: make the Chinese typography feel more rounded and closer to the user's desired Japanese-kanji print atmosphere without changing V1 product scope or Production boundaries.

## 2026-07-06 15:09 AEST

- Executed Stage 7.2 UI refinement locally.
- Added `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Added local cat avatar asset `public/brand/mimi-cats.png`.
- Replaced the visible `LexiCalm` brand area with the cat avatar and `咪咪 Vocabulary`.
- Added a Mincho（明朝体）oriented CJK（中日韩文字）font fallback.
- Slightly reduced desktop dashboard action-card density and strengthened hover / tap interaction feedback（交互反馈）.
- Reason: refine the accepted Stage 7.1 visual direction without changing V1 vocabulary import, flashcard review, storage, PTE / IELTS toggle, PWA, or Production boundaries.

## 2026-07-06 14:20 AEST

- Executed Stage 7 UI visual design locally.
- Added `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md` with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` markers.
- Added `motion` for Motion for React interaction animation.
- Redesigned the shared app shell with darker sage styling, desktop sidebar navigation, and mobile bottom navigation.
- Restyled dashboard, review, add, import, library, export, and settings surfaces around the existing local vocabulary and flashcard workflows.
- Documented that the PTE / IELTS toggle from the design prompt remains out of V1 scope.
- Reason: complete the dedicated Stage 7 visual design pass before any later Stage 6B Production execution.

## 2026-07-06 00:22 AEST

- Executed Stage 6A Production release gate design as documentation only.
- Added `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`.
- Documented the Stage 6B pre-execution checklist, env matrix, Production runtime gate, database migration gate, backup/import/rollback gate, stop conditions, and Stage 7 handoff requirements.
- Clarified that `person_id` separates learner data but is not security isolation.
- Reason: create a rigorous formal Production gate before visual design and before any future merge to `main` or Vercel Production action.

## 2026-07-06 00:15 AEST

- Confirmed the formal release sequence as Stage 6A release gate design, Stage 7 UI / visual design, then Stage 6B formal Production execution.
- Documented that `V1` should not merge to `main` for formal Production before Stage 7 visual design is accepted.
- Updated the deployment boundary so the existing Production deployment from branch `V1` remains a non-official artifact.
- Reason: prevent the Stage 6 heading from being interpreted as immediate Production execution before the dedicated visual design stage.

## 2026-07-05 23:45 AEST

- Executed Stage 5N-B controlled Preview UI write smoke and cleanup.
- Added a narrow development cleanup command for the Stage 5N UI smoke row set.
- Temporarily added `MIMI_ENABLE_STORAGE_UI_WRITES=true` to Vercel Preview only.
- Created write-enabled Preview deployment `dpl_JgKNc9zuAqgMsy5w13gbZoqkEhnY` at `https://words-learning-app-for-mimi-8r2cn2jko-anorias-projects.vercel.app`.
- Verified Preview `/api/storage/data` can write one controlled vocabulary row through the UI mutation path.
- Cleaned the smoke person, vocabulary item, and review settings row.
- Removed `MIMI_ENABLE_STORAGE_UI_WRITES` from Preview.
- Created disabled Preview deployment `dpl_Athg2hWZK1gV6ereWdbYk1WXG58C` at `https://words-learning-app-for-mimi-6v8azqoaa-anorias-projects.vercel.app`.
- Verified disabled Preview writes are blocked with `ui-writes-not-enabled`.
- Removed the temporary write-enabled Preview deployment.
- Verified Production env remains empty and the development database returned to zero rows.
- Reason: prove the Stage 5M UI write path in real Preview while closing the temporary write surface afterward.

## 2026-07-05 23:25 AEST

- Executed Stage 5N-A Preview UI runtime read-only verification.
- Created Preview deployment `dpl_HpcPDb5B2su2BLPWJVsYZjPDnWSg` at `https://words-learning-app-for-mimi-kb5b08c5v-anorias-projects.vercel.app`.
- Verified Vercel inspect reports `target=preview` and `readyState=READY`.
- Verified Preview `/api/storage/health` reads Postgres runtime with zero counts.
- Verified Preview `/api/storage/data` returns an empty schema version 3 snapshot.
- Verified Preview UI writes remain disabled with reason `ui-writes-not-enabled`.
- Verified app routes return HTTP 200 and error-log query returns no error records.
- Verified no Vercel env var changed and the development database remains empty.
- Reason: prove the Stage 5M UI runtime read path in real Preview before considering controlled Preview UI writes.

## 2026-07-05 22:52 AEST

- Executed Stage 5M user backup import and UI runtime cutover.
- Added file-backed backup import dry run, rollback trial, and guarded development commit support.
- Added a Stage 5M JSON backup fixture to verify file-backed import without real user data.
- Added `/api/storage/data` for development / preview Postgres snapshot reads and controlled UI mutations.
- Updated the UI data hook and write flows so `postgres-preview` can read/write through Postgres when explicitly enabled.
- Kept browser `localStorage` as the default runtime and local restore target.
- Verified local API read/write and browser library rendering against committed fixture data.
- Cleaned the Stage 5M fixture rows and verified the development database returned to zero core study rows.
- Reason: complete the development / preview backup import and UI runtime cutover path while keeping Production and Vercel env state untouched.

## 2026-07-05 15:45 AEST

- Executed Stage 5L backup import harness and smoke cleanup.
- Added a schema version 3 backup import dry-run planner and fixture backup.
- Added guarded commands for fixture dry run, development smoke cleanup, and development fixture transaction trial.
- Added tests for fixture target UUID mapping, metadata count mismatch rejection, and cross-person review reference rejection.
- Cleaned the Stage 5K smoke row set from the development database.
- Verified development database counts returned to zero after cleanup.
- Verified the fixture transaction trial inserted one person, one import batch, one vocabulary item, one review state, one review event, one review settings row, one backup import row, and six backup import mappings, then rolled back to zero.
- Reason: prepare formal backup import safely while removing the temporary smoke data left by Stage 5K.

## 2026-07-05 15:21 AEST

- Executed Stage 5K controlled write smoke for the development / preview Postgres adapter.
- Temporarily added `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` to Vercel Preview only.
- Created smoke-enabled Preview deployment `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv` at `https://words-learning-app-for-mimi-kj0qj7l5k-anorias-projects.vercel.app`.
- Verified Preview `/api/storage/health` returned `postgres-preview` with zero counts before the write.
- Called `/api/storage/smoke` once with the required confirmation header and received `ok=true`.
- Verified the development database now has exactly one smoke person, one vocabulary item, one review state, one review event, and one review settings row.
- Verified smoke vocabulary and review rows are scoped to person id `00000000-0000-4000-8000-0000000005f1`.
- Removed `MIMI_ENABLE_STORAGE_SMOKE_WRITES` from Preview after the write.
- Created follow-up disabled Preview deployment `dpl_BJn1pFAbLiiY4LgCyThKx2vDTSar` at `https://words-learning-app-for-mimi-7bzktk5uc-anorias-projects.vercel.app`.
- Verified the disabled Preview `/api/storage/smoke` returns `smoke-writes-not-enabled`.
- Removed the smoke-enabled Preview deployment.
- Reason: prove the runtime Postgres write path exactly once while closing the temporary write surface afterward.

## 2026-07-05 15:04 AEST

- Executed Stage 5J Postgres adapter read-only verification.
- Verified local `/api/storage/health` stays disabled when runtime mode is `local`.
- Verified local and Preview `postgres-preview` health checks can read Neon counts without writing data.
- Added `MIMI_STORAGE_RUNTIME=postgres-preview` to Vercel Preview only.
- Created verified Preview deployment `dpl_CFeC2VwRKtMSAjBiGGtyStsFw2tr` at `https://words-learning-app-for-mimi-dbkkkow3d-anorias-projects.vercel.app`.
- Confirmed Vercel production branch remains `main`, existing Production deployment remains non-official, and Neon core business tables remain empty.
- Reason: prove read-only adapter wiring in real Preview before considering smoke writes, backup import, UI cutover, or Production work.

## 2026-07-05 14:48 AEST

- Implemented Stage 5I runtime Postgres adapter for development / preview verification.
- Added server-only Postgres runtime mode, lazy Neon Pool creation, row mappers, and a `DurableRepositoryPort` implementation for people, vocabulary, imports, review settings, review queue, review events, and review states.
- Added `/api/storage/health` as a read-only storage health route and `/api/storage/smoke` as an opt-in write smoke route that is disabled by default.
- Added runtime mode and mapper tests.
- Kept browser `localStorage` as the user-facing runtime and kept Production Postgres runtime, backup import, and storage cutover out of scope.
- Reason: prove the database adapter boundary before any user-facing storage switch or Production work.

## 2026-07-05 14:26 AEST

- Updated Stage 5G deployment facts after Vercel Git integration created a clean Preview deployment from committed `origin/V1`.
- Documented Preview deployment `dpl_EmhfvP8yE9NrxCWPcdK3Qdd8sdk8` at `https://words-learning-app-for-mimi-aczic0spy-anorias-projects.vercel.app`.
- Added Stage 5H runtime Postgres adapter design.
- Recorded that the future runtime Postgres adapter should stay server-only, development / preview first, and disabled for Production until a separate formal gate.
- Reason: prepare the next persistence implementation safely without changing the current `localStorage` runtime or exposing public Production write paths.

## 2026-07-05 14:00 AEST

- Documented Stage 5G preview deployment boundary after confirming the current active Production deployment should remain but not be treated as formal V1 production.
- Verified Vercel project Git link production branch as `main` through read-only Vercel API output.
- Documented active Production deployment `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD` from branch `V1` as a non-official artifact.
- Created Preview deployment `dpl_d5LUb6r1wEXiJBUENb2PACEZMVsu` using standard `vercel deploy` without `--prod`.
- Verified the Preview deployment with `vercel inspect`, Vercel API OIDC claims, route-level `vercel curl` checks, and preview error-log query.
- Reason: remove deployment-state ambiguity while preserving the user's boundary that formal Production should wait until V1 is complete and merged.

## 2026-07-05 12:56 AEST

- Executed Stage 5F development / preview Vercel and Neon bootstrap after explicit user approval.
- Created and linked the Vercel project for this repository and connected it to the user's GitHub repository through the existing Vercel/GitHub account setup.
- Created the Neon resource through Vercel Marketplace for Development and Preview only, after the user accepted Marketplace terms in the browser.
- Pulled Vercel/Neon generated env vars into ignored `.env.local` without printing or committing secret values.
- Installed minimal database tooling with `@neondatabase/serverless` and `dotenv-cli`, with no ORM.
- Added guarded development database scripts and `.env.example` placeholders.
- Applied `db/migrations/0001_initial.sql` to the non-production development database and verified an empty schema with 8 tables, 11 indexes, and 5 key constraints.
- Ran local browser smoke checks for person/settings, add, import, library edit/archive, review, export buttons, and console errors.
- Attempted a preview deployment with `--target preview`; Vercel CLI returned `target: production`, so the unexpected deployment was removed immediately and follow-up inspection reported no deployments.
- Reason: complete the approved remote dry run for the accepted Neon Postgres direction while keeping active production deployment, production migration, backup import, authentication, runtime Postgres persistence, and production study-data mutation out of scope.

## 2026-07-05 01:29 AEST

- Documented Stage 5E Neon execution gate before any real remote storage work.
- Added the approval checklist for Vercel project scope, Neon project path, env handling, package installation, migration execution, backup import, and deployment scope.
- Documented future execution order for Tier 3 gate, fresh JSON backup, Vercel/Neon setup, env sync, migration dry run, backup import trial, adapter trial, and production promotion.
- Documented stop conditions and rollback direction for remote migration and import work.
- Reason: prepare the next real Neon Postgres step without touching credentials, env files, remote databases, migrations, deployment, or production data.

## 2026-07-05 01:12 AEST

- Implemented Stage 5D durable storage readiness without creating or connecting to a remote database.
- Added a local SQL migration draft for future Neon Postgres with `people`, person-scoped learning tables, review settings, backup imports, and backup import id mappings.
- Added database constraints and indexes for `person_id` separation, review-state uniqueness, vocabulary lookup, review queues, and backup import traceability.
- Added a local backup-to-Postgres mapping document for schema version 3 JSON backups, including source string id to target UUID mapping.
- Added a repository adapter contract requiring explicit person context for future learning-data operations.
- Added SQL static tests that check table coverage, `person_id`, person-scoped foreign keys, review uniqueness, indexes, and absence of credential/package coupling.
- Reason: prepare the database and adapter boundary for the accepted Neon Postgres path while keeping credentials, remote migrations, deployment, authentication, and remote data mutation out of scope.

## 2026-07-05 00:54 AEST

- Implemented Stage 5C local person adapter on top of browser `localStorage` schema version 3.
- Added local `people`, `selectedPersonId`, `personId` on learning records, and per-person review settings.
- Scoped local add, import duplicate detection, library filters, review queues, review events, and review settings to the selected person.
- Added a minimal `/settings` person switch and add-person control for the trusted private group model.
- Updated JSON backup to export schema version 3, include people counts, and still restore schema version 2 backups through migration.
- Updated vocabulary CSV export to include person id and display name.
- Added tests for schema migration, per-person settings, person-scoped review queues, person-scoped review recording, JSON backup compatibility, and CSV person fields.
- Reason: prepare the codebase for the accepted one-Neon-Postgres / many-people durable model without creating remote infrastructure or adding authentication.

## 2026-07-05 00:41 AEST

- Documented Stage 5B storage provider decision and multi-person data model.
- Accepted one Neon Postgres database as the intended durable storage direction for the private group.
- Added `people` / `person_id` design requirement so each learner's vocabulary, imports, review states, review events, settings, and backup imports stay separated.
- Clarified that future person switching does not require password or credential isolation in the current private-project scope.
- Documented that person switching is convenience data separation, not security isolation.
- Reason: align durable persistence planning with the user's clarification that the app will be used by multiple trusted people, not only one person.

## 2026-07-05 00:23 AEST

- Implemented Stage 5A local export and backup on top of browser `localStorage` schema version 2.
- Added complete JSON backup generation with app metadata, schema version, exported time, timezone, and record counts.
- Added vocabulary CSV export with explicit headers and escaping for commas, quotes, and newlines.
- Added `/export` restore preview for JSON backup files, with validation before writing to local browser storage.
- Added backup validation for malformed JSON, unsupported backup format, missing required fields, metadata counts, and review records referencing missing vocabulary items.
- Added unit tests for JSON backup creation, round trip restore shape, invalid backup rejection, broken review-reference rejection, and CSV escaping.
- Reason: reduce local data-loss risk before durable database provider selection, deployment, authentication, cloud sync, embedding, FSRS, or external integrations.

## 2026-07-04 23:42 AEST

- Implemented Stage 4 local review scheduler and flashcards on top of browser `localStorage` schema version 2.
- Added additive migration from schema version 1 to version 2 with `reviewStates`, `reviewEvents`, and `settings`.
- Added deterministic local review scheduling, due-first queue selection, four-rating review recording, and review event/state updates.
- Added `/settings` support for custom `sessionLimit`, and made `/review` obey the saved limit.
- Documented that fixed Stage 4 scheduler rules are only an MVP bootstrap and that later stages should evaluate embedding（向量嵌入）and FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）before replacing the scheduler.
- Added tests for migration, settings normalization, scheduler behavior, review queue selection, and review event/state updates.
- Reason: complete the agreed local review loop while keeping database, deployment, credentials, external APIs, embedding generation, FSRS implementation, analytics, and destructive data operations out of scope.

## 2026-07-04 01:14 AEST

- Implemented Stage 3 local vocabulary CRUD and text import using browser `localStorage` under `mimi-pte-vocabulary-v1`.
- Added vocabulary domain types, normalization, conservative `.txt` / pasted text import parsing, duplicate/invalid candidate handling, and local repository operations.
- Enabled manual add, library search/edit/archive/restore, import preview/save, and a local-data-backed review scaffold.
- Added `Vitest` with unit tests for normalization, parser, duplicate handling, repository mutations, timestamps, archive/restore, and import batch commits.
- Updated architecture, README, AGENTS, master plan, and Stage 3 plan to reflect the new local data flow and validation commands.
- Reason: complete the agreed Stage 3 local feature layer while keeping production database, deployment, credentials, external APIs, analytics, and destructive data operations out of scope.

## 2026-07-04 00:27 AEST

- Added the `human-ai-governance v0.2.0` marker to `AGENTS.md`.
- Added a lightweight Tier 1 `governance/preflight.py` scaffold and an npm `governance:preflight` command.
- Updated validation documentation to include the local governance preflight without introducing Tier 2 or Tier 3 requirements.
- Reason: migrate the existing project governance to the updated skill marker and preflight scaffold while keeping this local app scaffold appropriately lightweight.

## 2026-07-03 19:23 AEST

- Fixed the residual `npm audit` moderate findings by adding a root npm `overrides` entry that resolves `postcss` to 8.5.16 across the dependency tree.
- Confirmed `next@latest` is still 16.2.10 and still declares `postcss: 8.4.31`; avoided switching to canary Next.js and avoided npm's unsafe downgrade path.
- Validation now reports 0 vulnerabilities and the app still passes lint, typecheck, and production build.
- Reason: remove the known PostCSS security finding while staying on the stable Next.js release line.

## 2026-07-03 02:12 AEST

- Added Stage 2 app scaffold with Next.js App Router, TypeScript, Tailwind CSS, ESLint, npm, and minimal routes for home, add, import, review, library, export, and settings.
- Added the Stage 2 child plan and updated validation commands from file inventory to `npm run lint`, `npm run typecheck`, `npm run build`, and local dev-server smoke testing.
- Kept UI intentionally minimal so final visual design can be handled in a later dedicated stage.
- Recorded residual `npm audit` moderate findings through `next -> postcss`; no force downgrade was applied.
- Reason: create a runnable local application shell while preserving the agreed Stage 1 product boundaries and governance rules.

## 2026-07-03 01:48 AEST

- Updated the Stage 1 product plan so added time defaults to automatic recording while preserving a “modify added time” option for backfilled words.
- Clarified that timezone defaults to automatic device timezone capture and that actual write/update timestamps should remain system-maintained.
- Reason: reduce daily-entry friction while preserving a safe path for importing or manually adding older vocabulary.

## 2026-07-03 01:15 AEST

- Added Stage 1 product MVP design plan for manual entry, `.txt` batch import, import preview, and four fixed review ratings.
- Updated architecture and master plan to remove initial proficiency assumptions and defer `.docx` and PDF import to later stages.
- Reason: align the first-generation design with the updated user requirement before application scaffolding.

## 2026-07-03 00:16 AEST

- Removed accidental local `.Rhistory` file before Git bootstrap.
- Initialized the project for local Git and GitHub connection.
- Reason: keep the repository clean before the first commit and connect local governance artifacts to the user-provided GitHub repository.

## 2026-07-02 23:30 AEST

- Added initial Human-AI governance structure for the project.
- Added collaboration rules, architecture map, master plan, changelog, and AI agent log.
- Recorded that the project starts as Tier 1 durable small app governance, with Tier 3 gates required before credentials, production deployment, remote database mutation, or persistent user-data risk.
- Reason: establish a safe, resumable collaboration baseline before scaffolding the web app.
