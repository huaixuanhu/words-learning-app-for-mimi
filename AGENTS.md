# AGENTS.md

<!-- Generated/adapted from human-ai-governance v0.3.0 -->

## Collaboration

- Use strict low-hallucination mode. If a claim is uncertain and can drift, verify it from a reliable source before treating it as current.
- Plan before material changes. Wait for human agreement when changing project structure, data model, deployment, credentials, external services, paid usage, or persistent user data.
- Keep changes focused on the agreed scope. Protect user-owned changes and never revert unrelated work without explicit approval.
- Keep planning documents synchronized with code when architecture, data flow, safety boundary, commands, or user workflow changes.
- When branch plans or child plans are created, write the parent source at the top with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria`.
- Prefer Chinese for planning and handoff documents while preserving English technical terms with Chinese translation on first mention when useful.
- Ordinary product UI should use short, natural English for immersion. Chinese or bilingual copy remains appropriate for irreversible actions, privacy, credentials, backup replacement, and external AI data transmission.
- Reduce repetitive contrast phrasing and keep explanations concrete.
- Prefer common technical language. Add one short plain-language description when a narrower term is necessary.

## Project Context

- Project root: `/Users/anoria/Documents/python_coding/small_project/learningWordsformimi`
- User-provided GitHub repository: `https://github.com/huaixuanhu/words-learning-app-for-mimi.git`
- Current branch: `V2`.
- Current live product: cloud-backed V1 is live behind Production Basic Auth（基础认证）.
- Canonical V1 launch record: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md`.
- Canonical V2 plan: `plan_docs/PLAN_V2_MASTER.md`.
- Canonical completed V2 Stage 1 child plan: `plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md`.
- Canonical V2 Stage 2 gate and evidence: `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`, `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_EVIDENCE.md`, `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md`, and `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md`.
- Canonical completed V2 Stage 3 child plan: `plan_docs/PLAN_V2_STAGE3_DATA_MODEL_BACKUP_PARITY.md`.
- Canonical completed V2 Stage 3.1 child plan: `plan_docs/PLAN_V2_STAGE3_1_REVIEW_INTERACTION_CONTEXT_WORD_ACTIONS.md`.
- Canonical completed V2 Stage 4 child plan: `plan_docs/PLAN_V2_STAGE4_MOBILE_FOUNDATION_COPY.md`.
- Canonical completed V2 Stage 5 child plan: `plan_docs/PLAN_V2_STAGE5_DAILY_LEARNING_ENGINE.md`.
- Canonical completed V2 Stage 5.1 child plan: `plan_docs/PLAN_V2_STAGE5_1_DAILY_EPISODE_SCHEDULING_REPAIR.md`.
- Canonical completed V2 Stage 6 child plan: `plan_docs/PLAN_V2_STAGE6_ACTIVE_PRACTICE_ENGINE.md`.
- Canonical completed V2 Stage 7A child plan: `plan_docs/PLAN_V2_STAGE7A_LOCAL_AI_ENRICHMENT_COST_GUARD.md`.
- Canonical completed V2 Stage 7B-1 child plan: `plan_docs/PLAN_V2_STAGE7B_1_FORMAL_AI_LOCAL_ORCHESTRATION.md`. The accepted names are `V2-7B-1` and `V2-7B-2`; do not use A/B branch naming.
- Canonical completed V2 Stage 7B-2 child plan: `plan_docs/PLAN_V2_STAGE7B_2_NONPRODUCTION_PROVIDER_PROOF.md`.
- Canonical completed V2 Stage 8-1 child plan: `plan_docs/PLAN_V2_STAGE8_1_DASHBOARD_INSIGHTS.md`.
- Canonical completed V2 Stage 8-1.1 child plan: `plan_docs/PLAN_V2_STAGE8_1_1_LEARNER_COPY_AUDIT.md`.
- Canonical completed V2 Stage 8-2 child plan: `plan_docs/PLAN_V2_STAGE8_2_STAGING_PREVIEW_RELEASE_REHEARSAL.md`.
- Canonical completed V2 Stage 8-2.1 child plan: `plan_docs/PLAN_V2_STAGE8_2_1_PERFORMANCE_STABILISATION.md`; its separately approved protected Preview evidence is owned by V2-8-3 Gate 0B.
- Canonical completed V2 Stage 8-2.2 child plan: `plan_docs/PLAN_V2_STAGE8_2_2_REVIEW_AUDIO_BILINGUAL_EXAMPLES.md`; its `0004` has run only on non-Production `staging` and its application path is present on protected Preview.
- Canonical completed V2 Stage 8-2.3 child plan: `plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md`; it owns the pre-launch protected Preview issue register and closure evidence. It was reopened for PF-002 after the historical PF-001 closeout and completed again after explicit PF-002 / PF-003 acceptance.
- Canonical completed PF-001 child plan: `plan_docs/PLAN_V2_STAGE8_2_3_1_GOOGLE_CLOUD_STANDARD_TTS.md`; PF-001 is `High / Closed`. Gate B–E implementation/provider/deployment evidence and Gate F human closure are complete. The exact Voice Contract is `en-AU-Standard-C`, speaking rate `0.9`, pitch `0`, MP3. Local corpus evidence records 46 Good, 2 Review, 0 Bad and 2 unrecorded samples; the final MacBook + Chrome Preview retest passed Settings, Recognition, Active and example-word playback with “非常理想” audio. Mimi later independently confirmed the audio had no problem, but her exact device/browser was not recorded. iPhone + Safari remains untested.
- Canonical completed PF-002 child plan: `plan_docs/PLAN_V2_STAGE8_2_3_2_LEARNING_NAVIGATION_GOAL_HIERARCHY_TYPOGRAPHY.md`; PF-002 is `Normal / Closed by explicit acceptance`. It owns the Review/New Learning information architecture, two-goal hierarchy, session summary labels, Home panel alignment and font-only rollback. The historical exact protected Preview passed machine acceptance, but the user found Instrument Serif uncomfortable in real use; titles now return to Geist and large vocabulary restores its prior Georgia fallback. The Geist rollback exact protected Preview is Ready and the user explicitly accepted it without claiming a new comfort retest.
- Canonical PF-003 record lives directly in `plan_docs/PLAN_V2_STAGE8_2_3_PREVIEW_FEEDBACK_STABILISATION.md`; PF-003 is `Normal / Closed by explicit acceptance`. Active New Learning and Review reuse the Recognition completion dialog, current `Review complete` preference and local Mimi completion sound across all three Active modes. It has no child plan because it is a bounded UI-only parity fix; exact protected Preview machine checks pass and the user explicitly accepted it without claiming a new final-card listening run.
- Canonical V2 Stage 8-3 child plan: `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`. Local Gate 1, separately approved Gate 0B and separately approved remote read-only Gate 2 are complete. Gate 3 is separately approved within its read-only Production backup and isolated local restore scope; Gate 4 and every later mutation/Production gate require fresh approval.
- Canonical V2-8-3 Gate 2 evidence: `plan_docs/PLAN_V2_STAGE8_3_GATE2_REMOTE_READ_ONLY_INVENTORY.md`. It records the redacted Vercel/Neon/Gemini/TTS inventory, official-fact refresh, Production project SHA-256 pin, current Schema 5 counts/invariants, six-hour Neon history, credential incident boundary and Approval Stop 2.
- Canonical active V2-8-3 Gate 3 child plan: `plan_docs/PLAN_V2_STAGE8_3_GATE3_ENCRYPTED_LOGICAL_BACKUP_RESTORE_REHEARSAL.md`. Gate 3A–3B local implementation and synthetic proof pass; Gate 3C–3D wait for the implementation to be committed as a clean exact commit before any Production database connection.
- V2 status: Stage 1 through V2-8-2.3 are complete within their approved scopes. PF-001 is `High / Closed`; PF-002 and PF-003 are `Normal / Closed by explicit acceptance`. V2-8-3 Gate 0B, local Gate 1 and remote read-only Gate 2 are complete; Gate 3 is approved and in progress at its clean exact-commit checkpoint. Production V1 and Neon `main` remain Schema Version 5. Accepted Motion/reduced-motion and Daily Episode/FSRS behavior remain unchanged.
- V2-8-2.1 is complete locally and separately verified through V2-8-3 Gate 0B. It adds one persistent browser data Provider, coalesced reads, authoritative mutation/delta updates, mutation-order and delayed-response guards, a server-clock-owned Today fast path, selected-person Postgres resolution, cross-tab synchronization, privacy-safe timing, and `syd1` placement. V1, Motion, Schema, backup, AI gates, credentials, fixed historical Preview alias, and Production remained unchanged; the exact commit is available through its new protected unique/branch Preview deployment.
- V2-8-2.2 is complete. It restores Arrow selection after non-input learning buttons receive focus, shares one guarded 2×2 keyboard contract across Recognition/Active, adds a device-local browser English voice selector and preview, and carries aligned Chinese example translations through learner UI, import/edit, AI acceptance, Postgres/local storage, CSV and JSON backup Version 4. `0004_v2_bilingual_examples.sql` has run only on non-Production `staging`; Production remains unchanged. Accepted Motion/reduced-motion and scheduling remain unchanged.
- V2-8-2.3 uses numbered `PF` records, priority/status rules, bounded local fixes, exact-commit Preview retest and human closure. PF-001 is closed. PF-002 historical exact commit `52942b412d0a2281c4dded2f5b9bd716d7fd0131` is Ready as protected Preview deployment `dpl_DxQWHVspQuukaeR6LTCjKp15a3zp`; machine acceptance passed, but the user rejected its Instrument Serif typography. Geist rollback exact commit `54c8ca4492ff9b13d095ea0bd0d3d7ca702c3c2f` is Ready as protected Preview deployment `dpl_EmRVmp5YDTKgnh1VEtVBozwhRp6J`; bounded desktop machine checks pass and the user explicitly accepted it.
- PF-003 fixes an Active-only omission: after the final accepted queue result, Active opens the same completion dialog as Recognition. Its Done button skips the normal click sound and conditionally plays `mimi-review-complete.m4a` through the existing UI-only preference. Exact commit `acd009cc3879275dffa1d22c470b6c82fd1f8263` is Ready as protected Preview deployment `dpl_BAYB3tDx1m4ybKFRtw9rdf32jZon`; the user explicitly accepted it without a new final-card listening claim. Queue/pass logic, FSRS, Daily Episode, rollback semantics, TTS and Motion are unchanged.
- PF-001 implements an independent TTS guard: global 2,000 provider attempts/day, 100,000 characters/day, 1,000,000 characters/month, list-price-equivalent US$0.50/day and US$4/month, concurrency 4, Cache and Kill Switch, with no per-person limit. Cache hits do not count as provider attempts. `0005` is migrated only on non-Production `staging`; exact Preview commit `deab32f3ab96025116597881b7b69c9dde84b8f4` passed four playback paths. Gate E used 7 attempts / 170 characters / US$0.000680 including three safe diagnostic failures; Production remains closed.
- V2-8-3 Gate 1 has locally added exact `maintenance` / `schema6-readiness` / `live` cutover modes, old-client mutation refusal, dormant non-empty Schema 5/6 clone/main tooling, separately pinned `0003` / `0004` / `0005` migration SHA-256 values, secret-free cutover/paired-rollback evidence, and Production-only provider scopes. Gate 2 independently verified and pinned only the Production Neon project SHA-256; all remaining control-plane, target, backup, clone, action and confirmation gates stay active. Missing or unknown modes fail closed; Basic Auth remains ahead of maintenance; only `live` accepts Production mutations with the `v2-schema6` client marker. No remote database migration or deployment occurred. The live V1 and Neon `main` remain Schema Version 5.
- Version-hold plan: `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md` keeps SSO（Single Sign-On，单点登录）and confidential per-person isolation outside the whole V2 release. Preview feedback and V2-8-2.3 cannot reactivate them inside V2.
- Data lifecycle policy: `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md` remains active for V2 unless a later accepted child plan supersedes a specific part.
- Current stack: Next.js App Router, TypeScript, Tailwind CSS, ESLint, Vitest, npm, `@neondatabase/serverless`, `dotenv-cli`, `ts-fsrs`, Neon Postgres for the Production runtime, and browser `localStorage` as the local fallback.
- Current topology: Neon `main` is Production Schema 5; Neon `staging` is the Development / protected V2 Preview baseline at Schema 6; a no-compute Staging Schema 5 checkpoint is retained for V2-8-3. Production and non-production credentials are distinct; Production runtime is `postgres-production`.
- Branch `V2` carries a code-owned Vercel `syd1` region contract; the PF-001, PF-002 and PF-003 exact protected Preview deployments confirm their application Functions in `SYD1`.
- Current access model: shared Basic Auth protects the trusted group. `person_id` separates learning data but is not authentication, authorization, or confidential tenant isolation.

## Accepted V2 Boundary

- Both Recognition Vocabulary（阅读词汇）and Active Vocabulary（输出词汇）have separate internal Review/New Words zones; learner-facing entry labels use `Review` and `New Learning`.
- Each Track retains `Added today`, `Suggested review`, `Review goal`, and `New-word goal` data plus distinct-entry actuals for `Reviewed today` and `Learned today`. PF-002 presents them as two primary learner-facing goals with the matching added/suggested value as lighter supporting copy.
- A vocabulary entry counts once whether it is a single word, phrase, or fixed collocation.
- Review and new-word goals accept any database-safe non-negative integer; `0` is allowed.
- Recognition and Active use the same FSRS-6 algorithm family with completely independent parameter sets, state, events, rebuild behavior, and tests.
- Active V2 modes are `Say it`, `Spell it`, and `Dictation`.
- All three Active modes share one independent Active Review Profile; activity type remains on each event. Recognition and Active never share a Parameter Set（参数集）, state, event, or rebuild path.
- A history-bearing Track change requires `Start fresh in the other Track`; old history stays read-only and no state or event is copied.
- `Added today` uses append-only non-lexical creation and batch-reversal facts. Ordinary hard delete preserves the creation fact; a full `Batch imported` rollback reverses the whole source action.
- Daily queue requests bind `planId` and `planVersion`; server-owned actuals determine the remaining target, and opaque cursor/prompt tokens prevent clients from choosing internal counts or Active target revisions.
- Whole-day reset uses the exact accepted two visible gates and a transactional Idempotency Key（幂等键）record outside user backups.
- Recognition, Active, selected example words and Settings now share a local `/api/tts` client facade with no review-state write; browser SpeechSynthesis（浏览器文字转语音）is an explicit device fallback.
- Automated Speech Recognition（自动语音识别）, microphone upload, AI pronunciation scoring, PTE / IELTS writing question types, exam speaking question types, and external question banks remain outside the accepted V2 baseline.
- V2 must include the first formal AI enrichment path for extra meanings, examples, similar words, and confusable words, with editable preview and explicit human acceptance.
- Each generated draft must show readable supporting copy using its server-owned model lineage: `Generated by {modelLabel} · AI content may be inaccurate. Please review carefully before saving.` The accepted current label is `Gemini 3.1 Flash-Lite`.
- Current Production AI candidate is paid `gemini-3.1-flash-lite`, subject to the derived Stage 2 gate and a fixed 120-entry evaluation before Production integration.
- Stage 2 is Gemini-only. Datamuse, Free Dictionary, Groq comparison, `gemini-flash-latest`, and automatic provider failover are outside the active V2 route.
- The user confirmed current Gemini age / intended-use eligibility and reports AUD 20 Prepay with Auto-reload disabled. Treat this as provider-side cost containment, not a substitute for application request, token, cost, concurrency, Cache, and Kill Switch controls.
- The approved Stage 2 test key may exist only in ignored `.env.stage2.local`; never print, hash, stage, commit, copy to `.env.local`, or upload it to Vercel. A separate Production credential requires later approval.
- Current Stage 7A AI design has no per-person attempt ceiling. The server-owned `Australia/Melbourne` global boundaries are 300 provider attempts, 600,000 input tokens, 210,000 output/thinking tokens, and US$0.50 estimated cost per day; the monthly estimated-cost ceiling is US$2 and global concurrency is 2. Cache（缓存）and Kill Switch（紧急关闭开关）remain independent guards. A submitted provider attempt keeps its request count even when it later fails.
- `person_id` remains selectable and cannot divide or reset the global security and cost boundary. A future enforceable personal limit requires authenticated identity and is not part of V2.
- Paid-provider limited safety / abuse / legal retention is accepted when disclosed accurately. Do not claim Zero Retention（零保留）.
- The Stage 2 fixture evaluation and V2-7B-2 disposable provider proof were explicitly approved and used versioned provider/data/cost boundaries. Before any future Production AI call, require the current in-product disclosure plus a separately approved Production credential, migration, route, and deployment.
- V2-3 established Schema Version 6 and JSON backup Version 3. V2-8-2.2 adds `0004_v2_bilingual_examples.sql` and JSON backup Version 4; PF-001 adds operational-only `0005_v2_standard_tts_accounting.sql` without changing the Schema Version name or backup shape. `0004` and `0005` have run only on non-Production `staging`; Production `main` remains Schema Version 5.
- Every newly written English example requires an aligned non-empty Chinese translation. Legacy gaps stay explicit and discoverable through `Needs translation`; no interface may claim they are bilingual-complete. AI drafts remain editable and require explicit acceptance before backfilling a source vocabulary item.
- PF-001 makes Cloud TTS the client default across Recognition, Active Dictation/revealed answers, example-word playback and Settings preview; browser speech remains only an explicit fallback. The dedicated project `for-tts-502913` completed four candidate calls plus two exact-route calls: 6 provider attempts, 340 characters, list-price equivalent `US$0.00136`; the next identical playback was a Cache hit. Local proof uses user ADC; protected Preview uses a project/environment-bound WIF service account with no long-lived key. Its exact application deployment and human closure are complete.
- V2-8-3 Production accepts only the exact cutover modes `maintenance`, `schema6-readiness`, and `live`; missing or unknown values fail closed. Production Basic Auth runs before maintenance disclosure, and only `live` accepts mutations carrying the code-owned `v2-schema6` client marker.
- V2-8-3 clone/main database tools are dormant remote-capable commands. Before any Postgres connection they require exact target/database/role/action/confirmation gates plus authenticated live GETs to Neon's fixed official control-plane API, binding project, endpoint, branch, parent, state and clone source; local JSON/hash self-attestation is rejected and clone mode explicitly refuses the live confirmed Production-main endpoint. Gate 2 pinned the independently verified Production-project SHA-256 to `70b4a70d6cfcd6a872c5d9be7649be69332266624fb3cfec3aa6b32143caa880`; the raw project id stays outside source control and environment variables cannot override the pin. `0003` is pinned to `ef991928d299a7dfb78483c96fcd7e6fd673a009cd31ca0f0f91c606d2128fba`; `0004` to `9e00e1213366492db90a97709d605d68770a1b80f46caa8b748886bc8bd4e29c`; `0005` to `ce0890a59dcf262c38894f865cb249339e95727764c6a98a58b43eba2a4c5367`. Cutover evidence must stay secret-free and keep V1/Schema 5 and V2/Schema 6 rollback readiness paired.
- Production AI uses the independent `v2-8-3-production` scope. It requires `live`, HTTPS, Vercel Production `main`, `NODE_ENV=production`, `postgres-production`, Schema 6, atomic accounting, all Production confirmations, explicit Kill Switch state, and an initial four-attempt ceiling. Cutover evidence records the ledger before activation and after opening; removing the temporary ceiling requires separately accepted steady-state configuration and evidence.

## Runtime And Environment

- For Python support scripts, use project `venv` or `.venv` first when present.
- For Node.js work, use the package manager recorded by the lockfile.
- Do not assume a package version, provider model, price, rate limit, retention term, database target, or deployment state before checking local files and current official docs.
- Local fallback, Development / Staging / Preview, and Production data must remain distinguishable.
- Development / Staging / Preview use synthetic, fixture, or disposable test data. Real learning data stays in Production.
- Preview must not receive a Production AI credential. Protected branch `V2` Preview uses its own restricted Auth Key and exact `v2-8-2-preview` runtime gate; other Preview branches remain provider-closed or fixture-backed.
- Production cutover mode and AI readiness are server-owned environment contracts. Browser headers can identify the V2 client contract but cannot activate a cutover mode, provider scope, quota or steady-state ceiling.

## Governance Tier

- Current operational tier: Tier 3. The live private web app has ordinary credentials, confidential study data, Production hosting, and a cloud database without material economic or high-consequence account authority.
- Target capability tier: Tier 3 for accepted V2. The planned paid AI route has mechanically bounded cost and no authority over accounts, payments, messages, or high-consequence actions.
- Working tier: Tier 3.
- Tier rationale: credible risks are confidential-data exposure, credential mishandling, environment crossover, bounded paid-model abuse, and recoverable study-data loss. The app has no trading, transfer, payment, bulk account action, or comparable material authority.

The following tasks remain explicit-approval work under Tier 3:

- credentials, secrets, API keys, OAuth, or auth-provider configuration;
- external APIs, paid AI accounts, billing setup, rate-limit / Firewall（防火墙）configuration, or data transmission to a provider;
- Production deployment;
- Production database migrations;
- Production data write, cleanup, import, restore, or destructive change;
- GitHub push, pull request, or merge;
- long-running automation, scheduled jobs, email, messages, notifications, or 付费/扣款.

## Safety Boundaries

Allowed by default:

- Read local project files.
- Write agreed project files under this repository.
- Create local docs, plans, tests, and generated artifacts that stay inside the project tree.
- Run local validation commands that do not require credential inspection or remote mutation.

Require explicit human approval:

- Initialize or rewrite Git history.
- Push to GitHub or create / merge pull requests.
- Deploy to Vercel, change domains, or change Firewall rules.
- Create, migrate, seed, restore, or delete remote databases.
- Read or modify `.env` values, credentials, tokens, billing, or private account settings.
- Add AI generation, external lexical providers, analytics, or another integration that sends study data outside the app.

Forbidden without explicit approval:

- Mutate Production data.
- Send emails, messages, notifications, payments, or charges.
- Store secrets in source control or documentation.
- Publicly expose study history, review history, AI drafts, personal data, or credentials.
- Treat browser-selected `person_id` as verified identity.

## Data Persistence Policy

- Vocabulary records, timestamps, review history, typed attempts, AI enrichment, and self-rated rarity can be personal study data.
- Collect only the data required for the accepted learning and review workflow.
- Preserve exportability through JSON backup and CSV where semantically appropriate.
- Before schema migration or destructive cleanup, plan and verify backup / restore behavior.
- Default to private trusted-group behavior with simple person switching. Treat this as data separation until authentication and sharing are explicitly designed.
- Follow `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`: Production holds real data; non-production holds test data; after formal data begins, target weekly encrypted logical backups plus an additional backup before high-risk Production data changes.
- Follow `plan_docs/PLAN_V2_MASTER.md` for Review Profile isolation, daily-plan snapshots, AI provenance, quota ledger, minimal outbound lexical context, limited-retention disclosure, and accepted AI-data lifecycle.
- Raw AI prompts and raw provider responses are not retained by default when structured accepted evidence is sufficient.
- Speech Recognition / microphone audio is not collected or transmitted under the accepted V2 baseline.

## Before Material Changes

1. Read `AGENTS.md`, `ARCHITECTURE.md`, the active V2 parent / child plans, relevant V1 source plans, `CHANGELOG.md`, and `governance/AI_AGENT_LOG.md`.
2. Run `git status --short --untracked-files=all`.
3. Explain scope, non-scope, files likely to change, validation, side effects, and safety assumptions.
4. Wait for human agreement when required by this file or by task risk.
5. If the work depends on current provider facts, verify official lifecycle, pricing, privacy, limits, and API support before design or implementation.

## Before Handoff

1. Update docs and logs required by Tier 3.
2. Run the smallest meaningful validation commands.
3. Review the diff and file inventory.
4. Summarize changed files, validation, safety notes, and residual risks.

## Current Validation

Current local validation is:

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
npm run dev
```

