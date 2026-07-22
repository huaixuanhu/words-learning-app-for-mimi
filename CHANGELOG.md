# CHANGELOG

## 2026-07-22 22:41 AEST

- Closed PF-002 and PF-003 as `Normal / Closed by explicit acceptance` after the user explicitly accepted both exact protected Preview candidates. The record preserves machine evidence and does not claim a new typography-comfort or Active completion-sound human retest; iPhone + Safari remains untested.
- Completed the separately approved V2-8-3 Gate 2 remote read-only inventory. Vercel Production remains V1 on commit `6837d8c7c3b8c974afd7f86b9dd6fb9219b19b10` in `IAD1`; the latest clean `V2` Preview is Ready. Production has only the V1 Basic Auth/storage/database variable names and no V2 cutover, AI or TTS variables.
- Confirmed Neon `main` is the non-empty Schema 5 Production root in Sydney with 1 person, 1,486 vocabulary items, 125 review states and 203 review events. Expected structure and six orphan/reference checks pass, no assigned in-flight transaction was observed, and the current Free-plan restore history is only six hours. The retained Staging Schema 5 recovery branch remains no-compute and expires at `2026-08-17T12:00:00Z`.
- Refreshed Gemini/TTS metadata and official facts without provider calls. Gemini 3.1 Flash-Lite project limits are 4,000 RPM / 4M TPM / 150K RPD; GenerateContent logging is off while unused Interactions logging is on. TTS Preview WIF and its keyless service account remain enabled; Production has no independent AI/TTS identity yet.
- Recorded a credential safety boundary: the older V2-7B-2 proof key remains available and its value was accidentally displayed briefly by the signed-in console during read-only inspection. It was not copied, used, written or committed. Production will not reuse it; reference confirmation and rotation/revocation require a later explicit credential-mutation approval.
- Pinned only the independently verified Production Neon project SHA-256 in source, kept the raw project id out of the repository, updated focused fail-before-request coverage, and repaired all current V2-8-3 migration wording to `0003 -> 0004 -> 0005` in one outer transaction.
- Validation: focused V2-8-3 tests pass 3 files / 59 tests; full Vitest passes 91 files / 554 tests with the existing Postgres integration file/test skipped; lint, typecheck, all three backup dry-runs, cutover manifest template, Production build, Tier 3 governance preflight and `git diff --check` pass.
- Safety: no secret value was intentionally captured, no `v2:8-3:db:*` command ran, and no backup, branch, environment, credential, provider, migration, Production data or deployment mutation occurred. Gate 2 ends at Approval Stop 2; Gate 3 remains unapproved.
- Reason: bind the real Production target and platform constraints before selecting a recoverable backup path, while keeping every mutation behind a new human decision.

## 2026-07-22 21:32 AEST

- Advanced PF-003 from `Normal / Fixed locally` to `Normal / Preview-ready`. Vercel Git Integration had already deployed clean exact branch `V2` commit `acd009cc3879275dffa1d22c470b6c82fd1f8263` as protected Preview deployment `dpl_BAYB3tDx1m4ybKFRtw9rdf32jZon`, so no duplicate deployment was created.
- Confirmed `Preview / Ready`, a 42-second build, branch alias `https://words-learning-app-for-mimi-git-v2-anorias-projects.vercel.app`, unique URL `https://words-learning-app-for-mimi-1iozhbda7-anorias-projects.vercel.app`, and application Functions in `SYD1`.
- Confirmed protection through an unauthenticated HTTP 302 redirect to Vercel Authentication. Loaded the signed-in Preview application shell in Chrome and confirmed the expected V2 navigation with zero browser console error. This machine check does not claim that an Active session was completed or that the sound was heard; user/Mimi human retest remains required.
- Synchronized the PF-003 register, V2 Master/cutover handoff, Architecture, README, AGENTS and governance record. Production V1/Schema 5, Neon `main`, database state, credentials, environment values, AI/TTS configuration and V2-8-3 Gate 2 remain unchanged.
- Reason: make the exact Active completion-feedback fix available for protected Preview listening without widening Production authority.

## 2026-07-22 21:11 AEST

- Registered protected Preview finding PF-003 as `Normal` after the user confirmed that Active New Learning and Review reached their completion state without the completion sound already available in Recognition.
- Confirmed the cause in source: Recognition opened a completion dialog after the final accepted queue result and played the local Mimi sound from its `Done` gesture; the shared Active component only rendered its inline completed state and never read the existing sound preference or called the completion player.
- Added the same bounded completion-dialog contract to Active across New Learning/Review and Say it/Spell it/Dictation. `Done` skips the global soft click, closes the dialog and plays `mimi-review-complete.m4a` only when the existing `Review complete` preference is enabled. Session/mode initialization and rollback clear the dialog.
- Added focused Active regression coverage. Focused validation passes 1 file / 4 tests; full Vitest passes 91 files / 554 tests with the existing Postgres integration file/test skipped; lint, TypeScript, three backup dry-runs and Production build pass.
- Marked PF-003 `Normal / Fixed locally`. Commit, protected Preview and human sound retest remain pending; PF-002 remains independently `Normal / Preview-ready`.
- Safety: no completion criterion, queue, FSRS, Daily Episode, event/state, persistent data, Schema, backup, API, TTS, sound asset, Motion, credential, environment, database, deployment, Production or SSO change occurred.
- Reason: restore consistent and browser-reliable completion feedback for both vocabulary Tracks without changing learning behavior.

## 2026-07-22 20:47 AEST

- Advanced the Geist rollback candidate from `Normal / Fixed locally` to `Normal / Preview-ready`. Vercel Git Integration had already deployed exact branch `V2` commit `54c8ca4492ff9b13d095ea0bd0d3d7ca702c3c2f` as protected Preview deployment `dpl_EmRVmp5YDTKgnh1VEtVBozwhRp6J`, so no duplicate deployment was created.
- Confirmed `Preview / Ready`, a 39-second build and application Functions in `SYD1`. The exact deployment URL is `https://words-learning-app-for-mimi-l1ih7plu2-anorias-projects.vercel.app`; the branch Preview alias is `https://words-learning-app-for-mimi-git-v2-anorias-projects.vercel.app`.
- Verified protection through an unauthenticated redirect to Vercel login. A signed-in MacBook + Chrome check loaded the existing Preview data; `Today` and `Today’s plan` computed to Geist weight `600` with normal letter spacing, the HTML font variables contained no Instrument Serif reference, the desktop viewport had no horizontal overflow, and the browser console reported zero warning/error.
- Kept the claim bounded: this tranche did not repeat a remote 390 px test and does not count as user/Mimi comfort acceptance. PF-002 remains open for human retest; iPhone + Safari remains untested.
- Synchronized the PF-002 child/register, V2 Master/cutover handoff, Architecture, README, AGENTS and governance record. Production V1/Schema 5, Neon `main`, credentials, environment values, database state, AI/TTS configuration, learning data, Motion and SSO boundaries remain unchanged; Gate 2 stays paused and separately approval-gated.
- Reason: make the user-approved Geist rollback available for real protected-Preview testing while preserving exact deployment evidence and the Production stop boundary.

## 2026-07-22 15:38 AEST

- Moved PF-002 from `Normal / Preview-ready` back to `Normal / Fixed locally` after the user found Instrument Serif uncomfortable during real protected Preview use. The historical deployment and machine checks remain evidence for that superseded candidate.
- Removed Instrument Serif from the Next.js font load and HTML font variables. English display titles now use the existing Geist semibold system; large vocabulary text restores its pre-PF-002 Georgia fallback.
- Kept all other PF-002 work unchanged: Review/New Learning navigation, two-goal hierarchy, session labels, `Save today’s goals`, desktop panel equality, responsive layout and accepted Motion/reduced-motion behavior.
- Updated the focused PF-002 font contract; 1 test file / 3 tests, ESLint, TypeScript, Production build, Tier 3 governance preflight and `git diff --check` pass. A fresh exact protected Preview and human retest remain required before PF-002 can close.
- Safety: no component structure, learning behavior, FSRS, Daily Episode, persistent data, Schema, backup, API, TTS, AI, credential, environment, database, deployment, Production, GitHub or SSO action changed.
- Reason: restore the more comfortable pre-experiment type system while preserving the already accepted interaction and information-hierarchy improvements.

## 2026-07-22 15:01 AEST

- Advanced PF-002 from `Normal / Fixed locally` to `Normal / Preview-ready` after Git Integration automatically deployed exact commit `52942b412d0a2281c4dded2f5b9bd716d7fd0131` as protected Preview deployment `dpl_DxQWHVspQuukaeR6LTCjKp15a3zp`; no duplicate deployment was created.
- Confirmed Vercel `Preview / Ready`, branch `V2`, 41-second build, application Functions in `SYD1`, and active Deployment Protection through an unauthenticated redirect to Vercel login.
- Repeated acceptance on the exact Preview: 1280 px Home had no overflow, both top panels measured `488.32 px` at the same top coordinate, display titles computed to Instrument Serif and controls did not; 390 px Home/Study/Recognition/Active had no horizontal overflow and showed the accepted `Learn`, Review/New Learning, goal and session-label hierarchy.
- Browser console reported no warning/error. Deployment-filtered Vercel logs reported `Warning 0`, `Error 0`, `Fatal 0`; inspected routes returned expected `200`, `204` or `304` results.
- Synchronized the PF-002 child/register, V2 Master/cutover handoff, Architecture, README, AGENTS and governance record; `git diff --check` and Tier 3 governance preflight pass.
- Kept PF-002 open for user/Mimi human retest. V2-8-3 Gate 2, Production V1/Schema 5, Neon `main`, credentials, environments, AI/TTS providers, learning algorithms, Motion and SSO boundaries remain unchanged.
- Reason: establish exact protected Preview evidence for the agreed UI refinement without turning machine verification into an unsupported human acceptance claim.

## 2026-07-22 13:53 AEST

- Registered PF-002 as `Normal / Fixed locally` and reopened V2-8-2.3 after protected Preview feedback showed that Review/New Words navigation, goal hierarchy and session labels required clearer learner-facing structure.
- Changed desktop navigation to `Review / New Learning`, mobile navigation to `Learn`, and added persistent accessible `Review / New Learning` tabs to Recognition and Active while preserving Active practice-mode selection.
- Reworked Home and Study so `Review goal` and `New learning goal` are the two primary goal surfaces, with `Suggested review` and `Added today` as lighter supporting values. Session summaries now use `Daily goal`, zone-specific daily completion and `Ready now`; `Save today` now reads `Save today’s goals`.
- Matched the desktop `Library at a glance` panel to the Today plan panel height and kept natural mobile stacking. Added Instrument Serif through `next/font` only for semantic English display titles and large vocabulary text; Geist remains on navigation, buttons, labels, numbers, inputs and body, and current Motion/reduced-motion behavior is unchanged.
- Added focused UI contracts and local 1280/390 px browser acceptance. Full validation passes 91 files / 553 tests with the existing Postgres integration file/test skipped, lint, typecheck, three backup dry-runs, Production build and diff checks.
- Corrected the historical PF-001 evidence note: Mimi independently confirmed the audio had no problem, although her device/browser was not recorded; iPhone + Safari remains untested.
- Safety: no FSRS, Daily Episode, Schema, backup shape, API, TTS, AI, credential, environment, database, Preview/Production deployment, Production data or SSO state changed. Gate 2 is paused until PF-002 closes or is explicitly accepted, and would still require fresh approval.
- Reason: make the two learning zones and daily goals immediately understandable while adding the requested Tradermath-like title character without reducing information-reading speed.

## 2026-07-22 00:27 AEST

- Closed PF-001 as `High / Closed` after the user completed protected Preview playback on MacBook + Chrome across Settings Preview, Recognition vocabulary, Active vocabulary and example-word audio. The user confirmed the original problem was resolved and described the audio as “非常理想”.
- Marked V2-8-2.3 complete because PF-001 was its only registered finding and no `Blocker`, `High`, `Normal` or `Cosmetic` item remains open.
- Recorded evidence limits without widening the claim: Mimi did not provide an independent retest, and iPhone + Safari is a planned occasional-use environment that has not been directly accepted. A later device-specific issue will receive a new PF record.
- Made V2-8-3 Gate 2 the next candidate stage. This documentation closeout does not approve remote inventory, Production credentials, database migration, provider activation, deployment or writes.
- Validation: targeted status/register consistency search, `git diff --check` and Tier 3 governance preflight pass. Runtime tests and build were not rerun because this tranche changes documentation only.
- Reason: preserve the user's final audio-quality decision while keeping untested devices and Production authority explicit.

## 2026-07-21 23:55 AEST

