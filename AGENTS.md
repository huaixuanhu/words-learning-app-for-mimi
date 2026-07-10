# AGENTS.md

<!-- Generated/adapted from human-ai-governance v0.2.0 -->

## Collaboration

- Use strict low-hallucination mode. If a claim is uncertain and can drift, verify it from a reliable source before treating it as current.
- Plan before material changes. Wait for human agreement when changing project structure, data model, deployment, credentials, or persistent user data.
- Keep changes focused on the agreed scope. Protect user-owned changes and never revert unrelated work without explicit approval.
- Keep project planning documents synchronized with code when architecture, data flow, safety boundary, commands, or user workflow changes.
- When branch plans or child plans are created, write the parent source at the top with `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria`.
- Prefer Chinese for planning and handoff documents, while preserving English technical terms with Chinese translation on first mention when useful.
- Reduce repetitive contrast phrasing and keep explanations concrete.

## Project Context

- Project root: `/Users/anoria/Documents/python_coding/small_project/learningWordsformimi`
- User-provided GitHub repository: `https://github.com/huaixuanhu/words-learning-app-for-mimi.git`
- Current stage: Stage 8 Review Memory Algorithm（复习记忆算法）and Stage 8.5 Data Lifecycle（数据生命周期）and environment strategy are accepted before formal V1 Production（生产环境）launch. Stage 8-B installed and calibrated `ts-fsrs@5.4.1`; Stage 8-C implemented same-session repeat for failed Recognition Vocabulary（阅读词汇）ratings; Stage 8-D replaced the cross-day scheduler with Recognition-only FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）scheduling and local natural-day bucket（本地自然日分桶）due checks; Stage 8-E confirmed schema version 5 remains sufficient and tightened JSON backup restore against impossible Active Vocabulary review history; Stage 8-F handed the final V1 Recognition scheduler state shape to Stage 6B-P1 and added a static SQL regression for the neutral review state/event shape; Stage 8-G passed full local validation and a browser review-flow smoke check. Stage 6B-P1 Postgres Production runtime planning remains documented in `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`; Stage 6B-P1-B has added local `db/migrations/0002_schema5_production_runtime.sql` and static schema tests, but has not executed a database migration; Stage 6B-P1-C has added local `postgres-production` runtime / API（应用程序接口）contract guards and route tests; P1-F has validated the shared Postgres repository/database behavior, but the `postgres-production` route has not been exercised in Production. Stage 6B-P1-D has added local Postgres repository parity（仓储层功能对齐）code and tests. Stage 6B-P1-E has added local backup import version 5 planning, fixture, script, and tests; Stage 6B-P1-F has applied and validated schema version 5 on the approved non-production development database; Stage 6B-P1-G-A is documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md` and records an empty Production start with no development data copy or first-launch formal backup import. Stage 6B-P1-G-B completed the approved read-only Production inventory: Vercel Production uses `main`, Production env vars and database target are absent, the canonical domain is publicly reachable, and the existing Development / Preview Neon resource is operational while the attempted provider SSO management route did not expose branch/recovery details. Stage 6B-P1-G-C-0 is documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`; it is a documentation-only decision packet for provider evidence, exact Production target, access boundary, merge path, deployment mechanism, Production write acceptance, and historical deployment handling. Stage 7.2 local refinement is documented in `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md`; it keeps the darker soft sage palette and Motion for React interaction animation（交互动效）, replaces the visible `LexiCalm` brand area with the local cat avatar and `咪咪 Vocabulary`, slightly reduces desktop dashboard action-card density, and strengthens hover / tap feedback. Stage 7.3 local font trial is documented in `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md`; it self-hosts ChillRoundF 寒蝉全圆体 `v3.200` from Warren2060/ChillRound under OFL-1.1 and uses it for CJK（中日韩文字）UI text before system fallbacks. Stage 7.4 local theme（主题）toggle is documented in `plan_docs/PLAN_V1_STAGE7_4_THEME_TOGGLE.md`; it keeps `dark` as the default, adds a soft sage `light` theme, and stores only UI preference under `mimi-ui-theme-v1` outside study data and backup schemas. Stage 7.5 local sound audition is documented in `plan_docs/PLAN_V1_STAGE7_5_SOFT_CLICK_SOUND_TRIAL.md`; it added one Kenney CC0 click asset and a low-volume Settings preview. Stage 7.6 local sound design is documented in `plan_docs/PLAN_V1_STAGE7_6_SOUND_DESIGN.md`; it promotes the accepted soft click to app-wide button feedback, adds UI-only sound settings under `mimi-ui-sound-v1`, and adds a review-completion modal with the user-provided Mimi custom completion sound. Stage 7.7 local final acceptance is documented in `plan_docs/PLAN_V1_STAGE7_7_FINAL_ACCEPTANCE.md`; it passed local validation, route / asset checks, API safety smoke checks, and a focused in-app browser Settings check. Stage 7.8 local dual-track UI refinement is documented in `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`; it adds a Today Hub, Recognition Vocabulary / Active Vocabulary（输出词汇）UI cards, Study / 学习 and Practice Lab / 练习室 entries, Library filters and mastery labels, and a more intentional cat Home Brand Button while preserving the existing soft sage and calm animation style. Stage 7.9 local dual-track data/import refinement is documented in `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`; it upgrades browser-local storage to schema version 5 with `learningTrack`, nullable `tags`, `meaningsZh`, and `examples`, makes `/import` the parent page for Single input（单个输入）and Batch JSON import（批量 JSON 导入）, requires batch JSON to provide at least one meaning and one example while allowing unlimited entries, keeps `rarityScore` optional / nullable, keeps `/add` as a compatibility redirect, adds separate Recognition / Active daily limits, and keeps review scheduling limited to Recognition Vocabulary. Stage 7.10 local Library / Review controls are documented in `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md`; they add interactive side-panel review buttons, reset-today review confirmation, Library hard delete, JSON batch rollback, and `Batch imported` source chips while keeping schema version 5 and browser-local runtime semantics. Stage 7.11 local Review rollback / auto-refresh controls are documented in `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md`; they remove confusing regenerate/new-session buttons, add conservative empty-queue refresh after local Recognition Vocabulary changes, and add browser-local `回退1词` during multi-card sessions. Stage 8 explicitly keeps V1 Active Vocabulary out of review queue（复习队列）, review state（复习状态）, and review event（复习事件）creation while preserving `learningTrack`, backup（备份）, export, and import semantics for V2 compatibility. The Vercel project is linked, a Neon Postgres development / preview resource exists, and `db/migrations/0001_initial.sql` has been applied only to the non-production development database; Stage 6B-P1-F applied `db/migrations/0002_schema5_production_runtime.sql` only to the approved non-production development database; Stage 7.11, Stage 8, Stage 8.5, Stage 6B planning, Stage 6B-P1-B, Stage 6B-P1-C, Stage 6B-P1-D, Stage 6B-P1-E, Stage 6B-P1-F, Stage 6B-P1-G-A, Stage 6B-P1-G-B, and Stage 6B-P1-G-C-0 did not execute a Production database migration. The confirmed release sequence is Stage 6A gate design, Stage 7 UI / visual design, accepted Stage 8 Review Memory Algorithm, accepted Stage 8.5 Data Lifecycle and environment strategy, Stage 6B-P1 Postgres Production runtime implementation, then Stage 6B merge（合并）to `main` and formal Production execution after explicit approval. Stage 6B-P1 now has a local schema version 5 migration draft, local `postgres-production` runtime / API contract, local repository parity, local backup import version 5 support, non-production development database verification, P1-G-A handoff documentation, P1-G-B read-only inventory, P1-G-C-0 decision packet, completed provider/dashboard evidence, and an accepted policy topology; it still needs P1-G-C-4 branch/environment execution design plus final access/merge/deployment/write-acceptance decisions before any Production runtime cutover. Stage 7, Stage 8, Stage 8.5, Stage 6B planning, Stage 6B-P1-B, Stage 6B-P1-C, Stage 6B-P1-D, Stage 6B-P1-E, Stage 6B-P1-F, Stage 6B-P1-G-A, Stage 6B-P1-G-B, and Stage 6B-P1-G-C-0 did not implement a persisted exam-mode PTE / IELTS toggle, AI API, dictation, spelling, writing feedback, external vocabulary source, PWA（Progressive Web App，渐进式 Web 应用）, Production database migration, Production runtime cutover, or formal Production deployment. Formal first-launch backup import is explicitly skipped because Production starts empty and formal data begins after cloud-backed V1 launch. The Stage 6A gate also records that `person_id` separates learner data but is not security isolation, `postgres-preview` must not be used as a Production runtime, and durable Production writes require either explicit no-credential private-URL risk acceptance or a separate access gate. The existing active Production deployment (`dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD`) from branch `V1` remains documented as a non-official artifact and must not be treated as the formal V1 production release.
- Latest Stage 6B-P1-G-C-1 update, superseding the P1-G-C-0-only wording in the previous current-stage paragraph: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md` records the completed read-only Vercel Marketplace provider supplement. The Vercel-managed Neon resource is owned, available, on the Free `free_v3` plan, and connected only to Development / Preview for this project. Production still has no database environment variables or exact database target. Neon branch names, database labels, role labels, restore window, and exact empty Production target remain missing, so P1-G-C still needs human dashboard evidence, callable read-only Neon MCP evidence, separately approved browser SSO evidence, or separately approved Neon CLI / API evidence before any Production migration or runtime cutover.
- Latest Stage 6B-P1-G-C-3 update: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_3_DASHBOARD_EVIDENCE.md` records the approved read-only Neon dashboard evidence. The existing Vercel-managed Neon project `words-learning-app-for-mimi-neon` is visible in Neon Console with only one `main` default branch, database / role labels `neondb` / `neondb_owner`, Sydney region, Postgres 17, and a 6-hour restore window. No separate empty Production branch / database is visible. At evidence-capture close, P1-G-C still needed a Production target decision; the later Stage 8.5 policy below closes the topology choice without authorizing live changes.
- Latest Stage 8.5 update: `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md` is the accepted cross-stage Data Lifecycle（数据生命周期）and environment policy. For the current private trusted-group phase it selects the existing Neon project with `main` as future Production, a long-lived `staging` non-production baseline, and temporary logical `preview/*` branches derived from `staging`. Production starts empty; non-production business data does not promote into Production. After formal data begins, the independent logical-backup target is weekly plus before high-risk Production data changes, with daily backup and a separate Production project deferred until explicit upgrade triggers appear. P1-G-C-4 must document the branch/environment execution sequence before any remote change.
- Intended product: a mobile-first vocabulary flashcard web app for PTE study.
- Intended hosting: GitHub plus Vercel, with deployment only after explicit approval.
- Current application stack: Next.js App Router, TypeScript, Tailwind CSS, ESLint, Vitest, npm, `@neondatabase/serverless` for approved database scripts, `dotenv-cli` for explicit local env loading, `ts-fsrs` for Recognition FSRS scheduling, and browser `localStorage` for current app study data.
- Intended production storage is Neon Postgres in the existing `words-learning-app-for-mimi-neon` project: future Production `main`, non-production `staging`, and temporary logical `preview/*` children of `staging`. The private group uses a `people` table and `person_id` separation for all learning data. Production branch/environment changes, migration, import, and deployment still require separate explicit approval.

