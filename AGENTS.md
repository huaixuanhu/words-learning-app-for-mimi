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
- Canonical completed local V2 Stage 8-2.2 child plan: `plan_docs/PLAN_V2_STAGE8_2_2_REVIEW_AUDIO_BILINGUAL_EXAMPLES.md`; Preview/Staging rollout remains separately approved.
- Canonical V2 Stage 8-3 child plan: `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`. Local Gate 1 and separately approved Gate 0B are complete; Gate 2 and every later remote/Production gate require fresh approval.
- V2 status: Stage 1 through V2-8-2 are complete within their approved scopes. V2-8-2.1 is separately proven on protected Preview; V2-8-2.2 is complete on the local branch only. The current local contract is Schema Version 6 plus additive `0004`, JSON backup Version 4, shared Recognition/Active Arrow controls, device-selectable browser English voice, and aligned bilingual examples. Long-lived `staging` / protected Preview still run the previous Schema 6 contract; Production V1 and Neon `main` remain Schema Version 5. V2-8-3 local Gate 1 and remote Gate 0B are complete; Gate 2 and every later Production operation remain unapproved. Accepted Motion/reduced-motion and Daily Episode/FSRS behavior remain unchanged.
- V2-8-2.1 is complete locally and separately verified through V2-8-3 Gate 0B. It adds one persistent browser data Provider, coalesced reads, authoritative mutation/delta updates, mutation-order and delayed-response guards, a server-clock-owned Today fast path, selected-person Postgres resolution, cross-tab synchronization, privacy-safe timing, and `syd1` placement. V1, Motion, Schema, backup, AI gates, credentials, fixed historical Preview alias, and Production remained unchanged; the exact commit is available through its new protected unique/branch Preview deployment.
- V2-8-2.2 is complete locally. It restores Arrow selection after non-input learning buttons receive focus, shares one guarded 2×2 keyboard contract across Recognition/Active, adds a device-local browser English voice selector and preview, and carries aligned Chinese example translations through learner UI, import/edit, AI acceptance, Postgres/local storage, CSV and JSON backup Version 4. `0004_v2_bilingual_examples.sql` is a forward-only Schema 6 addition; it has not run on Staging/Preview or Production. Accepted Motion/reduced-motion and scheduling remain unchanged.
- V2-8-3 Gate 1 has locally added exact `maintenance` / `schema6-readiness` / `live` cutover modes, old-client mutation refusal, dormant non-empty Schema 5/6 clone/main tooling, separately pinned `0003` / `0004` migration SHA-256 values, secret-free cutover/paired-rollback evidence, and a Production-only AI activation scope. Missing or unknown modes fail closed; Basic Auth remains ahead of maintenance; only `live` accepts Production mutations with the `v2-schema6` client marker. No remote account/database access, deployment, migration, credential change or AI call occurred. The live V1 and Neon `main` remain Schema Version 5.
- Version-hold plan: `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md` keeps SSO（Single Sign-On，单点登录）and confidential per-person isolation outside V2.
- Data lifecycle policy: `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md` remains active for V2 unless a later accepted child plan supersedes a specific part.
- Current stack: Next.js App Router, TypeScript, Tailwind CSS, ESLint, Vitest, npm, `@neondatabase/serverless`, `dotenv-cli`, `ts-fsrs`, Neon Postgres for the Production runtime, and browser `localStorage` as the local fallback.
- Current topology: Neon `main` is Production Schema 5; Neon `staging` is the Development / protected V2 Preview baseline at Schema 6; a no-compute Staging Schema 5 checkpoint is retained for V2-8-3. Production and non-production credentials are distinct; Production runtime is `postgres-production`.
- Branch `V2` now carries a code-owned Vercel `syd1` region contract. It does not alter the currently deployed protected Preview and takes effect only through a later separately approved V2 deployment.
- Current access model: shared Basic Auth protects the trusted group. `person_id` separates learning data but is not authentication, authorization, or confidential tenant isolation.