The legacy `db:inspect:dev` and `db:inspect:schema5:dev` commands remain available only when `.env.local` intentionally targets their older Schema 3 / 5 Development baseline. They must not be run as a current-schema gate against Schema 6 `staging`. V2-8-2 Staging inspection uses `npm run v2:8-2:db:inspect` with the exact guarded non-Production identity variables loaded for that operation.

The current test suite covers the V1 repository/scheduler/backup boundaries, V2 daily contracts, the 120-entry AI corpus and quality/security contracts, Schema Version 6 migration/backup parity, Stage 3.1 interaction contracts, Stage 4 mobile contracts, and Stage 5/5.1/6 daily-engine behavior. Stage 5 adds timezone-safe day windows, exact free goals, per-Track plans/metrics, separate queues, first-rating stage movement, reset/rebuild guards, opaque evidence, operational-data exclusion, strict route/auth handling, bounded rollback coverage, and the guarded non-wrapping 2-by-2 keyboard rating contract. Stage 5.1 adds first-attempt scheduling anchors, pass-only actuals, failed-only refresh recovery, next-day consolidation, failure-priority cursors, timezone-overlap ownership, rollback/reset rebuild, and local/Postgres parity coverage. Stage 6 adds independent Active parameters, mixed-attempt anchor regression, structured typed outcomes, activity/target-bound evidence, three-mode UI contracts, two-profile reset, and explicit Track transition coverage. Stage 7A adds fixture/Gemini lineage, strict resting routes, runtime availability, provider timeout, global quota/accounting, editable acceptance, historical accepted-content restore, source-action remapping, neutral orphan-lineage labels, exact context spans, and UI contracts. V2-7B-1 adds current-disclosure evidence, session hashing, formal Idempotency/Cache ownership, reliable failure usage reconciliation, source revalidation, atomic result persistence, formal human-decision transactions, provider activation hard-gating, and UI contracts. V2-7B-2 adds current `ai-disclosure-v3`, exact localhost activation, a database-atomic two-attempt ceiling, temporary-target inspection, and real replay/cache/cap/Kill Switch evidence. V2-8-1 adds DST-safe calendar offsets, distinct passing entries versus all attempts, current-item/Track/Parameter-Set filtering, independent Retrievability, zero-goal UI, accessible chart values, and responsive contracts. V2-8-1.1 adds removed/preserved learner-copy regression checks, collapsed technical examples, and natural fixture display names while retaining technical IDs. V2-8-2 adds the exact protected-Preview activation gate, guarded Staging identity/migration inspection, and Preview-global accounting coverage. The full suite passes 64 files / 381 tests with the existing Postgres integration file/test skipped; all three backup dry-runs, build, governance, diff, guarded Schema 6 inspection, and the 320–1280 px browser acceptance matrix pass.

