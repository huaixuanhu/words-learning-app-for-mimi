# Words Learning App For Mimi Stage 8.5: Data Lifecycle And Environment Strategy

Created: 2026-07-10 23:56 AEST
Last updated: 2026-07-11 01:06 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`
- `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`
- `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`
- `ARCHITECTURE.md`

Input evidence:

- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_3_DASHBOARD_EVIDENCE.md`
- The 2026-07-10 human decision to balance simplicity, generality, future extensibility, and safety for the current private trusted-group app.

Consumer / next stage:

- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_4_BRANCH_ENVIRONMENT_EXECUTION_DECISION.md`
- Future FSRS V2, Active Vocabulary, AI scoring, and multi-user plans.

Document nature:

This is the accepted cross-stage Data Lifecycle（数据生命周期）and environment policy for V1 and its foreseeable extensions. The `Stage 8.5` number records its insertion between the accepted Stage 8 learning algorithm and formal Stage 6B Production（生产环境）execution. It is not a child algorithm plan and must not be treated as a peer alternative to the master plan.

Scope:

- Define the responsibilities and allowed data for Development, logical Staging, Preview, Production, and Recovery environments.
- Define the accepted single-Neon-project branch topology for the current private small-app phase.
- Define Preview branch（预览分支）creation, use, expiry, and deletion rules.
- Define Production backup（备份）, Recovery（恢复）, retention（保留）, deletion, and migration principles.
- Reserve future AI data domains and lineage（数据血缘）rules without implementing an AI feature or database migration.
- Define the triggers that require a later upgrade to stronger environment isolation, access control, or backup frequency.

Non-Scope:

- No Neon branch, database, role, snapshot, or project creation/deletion.
- No Vercel environment variable（环境变量）change, deployment, promotion, rollback, alias change, or domain change.
- No `.env` read, credential handling, connection string handling, SQL, database connection, migration, import, or data write.
- No GitHub push, pull request, merge（合并）to `main`, or Production launch.
- No authentication（认证）, AI API（人工智能接口）, prompt runtime, embedding store, analytics（分析追踪）, notification, email, or 付费/扣款 implementation.
- No automated backup job or external backup-storage selection.

Safety / Side Effects:

- This stage changes local documentation only.
- Every later remote, credential, database, branch, backup, restore, merge, or deployment action remains separately approved.
- Current provider facts are evidence snapshots and must be re-checked before live execution.

Exit criteria:

- One canonical environment and data-lifecycle policy exists.
- The single-project `main` / `staging` / `preview/*` topology is explicit.
- Data promotion, backup, recovery, deletion, AI-data, and future upgrade rules are explicit.
- Parent architecture, Stage 6B plans, project context, README, changelog, and AI log point to this policy.
- Local documentation validation passes.

## Decision Record

Accepted on 2026-07-10:

- The current product remains a private small app for a trusted group. Account-level credential isolation and maximum environment isolation are not the first design priority at this stage.
- Architecture should balance generality, operational convenience, future extensibility, recovery, and proportionate safety.
- Use one Neon project, `words-learning-app-for-mimi-neon`, for the current V1 environment topology.
- Reclassify the clean `main` branch as the future Production branch after the required empty-state and schema checks pass.
- Create one long-lived `staging` branch as the non-production baseline. Local Development and stable pre-production verification may use this target under explicit non-production guards.
- Create temporary logical `preview/*` branches from `staging`, not from Production `main`. Provider-generated branch labels may differ from this logical namespace.
- Keep real learning data in Production only. Staging and Preview use synthetic, fixture, or intentionally disposable test data.
- Use a weekly encrypted logical backup target after formal data begins, plus event-driven backups before high-risk Production changes. Daily backup is deferred until an upgrade trigger is met.

This policy supersedes the earlier recommendation to prefer a separate Neon Production project for the present V1. A separate Production project remains a future isolation option when the product risk profile changes.

## Current Evidence Baseline

As last inspected on 2026-07-10:

- Neon project: `words-learning-app-for-mimi-neon`.
- Plan surface: Free.
- Region: Sydney.
- Postgres version: 17.
- Visible branches: only `main`, marked Default.
- Visible database / role: `neondb` / `neondb_owner`.
- Current restore window: 6 hours.
- No scheduled snapshot was configured.
- No separate Production branch or database was visible.
- Vercel Production had no database environment variables.
- The current Neon target was connected to Development / Preview only.
- P1-F last verified schema version 5 and zero business/backup-import counts on the approved non-production target.

These are not permanent guarantees. P1-G-C-4 must re-check the exact branch, database, role, environment-variable scope, schema, and counts before any reclassification or live mutation.

## Environment And Branch Topology

```text
words-learning-app-for-mimi-neon
├── main                 -> Production; real durable study data only
├── staging              -> long-lived non-production baseline; test data only
└── preview/*            -> temporary branches derived from staging
```

The branch topology and Vercel environments are related but not identical:

- Vercel Local / Development can use browser-local storage by default or the explicitly guarded `staging` database target for integration work.
- Vercel Preview uses `staging` for a stable pre-production review or a temporary `preview/*` child for isolated feature verification.
- Vercel Production uses Neon `main` only after Production environment variables and `postgres-production` are explicitly configured.
- On a Vercel plan without Custom Environments, logical Staging can remain a branch-specific Preview workflow with its own branch-specific environment-variable scope. No paid-plan upgrade is required by this policy.

### Environment Matrix

| Environment | Primary responsibility | Allowed data | Persistence expectation |
| --- | --- | --- | --- |
| Local | UI, scheduler, import/export, and unit development | Browser-local personal test data, fixtures, synthetic data | Developer-controlled; not a shared source of truth |
| Development | Database migration and repository integration checks | Fixtures, synthetic rows, explicitly disposable data | Resettable; no valuable data assumption |
| Staging | Stable release-candidate and Production-like schema verification | Synthetic / fixture test data only | Long-lived branch, but its business rows remain disposable |
| Preview | Per-feature / per-PR isolated verification | Synthetic / fixture test data inherited from `staging` or created for the preview | Ephemeral |
| Production | Formal cloud-backed app and canonical shared study state | Real learner data created after formal launch; explicitly approved imports only | Durable source of truth |
| Recovery | Incident inspection and restore validation | Isolated copy of a Production recovery point | Temporary; delete after recovery closure |

## Data Classification And Movement

| Data class | Examples | Non-production | Production |
| --- | --- | --- | --- |
| Schema / code metadata | migrations, constraints, scheduler state shape | Test first | Apply after approval |
| Synthetic test data | fixtures, smoke rows, generated vocabulary | Allowed and disposable | Forbidden except a separately approved smallest-possible smoke with cleanup |
| Real study data | words, meanings, examples, review events, settings, import history | Do not copy from Production by default | Canonical location |
| Backup artifacts | JSON export, logical database dump, recovery metadata | May be inspected only through an approved recovery workflow | Store outside the live tables and protect as personal study data |
| AI-derived data | scores, explanations, prompt/model metadata, embeddings | Synthetic inputs only by default | Inherits the sensitivity and ownership of its source data |

Promotion rule:

- Code and migration files move from local review to Staging / Preview validation and then to Production.
- Business rows do not move from Development, Staging, or Preview into Production.
- Production starts empty. Formal data begins with real user activity after launch or a separately approved formal import.
- Production data must not be cloned into Staging or Preview by default. If realistic non-production data is later required, use schema-only branching or an explicit anonymization plan.

## Branch Lifecycle

### `main`

- Becomes the Production data branch only after `staging` exists and Development / Preview no longer point to `main`.
- Must pass schema-version, zero-count, runtime, environment-variable, and recovery checks before the first formal write.
- Receives migrations only after the same migration passes local/static checks and non-production database verification.
- Must not receive fixture seed data.

### `staging`

- Is created once from the verified clean schema before `main` receives valuable Production data.
- Remains the long-lived non-production database baseline.
- May contain deterministic fixtures and short-lived integration rows.
- Can be reset or recreated because it contains no valuable user data, but branch mutation still requires explicit approval.
- Does not promote its data into `main`; Production receives the reviewed migration independently.

### Logical `preview/*`

- Derives from `staging`, never from a `main` branch containing real Production data.
- Exists only for a Preview deployment, pull request, feature review, migration rehearsal, or bounded test run.
- Uses only synthetic / fixture data.
- Is deleted when the associated Git branch / pull request closes or the review ends.
- Uses a seven-day maximum lifetime as a cleanup backstop unless a named investigation owner and expiry date are recorded.
- Must not be retained as a hidden long-lived environment.

### Recovery Branches

- Are created from a confirmed Production recovery point only during an approved recovery or investigation.
- Are inspected before any in-place restore or connection switch.
- Are deleted after recovery validation, evidence capture, and user confirmation.

## Schema And Migration Lifecycle

1. Write forward-only migration files locally; do not rewrite already applied migrations.
2. Run static and application tests locally.
3. Apply and inspect the migration on `staging` or an isolated `preview/*` branch.
4. Compare the expected schema, constraints, triggers, and counts.
5. Create the required pre-change Production backup.
6. Apply the same reviewed migration independently to `main` after explicit approval.
7. Run read-only health and schema checks before allowing user writes.
8. Stop on target ambiguity, count mismatch, `person_id` leakage, Active-review invariant failure, or backup/recovery uncertainty.

Database branches are environment boundaries; they are not a data-merge mechanism. Schema promotion is performed through versioned migration files.

## Production Backup Policy

The current 6-hour Neon restore window is the short-window recovery layer. It does not replace an independent logical backup.

Accepted V1 baseline after formal Production data begins:

- Create one encrypted logical backup each week.
- Keep the most recent eight weekly backups unless storage or privacy review chooses a shorter period.
- Create an additional encrypted logical backup immediately before a Production migration, destructive cleanup, restore, or other high-risk data change.
- Store logical backups outside the live Neon project and restrict them like personal study data.
- Keep the exact backup format, encryption method, destination, and manual-versus-automated mechanism behind a separately approved implementation slice.
- Do not start a long-running backup automation merely because this policy exists.

Initial recovery objectives:

- Provider point-in-time incident detected inside the current restore window: use the verified provider recovery point when available.
- Independent logical-backup Recovery Point Objective（恢复点目标）: at most seven days of data loss.
- Recovery Time Objective（恢复时间目标）: one working day for this private small-app phase.
- These are policy targets, not proven guarantees, until a restore drill succeeds.

Increase logical backup frequency to daily or stronger when any of these becomes true:

- the app expands beyond the trusted private group;
- login, authentication, roles, or materially different account boundaries are added;
- losing up to seven days of review history becomes unacceptable;
- AI scoring, writing assessment, or other expensive-to-recreate user data becomes durable;
- write volume or active-user count makes weekly recovery inadequate;
- a user or operational requirement sets an RPO below 24 hours.

## Recovery Strategy

1. Identify the incident window and freeze risky writes when practical.
2. Select a provider recovery point or independent logical backup without exposing credentials in logs.
3. Restore first to an isolated Recovery branch / target when the provider path supports it.
4. Validate schema version, table counts, `person_id` scope, review-state/event invariants, and a read-only application snapshot.
5. Prefer targeted repair or an approved connection switch after validation. Use in-place restore only with explicit approval and a preserved pre-restore recovery point.
6. Record the chosen recovery point, observed data gap, validation result, and any post-recovery reconciliation.
7. Delete temporary Recovery branches after closure.

Recovery can reintroduce data deleted after the selected recovery point. Until a durable deletion ledger exists, the recovery checklist must explicitly review post-backup deletes and notify the user of any known resurrection risk.

## Retention And Deletion

- Active Production study data is retained while the trusted-group workspace uses it.
- Current hard-delete semantics remove the active database row set according to tested repository behavior.
- Logical backups may retain earlier copies until their retention window expires; deletion from active tables does not silently promise immediate erasure from historical backups.
- Preview and Recovery branches must be deleted at lifecycle closure.
- Staging test data may be reset without preservation after the target and scope are confirmed.
- Any future account-level deletion feature must define deletion propagation across active rows, AI-derived rows, logs, and backup expiry.

## Future AI Data Boundary

Stage 8.5 reserves logical data domains without committing a schema migration:

- `ai_runs`: append-only invocation metadata such as `person_id`, source entity, provider, model id, prompt version/hash, input hash, output schema version, status, latency, cost metadata, and timestamps.
- `ai_assessments`: versioned scores, rubric version, explanation, source entity, and `ai_run_id`; a new assessment supersedes rather than overwrites prior evidence.
- `prompt_versions`: add only if prompts become runtime-managed. Until then, prompt text remains version-controlled in Git and each run stores its version/hash.
- `embeddings`: separate derived-data table keyed by `person_id`, source entity, embedding model/version, dimensions, source hash, vector, and timestamps; do not mix vectors into `vocabulary_items`.

AI rules:

- AI-derived data inherits the environment and sensitivity of its source data.
- Production inputs and outputs remain in Production unless an explicit anonymized export is approved.
- Raw prompts and raw model responses are not retained by default when structured evidence is sufficient.
- Source edits, source deletion, prompt changes, or model-version changes must invalidate or supersede dependent embeddings and assessments.
- Provider/model/prompt lineage must be sufficient to explain which system produced a score.
- Any external AI provider, paid call, or user-data transmission requires a new approved stage and updated privacy boundary.

## Architecture Upgrade Triggers

Reconsider a separate Production Neon project, stronger access isolation, daily backups, and formal disaster-recovery automation when one or more of these applies:

- unfamiliar or public users join;
- login, OAuth, roles, admin access, or multi-tenant isolation becomes required;
- Production data includes substantial writing samples, AI evaluation history, or other higher-sensitivity content;
- multiple maintainers need independent provider access;
- compliance, contractual, billing, or uptime requirements appear;
- a branch/project-level incident would create unacceptable Production blast radius;
- restore objectives become stricter than the single-project Free-plan path can demonstrate.

The current single-project design is an intentional proportionality decision. It is not a permanent claim that one project fits every future risk profile.

## P1-G-C Handoff

Stage 8.5 closes the Production target strategy at the policy level:

- Neon project: existing `words-learning-app-for-mimi-neon`.
- Production branch: `main`.
- Long-lived non-production branch: `staging`.
- Temporary branch source: `staging`.
- First Production data state: empty.

P1-G-C-4 is now documented in `plan_docs/PLAN_V1_STAGE6B_P1_G_C_4_BRANCH_ENVIRONMENT_EXECUTION_DECISION.md`. It defines the required live sequence and keeps every live action separately approved:

- how and when `staging` is created from the verified clean `main` state;
- how Development / Preview environment variables move from current `main` to `staging` without printing values;
- how Preview branches are configured to derive from `staging`;
- how Production-only variables connect `postgres-production` to `main`;
- exact pre/post-change schema and zero-count checks;
- access-boundary choice, merge path, deployment mechanism, first-write acceptance, and historical deployment treatment.

P1-G-C still requires separate approval for the actual branch/environment changes and still needs access-boundary, merge, deployment, first-write, and historical-deployment decisions before formal Production.

### P1-G-C-5 Live Update

The user separately approved live execution on 2026-07-11. `plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md` records the resulting branch/environment boundary:

- `main` remains clean, schema-ready, and reserved for Production;
- `staging` exists as a long-lived child of `main`, is the Neon Default, and backs Development / Preview;
- Production and non-production credentials and Vercel variable scopes are distinct;
- managed per-feature Preview branch automation is deferred after the Marketplace retargeting path could not prove the required separation;
- no development data was promoted and both branches remain empty;
- a bounded Basic Auth gate closes the current private trusted-group access decision.

The remaining C5 work is Git merge, formal Production deployment, and read-only post-deployment acceptance. The first real user action remains the first formal write acceptance.

## Stop Conditions

Stop before any live action if:

- `main` contains unexpected or valuable non-production rows;
- `staging` cannot be distinguished from `main` without secret output;
- Preview branches would derive from Production data;
- Development / Preview still point to `main` when formal Production writes would begin;
- backup format, target, or recovery path is ambiguous before a high-risk Production change;
- the access-boundary decision remains open when durable public writes would become reachable;
- the actual provider/account evidence differs from this policy assumption;
- the user changes the proportionality or isolation decision.

## Reference Check

Re-checked on 2026-07-10:

- Vercel environments and logical Staging alternatives: `https://vercel.com/docs/deployments/environments` and `https://examples.vercel.com/kb/guide/set-up-a-staging-environment-on-vercel`
- Neon branching workflow and schema-only option: `https://neon.com/docs/get-started-with-neon/workflow-primer`
- Neon project-level restore-window behavior: `https://neon.com/docs/manage/projects`

## Stage 8.5 Result

Stage 8.5 is accepted as the canonical V1 Data Lifecycle and environment strategy. It selects a proportionate single-Neon-project topology, keeps Production data separate by branch and environment scope, lowers independent logical backup frequency to weekly for the current private phase, and defines explicit triggers for later isolation and backup upgrades. It performs no remote or persistent-data action.