- Completed the approved PF-001 Gate E infrastructure, migration, exact protected Preview deployment and machine-route proof. Deployment `dpl_9kJb31QgP7tj3RnfYL2oubprUzNA` runs exact code commit `deab32f3ab96025116597881b7b69c9dde84b8f4` on branch `V2` in `syd1`.
- Verified Kill Switch closed behavior before opening only the `Preview + V2` TTS route. Settings Preview, Recognition Listen, example-word Listen and Active Dictation Play word then returned playable Cloud audio; a repeated Settings playback added no provider attempt.
- Corrected the keyless federation exchange by keeping the Vercel OIDC subject-token audience as the HTTPS provider URL and using Google's `//iam.googleapis.com/...` full resource name only for the STS audience. Exact issuer, team, project, environment, subject and Git-ref restrictions remain unchanged.
- Recorded all Gate E provider work: 7 attempts, 170 characters and `US$0.000680` list-price equivalent. Three safe diagnostic failures consumed 111 characters / `US$0.000444`; four successful route calls consumed 59 characters / `US$0.000236`; active provider concurrency returned to zero.
- Final local closeout passes 90 test files / 550 tests with the existing Postgres integration file/test skipped, lint, typecheck, three backup dry-runs, Production build, dependency audit with 0 vulnerabilities, governance preflight and diff checks.
- PF-001 remains `High / Preview-ready` until the user or Mimi completes real-device Preview listening. Production V1, Neon `main`, Production variables/deployments, V2-8-3 Gate 2, learning data and SSO remain unchanged.
- Reason: preserve exact Preview evidence and leave subjective audio/learning acceptance to the intended users before any Production work.

## 2026-07-21 23:05 AEST

- Began the separately approved PF-001 Gate E for protected `V2` Preview only. Added a Preview runtime contract that requires HTTPS, Vercel Preview, Git ref `V2`, `postgres-preview`, Schema/accounting confirmations, exact project identity and short-lived Vercel OIDC through Google Workload Identity Federation.
- Created the dedicated keyless Google Cloud identity boundary in `for-tts-502913`: service account `mimi-tts-preview`, pool `mimi-vercel-preview` and provider `mimi-v2-preview`. The provider condition binds the exact Vercel team id, project id and `preview` environment; the exact Preview subject alone has `roles/iam.workloadIdentityUser`, and the service account has only `roles/serviceusage.serviceUsageConsumer`.
- Added 12 Sensitive Vercel variables scoped to `Preview + V2`, with `MIMI_TTS_KILL_SWITCH=on` for the first deployment. No Production variable, credential, deployment or Neon `main` state changed.
- Migrated long-lived non-Production `staging` only after exact branch/endpoint/database/role/recovery checks. `0004_v2_bilingual_examples.sql` and `0005_v2_standard_tts_accounting.sql` were applied in one transaction; core counts were unchanged, and post-inspection reports Schema 6, 14 required tables, 12 required constraints and zero invalid or in-flight AI/TTS state.
- Fixed a migration-runner defect exposed before SQL execution: versioned migrations may contain pure comments outside their `BEGIN/COMMIT` wrapper. A shared tested parser now accepts those comments while rejecting executable SQL outside the exact transaction, and is used by both Preview and dormant Production tooling.
- Local validation at that checkpoint passed lint, typecheck, focused WIF/route/accounting and migration-wrapper tests, 547 full-suite tests with the existing Postgres integration file/test skipped, three backup dry-runs, Production build and diff checks. Later Gate E evidence above supersedes the then-pending deployment and Kill Switch work.
- Reason: prepare a keyless, bounded Standard-C Preview deployment after database readiness without crossing into Production or declaring the user-facing issue closed early.

## 2026-07-21 19:03 AEST

- Validated the local Standard-C listening export against the versioned 50-entry corpus and Voice Contract. The export records 48 ratings: 46 `Good`, 2 `Review`, 0 `Bad`; `interdisciplinary` and `photosynthesis` are the two Review entries.
- Recorded the user's overall acceptance: a few words have less obvious stress, but the limitation is minor and `en-AU-Standard-C` can be used for V2. `whereas` and `adapt. adopt.` have no exported rating and remain an explicit accepted evidence limitation; the record does not claim 50/50 completion.
- Advanced PF-001 from `High / Fixed locally` to `High / Preview-ready`. Gate D local human acceptance is complete; protected Preview identity, `0004`/`0005` migration, exact deployment and real-device retest remain separately approved Gate E work. Production and V2-8-3 Gate 2 remain unchanged and paused.
- Kept the raw human export outside the repository and recorded only its contract, summary, limitations and SHA-256 `e1b7a7e1de1978c2815070f1fea9b11b59203ba44684d2eca241d423be851e08`.
- Reason: adopt the voice that passed practical listening while preserving the exact evidence gaps and remote release boundary.

## 2026-07-21 18:43 AEST

- Added a versioned 50-entry Standard-C human listening corpus with the accepted `20 common/PTE + 10 long/uncommon + 10 phrases/collocations + 5 sound/confusable pairs + 5 short sentences` composition.
- Added a confirmation-gated loopback runner that exercises the real `/api/tts` route with concurrency 2, verifies the fixed provider/voice/content contract, writes MP3 only to a timestamped `/tmp` folder, and requires five subsequent server Cache hits.
- Generated all 50 MP3 files successfully: 858 characters, 50 provider attempts, list-price equivalent `US$0.003432`, latency min/average/max `250 / 630 / 4,751 ms`. Five replay probes were Cache hits at 2–4 ms.
- Added a local mobile-friendly rating page with per-sample `Good / Review / Bad`, optional notes, browser-local progress and JSON export. The page and unfinished ratings are not learner data and do not enter Git, Postgres or backup.
- Focused corpus/TTS tests, full suite 89 files / 538 tests, all three backup dry-runs, typecheck, lint, Production build, audio/file count, corpus shape, Cache results and credential scan pass. Human ratings remain required before PF-001 can advance beyond `Fixed locally`.
- Reason: turn the chosen C voice into a reproducible, category-balanced human acceptance check without adding test controls to the learner UI or widening the remote deployment gate.

## 2026-07-21 17:53 AEST

- Implemented the local PF-001 Google Cloud Standard TTS candidate across Recognition, Active revealed answers / Dictation, selected example words and Settings preview. Cloud is the client default; browser SpeechSynthesis is available only when the learner explicitly chooses `Use device voice`. Playback never writes review or scheduling state.
- Pinned the human-selected Voice Contract `google-en-au-standard-c-v1`: `en-AU-Standard-C`, `en-AU`, speaking rate `0.9`, pitch `0`, MP3. Client requests cannot select a voice, provider, encoding or SSML.
- Added strict same-origin `/api/tts`, normalized English-only input, local fixture and Google adapters, 8-second provider timeout, 512 KiB response ceiling, cache-before-accounting, equal-miss coalescing, page-memory replay, visible retry/error states and stale-playback cancellation. Corrected Host/origin handling so `127.0.0.1` is not rejected when Next internally represents the request as `localhost`.
- Added independent TTS accounting with 2,000 attempts/day, 100,000 characters/day, 1,000,000 characters/month, list-price-equivalent `US$0.50/day` / `US$4/month`, concurrency 4 and no per-person limit. Added operational-only `0005_v2_standard_tts_accounting.sql`, pinned SHA-256 `ce0890a59dcf262c38894f865cb249339e95727764c6a98a58b43eba2a4c5367`, and synchronized `0003 -> 0004 -> 0005` readiness/migration guards.
- User-approved Gate C used dedicated project `for-tts-502913` and local user ADC without a service-account JSON key. Four current `en-AU Standard` candidates plus two route calls used 6 provider attempts / 340 characters / list-price equivalent `US$0.00136`; a subsequent identical route request was a Cache hit. The exact C route returned a valid 24 kHz mono, 64 kbps MP3.
- Added `@vercel/functions` for the future environment-isolated Runtime Cache adapter and `google-auth-library` for short-lived local ADC. Protected Preview still requires separately approved WIF identity, `0004` / `0005` migration and exact deployment; Production remains unchanged.
- Validation passes: 10 focused files / 35 tests; 88 full-suite files / 536 tests with the existing Postgres integration file/test skipped; lint; typecheck; all three backup dry-runs; Production build; script syntax; cutover manifest template; production dependency audit with 0 vulnerabilities; governance preflight; secret/diff checks.
- Reason: use the exact voice the user preferred while keeping paid playback bounded, cached, reversible and separate from learning evidence.

## 2026-07-21 16:15 AEST

- Registered `PF-001` as a `High / Planned` V2-8-2.3 finding after real-device listening confirmed that the current browser SpeechSynthesis voices are not acceptable across Recognition, Active revealed answers, Active Dictation, example-word playback and Settings preview.
- Added the derived documentation-first `V2-8-2.3-1 Google Cloud Standard TTS` plan. The user selected Google Cloud Text-to-Speech Standard after auditioning it; exact voice name remains deliberately unfrozen until a current `voices:list` result and user/Mimi listening select the allowlist.
- Defined one shared Cloud playback route, minimal English-only outbound text, explicit device fallback, no study-state write, server-only adapter, Runtime Cache, request coalescing, atomic TTS accounting, timeout and Kill Switch behavior. Preferred future authentication is short-lived Vercel OIDC through Google Workload Identity Federation, without a long-lived service-account JSON key.
- Accepted a relaxed global TTS boundary of 2,000 provider attempts/day, 100,000 characters/day, 1,000,000 characters/month, list-price-equivalent `US$0.50/day` / `US$4/month`, concurrency 4 and no per-person limit. Cache hits do not consume provider attempts; limits use full public list price rather than relying on the current free tier.
- Reserved `0005_v2_standard_tts_accounting.sql` as a future additive Schema 6 implementation migration. It does not exist yet, so no digest was invented; implementation must synchronize its exact SHA-256 and migration order into V2-8-3 before Gate 2.
- Synchronized the V2-8-2.2 trigger, V2-8-2.3 register, Master, Architecture, README, AGENTS and V2-8-3 cutover boundary. The current application still uses browser speech; no code, schema, backup shape, API/Billing, identity, credential, external call, database, deployment or Production state changed.
- Documentation consistency, diff and Tier 3 governance checks form this tranche's closeout. Runtime tests/build are intentionally out of scope because no runtime file changed.
- Reason: replace inconsistent device-dependent audio with a user-approved, low-cost Standard voice route while keeping normal learning fluid and paid-service activation separately controlled.

## 2026-07-20 22:57 AEST

- Added the documentation-only `V2-8-2.3 Preview Feedback Stabilisation` stage before Production cutover. It is the canonical register for user/Mimi findings discovered through protected Preview and uses sequential `PF` identifiers, evidence-backed reproduction, priority/status rules, bounded fixes, exact-commit Preview retest and explicit human closure.
- Defined the release threshold: all `Blocker` and `High` items must close, the current candidate and required migrations must run together on protected Preview, and representative user/Mimi learning flows must be retested or carry an explicit evidence limitation.
- Paused V2-8-3 Gate 2 until V2-8-2.3 is marked complete. Completion will make Gate 2 eligible for a new approval; it will not authorize remote inventory, migration, deployment, credentials, paid provider calls or Production work by itself.
- Reconfirmed across the V2 Master, cutover plan, Architecture, README, AGENTS and Version-hold record that the entire V2 release excludes SSO, OAuth and confidential per-person authorization. Preview feedback cannot reactivate those capabilities inside V2.
- No application code, schema, backup shape, environment value, credential, database, deployment, provider or Production state changed.
- Documentation consistency search, `git diff --check` and Tier 3 governance preflight passed. Runtime tests and build were intentionally not rerun because this tranche changes documentation only.
- Reason: create one controlled pre-launch correction loop for real Preview experience findings while preserving the existing release and safety gates.

## 2026-07-20 00:22 AEST