## Accepted V2 Boundary

- Both Recognition Vocabulary（阅读词汇）and Active Vocabulary（输出词汇）will have separate Review and New Words zones.
- Each Track will display `Added today`, `Suggested review`, `Review goal`, and `New-word goal`, plus distinct-entry actuals for `Reviewed today` and `Learned today`.
- A vocabulary entry counts once whether it is a single word, phrase, or fixed collocation.
- Review and new-word goals accept any database-safe non-negative integer; `0` is allowed.
- Recognition and Active use the same FSRS-6 algorithm family with completely independent parameter sets, state, events, rebuild behavior, and tests.
- Active V2 modes are `Say it`, `Spell it`, and `Dictation`.
- All three Active modes share one independent Active Review Profile; activity type remains on each event. Recognition and Active never share a Parameter Set（参数集）, state, event, or rebuild path.
- A history-bearing Track change requires `Start fresh in the other Track`; old history stays read-only and no state or event is copied.
- `Added today` uses append-only non-lexical creation and batch-reversal facts. Ordinary hard delete preserves the creation fact; a full `Batch imported` rollback reverses the whole source action.
- Daily queue requests bind `planId` and `planVersion`; server-owned actuals determine the remaining target, and opaque cursor/prompt tokens prevent clients from choosing internal counts or Active target revisions.
- Whole-day reset uses the exact accepted two visible gates and a transactional Idempotency Key（幂等键）record outside user backups.
- Recognition cards now have a locally implemented browser SpeechSynthesis（浏览器文字转语音）playback button with no review-state write.
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
- V2-3 established Schema Version 6 and JSON backup Version 3. V2-8-2.2 keeps Schema Version 6, adds immutable forward migration `0004_v2_bilingual_examples.sql`, and advances new JSON backups to Version 4; Version 1–3 remain readable. `0003` has run on deleted non-Production proof/rehearsal children and long-lived `staging`; `0004` has not run remotely, and Production `main` remains Schema Version 5.
- Every newly written English example requires an aligned non-empty Chinese translation. Legacy gaps stay explicit and discoverable through `Needs translation`; no interface may claim they are bilingual-complete. AI drafts remain editable and require explicit acceptance before backfilling a source vocabulary item.
- Browser SpeechSynthesis uses a device-local selected English voice with safe fallback and no study-state write. Cloud TTS remains outside the current baseline unless real-device listening triggers a separately planned provider/cost/privacy gate.
- V2-8-3 Production accepts only the exact cutover modes `maintenance`, `schema6-readiness`, and `live`; missing or unknown values fail closed. Production Basic Auth runs before maintenance disclosure, and only `live` accepts mutations carrying the code-owned `v2-schema6` client marker.
- V2-8-3 clone/main database tools are dormant remote-capable commands. Before any Postgres connection they require exact target/database/role/action/confirmation gates plus authenticated live GETs to Neon's fixed official control-plane API, binding project, endpoint, branch, parent, state and clone source; local JSON/hash self-attestation is rejected and clone mode explicitly refuses the live confirmed Production-main endpoint. The code-owned approved Production-project SHA-256 is intentionally `null` in Gate 1; only a separately approved Gate 2 inventory and reviewed code change may pin it, and environment variables cannot override it. `0003` is pinned to `ef991928d299a7dfb78483c96fcd7e6fd673a009cd31ca0f0f91c606d2128fba`; additive `0004` is pinned to `9e00e1213366492db90a97709d605d68770a1b80f46caa8b748886bc8bd4e29c`. Cutover evidence must stay secret-free and keep V1/Schema 5 and V2/Schema 6 rollback readiness paired.
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

V2 child plans must add focused tests before claiming the new behavior, including distinct-entry counting, free goals, daily snapshots, Track / Review Profile isolation, Active modes, Recognition pronunciation side-effect freedom, AI quota / replay / Cache / degraded mode, outbound-data minimization, structured draft acceptance, mobile responsive acceptance, and final backup / migration parity.