V2-8-2.1 supersedes the preceding suite-count snapshot: the current full suite passes 71 files / 403 tests with the existing Postgres integration file/test skipped. Added coverage owns persistent Provider and request coalescing, stable mutation ordering, delayed plan/person responses, server-clock drift, truncated response retention, cross-tab mutation synchronization, selected-person Daily fast path, privacy-safe timing, and the single-region `syd1` contract. All three backup dry-runs, lint, typecheck, Production build, isolated 390/1280 px browser flow, governance, and diff checks form the local completion gate. Separately approved Gate 0B confirms the exact protected Preview in `SYD1`, warm navigation/data-ready median/p95 `44.5/53ms` and `52/62ms`, zero transition full-data GET, one queue POST and zero provider call; it does not claim a fresh remote 390px screenshot.

V2-8-3 Gate 1 adds focused local coverage for cutover-mode and Basic-Auth ordering, old-client mutation rejection, non-empty Schema 5/6 inventory/parity, exact clone/main/project guards, pinned migration digest, secret-free manifest, paired rollback readiness, Production AI fail-closed behavior and the four-attempt ceiling. Final validation passes 13 focused files / 138 tests and 77 full-suite files / 484 tests, with the existing Postgres integration file/test skipped; lint, typecheck, all three backup dry-runs, manifest template, Production build, governance and diff checks pass. Do not run any `v2:8-3:db:*` command against a remote URL without the separately approved gate, a reviewed non-null Production-project pin and the exact evidence packet.

