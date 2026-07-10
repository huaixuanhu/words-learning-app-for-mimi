# Words Learning App For Mimi Stage 6B-P1-G-C-4: Branch Environment Execution Decision

Created: 2026-07-11 01:01 AEST
Last updated: 2026-07-11 01:01 AEST

Source plan:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`

Derived from:
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_3_DASHBOARD_EVIDENCE.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`
- `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`
- `ARCHITECTURE.md`

Scope:
- Convert the accepted Stage 8.5 single-Neon-project policy into an executable branch/environment（分支/环境）decision.
- Define the documentation-first sequence for creating long-lived `staging`, reserving `main` for future Production（生产环境）, and keeping temporary logical `preview/*` branches derived from `staging`.
- Define read-only preflight checks, secret-handling boundaries, environment variable（环境变量）scope transitions, verification points, rollback direction, and stop conditions.
- Preserve the fact that current `main` already received `0001_initial.sql` and `0002_schema5_production_runtime.sql` while it was the approved non-production target.

Non-Scope:
- No Vercel command, Neon command, GitHub push, pull request, merge（合并）, deployment, promotion, rollback（回滚）, alias change, or domain change.
- No Neon branch creation, branch deletion, branch reset, restore（恢复）, snapshot creation, database creation, role creation, or provider setting change.
- No `.env` read, credential value output, connection string handling, token handling, endpoint hostname output, or secret copy.
- No SQL command, database connection, schema inspection, migration（迁移）, backup import（备份导入）, cleanup, or data write.
- No Production environment variable change, Production runtime cutover, Production smoke write, authentication（认证）implementation, AI API（人工智能接口）, analytics（分析追踪）, notification, email, or 付费/扣款 feature.

Exit criteria:
- P1-G-C-4 records the accepted execution sequence and the exact approvals required before any live branch/environment action.
- P1-G-C-4 states how to handle current `main` schema state without rerunning already-applied migrations.
- P1-G-C-4 identifies the Vercel / Neon documentation implications that must be re-checked during live execution.
- Parent P1-G / Stage 6B docs, README, architecture notes, changelog, and AI log point to this decision.
- Local documentation validation passes.

## Reference Check

Re-checked on 2026-07-11:

- Vercel Environment Variables: `https://vercel.com/docs/environment-variables`
- Vercel Environments: `https://vercel.com/docs/deployments/environments`
- Neon Manage Branches: `https://neon.com/docs/manage/branches`
- Neon Schema-only Branches: `https://neon.com/docs/guides/branching-schema-only`

Planning implications:

- Vercel applies Production variables to the next Production deployment and Preview variables to non-Production branch deployments. Preview variables can be scoped to all non-Production branches or to a specific branch.
- Vercel Custom Environments such as first-class `staging` are available on Pro / Enterprise plans. This project is on a Hobby / Free setup, so Stage 8.5's `staging` remains a Neon branch plus Vercel Preview-branch workflow unless the user later upgrades.
- Neon branches are copy-on-write. A child branch can be created from the root branch or another branch, and a branch can contain multiple databases and roles.
- Neon-Managed Vercel integration creates preview deployment branches from the Neon default branch. Therefore, if managed auto-preview branching is used, P1-G-C-4 live execution must verify or change the parent behavior so Preview does not derive from Production `main`.
- Neon schema-only branches exist, but they are independent root branches and currently Beta. For this project, a normal `staging` child branch from a verified empty/schema-ready `main` is the recommended current path. Use schema-only only if live evidence shows `main` contains data that must not be copied and the user explicitly approves that alternate path.

## Current Evidence Baseline

From P1-G-C-3 and Stage 8.5:

- Neon project: `words-learning-app-for-mimi-neon`.
- Current visible branch: only `main`, marked Default.
- Visible database / role labels: `neondb` / `neondb_owner`.
- Region: `AWS Asia Pacific 2 (Sydney)`.
- Postgres version: `17`.
- Restore window: 6 hours.
- No scheduled snapshot is configured.
- No separate Production branch / database is visible.
- Vercel Production has no database environment variables.
- Vercel Development / Preview currently hold the existing Neon/Postgres variables.
- P1-F previously applied `0001_initial.sql` and `0002_schema5_production_runtime.sql` to the current non-production target and returned business / backup-import counts to `0`.

