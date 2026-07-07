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
- Current stage: Stage 7 UI（用户界面）visual design has been implemented and locally accepted after Stage 6A Production（生产环境）release gate design and Stage 5N Preview（预览环境）UI runtime verification. Stage 7.2 local refinement is documented in `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md`; it keeps the darker soft sage palette and Motion for React interaction animation（交互动效）, replaces the visible `LexiCalm` brand area with the local cat avatar and `咪咪 Vocabulary`, slightly reduces desktop dashboard action-card density, and strengthens hover / tap feedback. Stage 7.3 local font trial is documented in `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md`; it self-hosts ChillRoundF 寒蝉全圆体 `v3.200` from Warren2060/ChillRound under OFL-1.1 and uses it for CJK（中日韩文字）UI text before system fallbacks. Stage 7.4 local theme（主题）toggle is documented in `plan_docs/PLAN_V1_STAGE7_4_THEME_TOGGLE.md`; it keeps `dark` as the default, adds a soft sage `light` theme, and stores only UI preference under `mimi-ui-theme-v1` outside study data and backup schemas. Stage 7.5 local sound audition is documented in `plan_docs/PLAN_V1_STAGE7_5_SOFT_CLICK_SOUND_TRIAL.md`; it added one Kenney CC0 click asset and a low-volume Settings preview. Stage 7.6 local sound design is documented in `plan_docs/PLAN_V1_STAGE7_6_SOUND_DESIGN.md`; it promotes the accepted soft click to app-wide button feedback, adds UI-only sound settings under `mimi-ui-sound-v1`, and adds a review-completion modal with the user-provided Mimi custom completion sound. Stage 7.7 local final acceptance is documented in `plan_docs/PLAN_V1_STAGE7_7_FINAL_ACCEPTANCE.md`; it passed local validation, route / asset checks, API safety smoke checks, and a focused in-app browser Settings check. Stage 7.8 local dual-track UI refinement is documented in `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`; it adds a Today Hub, Recognition Vocabulary（阅读词汇）/ Active Vocabulary（输出词汇）UI cards, Study / 学习 and Practice Lab / 练习室 entries, Library filters and mastery labels, and a more intentional cat Home Brand Button while preserving the existing soft sage and calm animation style. Stage 7.9 local dual-track data/import refinement is documented in `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`; it now upgrades browser-local storage to schema version 5 with `learningTrack`, nullable `tags`, `meaningsZh`, and `examples`, makes `/import` the parent page for Single input（单个输入）and Batch JSON import（批量 JSON 导入）, requires batch JSON to provide at least one meaning and one example while allowing unlimited entries, keeps `rarityScore` optional / nullable, keeps `/add` as a compatibility redirect, adds separate Recognition / Active daily limits, and keeps current review scheduling limited to Recognition Vocabulary. The Vercel project is linked, a Neon Postgres development / preview resource exists, and `db/migrations/0001_initial.sql` has been applied only to the non-production development database; Stage 7.9 did not execute a remote database migration. The confirmed release sequence remains Stage 6A gate design, then Stage 7 UI / visual design, then Stage 6B merge（合并）to `main` and formal Production execution after explicit approval. Stage 7 did not implement a persisted exam-mode PTE / IELTS toggle, AI API（人工智能接口）, dictation, spelling, writing feedback, external vocabulary source, PWA（Progressive Web App，渐进式 Web 应用）, production database migration, production import, production runtime cutover, formal user backup import, or formal production deployment. The Stage 6A gate also records that `person_id` separates learner data but is not security isolation, `postgres-preview` must not be used as a Production runtime, and durable Production writes require either explicit no-credential private-URL risk acceptance or a separate access gate. The existing active Production deployment (`dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD`) from branch `V1` remains documented as a non-official artifact and must not be treated as the formal V1 production release.
- Intended product: a mobile-first vocabulary flashcard web app for PTE study.
- Intended hosting: GitHub plus Vercel, with deployment only after explicit approval.
- Current application stack: Next.js App Router, TypeScript, Tailwind CSS, ESLint, Vitest, npm, `@neondatabase/serverless` for approved database scripts, `dotenv-cli` for explicit local env loading, and browser `localStorage` for current app study data.
- Intended production storage is one Neon Postgres database for the private group, with a `people` table and `person_id` separation for all learning data. Production migration, production import, and production deployment still require separate explicit approval.

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
npm run backup:dry-run:fixture
npm run build
npm run dev
```

The current unit test suite covers vocabulary normalization, import parsing, local repository behavior, timestamp preservation, archive/restore behavior, schema migration, person-scoped data, review scheduling, per-person review settings, review event/state updates, JSON backup validation, CSV escaping, backup round trip behavior, and static checks for the SQL schema. The development database inspection requires ignored `.env.local` values created by the approved Vercel / Neon setup.
