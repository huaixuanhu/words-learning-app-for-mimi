# Words Learning App For Mimi Stage 6B-P1-G-C: Human Decision Closure

Created: 2026-07-10 18:40 AEST
Last updated: 2026-07-10 18:57 AEST

Source plan:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md`

Derived from:
- `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`
- `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`
- `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`
- `ARCHITECTURE.md`
- P1-G-B read-only Production inventory completed on 2026-07-10
- the 2026-07-10 correction that Neon email activation is not an established prerequisite for the existing operational Development / Preview resource

Scope:
- Turn the remaining P1-G-C choices into an explicit decision packet before any live Production（生产环境）action.
- Define acceptable provider-management path（供应商管理路径）or equivalent evidence for Neon branch / database / recovery capability.
- Define the decision options for Production target（生产目标）, access boundary（访问边界）, merge path（合并路径）, deployment mechanism（部署机制）, Production write acceptance, and the existing non-official Production deployment.
- Define the next separately approved read-only provider supplement and the stop conditions before migration（迁移）, environment variable（环境变量）changes, or deployment.

Non-Scope:
- No Vercel or Neon command.
- No `.env` read, credential value output, connection string handling, token handling, or private account setting change.
- No SQL command, database connection, database inspection, migration, branch creation, branch deletion, restore, backup import（备份导入）, or data write.
- No Production environment variable change, GitHub push, pull request, merge to `main`, Vercel deployment, promotion, rollback（回滚）, or alias change.
- No authentication（认证）or access-gate implementation.
- No Production smoke write.
- No AI API（人工智能接口）, external vocabulary source, analytics（分析追踪）, notification, email, or 付费/扣款 feature.

Exit criteria:
- The remaining P1-G-C decisions are listed with recommended defaults and accepted alternatives.
- The exact evidence required before choosing a Neon Production target is explicit.
- The next live/read-only provider supplement has a bounded scope and requires separate approval.
- Parent Stage 6B / P1 documents, README, architecture notes, changelog, and AI log point to this decision packet.
- Local documentation validation passes.

## Current State

P1-G-A, P1-G-B, P1-G-C-0, and P1-G-C-1 are complete.

Known current facts:

- Formal V1 runtime remains `postgres-production`.
- First launch starts with an empty Production database target.
- Development data must not be copied, cloned, promoted, or treated as seed data.
- Formal first-launch backup import is closed as `skip`.
- Vercel Production branch is `main`.
- Production currently has no database environment variables.
- The canonical Production domain is publicly reachable.
- The existing Development / Preview Neon resource is operational.
- The attempted Vercel SSO route did not expose Neon branch / recovery details.
- Email activation is not an established prerequisite for using the existing resource.
- P1-G-C-1 confirmed through Vercel CLI 55.0.0 that the Vercel-managed Neon resource is owned, available, on the `free_v3` Free plan, and connected to this project only for Development / Preview environments.

Open blocker:

P1-G-C cannot close until a provider-management path or equivalent evidence identifies the actual Neon branch / database / recovery capability. P1-G-C-1 did not expose branch names, database labels, role labels, restore window, or an exact empty Production target. Production migration and runtime cutover remain unauthorized.

## Reference Check

Re-checked on 2026-07-10:

- Vercel Git deployments: `https://vercel.com/docs/git`
- Vercel environment variables: `https://vercel.com/docs/environment-variables`
- Vercel promotion / rollback: `https://vercel.com/docs/deployments/promoting-a-deployment` and `https://vercel.com/docs/instant-rollback`
- Neon Vercel integration overview: `https://neon.com/docs/guides/vercel-overview`
- Neon Vercel-managed integration: `https://neon.com/docs/guides/vercel-managed-integration`
- Neon manual Vercel setup: `https://neon.com/docs/guides/vercel-manual`
- Neon branching and backup / restore: `https://neon.com/docs/introduction/branching` and `https://neon.com/docs/manage/backups`

Planning implications:

- Merging or pushing to the configured Vercel Production branch can create a Production deployment.
- Vercel environment variable changes affect new deployments, not already-created deployments.
- Promoting a Preview deployment to Production changes it to Production environment variables; Preview environment variables must not be treated as Production values.
- Vercel Instant Rollback does not rebuild environment variables. On Hobby, rollback capability is limited compared with Pro / Enterprise, so exact rollback availability must be checked live before relying on it.
- Neon branches are copy-on-write branches and can be created from current or past state, but the actual branch names, restore window, plan limits, and restore workflow must be verified on the real account.
- Neon backup / instant restore history can range from 1 to 30 days depending on plan, so a generic Neon restore claim is not enough evidence for this project.
- Vercel-managed Neon can inject `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PG*`, and legacy `POSTGRES_*` variables into selected environments; Production scope must be explicit and values must not be printed.
- Manual Neon connection remains a fallback if managed integration access stays blocked, but it requires stronger secret-handling approval because it involves direct connection-string handling.

## Required Decisions

### 1. Provider-Management Evidence Path

Recommended default:

Use the existing Vercel-managed Neon resource if an approved read-only management path can identify branch names, database names, Production separation, plan, restore window, and connection-variable scope without printing secrets.

Accepted alternatives:

- Use equivalent human-provided evidence from the Neon / Vercel dashboards, such as branch names, database labels, plan / restore-window text, and screenshots or copied non-secret metadata.
- Use a separately approved Vercel / Neon CLI or API read-only inventory if the account scope is clear and output is redacted.
- Use manual Neon connection only if managed integration access remains blocked and the user explicitly approves direct secret handling.

Decision status: pending.

Minimum evidence before target selection:

- exact provider path used;
- Neon project / resource identity without secret-bearing URLs;
- branch names and which branch is primary / root;
- database and role labels;
- whether an empty, distinct Production target already exists;
- restore window / retention and account-plan limitations;
- whether branch creation, restore, or target recreation is available on the actual account;
- whether the Production target can be connected to Vercel Production only.

Stop if:

- the only proposed target is the existing Development / Preview endpoint;
- branch / restore details cannot be inspected;
- the path would print or store secrets;
- the user has not separately approved account inspection.

### 2. Production Target

Recommended default:

Prefer a distinct empty Production branch / database target that belongs to the existing operational Neon resource only after provider evidence proves it is separable from Development / Preview and has an acceptable recovery path.

Accepted alternatives:

- Create a separate Vercel-managed Neon database / project for Production if that is cleaner than branch-level separation. This requires explicit approval because it creates cloud infrastructure and may affect billing / plan settings.
- Use a manually connected Neon Production target if managed integration access remains unresolved. This requires direct connection-string handling and explicit secret-safety approval.

Decision status: pending.

Target acceptance must record:

- target resource label;
- branch label;
- database label;
- role label;
- region;
- non-secret fingerprint only if needed;
- confirmation that all learning and backup-import tables are empty after migration and before runtime cutover;
- recovery direction before first formal write.

### 3. Access Boundary

Recommended default:

Do not enable durable public Production writes until the user chooses one of these paths:

- `accept-private-url-risk`: explicitly accept that the public URL is not real authorization and `person_id` is data separation, not security isolation;
- `add-access-gate`: create a separate access-gate stage before durable writes.

Decision status: pending.

Notes:

- The current canonical Production URL returned HTTP `200` without application credentials.
- Vercel deployment protection does not currently close access for the canonical project domain.
- If `accept-private-url-risk` is chosen, the launch docs must record the exact human risk acceptance before Production writes.
- If `add-access-gate` is chosen, P1-G-C should stop and create a new child plan for the gate before migration/runtime cutover.

### 4. Merge Path

Recommended default:

Use a pull request from `V1` to `main` for the formal release merge, because `main` is the configured Vercel Production branch and merge can create a Production deployment.

Accepted alternative:

Direct merge to `main` after a clean validation gate and explicit approval.

Decision status: pending.

Required before merge:

- final local validation;
- clean and pushed `V1`;
- Production env target and runtime decisions closed;
- explicit merge approval;
- deployment behavior chosen.

### 5. Deployment Mechanism

Recommended default:

Use Vercel Git integration after Production environment variables and database migration are ready, so the formal deployment aligns with the configured Production branch.

