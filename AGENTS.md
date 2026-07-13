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
- V2 status: documentation baseline accepted on 2026-07-13. No V2 code, schema migration, external API, paid provider, credential, or deployment action has been completed under that plan.
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
- Recognition cards will receive a browser SpeechSynthesis（浏览器文字转语音）playback button with no review-state side effect.
- Automated Speech Recognition（自动语音识别）, microphone upload, AI pronunciation scoring, PTE / IELTS writing question types, exam speaking question types, and external question banks remain outside the accepted V2 baseline.
- V2 must include the first formal AI enrichment path for extra meanings, examples, similar words, and confusable words, with editable preview and explicit human acceptance.
- Current Production AI candidate is paid `gemini-3.1-flash-lite`, subject to a fresh official-doc check and a fixed 50–100 entry evaluation before provider setup.
- Groq `openai/gpt-oss-20b` is a comparison / manual alternative, not automatic failover.
- Initial AI ceilings are 100 provider attempts per person per local day and 200 provider attempts across Production per server-owned `Australia/Melbourne` budget day, with independent global token, cost, concurrency, Cache（缓存）, and Kill Switch（紧急关闭开关）guards. A submitted provider attempt keeps its request count even when it later fails.
- Per-person AI limits are fairness controls; only global controls are a security boundary because `person_id` is selectable.
- Paid-provider limited safety / abuse / legal retention is accepted when disclosed accurately. Do not claim Zero Retention（零保留）.
- Before the first external AI call, require a versioned user confirmation that names the provider, outbound lexical fields, excluded personal fields, limited content retention, separate technical / usage metadata, and the active quota / cost boundary.
- The exact V2 schema version remains a child-plan decision; Version 6 is only the current candidate. Existing executed migrations must not be rewritten.

## Runtime And Environment

- For Python support scripts, use project `venv` or `.venv` first when present.
- For Node.js work, use the package manager recorded by the lockfile.
- Do not assume a package version, provider model, price, rate limit, retention term, database target, or deployment state before checking local files and current official docs.
- Local fallback, Development / Staging / Preview, and Production data must remain distinguishable.
- Development / Staging / Preview use synthetic, fixture, or disposable test data. Real learning data stays in Production.
- Preview must not receive a Production AI credential. AI stays disabled or fixture-backed until a separately approved non-production provider-test route exists.

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
npm run build
npm run dev
```

The current V1 unit test suite covers vocabulary normalization, import parsing, local repository behavior, timestamp preservation, archive / restore / hard delete, JSON batch rollback, schema migration, person-scoped data, Recognition review scheduling, reset-today behavior, one-word rollback, per-person settings, review event / state updates, JSON backup validation, CSV escaping, backup round trip, backup import version 5 mapping, Active review-row rejection, static SQL checks, and a skipped-by-default Postgres integration test.

V2 child plans must add focused tests before claiming the new behavior, including distinct-entry counting, free goals, daily snapshots, Track / Review Profile isolation, Active modes, Recognition pronunciation side-effect freedom, AI quota / replay / Cache / degraded mode, outbound-data minimization, structured draft acceptance, mobile responsive acceptance, and final backup / migration parity.