- Completed the local-only V2-8-2.2 interaction/audio/example slice. Recognition and Active now share one guarded 2×2 keyboard selector: the first valid Arrow chooses the first rating, subsequent arrows move without wrapping, Enter confirms, Space flips, and real text entry/dialog/IME contexts retain priority. Existing rating colors, Motion and reduced-motion behavior were not changed.
- Added a Settings English voice selector over browser SpeechSynthesis. `Best available` ranks only voices actually reported by the device; the learner can preview and save a browser-local choice, and every word/dictation/example-word playback uses the same safe fallback. No Cloud TTS, network audio, microphone, AI speech scoring or study-state write was added.
- Added aligned `exampleTranslationsZh` across single add, Batch import, Library edit/search/filter, Review, context-word addition, AI enrichment, local/Postgres repositories and CSV. Every newly written English example requires a non-empty Chinese translation; legacy gaps remain visible through `Needs translation` and are never labelled complete.
- Upgraded new JSON backups to Version 4 while continuing to read Versions 1–3. Added forward-only `0004_v2_bilingual_examples.sql` with JSON-array/equal-length constraints; kept `0003` unchanged and pinned both migration hashes in V2-8-3 database and cutover-manifest contracts.
- Upgraded AI enrichment to prompt/output V3 with editable Chinese translations for source examples, generated examples and confusable example pairs. Existing accepted drafts remain readable. Accept writes a reviewed source translation; rejection/failure does not overwrite English examples, and this local tranche made no Gemini call.
- Synchronized the V2-8-2.2 child plan, Master Plan, V2-8-3 cutover sequence, Architecture, README, AGENTS, backup mapping and governance record. Long-lived `staging`, protected Preview and Production were not changed; `0004` remains unexecuted remotely.
- Validation passed 11 focused files / 104 tests, then the full suite at 80 files / 506 tests with the existing Postgres integration file/test skipped. ESLint, TypeScript, all three backup dry-runs, V2-8-3 manifest template, Production build, script syntax and HTTP 200 checks for Home/Settings/Review passed. The optional `agent-browser` CLI was unavailable, so no automated browser screenshot or claim about subjective voice quality is made.
- Reason: close the three Preview findings without changing learning scheduling, preserve honest legacy-data gaps, and keep Cloud TTS as a separate evidence-driven upgrade if real-device browser voices are still unsatisfactory.

## 2026-07-19 21:18 AEST

- Completed the separately approved V2-8-3 Gate 0B protected Preview verification against exact commit `2e6145386d018968f61a1bee1b6f897feebff627`. Git Integration had already produced READY Preview deployment `dpl_3DeE8BrKcZ9cBdCkPA4jE1UTeHXf` from source ref `V2`; the dirty Gate 1 working tree was not deployed, the fixed historical Preview alias was not changed, and no Production deployment was created.
- Confirmed Vercel Authentication and `SYD1` placement for all observed application/API Functions. Anonymous access redirected to Vercel sign-in; observed Vercel Warning/Error/Fatal and browser warning/error counts were all zero.
- Ten warm Home → Library runs measured navigation median/p95 `44.5/53ms` and data-ready median/p95 `52/62ms`. Warm transitions added zero full-data GET; first Active queue opening added exactly one `/api/study` `POST 200`; rating and rollback added no workspace refresh.
- Passed a bounded Recognition/Active learning smoke: Space/Arrow/Enter rating, `回退1词`, Listen, and all three Active modes remained available. The synthetic rating was rolled back. AI disclosure was inspected without creating a draft, and no AI generation route/provider attempt occurred.
- Reconfirmed through Neon Console that retained checkpoint `br-patient-mud-a7cnc81r` exists under `staging`, has no compute, and still expires at `2026-08-17T12:00:00Z`. No branch or expiry mutation occurred.
- The remote desktop layout had no overflow. Chrome's requested 390px override did not alter the actual CSS viewport, so this record deliberately relies on the same exact commit's prior local 390/1280px acceptance and does not claim a new remote-phone screenshot.
- Synchronized V2-8-2, V2-8-2.1, V2-8-3, master/architecture/readme/agents and governance records. Production V1, Neon `main`, credentials, aliases, environment values, Shareable Link, Gemini usage and accepted Motion/reduced-motion behavior remained unchanged. Gate 2 is the next separately approved step.
- Reason: verify that the committed V2 performance repair is genuinely fluid in the protected Sydney Preview while preserving exact-source, access, cost, recovery and Production stop boundaries.

## 2026-07-19 19:14 AEST

- Completed the documentation-first `V2-8-3` local Gate 1 protection tranche. Added the canonical Production backup/migration/cutover child plan with Gate 0–7, explicit stop points, paired application/database rollback, post-write reconciliation, AI rollout, stability and cleanup boundaries.
- Added exact Production `maintenance` / `schema6-readiness` / `live` modes. Missing or unknown mode fails closed after Basic Auth; `schema6-readiness` is read-only; only `live` accepts mutations carrying the code-owned `v2-schema6` client marker. Storage, Daily Study and formal AI senders now carry that marker.
- Added dormant non-empty Schema 5/6 inventory, clone/main migration, inspection and parity tooling. Before any Postgres connection it requires exact action/target/database/role evidence, authenticated live Neon endpoint/branch topology, a code-owned approved Production-project hash, a pinned `0003` SHA-256, UTC repeatable-read snapshots and non-empty learning data. The project hash intentionally remains unpinned in Gate 1, so real commands stay mechanically closed until Gate 2; `main` migration additionally requires backup/recovery/clone rehearsal, write-free, old-V1-runtime blocking evidence and zero in-flight writes.
- Added strict Schema 6 table/column/constraint/index/trigger checks, Recognition-only legacy-history and creation/default backfill checks, full core-row digests, and a secret-free cutover manifest with encrypted-backup/recovery evidence, paired V1/Schema 5 rollback and mandatory post-write reconciliation decisions. Exact learner-activity timestamps stay out of inventory output, and readiness/verified manifests reject a zero-row core inventory.
- Added independent Production AI scope `v2-8-3-production`. It requires HTTPS, Vercel Production `main`, `NODE_ENV=production`, `postgres-production`, Schema 6/accounting, exact Production confirmations, `live`, explicit Kill Switch state and either the initial four-attempt ceiling or a separately accepted steady-state marker. A blocked fifth attempt cannot call the provider.
- Independent read-only audits found and drove closure of the original self-attested target binding, activity-timestamp output, incomplete AI/reconciliation evidence, loose identity booleans, incomplete write chronology, unpinned Production project and zero-row readiness weaknesses. The final audit found no remaining P0/P1/P2.
- Focused validation passed 13 files / 138 tests. Full Vitest passed 77 files / 484 tests with the existing Postgres integration file/test skipped; lint, typecheck, all three backup dry-runs, the secret-free manifest template, Production build, Tier 3 governance and diff checks passed.
- No `npm run v2:8-3:db:*` command or successful remote-capable DB path was run; isolated child-process tests only proved fail-closed behavior without credentials. No remote account/database or `.env` value was inspected, no backup/credential/deployment/migration/Production write/Gemini call occurred, and V1 / Neon `main` remain live on Schema Version 5. Gate 0B and Gate 2 require fresh approval.
- Reason: make the later V2 Production cutover mechanically stoppable and evidence-backed before touching real learner data or external infrastructure.

## 2026-07-19 13:20 AEST

- Completed the documentation-first `V2-8-2.1` V2-only runtime performance stabilisation. V1 remains unchanged and was not rebuilt, backported or redeployed.
- Moved browser workspace ownership into one persistent root Provider, coalesced concurrent reads, retained the last accepted Postgres snapshot on transient/truncated reads, filtered cross-tab events, and removed the same-tab full-GET loop after writes.
- Serialized ordinary storage writes, applied rating/rollback deltas immediately, protected those deltas with an active-mutation patch journal, and made revalidation wait for a stable mutation queue. Only accepted snapshots may update the selected learner.
- Reused existing Daily Plans locally with a server-owned clock anchor; sleep/device-clock drift returns to the server. Delayed older-plan or old-learner responses are merged before visible Today is derived, while the Postgres resolver skips empty transactions and second snapshots for an existing day.
- Added one non-looping cross-tab signal for broad Study and formal AI mutations, privacy-safe `Server-Timing` headers, and a root Vercel `syd1` contract for the next approved V2 deployment.
- Added focused Provider, concurrency, delayed-response, clock, resolver, timing, route and region tests. Full Vitest passes 71 files / 403 tests with the existing Postgres integration file/test skipped; lint, typecheck, all three backup dry-runs, Production build and diff checks pass.
- Isolated 390px/1280px Production-build browser verification used a repository Schema 6 fixture and browser-only local response stub. Ten Home/Library transitions produced one bootstrap data GET, no transition GET or repeated Loading state, no overflow/overlay/console issue, and an eight-transition warm median of about 64.5ms.
- The current protected Preview still runs the accepted V2-8-2 deployment. `syd1` placement and real Preview latency require a later approved deployment; Production, Neon `main`, credentials, AI/provider use, Schema, backup, Motion and reduced-motion were untouched.
- Reason: remove the repeated network waits reported by the user and Mimi before V2 replaces V1, while keeping data and release boundaries intact.

## 2026-07-19 00:45 AEST

- Completed `V2-8-2` Staging / protected Preview rehearsal under its approved non-Production scope. Added the code-owned `v2-8-2-preview` provider gate and guarded Staging migration/inspection/seed tooling; Production and ordinary Preview branches remain fail closed.
- Proved Schema 5 → 6, Reset → 5, and a second forward migration on a temporary child of `staging`, deleted the child, retained the named no-compute Schema 5 recovery checkpoint, and migrated long-lived non-Production `staging` to Schema 6 with 12 expected tables and 8 expected constraints.
- Deployed complete V2 as Preview deployment `dpl_FH1TAyEwkcad4qXbhAbDQdujhHkP`, protected it with Vercel Authentication, bound the fixed acceptance alias, and enabled full UI writes only for branch `V2`. Preview uses separate database, study-token and restricted Gemini credentials; no bearer link or secret is stored in the repository.
- Exercised free Daily Plan goals, Recognition failed-anchor recovery, Space/Arrow/Enter controls, Active `Say it` / `Spell it` / `Dictation`, independent Dashboard Actual/FSRS views, both reset gates, editable/accepted Gemini enrichment, AI candidate addition, exact-span context explanation, duplicate protection and Backup counts against named synthetic data.
- Final Staging state is 1 synthetic person, 5 entries, 4 Review states, 5 Review events, 1 accepted AI draft and 2 context Cache rows. Final AI ledger is 3 successful `gemini-3.1-flash-lite` attempts, 1,138 input + 329 output + 0 thinking = 1,467 tokens, `US$0.000777`, 0 submitted runs and 0 active calls.
- Passed protected health/access checks, Kill Switch and Cache proof, zero error-level runtime logs, and true device-emulation checks at 320, 375, 390, 768, 820, 1023, 1024 and 1280 px. Mobile navigation ends and desktop navigation begins exactly at 1024 px; accepted Motion/reduced-motion code was not changed.
- Final local validation passed ESLint, TypeScript, 64 test files / 381 tests with the existing Postgres integration file/test skipped, all three backup dry-runs, Next.js Production build, the guarded Schema 6 Staging inspection, Tier 3 governance preflight, secret-shape checks and `git diff --check`.
- Production V1, Neon `main`, Production data/secrets/domain and Schema 5 remain unchanged. Protected Preview stays fully AI-enabled for user/Mimi acceptance; V2-8-3 separately owns Production backup, migration, deployment, verification and eventual Preview-key revocation.
- Reason: run the complete V2 with real provider and persistent synthetic data in a protected non-Production environment before any Production cutover.

## 2026-07-18 21:58 AEST

- Completed the documentation-first `V2-8-1.1` Learner-facing Copy Audit before any remote rehearsal. Added a derived child plan and synchronized the V2 master plan, Architecture, README, AGENTS, and governance record.
- Removed the global atmosphere slogan, page subtitles, desktop encouragement card, duplicated headings/instructions, generic completion encouragement, and developer-facing `V2 Stage ... Schema ... Fixture` display names from learner surfaces.
- Shortened Home, Insights, Practice Lab, Review/Active completion, Settings, Batch import, and AI preview states. Preserved `Batch imported`, `Actual`, `FSRS estimate`, Daily Plan meaning, keyboard controls, error/retry paths, destructive-action warnings, person-separation boundaries, and formal AI model/outbound/retention disclosure.
- Made Batch import start with an empty paste field and moved its compact JSON guidance into collapsed `Example format`. Synthetic fixture display names now read `Mimi`, while technical IDs/slugs and backup compatibility remain intact.
- Added a repository-wide Learner Copy Contract and updated focused AI/Dashboard UI contracts. No route, schema, backup shape, scheduler, persistence behavior, dependency, Motion, or reduced-motion rule changed.
- Passed focused tests (4 files / 14 tests), ESLint, TypeScript, 64 test files / 375 tests with the existing Postgres integration file/test skipped, all three backup dry-runs, Next.js Production build, Tier 3 governance preflight, and `git diff --check`.
- Local browser acceptance passed at 320, 375, 390, 768, 820, 1023, 1024, and 1280 px with no horizontal overflow, framework overlay, internal fixture label, or new console error. Retained 320/390 px Today and 390 px Batch import screenshots outside the repository.
- Reason: keep ordinary screens focused on learning, actions, and trustworthy state before beginning the separately approved V2-8-2 remote rehearsal.

## 2026-07-18 17:01 AEST

