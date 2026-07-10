# Words Learning App For Mimi Stage 6B: Production Execution Plan

Created: 2026-07-07 23:53 AEST
Last updated: 2026-07-10 20:55 AEST

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`, `plan_docs/PLAN_V1_STAGE7_7_FINAL_ACCEPTANCE.md`, `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`, `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`, `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md`, `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md`, `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`, and the 2026-07-07 user confirmation that Stage 7 interaction and logic are locally accepted.
Scope: define the formal Stage 6B execution route after Stage 7 acceptance, including pre-execution drift checks, local validation, Preview（预览环境）verification, merge（合并）to `main`, Production（生产环境）deployment decision points, runtime（运行模式）choice, smoke test（冒烟测试）, backup / import（备份 / 导入）boundary, rollback（回滚）direction, and stop conditions.
Non-Scope: no GitHub push, no pull request, no merge to `main`, no Vercel command, no Neon command, no `.env` or credential read/change, no Production deployment, no Production env var change, no database migration（数据库迁移）, no user backup import, no data mutation, no authentication（认证）implementation, no AI API（人工智能接口）, no dictation engine（听写引擎）, no spelling checker（拼写检查器）, no writing feedback model, no external vocabulary source, no analytics（分析追踪）, no notification, no email, and no 付费/扣款 feature in this planning step.
Exit criteria: Stage 6B execution plan exists, parent docs and logs link to it, current local validation passes, and every future remote / credential / Production action remains behind explicit human approval.

## Reference Check

Checked on 2026-07-07:

- Vercel environments documentation: `https://vercel.com/docs/deployments/environments`
- Vercel Git deployments documentation: `https://vercel.com/docs/git`
- Vercel environment variables documentation: `https://vercel.com/docs/environment-variables`
- Vercel managing deployments documentation: `https://vercel.com/docs/deployments/managing-deployments`
- Vercel rollback documentation: `https://vercel.com/docs/deployments/rollback-production-deployment`
- Neon / Vercel integration overview: `https://neon.com/docs/guides/vercel-overview`
- Neon branching documentation: `https://neon.com/docs/introduction/branching`

Planning implications:

- Vercel has Local, Preview, and Production environments; Preview is for testing without affecting the live site, and Production is the user-facing environment.
- With Git integration, merging to the production branch, usually `main`, can create a Production deployment.
- Vercel environment variable changes apply to new deployments, so Stage 6B must set and verify env vars before the deployment that should use them.
- Neon branches are isolated copy-on-write data branches, useful for testing database changes before touching a Production target.

## 2026-07-08 Runtime Decision Update

The user chose shared Postgres Production for the formal V1 release.

This supersedes the earlier recommendation to use browser-local Production as the lowest-risk first release path. Browser-local Production remains a fallback option only. The active path is now:

1. Stage 8 Review Memory Algorithm in `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md` is accepted.
2. Stage 6B-P1 Postgres Production runtime in `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md` has reached P1-G-C-3: schema version 5 migration, backup import capability, Active review guards, and repository parity were validated against the approved non-production development database; the Production handoff and read-only inventory are documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md`, the P1-G-C decision packet is documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`, the provider supplement is documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`, the evidence route decision is documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md`, and the Neon dashboard evidence is documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_3_DASHBOARD_EVIDENCE.md`.
3. Choose the exact Production target strategy now that dashboard evidence shows only one `main` Default branch, `neondb` / `neondb_owner`, and no separate empty Production target. Then complete P1-G-C human decision closure for access boundary, merge path, deployment mechanism, and first-write acceptance method. Environment scopes are already inventoried; initial backup import is closed as `skip` because Production will start empty.
4. Only after explicit approval, run final merge, Production env setup, Production migration, deployment, and smoke tests. First-launch import remains skipped unless the user explicitly reopens that decision.

## Current Local Facts To Re-Check Before Execution

Current local facts from Stage 7 closeout:

- Branch: `V1`, tracking `origin/V1`.
- Working tree: clean at the closeout check.
- Local app default runtime: browser `localStorage`（本地浏览器存储）.
- Browser-local app data schema: version 5 with `learningTrack`, nullable `tags`, `meaningsZh`, `examples`, Recognition / Active daily limits, Library hard delete, JSON batch rollback, reset-today review, and one-word review rollback.
- Current review scheduler: accepted Stage 8 Recognition-only FSRS-6 scheduler with same-session repeat for failed Recognition ratings and local natural-day due checks.
- Stage 8 boundary: V1 scheduling applies only to `learningTrack === "recognition"`; Active Vocabulary must not enter review queue, review state, or review event creation.
- Current code accepts `local`, `postgres-preview`, and `postgres-production`.
- `postgres-preview` is development / preview only and is rejected in Vercel Production.
- Stage 5F SQL migration has been applied only to the non-production development database.
- The non-production development database has `0001_initial.sql` plus `0002_schema5_production_runtime.sql` applied. Production has not been migrated.
- Existing active Production deployment from branch `V1` is documented as a non-official artifact and must not be treated as the formal V1 release.
- P1-G-B confirmed the Vercel Production branch is `main`, Production has no environment variables, the canonical domain is publicly reachable, and no Neon Production target is configured.
- P1-G-B confirmed the current `V1` commit has a Ready Preview deployment.
- Prior Stage 5F / 5J / 5K / 5L / 5N and P1-F evidence confirms the Development / Preview Neon resource is operational. P1-G-C-3 dashboard evidence confirms the current Neon project has only one `main` Default branch, `neondb` / `neondb_owner`, no child branches, and a 6-hour restore window.

Stage 6B execution must re-check all drift-prone facts before any live action:

- `git status --short --branch --untracked-files=all`
- latest `V1` commit and whether it is pushed
- Vercel project identity and production branch
- current Vercel deployments and aliases
- Preview and Production env var scopes
- exact Neon database / branch target
- whether the user wants browser-local Production or shared Postgres Production
- whether no-credential private-URL risk is accepted if durable Production writes are enabled without authentication

## Primary Decision: First Formal Production Runtime

Stage 6B must choose one of two routes before execution.

### Option A: Browser-Local Formal Production

Deferred after the 2026-07-08 user decision. This remains a fallback only if the user later decides not to launch V1 with shared cloud data.

Behavior:

- Production app uses browser `localStorage`.
- No shared durable Production database runtime is enabled.
- No Production database migration or import is required.
- Each device / browser stores its own study data.
- The learner must use JSON backup / restore for portability.

Why this is the lowest-risk V1 route:

- It matches the app's current default runtime.
- It avoids turning the unauthenticated public URL into a shared writable database surface.
- It avoids forcing a schema-version-5 Postgres migration before the UI is already formally released.
- It keeps Production env vars simple: do not set `MIMI_STORAGE_RUNTIME=postgres-preview`, `MIMI_ENABLE_STORAGE_UI_WRITES`, or `MIMI_ENABLE_STORAGE_SMOKE_WRITES` in Production.

Acceptance tradeoff:

- Data is not shared across the private group through a central database.
- Browser data can be lost if the user clears site data without a backup.

### Option B: Shared Postgres Production

Required if the first formal Production release must share vocabulary / review data across the private group.

Selected by the user on 2026-07-08. This route is not a direct deploy-only execution. `Stage 6B-P1 Postgres Production Runtime` has validated the required local and non-production database bridge through P1-F, P1-G-A documented the Production handoff, P1-G-B completed the read-only Vercel / Neon inventory, P1-G-C-0 documented the remaining decision packet, P1-G-C-1 completed a read-only Vercel Marketplace provider supplement, P1-G-C-2 selected the evidence route, and P1-G-C-3 captured the read-only Neon dashboard evidence. Formal Production still needs exact Production target strategy, P1-G-C human decision closure, and explicit Stage 6B execution approval.

Status before any shared durable Production writes:

- Upgrade the working gate to Tier 3.
- Done locally / non-production: design and implement a `postgres-production` runtime mode.
- Done locally / non-production: reconcile browser-local schema version 5 with the Postgres schema, including `learningTrack`, nullable `tags`, and multiple meanings / examples.
- Done locally / non-production: incorporate Stage 8's accepted Recognition review memory state shape before any Production migration.
- Done locally / non-production: keep Active Vocabulary stored/exported/imported without scheduling state or events in V1.
- Done locally: add server-only Production write gates that are different from Preview smoke flags.
- Decide whether to accept no-credential private-URL risk or add an access gate.
- Done locally / non-production: add tests for Production runtime rejection / acceptance, person-scoped reads/writes, destructive controls, backup import, rollback behavior, and secret safety.
- Done against the approved non-production development database: apply schema version 5 migration, verify schema, run fixture dry run / rollback / guarded commit / cleanup, and exercise repository integration.
- Done in P1-G-A: record the user's empty Production start and skip formal backup import for first launch because the current development state contains no valuable data.
- Done in P1-G-B: confirm exact Vercel project/team, `main` Production branch, current Production / Preview deployments and aliases, environment variable scopes, public canonical-domain behavior, and the absence of a configured Production database target.
- Done in P1-G-C-0: document the provider evidence requirements, recommended defaults, accepted alternatives, stop conditions, and the next read-only provider supplement in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`.
- Done in P1-G-C-1: confirm the Vercel-managed Neon resource is owned, available, Free-plan, and connected only to Development / Preview; confirm the CLI metadata path does not expose branch / database / restore details.
- Done in P1-G-C-2: recommend human dashboard evidence as the next safest route and define the required metadata / redaction checklist.
- Done in P1-G-C-3: capture the approved read-only Neon dashboard evidence; the current project has only `main`, database / role labels `neondb` / `neondb_owner`, no child branches, no visible distinct Production target, and a 6-hour restore window.
- Still required before Production: choose the exact target strategy, confirm access boundary, merge path, deployment mechanism, and first-write acceptance scope.