V2-8-2.2 current validation passes 11 focused files / 104 tests and 80 full-suite files / 506 tests, with the existing Postgres integration file/test skipped. It adds keyboard, browser voice, bilingual pair, Backup Version 4, AI output V3, `0004`, and two-hash cutover coverage. Lint, typecheck, all three backup dry-runs, script syntax, manifest template and Production build pass. Browser voice quality still requires real-device human listening; automated tests must not be described as proof that one device offers a good voice.

PF-001 local validation supersedes that snapshot: its pre-corpus focused slice passes 10 files / 35 tests; after adding the Gate D corpus test, the full suite passes 89 files / 538 tests, with the existing Postgres integration file/test skipped. It adds fixed Standard-C contract, same-origin route, explicit device fallback, fixture/Google adapters, Cache/coalescing, local/Postgres accounting, `0005`, migration-order guards, provider-data minimization and the versioned 50-entry corpus. The live corpus generated 50 valid MP3 files plus five Cache hits. Lint, typecheck, all three backup dry-runs, build, dependency audit, governance and diff checks form the closeout. At that checkpoint, local human evidence recorded 48 ratings: 46 Good, 2 Review and 0 Bad; the user accepted the minor stress weakness, while two unrecorded entries remained explicit. The later Gate F record supplies the protected Preview human closure.