## Runtime And Environment

- For Python support scripts, use project `venv` or `.venv` first when present.
- For Node.js work, use the package manager recorded by the lockfile once the app is scaffolded.
- Do not assume a package manager, framework version, database provider, or deployment state before checking local files and current official docs.

## Governance Tier

This project starts as Tier 1: durable small app.

Upgrade the working gate to Tier 3 before tasks involving:

- credentials, secrets, OAuth, or auth provider configuration
- production deployment
- production database migrations
- external APIs, account connectors, or paid services
- long-running automation, scheduled jobs, email, messages, or 付费/扣款
- destructive changes to persistent study data

## Safety Boundaries

Allowed by default:

- Read local project files.
- Write agreed project files under this repository.
- Create local docs, plans, test files, and generated artifacts that stay inside the project tree.
- Run local validation commands.

Require explicit human approval:

- Initialize or rewrite git history.
- Push to GitHub or create pull requests.
- Deploy to Vercel or connect production domains.
- Create, migrate, seed, or delete remote databases.
- Read or modify `.env` values, credentials, tokens, or private account settings.
- Add tracking, analytics, AI generation, or third-party integrations that send user study data outside the app.

Forbidden without explicit approval:

- Mutate production data.
- Send emails, messages, 付费/扣款, or notifications.
- Store secrets in source control.
- Publicly expose study history, review history, or personal data.