- Implemented the local, documentation-first `V2-8-1` Dashboard Insights slice and split remaining release work into separately approved `V2-8-2` Preview rehearsal and `V2-8-3` Production execution.
- Reworked each Recognition / Active Today card into a compact 2-by-2 plan grid for `Added today`, `Suggested review`, `Review goal`, and `New-word goal`, plus distinct `Reviewed today` / `Learned today` progress rows. Zero goals display `No goal` without division or hidden clamping.
- Added a 7/14-day `Learning rhythm` view backed by person-local calendar days. Passing entries are distinct per day, attempts retain all unique review events, missing full days are explicit zeroes, and Recognition / Active remain separate.
- Added a profile-isolated `Memory outlook` with five calm schedule windows and three FSRS retrievability bands. New, incomplete legacy, future-reviewed, archived, wrong-profile, and wrong-Parameter-Set rows are excluded instead of receiving invented estimates.
- Added timezone-offset helpers, Recognition / Active retrievability adapters, pure Dashboard derivation, accessible non-color chart distinctions, loading/unavailable states, and focused data/UI tests. No chart dependency, schema, route, backup-shape, storage write, external request, or motion rule changed.
- Passed focused Dashboard/day-window/FSRS/UI tests, ESLint, TypeScript, 63 test files / 371 tests with the existing Postgres integration file/test skipped, all three backup dry-runs, Next.js Production build, Tier 3 governance preflight, and `git diff --check`.
- Local Production-build browser acceptance passed at 320, 375, 390, 768, 820, 1023, 1024 and 1280 px with no horizontal overflow, framework overlay, console warning or console error. Track/period controls and the 1023/1024 navigation handoff worked; representative 390 px screenshots were retained outside the repository.
- Reason: make daily activity and the current learning outlook visible without overstating prediction certainty or widening this local UI stage into release authority.

## 2026-07-18 14:27 AEST

- Completed the approved `V2-7B-2` disposable non-Production provider proof and synchronized its child plan, parent plan, Architecture, README, database mapping, AGENTS, and governance record.
- Executed the forward-only Schema 6 draft on one schema-only Neon child of `staging` after proving all core tables empty. The child contained only one synthetic person plus `adapt` and `mitigate`; a dedicated runtime role received application table/sequence access after the one-time owner migration.
- Confirmed AI Studio Project logging `Disabled`, used `ai-disclosure-v3`, generated local-only Basic Auth, and sent no existing learner credential or real learning row.
- Completed exactly two Gemini attempts: one `enrichment_v1` and one exact-span `context_explain_v1`. Both succeeded with the pinned model, current disclosure, valid structure, provider response ids, and atomic stored results.
- Proved same-key Replay and different-key Cache for both features, database rejection of a third new attempt, and live Kill Switch rejection. These checks left the provider attempt count at `2`.
- Observed 881 input, 304 output, 0 thinking, and 1,185 total tokens with US$0.000677 estimated cost, below the US$0.00310 reservation. The final ledger had no submitted run or active provider call.
- Contained one credential-handling incident: the first temporary key appeared in browser-structure tool output before use. It was never saved or called and was manually revoked. The replacement proof key was also manually revoked after Google rejected automated deletion. Refreshed AI Studio confirmed both temporary key names absent.
- Permanently deleted the Neon child branch/endpoint/role and `.env.v2-7b-2.local`, then cleared active Gemini, database, and generated local-auth values from automation memory. Production, long-term `staging`, Vercel, real learning data, and existing motion/reduced-motion behavior were unchanged.
- Passed ESLint, TypeScript, 61 test files / 360 tests with the existing Postgres integration file/test skipped, all three backup dry-runs, Next.js Production build, Tier 3 governance preflight, and `git diff --check`.
- Reason: establish real provider, accounting, replay, Cache, cap, and Kill Switch evidence without leaving behind a credential, remote test target, or Production activation path.

## 2026-07-18 12:41 AEST

- Started the user-approved, documentation-first `V2-7B-2` temporary non-Production provider proof under `plan_docs/PLAN_V2_STAGE7B_2_NONPRODUCTION_PROVIDER_PROOF.md`.
- Upgraded new formal confirmations to `ai-disclosure-v3`. The concise UI now separates limited safety / abuse / legal logging from optional Project logging and no longer describes abuse monitoring as a fixed 55-day period; historical v1/v2 accepted lineage remains readable.
- Added a code-owned localhost-only activation boundary that requires exact smoke scope, loopback origin, `postgres-preview`, Schema 6/accounting readiness, a confirmed temporary target, confirmed Auth Key type, confirmed disabled Project logging, no Vercel runtime, and the existing Kill Switch.
- Added an independent database-atomic two-provider-attempt ceiling for this proof. Completed replay and Cache remain ahead of reservation; success or failure counts toward the ceiling, and a third new attempt is rejected before a new `ai_runs` row or provider call.
- Added guarded temporary-target inventory/migration/seed/inspection and provider-proof scripts. The database tool requires an ignored mode-`600` environment file, matching pooled/unpooled Neon endpoint, a dedicated temporary role/database, a schema-only empty target, explicit migration/seed flags, and fixed synthetic vocabulary.
- Passed ESLint, TypeScript, the full Vitest suite (61 files / 360 tests passed; 1 Postgres integration file/test skipped), all three backup dry-runs, Next.js Production build, and `git diff --check` before any external action.
- No Gemini/provider request, charge, credential creation/read, remote database connection, SQL execution, Production write, Vercel action, deployment, commit, push, pull request, or merge has occurred at this checkpoint. The live V1 database remains Schema Version 5 and existing motion/reduced-motion behavior is unchanged.
- Reason: prove the completed formal route with two synthetic, mechanically bounded calls while keeping every credential, database write, and provider action temporary, localhost-only, and independently removable.

## 2026-07-17 23:52 AEST

- Completed documentation-first `V2-7B-1` under the accepted `V2-7B-1` / `V2-7B-2` naming. `V2-7B-2` remains unstarted and retains all credential, temporary non-Production Schema 6, provider-call, and synthetic-smoke work behind separate approval.
- Added `ai-disclosure-v2`, session-bound confirmation evidence, server-owned lexical source reconstruction, canonical SHA-256 source/request/idempotency/cache hashes, complete replay/conflict behavior, Cache-before-quota, same-Cache processing ownership, and a 150-second bounded lease.
- Connected dormant formal orchestration through global atomic reservation, reliable failed-output usage reconciliation, source revalidation, terminal categories, and atomic result/settlement persistence. The code-owned activation gate remains closed for every environment-variable combination before V2-7B-2.
- Tightened the lazy Gemini adapter to top-level `store: false`, `thinkingLevel: minimal`, strict structured output, no tools/grounding/retry, 700 output/thinking token maximum, and 90-second timeout; reliable usage and lineage are retained for conservative failure accounting.
- Added formal Postgres draft accept/reject and candidate `Add to learning` transactions, plus Library/example-word UI disclosure and formal actions while preserving the browser-local fixture zero-request path and all accepted motion/reduced-motion behavior.
- Extended the unexecuted Schema Version 6 draft with Disclosure confirmation, request Idempotency/in-flight lease, and terminal category records. JSON backup stays at version 3; operational confirmations, sessions, replay, Cache ownership, quotas, and rejected/temporary data remain excluded.
- Passed ESLint, TypeScript, the full Vitest suite (61 files / 356 tests passed; 1 Postgres integration file/test skipped), all three backup dry-runs, Next.js Production build, Tier 3 governance preflight, and `git diff --check`.
- Browser acceptance on the local Production build passed Home and Library at 320, 390, 768, 1024, and 1280 px with no horizontal overflow or console error. Next.js development mode hit the machine-level `EMFILE` watcher limit and returned 404; the already-passing Production build served the routes normally, so no code or motion adjustment was made for that local resource condition.
- No environment value, credential, or secret was inspected, changed, or staged. No Gemini/provider request, charge, remote database connection, SQL execution, Production write, Vercel action, deployment, commit, push, pull request, or merge occurred.
- Reason: make the formal AI path locally complete and testable while ensuring that accidental environment configuration cannot activate paid external transmission before the separately approved V2-7B-2 gate.

## 2026-07-16 00:27 AEST

- Completed the local V2 Stage 7A AI Enrichment and Cost Guard capability from the documentation-first child plan; the formal provider path remains closed for Stage 7B.
- Added honest browser-local `local-fixture` enrichment in Library with editable meanings, examples, similar/confusable candidates, explicit reject/accept, Track confirmation, duplicate reuse, relation provenance, and `Add to learning`.
- Activated exact-span example-word fixture explanation and reuse of the existing manual addition form. Every fixture result says `Local preview · No AI request was made.` and is never labelled as Gemini output.
- Added strict formal `/api/ai/enrichment` and `/api/ai/context-explain` handlers plus a lazy direct Gemini adapter. Stage 7A handlers enforce Basic Auth, same-origin, Content-Type/body limits, exact public fields, Disclosure Version, and a fail-closed resting state; trusted server lookup, persisted disclosure confirmation, accounting/provider orchestration, and real calls remain Stage 7B work. The dormant adapter validates model/usage/structure, uses no tools or retries, and has a 90-second timeout.
- Added dormant-tested atomic Postgres reservation, settlement, stale in-flight recovery, Idempotency Key replay/conflict handling, and global accounting. The current design has no personal attempt ceiling; global limits are 300 attempts, 600,000 input tokens, 210,000 output/thinking tokens, and US$0.50 per Melbourne budget day, plus US$2 per month and concurrency 2.
- Preserved accepted-only JSON backup behavior with honest `local-fixture` lineage. Restore validates accepted content as historical evidence, Postgres import keeps the creation-action-to-draft link, source changes require a fresh preview before a later candidate link, and removed lineage degrades to `Suggestion added`. Pending/rejected drafts, context Cache, quota buckets, and replay state remain outside learner backups.
- Required non-null provider usage metadata before any successful Postgres AI settlement; the unexecuted Schema Version 6 draft carries the same invariant for non-fixture successful runs.
- Passed ESLint, TypeScript, the full Vitest suite (53 files / 328 tests passed; 1 Postgres integration file/test skipped), all three backup dry-runs, Next.js Production build, Tier 3 governance preflight, and `git diff --check`.
- Forced-local browser acceptance passed at 320, 390, 768, 1024, and 1280 px with no horizontal overflow or console warning/error. It covered multiline preview acceptance, honest candidate addition to Active, exact example-token explanation, and blank target meaning when a local fixture has no real definition.
- Next.js detected the ordinary ignored `.env.local`, but no value, credential, or secret was inspected, copied, changed, or staged by the agent. No Gemini/provider request, charge, remote database connection, migration, Production write, Vercel action, deployment, commit, push, pull request, or merge occurred. The first real call remains a separately approved Stage 7B action and requires confirmation of the then-current disclosure.
- Reason: make the AI review and acceptance experience usable locally while keeping paid usage, study-data transmission, and cost accounting closed until the provider path is explicitly approved.

## 2026-07-15 19:20 AEST

- Completed documentation-first V2 Stage 6 Active Practice Engine and synchronized the parent plan, architecture, README, AGENTS, and governance log.
- Added independent `active-fsrs-v1` scheduling, profile-scoped Active states/events/rebuilds, and the Stage 5.1 first-attempt Daily Episode rule. A later required pass completes today without replacing the first failure or advancing cross-day FSRS again.
- Activated separate Active `Review` / `New Words` entry points plus `Say it`, `Spell it`, and `Dictation`; all three share one Active Review Profile while retaining activity type per event.
- Added browser SpeechSynthesis playback, deterministic `active-answer-v1` comparison, structured typed outcomes, and non-lexical target-revision binding. Raw typed answers, audio, and transcripts are not persisted.
- Generalized prompt refresh/retry, same-session repeat, `回退1词`, and two-profile whole-day reset for local and guarded Postgres application paths while retaining Recognition wrappers.
- Added explicit `Start fresh in the other Track` for history-bearing entries. Source history stays read-only, target history/state is not copied, and an already history-bearing target fails closed.
- Preserved the current card/rating motion and reduced-motion rules. Added guarded Active keyboard behavior: Say uses `Space`; revealed cards use Arrow selection and `Enter`; typed inputs retain normal typing and use `Enter` to check.
- Passed TypeScript, ESLint, 42 test files / 277 tests with 1 existing Postgres integration file/test skipped, all three backup dry-runs, Next.js Production build, Tier 3 governance preflight, final diff checks, and the local browser matrix from 320 through 1280 px.
- Browser-local acceptance covered wrong Spell answer → keyboard `forgot` → same-session return → exact recovery, Say `Space` reveal, Dictation target hiding, both themes, no horizontal overflow, no framework overlay, and no console error. The disposable Active entry/events and temporary goal were removed/restored.
- Kept Schema Version 6 / backup version 3 and the accepted motion unchanged. No environment value or secret was inspected or changed; no Gemini/provider call, remote database connection, migration, Production write, Vercel action, deployment, commit, push, pull request, or merge occurred.
- Reason: make Active practice usable while preventing the same final-pass scheduling distortion already repaired for Recognition.