PF-001 Gate E validation supersedes the suite count above: the full suite passes 90 files / 550 tests with the existing Postgres integration file/test skipped. It adds exact Preview WIF runtime gates, short-lived Vercel OIDC exchange, Runtime Cache/Postgres accounting wiring and a shared migration parser that accepts comment headers while rejecting executable SQL outside the transaction. Lint, typecheck, all three backup dry-runs, Production build, production dependency audit, governance and diff checks pass. Non-Production `staging` post-inspection confirms Schema 6, 14 required tables, 12 constraints, unchanged core counts and zero in-flight AI/TTS state. Exact Preview machine checks and the final MacBook + Chrome human playback pass; PF-001 is closed with independent Mimi and iPhone + Safari evidence explicitly unclaimed.

PF-002 historical local validation supersedes the suite count above: the full suite passes 91 files / 553 tests with the existing Postgres integration file/test skipped. Focused learner-UI contracts pass 6 files / 24 tests. Lint, typecheck, all three backup dry-runs, Production build, governance and diff checks pass. Local Production-build browser checks pass at 1280 px and 390 px with no overlay or horizontal overflow; the two desktop Home panels both measure 488 px high, and Home/Study/Recognition/Active show the accepted Review/New Learning, goal and session-label hierarchy. Exact protected Preview commit `52942b412d0a2281c4dded2f5b9bd716d7fd0131` repeats that machine acceptance, but the user subsequently rejected Instrument Serif as uncomfortable. The font-only rollback removes its load/reference, restores Geist semibold titles and the prior Georgia large-word fallback; its focused contract passes 1 file / 3 tests, with lint, typecheck, Production build, governance and diff checks also passing. Exact commit `54c8ca4492ff9b13d095ea0bd0d3d7ca702c3c2f` is Ready as protected Preview deployment `dpl_EmRVmp5YDTKgnh1VEtVBozwhRp6J`; its desktop font/protection/region/overflow/console checks pass without claiming a fresh remote 390 px test. PF-002 is `Normal / Closed by explicit acceptance` without a new comfort-retest claim.