Stage 6B should resume only after the P1-F result is accepted, P1-G-A / P1-G-B / P1-G-C-0 / P1-G-C-1 / P1-G-C-2 / P1-G-C-3 are synchronized, and P1-G-C records the remaining Production choices.

## Deferred Stage 6B-A Path

This browser-local execution path is currently deferred:

1. Stage 6B-A plan acceptance: user confirms browser-local formal Production for V1.
2. Local final validation: run the local validation ladder listed below.
3. Git readiness: confirm `V1` is clean, pushed, and reviewed.
4. Clean Preview: deploy or use a clean Preview from final `V1`, verify `target=preview`, and run route / API safety smoke checks.
5. Production preflight: re-check Vercel production branch, current Production deployment, Production env vars, and official docs.
6. Merge approval: only after explicit approval, merge `V1` to `main`.
7. Production deployment approval: only after explicit approval, allow Git integration or run the approved deployment command.
8. Production smoke: verify the app routes, expected local runtime, blocked smoke writes, backup/export path, and absence of relevant error logs.
9. Closeout: update docs/logs with exact deployment id, URL, validation evidence, residual risk, and rollback notes.

## Local Validation Gate

Run before Preview or Production execution:

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run build
git diff --check
```

Use `npm run db:inspect:dev` only after explicit approval because it reads ignored `.env.local` values and connects to the development database.

## Preview Gate

Before formal Production, Stage 6B should verify a clean Preview from the final `V1` state:

- Confirm deployment target is `preview`.
- Confirm app routes load: `/`, `/study`, `/import`, `/library`, `/review`, `/practice-lab`, `/export`, `/settings`.
- Confirm `/add` redirects to `/import`.
- Confirm local browser runtime behavior if choosing Option A.
- Confirm `/api/storage/health` reports the expected mode for that Preview configuration.
- Confirm write smoke endpoints remain disabled unless a temporary Preview-only smoke is explicitly approved.
- If any temporary Preview write flag is enabled, write the smallest controlled row set, clean it, remove the flag, and verify the disabled state again.

## Production Gate For Option A

Pre-deploy:

- Confirm Stage 7 is accepted.
- Confirm the user accepts browser-local Production for the first formal V1 release.
- Confirm `V1` is clean and final.
- Confirm `main` is the Vercel production branch.
- Confirm Production env vars do not include preview-only storage flags.
- Confirm no Production database migration or import is planned for Option A.

Execution:

- Merge `V1` to `main` only after explicit approval.
- Let Vercel Git integration create the Production deployment or run an explicitly approved Production deployment command.
- Inspect the resulting deployment and verify `target=production`.

Smoke:

- `/` loads and shows `咪咪 Vocabulary`.
- `/import`, `/library`, `/review`, `/export`, and `/settings` load.
- `/add` redirects to `/import`.
- `/api/storage/health` does not expose Production Postgres writes.
- `POST /api/storage/smoke` is blocked unless a separately approved Production smoke write exists.
- JSON backup / export path remains visible.
- Person switching remains visible as data separation, not security isolation.
- Error logs show no relevant new server errors.

Closeout:

- Record deployment id, URL, commit, Production branch, runtime choice, smoke result, and rollback option.
- Keep the non-official old Production deployment documented as historical context.

## Production Gate For Option B

If the user chooses shared Postgres Production:

1. Follow `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`.
2. Follow `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md` after Stage 8 is accepted.
3. Implement `postgres-production` only after explicit approval.
4. Add schema migration / data import / access boundary / scheduler rebuild / rollback tests.
5. Verify against a non-production Neon branch.
6. Return to Stage 6B only after the new algorithm, runtime, and data path have passed local and Preview validation.

## Backup And Import Boundary

Option A:

- No Production import.
- Recommend a fresh JSON backup from the user's current browser before relying on the formal Production URL.
- If the local browser data is intentionally empty, record that no import was needed.

Option B:

- First launch uses no formal backup import. The user confirmed on 2026-07-10 that the current development database contains no valuable data and formal data should begin only after cloud-backed V1 launch.
- Apply the schema to an explicitly confirmed empty Production target and verify all learning / backup-import counts are `0` before runtime cutover.
- Do not copy, clone, or promote development data into Production.
- Keep the schema version 5 import tooling available for future recovery or a separately approved later migration.
- If import is reopened later, require a fresh JSON backup, metadata/count validation, dry run, rollback trial, exact target/person mapping, and explicit commit approval.

## Rollback Direction

Deployment rollback:

- If Production deployment fails, stop before any database/import action.
- Prefer Vercel rollback or alias restoration to the previous known-good Production deployment.
- Preserve error evidence without printing secrets.

Database rollback:

- For Option A, there is no Production database mutation.
- For Option B initial launch, migration must have an exact-target guard and documented rollback procedure. Import rollback is not part of the first-launch path because no formal import will run.

User-data rollback:

- For browser-local Production, restore from JSON backup if site data is cleared or corrupted.
- For future Postgres Production, use backup import mappings, database transactions, and Neon recovery/branching features according to the accepted implementation plan.

## Stop Conditions

Stop immediately if:

- The user has not explicitly approved the specific live action.
- Working tree is dirty in a way that is not understood.
- `V1` is not the intended release branch.
- `main` is not confirmed as the Vercel production branch.
- Vercel project/team scope is ambiguous.
- Production env vars include preview-only write flags.
- Any secret would be printed or committed.
- Production database target is ambiguous.
- Stage 8 scheduler state shape has not been accepted.
- The user chooses shared Postgres Production before `postgres-production` exists.
- A Preview or Production deployment reports an unexpected target.
- Route/API smoke fails.
- Error logs show new relevant server failures.
- The user pauses or changes the release decision.

## Open Human Decisions

Before execution, the user must still choose:

- Choose the exact empty Production target plus recovery path now that P1-G-C-3 has confirmed the current resource has only `main` and no separate Production target.
- Access boundary: no-credential private-URL risk acceptance, or a separate access gate before Production database writes.
- Merge path: direct merge to `main` or pull request review first.
- Production deployment mechanism: Vercel Git integration after merge or explicit CLI deployment.
- Whether the existing non-official Production deployment should remain as history or be replaced/archived after formal release.
- Whether to run only read-only Production smoke checks or approve a smallest-possible write smoke.

Closed on 2026-07-10:

- Formal user backup import is skipped for first launch; Production begins with empty schema-version-5 tables and formal data starts after cloud-backed V1 launch.

## Stage 6B Planning Result

This document is a plan only. It does not execute Stage 6B.

Stage 6B-P1-G-A documentation, P1-G-B read-only inventory, P1-G-C-0 decision packet, P1-G-C-1 provider supplement, P1-G-C-2 evidence route decision, and P1-G-C-3 dashboard evidence capture are complete. P1-G-B found no Production env vars or database target and confirmed the canonical domain is publicly reachable. P1-G-C-1 confirmed the Vercel-managed Neon resource is owned, available, Free-plan, and connected only to Development / Preview. P1-G-C-3 confirmed the current resource has only one `main` Default branch, `neondb` / `neondb_owner`, no child branches, no visible distinct Production target, and a 6-hour restore window. No formal Production release should proceed before the target strategy and final P1-G-C decisions close.