## Data Persistence Policy

- Vocabulary records, timestamps, review history, and self-rated rarity can be personal study data.
- Collect the minimum data required for the flashcard and review workflow.
- Preserve exportability from the beginning, preferably CSV or JSON.
- Before schema migrations or destructive cleanup, plan backup/export behavior.
- Default to private trusted-group behavior with simple person switching. Treat this as data separation, not security isolation, until authentication and sharing are explicitly designed.
- Follow `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`: real learning data stays in Production; Development / Staging / Preview use disposable test data; after formal data begins, target weekly encrypted logical backups plus a backup before high-risk Production data changes.

## Before Material Changes

1. Read `AGENTS.md`, `ARCHITECTURE.md`, active `plan_docs/` files, `CHANGELOG.md`, and `governance/AI_AGENT_LOG.md` when present.
2. Run `git status --short --untracked-files=all` when the directory is a git repository.
3. Explain scope, non-scope, files likely to change, validation, and safety assumptions.
4. Wait for human agreement when required by this file or by task risk.

## Before Handoff

1. Update docs and logs required by the governance tier.
2. Run the smallest meaningful validation commands available.
3. Review the diff or file inventory.
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

The current unit test suite covers vocabulary normalization, import parsing, local repository behavior, timestamp preservation, archive/restore/hard-delete behavior, JSON batch rollback, schema migration, person-scoped data, review scheduling, reset-today review behavior, one-word review rollback, per-person review settings, review event/state updates, JSON backup validation, CSV escaping, backup round trip behavior, backup import version 5 mapping, Active review-row rejection, static checks for the SQL schema, and a skipped-by-default Postgres repository integration test. The development database inspection requires ignored `.env.local` values created by the approved Vercel / Neon setup.