## 2026-07-15 16:20 AEST

- Completed the documentation-first V2 Stage 5.1 Daily Episode scheduling repair requested from Mimi's real-use feedback; no V1 Hotfix was created.
- Made the first Recognition attempt inside one persisted Daily Plan window the sole cross-day FSRS scheduling anchor. Later same-day attempts remain immutable raw evidence and no longer extend the next review after a required recovery pass.
- Retained `forgot` and `hard` as separate events/counts while both use unsuccessful-recall scheduling when they are the anchor.
- Scheduled a failed anchor and a new direct `vague` for the next local-day boundary; preserved normal FSRS behavior for direct new `remembered` and mature direct `vague` / `remembered` ratings.
- Counted `Learned today` / `Reviewed today` only after a passing attempt and restored failed-only entries to their original `New Words` / `Review` zone after refresh.
- Added equal-checkpoint priority by descending `forgot`, then `hard`, counts and included those keys in the signed Review cursor so ordering remains correct across pages.
- Reused the same pure episode policy for local and Postgres application paths, rollback, reset, and replay. Timezone-overlapping plans use deterministic activation ownership; ambiguous equal activation fails closed.
- Passed focused Stage 5.1 tests (4 files / 47 tests), ESLint, TypeScript, the full Vitest suite (40 files / 265 tests passed; 1 Postgres integration file/test intentionally skipped), all three backup dry-runs, the Next.js Production build, Tier 3 governance preflight, and final diff checks.
- Kept Schema Version 6 and backup version 3 unchanged. Did not inspect a secret, call Gemini, connect to a remote database, execute a migration, mutate Production, change Vercel, deploy, commit, push, or open a pull request.
- Reason: prevent the required final passing click from hiding that a word was genuinely weak earlier in the same learning session.

## 2026-07-14 23:16 AEST

- Completed the documentation-first Stage 5 keyboard-interaction follow-up after the user's confirmation.
- Added simultaneous mouse and keyboard control to Recognition Review/New Words cards: `Space` reveals or hides, Arrow keys select inside the visible non-wrapping 2-by-2 memory grid, and `Enter` confirms the selected enabled rating through the existing submission path.
- Made the first handled Arrow key select `完全忘记了`, then preserved row/column movement and clamped every outer edge without wrapping.
- Kept mouse click as immediate submission and let mouse hover hand the same transient choice to later Arrow-key movement.
- Protected inputs, textareas, selects, editable content, ordinary focused controls, open dialogs, modifier combinations, IME composition, repeat Space, and repeat Enter from shortcut takeover.
- Added the compact learner hint `Space flip · Arrow keys choose · Enter confirm`.
- Reused the existing rating hover brightness and shadow for keyboard selection. No transition value, card motion, hover motion, transform, or reduced-motion rule changed.
- Passed focused keyboard tests (2 files / 10 tests), ESLint, TypeScript, the full Vitest suite (39 files / 248 tests passed; 1 Postgres integration file/test intentionally skipped), all three backup dry-runs, and the Next.js Production build.
- Isolated forced-local browser acceptance on `127.0.0.1:3017` verified unchanged scroll position on Space, first-Arrow selection, mixed Arrow movement, edge clamping, Enter submission, direct mouse submission, and open-dialog shortcut protection with no console error. Temporary ratings were rolled back, the goal was restored to `0`, and the disposable entry was deleted.
- Did not inspect or configure a credential, call Gemini, connect to a remote database, execute a migration, mutate Production data, change Vercel, deploy, commit, push, or open a pull request.
- Reason: let the learner move fluidly between mouse and keyboard while preserving the already accepted visual motion and the existing study-data safeguards.

## 2026-07-14 19:13 AEST

- Completed the documentation-first V2 Stage 5 prompt-expiry experience repair requested after the main Stage 5 commit.
- Refreshes prompt evidence when each Recognition card becomes active, so cards waiting in one queue no longer depend only on the queue-read timestamp.
- Keeps Basic Auth separate from card evidence: expiry does not navigate to login, reopen the zone, clear the current card, or discard completed session progress.
- Added explicit `prompt_expired`, `prompt_invalid`, `prompt_stale`, and `prompt_consumed` categories. Only `prompt_expired` may refresh and retry once; all other and ambiguous failures remain fail-closed.
- Preserved the original `promptId` across refresh and moved Postgres same-prompt consumption inspection after the plan row lock, preventing concurrent old/refreshed tokens from both creating a rating.
- Added strict `refreshPrompt` routing with person/plan/version/day/item/consumption checks, plus bounded browser-local expired-record retention outside formal data and backup.
- Added the lightweight successful-recovery copy `This card was refreshed.`; ordinary proactive refresh remains silent.
- Passed focused prompt recovery/token/route/static/UI tests (6 files / 33 tests), ESLint, TypeScript, the full Vitest suite (38 files and 242 tests passed; 1 Postgres integration file/test intentionally skipped), all three backup dry-runs, Next.js Production build, Tier 3 governance preflight, and final diff checks.
- Browser acceptance confirmed a normal refreshed-card rating remains on `/review?zone=new`, preserves progress, and emits no console warning/error. The temporary rating, entry, and goal change were restored; the 30-minute expiry branch is covered with injected-clock tests.
- Did not inspect or configure a credential, call Gemini, connect to a remote database, execute a migration, mutate Production data, change Vercel, deploy, commit, push, or open a pull request.
- Reason: retain the strict bounded card-authority design without making a long learning session feel logged out or forcing the learner to restart a zone.

## 2026-07-14 16:07 AEST

- Completed local V2 Stage 5 from the documentation-first child plan `plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md`.
- Added timezone-safe Daily Plan resolution for both Tracks, including 23-hour/25-hour local days, frozen `Suggested review`, exact today goals, future defaults, and six learner-visible values per Track.
- Replaced the combined Recognition session with separate `Review` and `New Words` zones. First valid ratings move entries from `New` to `In review`; failed ratings can return in-session through new opaque prompt evidence without consuming another distinct target.
- Updated Home, Study, Review, Settings, and Library with the daily values, today/future goal editing, learning-stage filters, card-body reveal/hide, whole-entry browser `Listen`, calm rating colors, example actions, and bounded `回退1词`.
- Removed the old `1..80` goal limit. Exact decimal integers from `0` through `2,147,483,647` are accepted, while each internal queue page remains bounded to 100 entries.
- Replaced the former Review-page daily reset with Study's two-gate whole-day reset using the accepted Chinese irreversible warning. Daily plans, goals, suggestions, vocabulary, creation facts, unrelated dates, and AI content are preserved; current-day Active history fails closed until V2-6 can rebuild it.
- Added strict `POST /api/study` operations, Postgres transaction/rebuild paths, request-time HMAC prompt/cursor evidence issued only for the bounded selected page, local session-only operational evidence, rating idempotency, and bounded one-entry rollback routing. Operational tokens/replays remain outside JSON backup.
- Kept `MIMI_STUDY_TOKEN_SECRET` intentionally unconfigured, so server-backed token issuance remains fail-closed. Schema Version 6 SQL remains an unexecuted draft and live V1 remains Schema Version 5.
- Passed focused daily-study/API tests (5 files / 36 tests), ESLint, TypeScript, the full Vitest suite (37 files and 231 tests passed; 1 Postgres integration file/test intentionally skipped), all three backup dry-runs, Next.js Production build, Tier 3 governance preflight, and final diff checks.
- Browser acceptance passed on isolated forced-local `127.0.0.1:3001` data across 320, 375, 390, 768, 820, 1023, 1024, and 1280 px, both themes, daily metrics/goals, New-to-In-review movement, failed-card repeat, rollback, both reset gates, and critical routes with no horizontal overflow, framework overlay, console warning, or console error. The disposable phrase was deleted and the changed test goal restored.
- Did not inspect or configure a credential, call Gemini, connect to a remote database, execute a migration, mutate Production data, change Vercel, deploy, commit, push, or open a pull request.
- Reason: turn the accepted daily-learning contract and Schema Version 6 shapes into a calm, usable Recognition flow before Active practice, AI enrichment, and Dashboard insights.

## 2026-07-14 11:14 AEST

- Completed local V2 Stage 4 from the documentation-first child plan `plan_docs/PLAN_V2_STAGE4_MOBILE_FOUNDATION_COPY.md`.
- Closed the 768–1023 px navigation gap with `Home`, `Study`, `Review`, `Library`, and `More` below 1024 px; kept the desktop rail as the sole primary navigation from 1024 px.
- Added an accessible responsive dialog for the mobile `More` panel and Review/Library confirmations, including focus containment/restoration, Escape handling, scroll lock, dynamic viewport sizing, and Safe Area padding.
- Replaced sub-1024 px Batch editing tables with touch-friendly cards backed by the same candidate state; retained the desktop table and fixed a hidden-input containment issue that caused page-level horizontal scrolling at 1024 px.
- Shortened ordinary copy into natural English across navigation, pages, import, Library, Review, Settings, and Backup while preserving `Batch imported`, the cat Home Brand Button, Chinese destructive warnings, and both themes.
- Aligned visible Active presentation with only `Say it`, `Spell it`, and `Dictation`; kept all three resting until V2-6 and showed no false Active progress.
- Preserved fluid 180–240 ms normal interaction. Reduced-motion behavior removes spatial lift/travel while keeping short opacity, color, border, and surface feedback.
- Added focused mobile-foundation contract tests and passed ESLint, TypeScript, 32 test files / 207 tests with the existing Postgres integration test skipped, three backup fixture dry-runs, and the Next.js Production build.
- Browser acceptance passed at 320, 375, 390, 768, 820, 1023, 1024, and 1280 px with no horizontal document overflow, breakpoint navigation gap/duplication, framework error overlay, or console warning/error. It also covered `More` focus behavior, all primary routes, mobile Review/Library dialogs, Batch card/table handoff, both themes, and the accepted Practice Lab modes.
- Saved 320/390 px user screenshots outside tracked source. A real iOS/Android Software keyboard remains a release-stage device recheck; dynamic viewport, scroll, focus, input-size, and bottom-clearance behavior passed locally.
- Kept the current one-confirmation V1 Review reset unchanged; the accepted two-gate whole-day learning reset remains V2-5 scope.
- Did not access a credential, call Gemini, connect to or migrate a remote database, alter Production data, change Vercel, deploy, commit, push, or open a pull request. Live V1 remains Schema Version 5.
- Reason: establish a continuous, calm, touch-friendly UI foundation before the daily-learning, Active, AI, and Dashboard engines are added.

## 2026-07-14 02:03 AEST

- Completed local V2 Stage 3.1 from the documentation-first child plan `plan_docs/PLAN_V2_STAGE3_1_REVIEW_INTERACTION_CONTEXT_WORD_ACTIONS.md`.
- Added short guarded card-body tapping for Recognition review answers, retained the compact native `Show answer` / `Hide answer` control, and preserved the first reveal timestamp across later hide/reveal cycles.
- Applied four calm, text-labelled rating tones—muted terracotta, warm honey, pale olive, and soft sage—without changing rating values, same-session repeats, scheduler calls, or FSRS behavior.
- Segmented revealed English examples with exact UTF-16 offsets, apostrophe/hyphen support, punctuation preservation, and a Unicode-aware fallback for browsers without `Intl.Segmenter`.
- Added a responsive example-word action panel: browser-only `Listen`, visibly resting `AI explain`, and a manual `Add to learning` form with editable meaning/example/Track and selected-person duplicate protection including archived entries.
- Reserved strict `context_explain_v1` public/trusted/result contracts and amended the unexecuted Schema Version 6 draft with expiring operational Cache lineage. Context Cache rows and unreferenced context runs remain outside user backup/restore.
- Corrected Gemini 3.1 Flash-Lite synchronous Standard prices to US$0.25 / 1M input and US$1.50 / 1M output/thinking tokens. Runner version 5 now reserves US$0.186 for 120 attempts and fails closed above the retained US$0.10 live-evaluation ceiling; no paid call ran.
- Passed lint, TypeScript, 31 test files / 202 tests with the existing Postgres integration test intentionally skipped, three backup fixture dry-runs, AI dry-run, Next.js Production build, Tier 3 governance preflight, final diff checks, and local browser acceptance.
- Browser acceptance used a forced-local isolated `localhost:3001` origin. It covered reveal/hide/reveal, nested actions, speech, duplicate rejection, successful manual Active addition, dark/light tones, 320 / 390 / 1200 px layouts, scroll lock, and focus containment with no browser error/warning, error overlay, or horizontal overflow.
- Did not read or change a credential, call Gemini, connect to or migrate a remote database, alter Production data, change Vercel, deploy, commit, push, or open a pull request. Live V1 remains Schema Version 5.
- Reason: remove immediate Review friction and make example context useful now while reserving a narrow, server-trusted AI boundary for V2-7.