Accepted alternatives:

- Vercel Dashboard deployment from an exact Git reference.
- Vercel CLI Production deployment with explicit command approval.
- Staged Production build with manual promotion if the user wants an extra pause before assigning the Production domain.

Decision status: pending.

Required before deployment:

- `MIMI_STORAGE_RUNTIME=postgres-production` and database variables are scoped to Production only;
- Preview-only write flags remain absent from Production;
- a new deployment is created after env var changes;
- resulting deployment target is verified as Production.

### 6. Production Write Acceptance

Recommended default:

Use the first real user action as the Production write acceptance check, after read-only health, runtime, empty-state, and zero-count checks pass. This avoids synthetic test vocabulary in the formal database.

Accepted alternative:

Run a smallest-possible Production write smoke with explicit approval, then verify and clean it. This creates temporary Production data and requires a documented cleanup path.

Decision status: pending.

Required acceptance evidence:

- runtime reports `postgres-production`;
- empty-state read does not silently fall back to local runtime;
- all learning and backup-import counts are zero before first write;
- first approved write creates only intended rows;
- refresh reads the same durable data;
- `person_id` separation remains intact.

### 7. Existing Non-Official Production Deployment

Recommended default:

Keep `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD` documented and untouched until the formal Production deployment is complete and verified.

Accepted alternatives:

- Treat it as historical context only after formal release.
- Use it as the immediate previous deployment candidate if Vercel rollback eligibility confirms it remains eligible.

Decision status: pending.

Do not delete, promote, rollback, or alias-change this deployment without separate approval.

## Recommended P1-G-C Default Package

If the user wants the lowest-friction cloud-backed V1 path while preserving safety, the recommended package is:

1. Approved read-only provider supplement for the existing Vercel-managed Neon resource.
2. Distinct empty Production target in that resource if branch / recovery evidence supports it.
3. `accept-private-url-risk` only if the user explicitly accepts trusted-group public-URL risk; otherwise stop for an access-gate child stage.
4. Pull request from `V1` to `main`.
5. Vercel Git integration deployment after Production env vars and database migration are complete.
6. First real user write as write acceptance.
7. Keep the historical non-official Production deployment untouched until formal release is verified.

This is a recommendation, not an approval.

## Next Approved Slice

`P1-G-C-1 Provider Supplement` is complete in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`.

It confirmed:

- the Vercel-managed Neon resource exists, is owned, and is available;
- the resource is connected to `words-learning-app-for-mimi` for Development / Preview only;
- Production still has no database environment variables;
- Vercel Marketplace metadata can show plan and resource scope but not Neon branch / database / restore details.

The next gate is no longer generic provider discovery. It is a human evidence-route decision for the missing Neon branch / database / restore metadata.

Accepted next evidence routes:

- human-provided non-secret Neon dashboard metadata;
- a callable Neon Marketplace MCP read-only tool if it becomes available;
- a separately approved browser SSO read-only inspection with a hard stop at `Almost there` or any account-changing prompt;
- a separately approved Neon CLI / API path only if secret handling is explicitly included.

P1-G-C remains open until that evidence supports exact target selection and recovery direction.

## Stop Conditions

Stop immediately if:

- provider access still lands only on the `Almost there` screen and no equivalent evidence is available;
- the only available connection appears to be Development / Preview;
- any action would reveal a password, token, full Postgres URL, or endpoint hostname in docs/logs;
- any action would create or mutate a database target;
- any action would alter Vercel environment variables or trigger a deployment;
- access-boundary choice remains unresolved when durable writes would become reachable;
- the user pauses, changes runtime direction, or asks to reconsider browser-local launch.

## P1-G-C-0 Result

This document is a decision packet only. It does not close P1-G-C and does not authorize live Production work. P1-G-C remains open until the provider supplement and human decisions are completed.

## P1-G-C-1 Result

P1-G-C-1 is documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`. It is complete as a read-only provider supplement. It strengthened the Vercel-managed Neon resource evidence but did not expose exact Neon branch, database, role, restore, or empty Production target details. P1-G-C remains open.
