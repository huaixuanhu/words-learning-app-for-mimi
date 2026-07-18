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
- V2 status: Stage 1 through V2-8-1.1 are complete within their approved local/disposable scopes. Stage 3 advances branch `V2` local/application snapshots to Schema Version 6 and JSON backup version 3. Stage 3.1 adds guarded Review-card tapping, calm rating tones, exact-offset example-word actions, browser-only `Listen`, duplicate-guarded manual addition, and the bounded `context_explain_v1` contract. Stage 4 adds continuous phone/tablet navigation, responsive dialogs, Safe Area behavior, concise English-first copy, and fluid reduced-motion handling. Stage 5 connects timezone-owned Daily Plans, six values per Track, separate Recognition Review/New Words queues, free goals, learning stage, same-session repeat, bounded `回退1词`, whole-entry pronunciation, the two-gate whole-day reset, and guarded Space/Arrow/Enter Review controls to local application behavior and a strict `/api/study` boundary. Stage 5.1 makes the first attempt in each Daily Plan-owned Learning Episode the sole cross-day FSRS input, keeps later recovery attempts as raw evidence, requires a next-local-day checkpoint after a failed anchor or a new direct `vague`, and restores unfinished entries to their original zone after refresh. Stage 6 applies the same anchor independently to `active-fsrs-v1`, activates Active Review/New Words with `Say it`, `Spell it`, and `Dictation`, persists structured outcomes without raw typed answers or audio, binds activity and target revision to prompt evidence, rebuilds both profiles independently, and adds guarded `Start fresh in the other Track`. Stage 7A implements browser-local fixture enrichment and context explanation with honest `local-fixture` lineage, editable acceptance, accepted-only backup, and manual `Add to learning`. V2-7B-1 completes local formal orchestration, Disclosure evidence, canonical hashes, Cache/Idempotency/in-flight ownership, strict provider accounting, source revalidation, Postgres human-decision mutations, and formal UI wiring. V2-7B-2 proves the exact localhost route on a deleted schema-only Neon child using two successful synthetic Gemini calls, Replay/Cache, a database-enforced third-attempt stop, and Kill Switch. Observed usage was 1,185 tokens and US$0.000677; both temporary Auth Keys, the child branch/role, and the local secret file were deleted. V2-8-1 compacts each Track's four plan values, adds separate Actual progress rows, a 7/14-day event-backed Learning rhythm, and independent Recognition/Active FSRS Memory outlook, with no new route, schema, dependency, or write. V2-8-1.1 removes redundant learner copy and developer-facing fixture display names under a regression contract while preserving safety, disclosure, metrics, keyboard, and accessibility meaning. The accepted motion and reduced-motion rules remain unchanged. The server study-token secret is intentionally unconfigured and server-backed issuance fails closed. The live V1 database remains Schema Version 5; Production migration, Vercel credential change, deployment, and Production provider activation remain separately approved work. The next proposed product stage is V2-8-2 and requires separate approval.
- Version-hold plan: `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md` keeps SSO（Single Sign-On，单点登录）and confidential per-person isolation outside V2.
- Data lifecycle policy: `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md` remains active for V2 unless a later accepted child plan supersedes a specific part.
- Current stack: Next.js App Router, TypeScript, Tailwind CSS, ESLint, Vitest, npm, `@neondatabase/serverless`, `dotenv-cli`, `ts-fsrs`, Neon Postgres for the Production runtime, and browser `localStorage` as the local fallback.
- Current topology: Neon `main` is Production; Neon `staging` is the Development / Preview baseline; Production and non-production credentials are distinct; Production runtime is `postgres-production`.
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
- V2-3 locks Schema Version 6 for current local/application snapshots and backup version 3 for JSON backups. Existing migrations must not be rewritten. `0003_v2_schema6_data_model.sql` was executed only on the deleted V2-7B-2 schema-only child and remains unexecuted on long-term `staging` and Production.

## Runtime And Environment

- For Python support scripts, use project `venv` or `.venv` first when present.
- For Node.js work, use the package manager recorded by the lockfile.
- Do not assume a package version, provider model, price, rate limit, retention term, database target, or deployment state before checking local files and current official docs.
- Local fallback, Development / Staging / Preview, and Production data must remain distinguishable.
- Development / Staging / Preview use synthetic, fixture, or disposable test data. Real learning data stays in Production.
- Preview must not receive a Production AI credential. The completed V2-7B-2 route used a new temporary Auth Key on one deleted schema-only child; ordinary Preview remains disabled or fixture-backed.

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
npm run db:inspect:dev
npm run db:inspect:schema5:dev
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
npm run dev
```

The current test suite covers the V1 repository/scheduler/backup boundaries, V2 daily contracts, the 120-entry AI corpus and quality/security contracts, Schema Version 6 migration/backup parity, Stage 3.1 interaction contracts, Stage 4 mobile contracts, and Stage 5/5.1/6 daily-engine behavior. Stage 5 adds timezone-safe day windows, exact free goals, per-Track plans/metrics, separate queues, first-rating stage movement, reset/rebuild guards, opaque evidence, operational-data exclusion, strict route/auth handling, bounded rollback coverage, and the guarded non-wrapping 2-by-2 keyboard rating contract. Stage 5.1 adds first-attempt scheduling anchors, pass-only actuals, failed-only refresh recovery, next-day consolidation, failure-priority cursors, timezone-overlap ownership, rollback/reset rebuild, and local/Postgres parity coverage. Stage 6 adds independent Active parameters, mixed-attempt anchor regression, structured typed outcomes, activity/target-bound evidence, three-mode UI contracts, two-profile reset, and explicit Track transition coverage. Stage 7A adds fixture/Gemini lineage, strict resting routes, runtime availability, provider timeout, global quota/accounting, editable acceptance, historical accepted-content restore, source-action remapping, neutral orphan-lineage labels, exact context spans, and UI contracts. V2-7B-1 adds current-disclosure evidence, session hashing, formal Idempotency/Cache ownership, reliable failure usage reconciliation, source revalidation, atomic result persistence, formal human-decision transactions, provider activation hard-gating, and UI contracts. V2-7B-2 adds current `ai-disclosure-v3`, exact localhost activation, a database-atomic two-attempt ceiling, temporary-target inspection, and real replay/cache/cap/Kill Switch evidence. V2-8-1 adds DST-safe calendar offsets, distinct passing entries versus all attempts, current-item/Track/Parameter-Set filtering, independent Retrievability, zero-goal UI, accessible chart values, and responsive contracts. V2-8-1.1 adds removed/preserved learner-copy regression checks, collapsed technical examples, and natural fixture display names while retaining technical IDs. The full suite passes 64 files / 375 tests with the existing Postgres integration file/test skipped; all three backup dry-runs, build, governance, diff, and the 320–1280 px browser acceptance matrix pass.

V2 child plans must add focused tests before claiming the new behavior, including distinct-entry counting, free goals, daily snapshots, Track / Review Profile isolation, Active modes, Recognition pronunciation side-effect freedom, AI quota / replay / Cache / degraded mode, outbound-data minimization, structured draft acceptance, mobile responsive acceptance, and final backup / migration parity.