## 2026-07-14 00:30 AEST

- Completed local V2 Stage 3 from the documentation-first child plan `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`.
- Locked Schema Version 6 for branch `V2` snapshots and backup version 3 for JSON backups while retaining forward migration from schema versions 1–5.
- Added the forward-only `db/migrations/0003_v2_schema6_data_model.sql` draft for daily defaults/plans, immutable creation/reversal facts, profile-aware review evidence, accepted AI lineage/drafts, vocabulary relations, and operational quota/idempotency tables.
- Migrated legacy review history honestly to Recognition: earliest retained events supply `firstRatedAt`; missing evidence stays `legacy_unknown` with no invented timestamp or Active history.
- Added creation facts to successful single/batch additions, preserved creation tombstones after hard delete, and recorded valid whole-batch `Batch imported` reversals.
- Updated local and Postgres repository snapshots, mappers, settings compatibility, scheduler/review writes, API route mocks, backup validation/export, guarded Postgres import planning, and CSV compatibility for `ai_generated` entries.
- Added a deterministic Schema Version 6 fixture containing Recognition and Active evidence, daily plans, a deleted-item creation tombstone, one reversal, and one accepted Gemini lineage/draft/relation chain.
- Synchronized `db/LOCAL_BACKUP_TO_POSTGRES.md` with Schema Version 6 remapping, legacy derivation, accepted-AI inclusion, operational-data exclusion, and the unexecuted remote boundary.
- Kept operational quota, Cache, idempotency, temporary/rejected AI drafts, and unreferenced AI audit rows outside user backup/restore.
- Refined the Tier 3 preflight side-effect scan to inspect newly added executable lines (and full untracked files), preventing unchanged `DELETE FROM` statements in a touched repository from becoming false positives while retaining detection for newly introduced destructive SQL.
- Passed lint, TypeScript typecheck, 182 tests with 1 intentional Postgres integration skip, all three backup fixture dry-runs, Next.js Production build, and final diff checks.
- Did not connect to or migrate Development, Staging, Preview, or Production; the live V1 database remains Schema Version 5. No credential, provider call, Vercel change, deployment, GitHub push, or persistent remote-data write occurred.
- Reason: make the accepted Stage 1 daily/Review Profile contract and Stage 2 accepted-AI lineage representable and recoverable before any V2 user-facing engine is built.

## 2026-07-13 23:00 AEST

- Recorded the user's qualitative review of concrete Stage 2-B cases and conditional acceptance of the observed error range for supplementary, editable Gemini drafts.
- Preserved the unscored 120-row worksheet and all known lexical defects; no numeric human threshold is claimed as completed.
- Unblocked V2-7 local editable-draft implementation while keeping Production credential, provider activation, migration, and deployment under separate approval.
- Froze the required supporting copy: `Generated by Gemini 3.1 Flash-Lite · AI content may be inaccurate. Please review carefully before saving.`
- Required the displayed model label to come from server-owned result lineage and kept AI-derived fields subject to explicit review and acceptance before entering formal learning data.
- Kept the quality notice separate from the first-outbound-call provider/data/retention/cost disclosure.
- Made no application-code, V1 UI, credential, provider-call, database, Vercel, Production, GitHub remote, or deployment change.
- Reason: treat the model as a fallible suggestion source rather than the sole correct answer while keeping the remaining risk visible and user-controlled.

## 2026-07-13 21:56 AEST

- Added the derived documentation-first V2 Stage 2-B quality plan and linked it from the Stage 2 parent, first-run evidence, V2 master, README, architecture, and AGENTS context.
- Preserved Prompt/schema v1 and the fixed 120-entry corpus, then locked their first-run hashes in runner version 4 to prevent an accidental non-comparable second evaluation.
- Added Prompt/schema v2 with the same four-field output shape, a shared maximum of three similar/confusable candidates, preference for empty arrays over filler, and explicit exclusion of malformed or erroneous learnable forms.
- Added conservative local rejection for candidate meta labels, URLs, invalid surfaces, self-described error forms, visible wrong-answer examples, combined candidate overflow, and exact duplicates of supplied meanings/examples.
- Updated the runner to validate against the exact supplied lexical context, retain the existing accounting/provider stop rules, require the ignored key file to remain mode `600`, and expose Prompt/schema v2 hashes in dry-run evidence.
- Passed the 32-test focused AI quality suite, dry-run baseline locks, governance, lint, typecheck, diff, secret-boundary, and credential-permission checks before any second external request.
- Completed the sole approved unchanged-corpus second run: 120 submitted, 120 locally valid, 0 provider/network failure, no stop condition, and estimated cost US$0.027943.
- Reduced combined candidates from 512 across 114 first-run valid drafts to 272 across 120 second-run valid drafts; candidate-output tokens fell 39.27%, while p50 and p95 latency were lower in this descriptive run.
- Recorded remaining meaning, example, ordering, headword, obscurity, and relation-taxonomy defects in `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md`; kept the human worksheet blank and V2-7 blocked.
- Made no third paid call or selective retry.
- Passed the full suite with 165 tests and 1 intentional database-integration skip, both backup fixture dry-runs, Next.js Production build, final Tier 3 governance, lint, typecheck, AI dry-run, diff, worksheet, and secret-boundary checks.
- Kept the live V1 UI, Schema Version 5, database, Vercel settings, Production credentials, and deployment unchanged.
- Reason: address the first run's quota-filling, malformed learnable candidates, comparison-label, and repeated-content defects while keeping the second quality measurement comparable and mechanically bounded.

## 2026-07-13 21:23 AEST

- Implemented the documentation-first V2 Stage 2 Gemini quality and security gate under `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`, with the first-run record in `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_EVIDENCE.md`.
- Re-verified the current official Gemini model, lifecycle, pricing, billing, Structured Output, thinking, and terms baseline; pinned `gemini-3.1-flash-lite` and removed Datamuse, Free Dictionary, Groq comparison, and `gemini-flash-latest` from the active Stage 2 route.
- Added provider-neutral AI enrichment contracts for strict public requests, allowlisted lexical payloads, bounded structured drafts, usage/cost accounting, atomic quota reservations, degraded mode, and Kill Switch behavior.
- Added a fixed 120-entry PTE-oriented fixture corpus, a no-tools Gemini schema/Prompt, and a guarded local runner with concurrency 1, no retries, stale-price rejection, a US$0.10 reserved run ceiling, ignored artifacts, and an explicit paid-call confirmation flag.
- Stored the user-approved test credential only in ignored `.env.stage2.local`; it remains untracked and was not copied to `.env.local`, Vercel, Preview, Production, source code, logs, or tracked evidence.
- Completed the approved 120-call fixture run: 114 drafts passed local validation, 6 duplicate/self-candidate drafts were rejected, no provider/network request failed, and the observed model matched the pinned model. The 95% structural rate did not meet the provisional 100% threshold.
- Corrected the cost record after discovering that runner version 1 dropped usage for the six invalid HTTP 200 responses: the retained US$0.034275 is a lower bound and the reservation-backed total interval is US$0.034275–0.038925.
- Upgraded the runner locally, without another paid call, so future HTTP 200 responses retain safe usage/model/finish evidence before parsing; rejected parsed drafts stay ignored, and provider blocks, non-`STOP` finishes, or missing candidate contracts stop further calls.
- Closed an internal quota-bypass path by requiring every Production-design reservation to match the configured per-attempt token envelope and to reserve at least its configured cost.
- Recorded agent-precheck concerns including maximum-filling behavior, malformed or non-learnable candidate values, and selected example-relevance defects; left the 120-row human lexical worksheet unscored and V2-7 Production integration blocked.
- Kept the live V1 UI, Schema Version 5, repositories, database, Production data, Basic Auth, Vercel configuration, and deployment unchanged.
- Reason: test the chosen Gemini route against a reproducible quality and abuse boundary before any user-facing or Production AI integration, and preserve the failed threshold as evidence rather than accepting weak output silently.

## 2026-07-13 15:40 AEST

- Completed V2 Stage 1 under `plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md`, derived explicitly from the accepted V2 master plan.
- Added isolated pure TypeScript contracts for per-Track daily plans and metrics, database-safe free goals, separate Review / New Words queues, plan-version and cursor guards, immutable creation/reversal facts, legacy unknown review history, and late-Snapshot recommendation recovery.
- Froze Active `Say it`, `Spell it`, and `Dictation` evidence as one independent Active Review Profile, kept typed answer outcomes separate from all four learner self-ratings, and added server-owned prompt-token / target-revision and Parameter Set boundaries without recording raw answer or audio data.
- Froze the exact two-gate whole-day reset copy, plan-bound commands, seven-day operational idempotency behavior, same-key/different-payload conflicts, and exclusion of replay records from user backups.
- Added 22 focused Stage 1 tests covering phrases/fixed collocations as one entry, immutable `Batch imported` rollback, queue separation and large-goal pagination, Recognition/Active isolation, 23/25-hour local days, strict rating evidence, typed-answer normalization, reset copy, and replay expiry.
- Synchronized the V2 master plan, README, architecture, AGENTS, changelog, and AI log with the completed isolated contract.
- Kept the current V1 UI, Schema Version 5, repositories, API routes, backups, database, external providers, credentials, and Production behavior unchanged.
- Reason: establish one executable and non-drifting V2 product/data boundary before persistence, daily-learning UI, Active scheduling, or AI integration begins.

## 2026-07-13 00:26 AEST

- Added `plan_docs/PLAN_V2_MASTER.md` as the accepted V2 documentation baseline derived from the completed V1 plan, dual-track UI/data work, Recognition FSRS plan, Data Lifecycle policy, live V1 release record, architecture, Mimi feedback, and the user's confirmation.
- Defined the V2 mainline as separate Review / New Words zones, four daily values per Track, distinct-entry actuals, independent Recognition / Active FSRS profiles, three Active practice modes, Recognition pronunciation playback, mobile refinement, dashboard insight, and mandatory first-generation AI enrichment.
- Fixed the counting unit so one vocabulary entry counts once whether it is a single word, phrase, or fixed collocation.
- Expanded the initial AI request ceilings to 100 provider attempts per person per local day and 200 provider attempts across Production per server-owned `Australia/Melbourne` budget day; a submitted provider call retains its request count even if it later fails, while global token, cost, concurrency, Cache, billing, and Kill Switch controls remain the hard boundary.
- Recorded that paid-provider limited safety / abuse / legal retention is acceptable when disclosed accurately and must not be described as Zero Retention.
- Deferred Speech Recognition, microphone upload, and AI pronunciation scoring while adding browser SpeechSynthesis playback to the planned Recognition and Active flows.
- Added `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md` to preserve future SSO, authorization, account recovery, deletion, and tenant-isolation requirements without placing them in V2.
- Rewrote `AGENTS.md` around the current live V1 / accepted V2 source of truth and synchronized README / architecture with the accepted plan while keeping all V2 implementation and Production actions unperformed.
- Reason: establish one durable, non-drifting V2 parent plan before any child plan or code change and incorporate the user's final metric, quota, retention, speech, and Recognition-playback decisions.

## 2026-07-11 20:54 AEST

- Upgraded the repository governance marker and project-specific preflight from `human-ai-governance v0.2.0` to `v0.3.0` after explicit user approval.
- Reclassified the launched private Production app with current operational tier, target capability tier, and working tier all set to Tier 3.
- Updated the preflight to the five-tier model, required an explicit tier, kept project-tuned secret and executable-file scanning, and removed HTTP-method-only risk detection.
- Made strict side-effect scanning explicit in the npm Tier 3 command and synchronized README, architecture, and master-plan governance wording without rewriting historical stage records.
- Passed the Tier 3 governance preflight, ESLint, TypeScript typecheck, the full Vitest suite with 111 passed and 1 skipped, Next.js Production build, and final diff checks.
- Reason: align durable project governance with the current Production capability and the updated proportional five-tier skill while preserving proven local safeguards.

## 2026-07-11 16:24 AEST

- Rotated only the Vercel Production `MIMI_BASIC_AUTH_PASSWORD` after explicit user approval, preserving the existing shared username.
- Recorded the user's proportionate-risk acceptance of a short shared passphrase for the current private trusted-group phase; kept its value out of tracked files and project documentation.
- Rebuilt current Ready Production deployment `dpl_C3GADXU3QHVuiyyog3Wdi4cCDfEF` as `dpl_Af25vm8v896iAgzNbb5whyAmLF2v` so the new environment value became active without deploying the local `V1` branch directly.
- Verified unauthenticated and incorrect-password access return `401`, the selected credential returns `200`, authenticated storage remains Ready `postgres-production` with schema version 5, and the new deployment has zero error/`5xx` logs.
- Observed read-only counts of 1 person, 1 settings row, and zero vocabulary/import/review rows; performed no Production database write.
- Reason: restore a known, user-selected access credential after the randomly generated launch password could not be recovered from local records or Vercel sensitive-value surfaces.