PF-003 local validation supersedes only the suite count above: the focused Active contract passes 1 file / 4 tests, and the full suite passes 91 files / 554 tests with the existing Postgres integration file/test skipped. Lint, typecheck, all three backup dry-runs and Production build pass. Exact commit `acd009cc3879275dffa1d22c470b6c82fd1f8263` is Ready as protected Preview deployment `dpl_BAYB3tDx1m4ybKFRtw9rdf32jZon`; Vercel reports Preview, a 42-second build and application Functions in `SYD1`. An unauthenticated request redirects to Vercel Authentication, while the signed-in application shell loads with zero browser console error. It adds no Schema, backup, API, TTS, scheduling, persistent-data or Motion change. PF-003 is `Normal / Closed by explicit acceptance` without a new final-card listening claim.

V2-8-3 Gate 2 local closeout keeps the full suite at 91 files / 554 tests with the existing Postgres integration file/test skipped. Focused cutover contracts pass 3 files / 59 tests. Lint, typecheck, all three backup dry-runs, cutover manifest template, Production build, Tier 3 governance preflight and diff checks pass. The independently verified Production Neon project is stored only as SHA-256; focused coverage proves a different project is rejected before any control-plane request. No remote-capable database command, backup, branch/credential/environment mutation, provider call, migration or Production deployment ran.

V2-8-3 Gate 3 local checkpoint supersedes only the suite count above: focused backup contracts pass 1 file / 10 tests and the full suite passes 92 files / 564 tests with the existing Postgres integration file/test skipped. PostgreSQL 17.10 plus `age` 1.3.1 tool checks, synthetic encrypted backup/restore, wrong-identity and corruption rejection, cleanup, lint, typecheck, all three application backup dry-runs, Production build, Tier 3 governance and diff checks pass. Vercel Sensitive values are non-readable; the Production runner instead consumes one Neon Console `main` unpooled connection string from the system clipboard, clears it before parsing/connection and verifies the code-pinned endpoint SHA-256. Gate 3C–3D remain blocked until the implementation is committed and the synthetic proof is regenerated against that clean exact commit.

V2 child plans must add focused tests before claiming the new behavior, including distinct-entry counting, free goals, daily snapshots, Track / Review Profile isolation, Active modes, Recognition pronunciation side-effect freedom, AI quota / replay / Cache / degraded mode, outbound-data minimization, structured draft acceptance, mobile responsive acceptance, and final backup / migration parity.