Important implementation note:

- The current migration scripts do not maintain a durable `schema_migrations` ledger. P1-G-C-4 live execution must verify schema version 5 by schema shape, constraints, indexes, triggers, and row counts, not by assuming a migration table exists.
- Because `0001_initial.sql` and `0002_schema5_production_runtime.sql` were already applied to current `main`, live execution must not rerun them blindly. If schema version 5 is present and counts are zero, the initial Production target preparation should be a reclassification plus environment-scope separation, not a fresh migration.

## Accepted Target Topology

Stage 8.5 closes the policy-level target strategy:

```text
words-learning-app-for-mimi-neon
├── main                 -> future Production; real durable study data only
├── staging              -> long-lived non-production baseline; test data only
└── preview/*            -> temporary logical branches derived from staging
```

This is accepted for the current private trusted-group phase.

Deferred alternatives:

- A separate Neon Production project remains a future isolation upgrade when risk increases.
- Daily independent logical backups remain deferred until a Stage 8.5 upgrade trigger appears.
- A first-class Vercel Custom Environment named `staging` remains deferred unless the account plan and workflow change.

## Execution Decision

### Decision 1: Create `staging` From Verified Clean `main`

Accepted direction:

- Create long-lived `staging` from current `main` only after read-only checks confirm `main` has schema version 5 and zero business / backup-import rows.
- Keep `staging` as the stable non-production database baseline.
- Use only synthetic, fixture, or disposable rows in `staging`.

Preconditions:

- Re-check Neon project name, branch list, plan limits, restore window, branch count, current default branch, database label, and role label.
- Re-check Vercel project, Production branch, current deployments, and environment variable scopes.
- Run a read-only schema/count inspection against current `main` only after separate approval for database connection / target inspection.
- Confirm `main` has no valuable rows before branching.

Stop if:

- `main` contains unexpected rows, real study data, unknown rows, or backup-import rows.
- schema version 5 shape is incomplete.
- the provider path would expose secrets in logs or docs.
- branch creation would exceed plan limits or require billing change.

### Decision 2: Move Development / Preview Away From `main`

Accepted direction:

- After `staging` exists, Development and stable Preview workflows should point to `staging`, not `main`.
- Preview UI write flags remain absent by default.
- Any temporary Preview write flag must remain separately approved, time-bounded, and removed after verification.

Preferred provider path:

- Use Vercel / Neon managed integration or dashboard flows if they can retarget Development / Preview to `staging` without printing values.

Fallback provider path:

- If managed flows cannot express the needed branch/environment mapping, use manual environment variables only after a separate secret-handling approval. Secret values must not be committed, printed, pasted into logs, or summarized in docs.

Vercel scoping rule:

- A stable Preview baseline can use Preview environment variables scoped to all non-Production branches or to the release branch used for verification.
- Feature-specific `preview/*` database branches require branch-specific Preview variable overrides for the matching Git branch or an explicitly documented alternate routing mechanism.
- Production variables must remain absent until the later Production setup slice.

Stop if:

- Development / Preview cannot be distinguished from Production without revealing secrets.
- Vercel or Neon UI can only keep Development / Preview attached to `main`.
- the only feasible path requires manual connection-string handling and the user has not approved secret handling.

### Decision 3: Make Preview Branching Derive From `staging`

Accepted direction:

- Temporary logical `preview/*` database branches derive from `staging`, never from a `main` branch that may contain real Production data.
- A preview branch must have an owner, purpose, and expiry. The default cleanup backstop is seven days.

Execution implication from Neon docs:

- Neon-Managed Vercel integration creates preview deployment branches from the Neon default branch. If live execution wants managed auto-preview branches, it must either:
  - verify that the integration can choose `staging` as the parent; or
  - set `staging` as the Neon default branch while recording that Neon Default is not the same concept as Production; or
  - stop using managed auto-preview branch creation and use an explicit manual / branch-specific environment-variable path.

Recommended current path:

- For the first cloud-backed V1 launch, use `staging` as the stable non-production target and defer per-feature `preview/*` automation until the Production cutover is stable.
- Do not allow any auto-preview workflow to branch from Production `main` after real learner data exists.

### Decision 4: Reserve `main` For Production

Accepted direction:

- `main` becomes the Production data branch after:
  - `staging` exists;
  - Development / Preview no longer use `main`;
  - schema version 5 and zero business / backup-import counts are re-verified;
  - Production-only environment variable scope is explicitly approved.

Initial Production SQL decision:

- If read-only inspection confirms current `main` already has the expected schema version 5 shape and zero counts, do not rerun `0001_initial.sql` or `0002_schema5_production_runtime.sql`.
- If schema version 5 is incomplete, stop and create a new migration/recovery decision instead of guessing.
- If rows exist, stop and classify them before any branch creation, cleanup, or reclassification.

Production env direction:

- `MIMI_STORAGE_RUNTIME=postgres-production` belongs only in Production.
- Production database variables must point to `main` only.
- Preview-only write flags must remain absent from Production.

### Decision 5: Recovery And Backup Before Cutover

Accepted direction:

- The provider restore window is currently 6 hours and must be re-checked before live execution.
- Because Production starts empty, independent logical backup implementation begins after formal data starts, or immediately before a later high-risk Production data change.
- Any restore, reset, branch deletion, or cleanup action requires separate explicit approval.

Before first formal write:

- record current branch topology;
- record schema/count read-only evidence;
- confirm runtime reports `postgres-production`;
- confirm no silent fallback to local or `postgres-preview`;
- confirm access-boundary decision is closed.

## Future Live Execution Order

Each step below requires separate explicit approval when it becomes live:

1. Read-only account and branch inventory:
   - Vercel project/team, Production branch, deployments, aliases, env var names/scopes;
   - Neon project, branch list, default branch, branch count, restore window, database / role labels.
2. Read-only current `main` database inspection:
   - schema version 5 fields / constraints / indexes / triggers;
   - business and backup-import counts;
   - no valuable rows.
3. Create `staging` from verified clean `main`.
4. Repoint Development / Preview scopes from `main` to `staging` without printing secret values.
5. Verify Development / Preview read from `staging` and cannot write unless explicitly enabled for a bounded test.
6. Define the temporary `preview/*` mechanism; defer automation if parentage cannot be guaranteed from `staging`.
7. Re-verify `main` remains schema-ready and empty after non-production scopes move away.
8. Configure Production-only runtime/database variables for `main` in a later approved stage.
9. Deploy / merge only after access boundary, merge path, deployment mechanism, and first-write acceptance are closed.

## Remaining P1-G-C Decisions

Still pending after P1-G-C-4:

- Access boundary: accept private trusted URL risk or create an access-gate stage before durable public writes.
- Merge path: pull request from `V1` to `main` or explicitly approved direct merge.
- Deployment mechanism: Vercel Git integration, dashboard deployment, CLI deployment, or staged promotion path.
- First-write acceptance: first real user action or a separately approved smallest-possible write smoke with cleanup.
- Historical deployment treatment: keep the current non-official Production deployment as history / recovery context until formal release is verified.

## Stop Conditions

Stop immediately if:

- `main` contains unexpected, unknown, or valuable rows.
- schema version 5 is not present on the target branch.
- `staging` already exists but its parentage, schema, or data contents are ambiguous.
- Development / Preview still point to `main` when durable Production writes would become reachable.
- managed Preview branch automation would derive branches from Production `main`.
- any command would print, store, or require copying a secret without explicit secret-handling approval.
- Vercel Production env vars are added before target checks and access boundary close.
- current provider docs or dashboard behavior conflicts with the accepted Stage 8.5 topology.
- the user changes the topology, backup, isolation, or access decision.

## P1-G-C-4 Result

P1-G-C-4 is complete as a documentation-only branch/environment execution decision. It accepts the Stage 8.5 topology as the live execution target, defines the future approval sequence, and keeps all Vercel, Neon, database, environment-variable, migration, deployment, and Production write actions out of scope.