## 2026-07-11 13:16 AEST

- Rebuilt `README.md` as a human-facing introduction for people seeing the repository for the first time.
- Defined the product as a private small vocabulary-learning app for Mimi and Anoria, centered on customization, gentle UI interaction, and an ADHD-friendly learning experience.
- Recorded the possible future direction toward an SSO-enabled open multi-user application without presenting it as current V1 behavior.
- Replaced Stage 5/6/7/8 chronology, historical Preview URLs, deployment ids, migration commands, and stale release-state wording with concise sections for product purpose, V1 features, learning tracks, architecture, local setup, environments, data boundaries, documentation, and future direction.
- Kept credentials and private access details out of the README while retaining the canonical Production URL and current cloud-backed status.
- Added an explicit documentation-responsibility boundary to `ARCHITECTURE.md`: README is the human entrypoint; architecture, plans, changelog, and AI log own technical detail and historical evidence.
- Reason: make the GitHub repository understandable and useful to a new human reader while keeping detailed engineering history in its specialized repository documents.

## 2026-07-11 12:37 AEST

- Merged formal release pull request `#1` from `V1` to `main` with merge commit `a70b341a2af61161bb1f778ffeae69a143f03146`.
- Verified Ready Production deployment `dpl_8eavod6FSJw3arDD67K6rW2HUUbn` on the canonical domain.
- Confirmed unauthenticated root access returns HTTP `401` with Basic Auth challenge, authenticated root returns `200`, storage health reports Ready `postgres-production`, and storage data reports schema version 5 with empty vocabulary/import/review arrays.
- Performed no synthetic or formal Production write; the first real user action remains the first write acceptance event.
- Visually verified the current release in the user's authenticated Chrome session and found obsolete `local` wording on the Dashboard/Library.
- Replaced the stale local-runtime wording with cloud-neutral Recognition FSRS and empty-vocabulary copy without changing scheduler, storage, layout, or data behavior.
- Passed ESLint, TypeScript, the full Vitest suite with 111 passed and 1 skipped, and Next.js Production build after the copy correction.
- Deployed copy correction commit `3941fc0` as final functional Production deployment `dpl_ZrEHc39z4dufgq3RcPQGUV1vK4n2`; revalidated canonical Basic Auth, `postgres-production`, schema version 5, empty formal data, corrected HTML copy, and no error/5xx logs.
- Reason: keep the newly cloud-backed V1 interface consistent with its actual `postgres-production` runtime before final handoff.

## 2026-07-11 02:01 AEST

- Started the explicitly approved Stage 6B-P1-G-C-5 live Production execution and added `plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md`.
- Verified clean schema-version-5 `main`, created long-lived `staging`, set `staging` as Neon Default with no auto-delete, and retained `main` as the empty Production data branch.
- Separated Vercel database scopes so Development / Preview use `staging` and Production uses `main` with `MIMI_STORAGE_RUNTIME=postgres-production`; kept Preview-only write flags absent from Production.
- Disconnected the owned Neon Marketplace resource from this Vercel project after reconnect testing could not prove non-production branch retargeting; configured only the minimum environment-specific database variables manually and deferred per-feature Preview branch automation.
- Rotated the Production database role credential after branching to separate Production and non-production. A first rotated value appeared in a local browser-automation inspection payload, so it was immediately invalidated through a second rotation and recorded as a credential incident without committing or documenting its value.
- Added a Production-only application Basic Auth gate for pages and current storage API routes, with fail-closed behavior when credentials are missing, constant-time comparison, and focused route/security tests.
- Added a shared schema version 5 inspection module and a guarded Production read-only inspection command; `main` and `staging` both passed 8-table, 6-column, 9-constraint, 1-index, 2-trigger, and zero-row checks.
- Recorded Production database preparation as `skipped-existing-schema`; the already-present non-idempotent migrations were not rerun.
- Verified Ready Preview deployment `dpl_EmKkV31KApZJchr7w7XV5S3F4XZF` reports `postgres-preview`, schema version 5, and empty study/review data without a write.
- Upgraded the active governance command to Tier 3 and narrowed strict side-effect term scanning to executable non-test files while retaining repository-wide secret scanning.
- On resumed validation, confirmed Vercel sensitive Production values are non-readable locally; rejected a mixed local-environment probe as Production evidence, recorded that the guarded inspection stopped before database connection, and regenerated the trusted-group Basic Auth credentials for post-deployment acceptance.
- Synchronized AGENTS, README, architecture, master, Stage 8.5, Stage 6B, Stage 6B-P1, P1-G, and P1-G-C documentation to the actual in-progress release state.
- Reason: complete the environment, credential, access, schema, and Preview gates required before merging `V1` to `main` and creating the formal cloud-backed V1 Production deployment.

## 2026-07-11 01:06 AEST

- Executed Stage 6B-P1-G-C-4 as a documentation-only branch/environment execution decision after reviewing the newly updated Stage 8.5 policy documents.
- Added `plan_docs/PLAN_V1_STAGE6B_P1_G_C_4_BRANCH_ENVIRONMENT_EXECUTION_DECISION.md` with explicit Source plan, Derived from, Scope, Non-Scope, and Exit criteria.
- Recorded the accepted live sequence: verify clean schema-ready `main`, create long-lived `staging`, move Development / Preview away from `main`, keep logical `preview/*` derived from `staging`, reserve `main` for Production, and configure Production-only variables only after later approval.
- Added the migration boundary that current scripts do not maintain a durable `schema_migrations` ledger, so live execution must verify schema shape / constraints / indexes / triggers / counts and must not blindly rerun already-applied `0001_initial.sql` or `0002_schema5_production_runtime.sql`.
- Re-checked current Vercel and Neon documentation for environment variable scoping, Custom Environments plan limits, Neon branch copy-on-write behavior, managed Preview branch parentage, and schema-only branch status; recorded the implication that managed Preview automation must not derive branches from Production `main`.
- Synchronized AGENTS, README, architecture, master, Stage 8.5, Stage 6B, Stage 6B-P1, P1-G handoff, and P1-G-C closure docs so P1-G-C-4 is no longer an open documentation blocker.
- Kept Vercel / Neon commands, browser provider actions, `.env` access, credential handling, database connection, SQL, branch creation, environment-variable changes, merge, deployment, backup automation, and Production writes out of scope.
- Reason: turn the accepted Stage 8.5 topology into an execution-ready decision while preserving the approval gate before any live infrastructure action.

## 2026-07-11 00:12 AEST

- Accepted Stage 8.5 Data Lifecycle（数据生命周期）and Environment Strategy after the user confirmed the documentation-first scope and refined the architecture for the current private trusted-group app.
- Added `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md` as the canonical cross-stage policy derived from the master plan, Stage 6A, Stage 8, Stage 6B-P1, P1-G-C, architecture, and P1-G-C-3 dashboard evidence.
- Selected one Neon project topology for the current phase: verified clean `main` as future Production, a long-lived `staging` non-production baseline, and temporary logical `preview/*` branches derived from `staging`.
- Fixed the data-movement rule: code and versioned migrations move across environments; synthetic / fixture business rows remain non-production, and Production starts empty with real data created after launch.
- Lowered the independent logical-backup target from daily to weekly, retained the most recent eight weekly backups, required an additional backup before high-risk Production data changes, and added explicit triggers for later daily backup or separate-project isolation.
- Defined Preview/Recovery branch lifecycle, migration ordering, Recovery Point Objective（恢复点目标）/ Recovery Time Objective（恢复时间目标）, deletion-resurrection risk, and future AI run / assessment / prompt / embedding lineage boundaries.
- Corrected the future execution path for current `main`: because `0001_initial.sql` and `0002_schema5_production_runtime.sql` were already applied while it was the approved non-production target, P1-G-C-4 must inspect migration history and must not rerun already-applied migrations after reclassification.
- Synchronized AGENTS, architecture, README, master/release/P1/P1-G/P1-G-C plans, P1-G-C-3 follow-up evidence, and backup-import mapping to the accepted policy and the next documentation-first `P1-G-C-4 Single-Project Branch Topology Execution Decision`.
- During the final stale-wording scan, one double-quoted `rg` pattern contained Markdown backticks and caused the shell to attempt `0001_initial.sql` and `0002_schema5_production_runtime.sql` as command names. Both returned `command not found`; no script, database connection, network call, or mutation occurred. The scan was rerun safely with a single-quoted pattern.
- Kept Neon/Vercel mutation, `.env`/credential access, database connection, SQL, branch creation, environment-variable changes, merge, deployment, backup automation, and Production writes out of scope.
- Reason: establish a reusable lifecycle baseline while keeping infrastructure proportionate to a small private app and preserving explicit upgrade paths for future users, AI data, recovery needs, and stronger isolation.

## 2026-07-10 20:55 AEST

- Executed Stage 6B-P1-G-C-3 dashboard evidence capture after the user opened the Neon dashboard and approved direct read-only inspection.
- Added `plan_docs/PLAN_V1_STAGE6B_P1_G_C_3_DASHBOARD_EVIDENCE.md` as the derived child evidence document.
- Confirmed Neon project `words-learning-app-for-mimi-neon` is visible in Neon Console with Free plan surface, Sydney region, default `.25 CU` compute, Postgres 17, and a 6-hour history / restore window.
- Confirmed the visible branch list contains only `main`, marked `Default`, with no child branches and no visible distinct empty Production branch.
- Confirmed visible database / role labels `neondb` / `neondb_owner`.
- Confirmed the dashboard integration page does not expose Production environment scope; prior Vercel CLI evidence remains the source for Development / Preview-only connection scope and absent Production env vars.
- Kept connection strings, endpoint hostnames, passwords, tokens, `.env` exports, internal provider ids, SQL, database connections, branch creation/deletion, restore, snapshot creation, env var changes, merge, deployment, and Production writes out of scope.
- Reason: close the Neon dashboard evidence gap and move P1-G-C from evidence collection to Production target strategy selection.

## 2026-07-10 19:44 AEST

- Executed Stage 6B-P1-G-C-2 evidence route decision documentation after the user confirmed the next stage.
- Added `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md` as the derived child route-decision document.
- Recommended human dashboard evidence as the next safest route for missing Neon branch / database / restore metadata.
- Defined the required non-secret evidence packet: project/resource display name, branch list, primary/root marker, database label, role label, empty Production target status, restore / retention window, visible branch create / restore / reset controls, and Vercel Production connection availability.
- Defined redaction rules for connection strings, endpoint hostnames, passwords, tokens, `.env` exports, QR codes, and database env var values.
- Kept provider dashboard navigation, browser SSO, Neon CLI / API secret handling, `.env` access, database connection, SQL, branch creation/deletion, restore, env var changes, merge, deployment, promotion, rollback, alias changes, Production migration, and Production writes out of scope.
- Reason: choose the safest evidence route before any account-sensitive or Production-impacting action.

## 2026-07-10 18:57 AEST

- Executed Stage 6B-P1-G-C-1 read-only provider supplement after the user confirmed the next stage.
- Added `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md` as the derived child result document.
- Used Vercel CLI 55.0.0 through `npm exec` for read-only project, env, integration, resource, installation, and deployment-list metadata. The CLI was temporarily fetched into npm's execution cache because `vercel` / `vc` were not on `PATH`; no project dependency file changed.
- Confirmed the Vercel-managed Neon resource is owned, available, Free-plan, and connected to `words-learning-app-for-mimi` only for Development / Preview.
- Confirmed Production still has no database environment variables and no exact database target.
- Confirmed the Vercel Marketplace metadata path does not expose Neon branch names, primary/root status, database labels, role labels, restore window, or an exact empty Production target.
- Kept `.env` access, database connection, SQL, branch creation/deletion, restore, env var changes, merge, push, deployment, promotion, rollback, alias changes, browser SSO action, email action, secret output, Production migration, and Production data writes out of scope.
- Reason: strengthen the provider evidence without crossing into secret handling or Production mutation.

## 2026-07-10 18:40 AEST

- Executed Stage 6B-P1-G-C-0 human decision closure documentation after the user confirmed the next stage.
- Added `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md` as the derived child decision packet for P1-G-C.
- Recorded recommended defaults and accepted alternatives for provider-management evidence, exact Production target, access boundary, merge path, deployment mechanism, Production write acceptance, and the historical non-official Production deployment.
- Re-checked official Vercel and Neon docs for Git deployment, environment variable scoping, promotion / rollback, Vercel-managed Neon, manual Neon setup, branching, and backup / restore implications.
- Synchronized parent Stage 6B / P1 plans, README, architecture notes, AGENTS project context, changelog, and AI log so the next gate is provider-management evidence plus P1-G-C decisions, not a presumed Neon email activation prerequisite.
- Kept Vercel / Neon commands, `.env` access, database connections, SQL, Production env var changes, branch creation/deletion, merge, push, deployment, promotion, rollback, alias changes, email action, secret output, Production migration, and Production data writes out of scope.
- Reason: turn the remaining P1-G-C blockers into an explicit decision packet before any live Production action.

## 2026-07-10 17:43 AEST

- Corrected the Stage 6B-P1-G-B interpretation after reviewing the pre-UI Neon history at the user's request.
- Confirmed Stage 5F created the Development / Preview Neon resource and applied `0001_initial.sql`; Stage 5J verified Preview reads; Stage 5K and Stage 5N verified controlled writes and UI persistence; Stage 5L cleaned test rows; and Stage 6B-P1-F applied schema version 5 and verified repository parity on the same approved non-production resource.
- Removed the unsupported assumption that an email activation is a prerequisite for the existing Neon resource. The attempted Vercel SSO route displayed an activation screen, but this identifies an unresolved provider-management path rather than an absent or unusable resource.
- Kept P1-G-C blocked on exact Production target/recovery evidence, access boundary, merge/deployment choices, and first-write acceptance.
- Recorded an execution-process incident: a documentation search pattern used shell backticks inside double quotes and unintentionally invoked `npm run db:migrate:dev`. The guarded development-only migration failed at the first DDL statement because `people` already existed; the SQL file is transaction-wrapped and no successful mutating statement preceded the failure. No follow-up database connection was made.
- Added the prevention rule to use single-quoted or fixed-string shell patterns when Markdown backticks appear in search text.
- Reason: preserve the verified Neon operational history, remove an over-strong blocker, and keep the accidental database connection auditable.

## 2026-07-10 13:44 AEST

- Executed Stage 6B-P1-G-B read-only Production inventory after separate explicit approval.
- Confirmed clean/pushed `V1` commit `553d91a7888f940f1b1a986455f7c718ee1530ac`, exact Vercel team/project identity, Git repository link, and `main` as the configured Production branch.
- Confirmed the historical non-official Production deployment remains Ready while the current `V1` commit has a Ready Preview deployment.
- Confirmed Production has no environment variables; `MIMI_STORAGE_RUNTIME` remains Preview-only, and encrypted Neon/Postgres variables remain Development / Preview-only.
- Confirmed the canonical Production domain returns HTTP `200` without application credentials, so the durable-write access boundary remains unresolved.
- Confirmed the Development / Preview Neon integration resource is available and recorded redacted project/endpoint fingerprints instead of secret-bearing connection values.
- Confirmed no Production database target is configured.
- Reached the official Neon Console through provider SSO but encountered an `Almost there` email-activation screen; branch names, Production-target separation, account retention, and restore capabilities were unavailable through that route. The later 17:43 evidence review clarifies that this did not invalidate the existing operational Development / Preview resource.
- Kept environment changes, SQL, database connections/mutations, branch creation, email resend, deployment, promotion, alias changes, merge, push, and secret output out of scope.
- Reason: replace assumed Production infrastructure readiness with an evidence-backed account snapshot before any target/access/deployment decision.

## 2026-07-10 13:24 AEST

- Executed Stage 6B-P1-G-A Production execution handoff documentation after explicit approval.
- Added `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md` as a derived child plan with source, scope, non-scope, safety, exit criteria, decision register, execution slices, rollback direction, and stop conditions.
- Recorded the user's decision that the current development database contains no valuable data, formal V1 Production should start from empty schema-version-5 tables, no development data should be copied, and no formal backup import is required for first launch.
- Recorded that formal vocabulary and review data begin only after the fully cloud-backed V1 starts running.
- Verified from local source that an empty Postgres snapshot can present the default Mimi workspace and the first valid cloud mutation can create the first durable learner row; added empty-read, first-real-write, refresh-persistence, and `person_id` separation to the future Production acceptance boundary.
- Split P1-G into P1-G-A documentation, P1-G-B read-only Vercel / Neon inventory, and P1-G-C human decision closure, with separate approval required before account inspection or live Production actions.
- Required a Production-specific exact-target migration guard instead of repointing development-only commands.
- Kept Vercel / Neon commands, `.env` access, Production migration, Production data writes, formal import, merge, push, deployment, authentication, and access-gate implementation out of scope.
- Reason: turn the completed non-production Postgres proof into an explicit, resumable Production handoff while preserving an empty first-launch data boundary.

## 2026-07-09 23:26 AEST

- Executed Stage 6B-P1-F non-production database verification after explicit approval.
- Added schema version 5 database inspect and Active-review guard verification scripts.
- Added npm commands for schema version 5 migration, schema inspection, Active guard verification, schema5 fixture trial/commit, and Postgres repository integration testing.
- Applied `db/migrations/0002_schema5_production_runtime.sql` only to the approved non-production development database.
- Verified schema version 5 database shape: 6 columns, 9 constraints, 1 index, and 2 Active-review guard triggers.
- Verified direct database writes to Active Vocabulary（输出词汇）review states/events are rejected by trigger guards and rolled back.
- Ran schema version 3 and schema version 5 fixture transaction rollback trials, then ran guarded schema version 5 fixture commit and cleanup.
- Added a skipped-by-default Postgres repository integration test and verified actual migrated development database behavior for schema version 5 vocabulary fields, dual limits, Active review rejection, review rollback/reset, JSON import rollback, hard delete, and schema version 5 snapshot export.
- Confirmed final development database counts returned to zero for core learning and backup import tables.
- Kept Vercel commands, Neon management commands, Production（生产环境）migration, Production import, Production deployment, Production env var changes, and formal user backup import out of scope.
- Reason: close the non-production database verification bridge before any Production execution handoff.

## 2026-07-09 00:59 AEST

- Executed Stage 6B-P1-E backup import version 5 locally after explicit approval.
- Updated backup import planning to accept schema version 3 / 4 / 5 workspace backups while preserving the existing schema version 3 fixture path.
- Added schema version 5 import support for `learningTrack`, nullable `tags`, multiple `meaningsZh`, multiple `examples`, JSON import sources, and separate Recognition / Active daily limits.
- Added an explicit guard so schema version 4 / 5 backup import plans reject review states or review events that target Active Vocabulary（输出词汇）.
- Updated the Postgres import script SQL shape for schema version 5 columns and added `npm run backup:dry-run:schema5-fixture`.
- Added a schema version 5 fixture with a JSON import batch, one Recognition Vocabulary（阅读词汇）item with review history, one Active Vocabulary item without review rows, multiple meanings/examples, tags, and dual limits.
- Updated docs for the backup-to-Postgres mapping and Stage 6B-P1 handoff so P1-F non-production database verification is the next gated step.
- Kept remote database migration, database inspection, trial rollback against a database, formal backup import, Vercel / Neon commands, `.env` changes, Production import, and Production deployment out of scope.
- Reason: make the backup import bridge match the accepted schema version 5 / Recognition-only V1 data model before any real database verification.

## 2026-07-09 00:37 AEST

- Executed Stage 6B-P1-D repository parity locally after explicit approval.
- Updated Postgres mappers and repository SQL for schema version 5 vocabulary arrays, `learning_track`, nullable `tags`, JSON import source types, and separate Recognition / Active daily limits.
- Added Postgres repository and `/api/storage/data` parity operations for hard delete, JSON batch rollback, reset-today Review rebuild, and one-word Review rollback rebuild.
- Removed the UI blocks that previously disabled those Library / Review controls for Postgres runtimes.
- Updated Review session bookkeeping so Postgres `回退1词` uses the persisted review event id from the returned runtime snapshot.
- Added local mapper, route mock, and static repository parity tests without connecting to a database.
- Kept backup import version 5, remote database migration, non-production Neon verification, Production import, and Production deployment out of scope.
- Reason: make the Postgres repository behavior match the accepted V1 browser-local Library / Review controls before backup import and real database verification.

## 2026-07-09 00:11 AEST

- Executed Stage 6B-P1-C runtime / API contract locally after explicit approval.
- Added `postgres-production` to the storage runtime（运行模式）parser and guarded it so it is accepted only in Vercel Production.
- Kept `postgres-preview` rejected in Production and preserved default `local` behavior when the runtime env var is missing or invalid.
- Updated `/api/storage/health` so Production `postgres-production` readiness does not expose public table counts, while Preview health still reports development / preview counts.
- Updated `/api/storage/data` so Production requires `postgres-production`; Preview writes still require `MIMI_ENABLE_STORAGE_UI_WRITES=true` plus the preview confirmation header, while Production does not use that header as its permission model.
- Updated the browser data hook and local UI guards so `postgres-production` is not mislabeled as `postgres-preview`, and local-only destructive controls remain blocked for all Postgres runtimes until repository parity is implemented.
- Added runtime / API route contract tests without connecting to a database.
- Kept database migration, Neon / Vercel commands, `.env` access, Production deployment, Production import, and real database validation out of scope.
- Reason: prepare the guarded `postgres-production` code path before implementing Postgres repository parity.

## 2026-07-08 23:52 AEST

- Executed Stage 6B-P1-B local schema and static tests after explicit approval.
- Added `db/migrations/0002_schema5_production_runtime.sql` as the local schema version 5 Production runtime migration draft.
- Added schema fields for `learning_track`, nullable `tags`, `meanings_zh`, `examples`, `recognition_session_limit`, and `active_session_limit`.
- Added JSON source type support for `json_file` and `json_paste`, plus backup import schema version 5 support.
- Added database-level trigger guards so V1 `review_states` and `review_events` can target only Recognition Vocabulary（阅读词汇）items.
- Extended static schema tests to cover the new `0002` migration, neutral Stage 8 review state naming, and Active Vocabulary（输出词汇）no-review-row protection.
- Kept `0001_initial.sql` historical and did not execute any database command, Vercel command, Neon command, Production migration（生产迁移）, Production import, or Production deployment.
- Reason: prepare the schema version 5 database shape locally before implementing the `postgres-production` runtime / API path.

## 2026-07-08 22:05 AEST

- Executed Stage 8-G final acceptance locally.
- Ran local browser review-flow smoke checks on temporary dev server origins.
- Verified that a Recognition Vocabulary（阅读词汇）smoke word entered Review while an Active Vocabulary（输出词汇）smoke word did not enter the Review queue.
- Verified that `完全忘记了` repeated the Recognition smoke word inside the same session and that `完全记得` completed the repeated item with the `已完成今日复习任务` modal.
- Marked Stage 8 Review Memory Algorithm（复习记忆算法）as accepted and handed the next step to Stage 6B-P1 Postgres Production runtime implementation after separate approval.
- Fixed a UI-only decorative button-sound fallback path so blocked audio playback in automated browser smoke checks is caught quietly instead of surfacing an unhandled rejection.
- Re-ran the browser smoke check after the sound fallback fix and verified the Review flow still passed without new audio errors for the clean origin.
- Reason: close the pre-Production review algorithm stage before moving to the cloud-backed V1 runtime bridge.

## 2026-07-08 21:31 AEST

- Executed Stage 8-F Postgres Production handoff locally.
- Updated Stage 6B-P1 with the final V1 Recognition Vocabulary（阅读词汇）FSRS state shape from Stage 8-D / 8-E.
- Documented that Production should keep neutral `review_states.difficulty` / `review_states.stability`, exact `due_at`, application-level natural-day due checks, and no V1 `scheduled_days` / scheduler-version columns.
- Documented that Stage 6B-P1 must reject Active Vocabulary（输出词汇）review state / event rows through repository, backup import, and preferably database-level direct write protection.
- Added a static SQL regression test for the existing neutral `review_states` / `review_events` shape in `0001_initial.sql`.
- Kept `0001_initial.sql` historical and deferred `0002_schema5_production_runtime.sql` to later explicit Stage 6B-P1 implementation approval.
- Reason: hand off the accepted Stage 8 state shape to the cloud-backed V1 Production planning path without running remote migrations.

## 2026-07-08 18:44 AEST

- Executed Stage 8-E data migration and backup compatibility locally.
- Confirmed Stage 8 does not need schema version 6 because schema version 5 already has neutral FSRS-compatible review state fields.
- Tightened JSON backup restore validation so review states and review events that point to Active Vocabulary（输出词汇）items are rejected as V1-impossible data.
- Preserved Active Vocabulary backup / restore round-trip when no review history is attached.
- Preserved Recognition Vocabulary（阅读词汇）review history round-trip, including numeric FSRS `difficulty` and `stability` values.
- Added local migration and backup tests for schema version 5 preservation, Active no-review-history round-trip, and impossible Active review state / event rejection.
- Reason: prevent broken or future-incompatible backups from importing Active scheduling state into V1 Production（生产环境）data.

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
