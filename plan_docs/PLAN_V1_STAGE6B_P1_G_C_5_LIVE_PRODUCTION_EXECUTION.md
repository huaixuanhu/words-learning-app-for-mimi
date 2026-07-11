# Words Learning App For Mimi Stage 6B-P1-G-C-5: Live Production Execution

Created: 2026-07-11 02:01 AEST
Last updated: 2026-07-11 12:40 AEST

Source plan:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`

Derived from:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_4_BRANCH_ENVIRONMENT_EXECUTION_DECISION.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`
- `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`
- `ARCHITECTURE.md`

Scope:
- Execute the approved single-project Neon branch/environment（分支/环境）topology.
- Separate Production（生产环境）and non-production database credentials and Vercel environment variable（环境变量）scopes.
- Add a bounded application-level Basic Auth（基础认证）gate for the private trusted-group V1.
- Verify schema version 5 and zero formal data on `main` and `staging` without blindly rerunning existing migrations（迁移）.
- Validate the current release on Preview（预览环境）, merge `V1` to `main` through a pull request, deploy through Vercel Git integration, and verify the canonical Production deployment.

Non-Scope:
- No development or test data is copied, promoted, imported, or seeded into Production.
- No synthetic Production vocabulary write or cleanup write is performed.
- No Active Vocabulary（输出词汇）scheduler, AI API（人工智能接口）, exam-mode toggle, analytics（分析追踪）, notification, email, payment, or public-user authentication system is added.
- No claim is made that `person_id` is authorization or tenant isolation.
- No automated `preview/*` branch lifecycle is enabled until its parentage and cleanup path can be verified independently.

Exit criteria:
- Neon has a long-lived `staging` child of `main`, and `staging` is the Neon Default branch for non-production branch derivation.
- Development and Preview point only to `staging`; Production points only to `main`.
- Production and non-production use distinct working credentials, and no credential value is committed or written into project documentation.
- `main` and `staging` both pass schema version 5 and zero-count inspection.
- Production fails closed when Basic Auth configuration is absent and rejects unauthenticated application/API requests when configured.
- A current Preview deployment reports `postgres-preview` and empty schema version 5 data.
- `V1` reaches `main` through a reviewed pull request, Vercel creates a Ready Production deployment, and the canonical domain passes authenticated read-only checks.
- Formal data remains empty; the first real user action is the separately observable write acceptance event.
- Governance documents, changelog, and AI agent log record the actual outcome and residual risks.

## Human Approval

The user explicitly granted permission on 2026-07-11 to continue the remaining cloud, credential, database, GitHub, merge, and deployment steps and to attempt the complete V1 launch.

This approval closes the live-action boundary for this bounded execution plan. Destructive data operations, synthetic Production writes, credential disclosure, paid-plan changes, and features outside the stated scope remain excluded.

## Closed Decisions

### Access Boundary

Decision: `add-access-gate`.

- Production receives an application-level Basic Auth gate for the current private trusted group.
- The gate covers page requests and current storage API routes.
- Vercel Production fails closed if either Basic Auth environment variable is absent.
- This is a bounded V1 gate, not user authentication, per-person authorization, or a replacement for a future identity system.

### Merge And Deployment

- Merge path: pull request from `V1` to `main`.
- Deployment mechanism: Vercel Git integration from configured Production branch `main`.
- The historical non-official Production deployment remains historical evidence and is not deleted or manually promoted.

### Production Write Acceptance

- First-write acceptance uses the first real user action after read-only Production verification.
- No synthetic vocabulary is inserted into the formal database.
- Before that action, all learning and backup-import tables must remain empty.

## Live Execution Record

### Branch And Environment Boundary

Completed on 2026-07-11:

- Verified `main` as schema version 5 with zero rows in all eight application and backup-import tables.
- Created long-lived Neon branch `staging` from the verified clean `main` state.
- Set `staging` as Neon Default so future managed branch derivation does not use Production `main` as its baseline.
- Kept `main` as the explicit Production data branch even though it is no longer the provider's Default branch.
- Set `staging` auto-delete to Never.
- Pointed Vercel Development and Preview database variables to `staging`.
- Pointed Vercel Production database variables to `main` and set `MIMI_STORAGE_RUNTIME=postgres-production` only in Production.
- Kept Preview runtime as `postgres-preview` and left Production write-enablement flags absent.

### Marketplace Integration Boundary

The Vercel-managed Neon integration did not expose a reliable branch retargeting result for the required `main` / `staging` separation. Reconnect testing continued to produce the Production-branch endpoint for non-production scopes.

Decision:

- Disconnect the Marketplace resource from this Vercel project while keeping the owned Neon resource itself intact.
- Configure the minimum required database variables manually with environment-specific scope.
- Defer managed per-feature Preview branch automation until parentage and cleanup behavior can be proven without risking Production data.

### Credential Isolation And Incident Record

- `staging` retained the credential copied with its branch state.
- The Production role credential on `main` was rotated after `staging` was created, giving Production and non-production distinct working credentials.
- During the first rotation, a credential value appeared in a local browser-automation inspection payload. It was not committed or added to project documentation, but it must be treated as exposed.
- The Production credential was rotated a second time immediately. The exposed value is invalid, and the final value is stored only in provider/Vercel secret surfaces and temporary local secret files used during this execution.
- Temporary secret files must be deleted before handoff. The trusted-group access password may be placed in the user's local clipboard, but it must not be printed in the chat or committed.

### Schema And Empty-State Verification

`main` and `staging` both passed read-only inspection with:

- 8 expected tables;
- 6 schema version 5 columns;
- 9 expected constraints;
- 1 expected supporting index;
- 2 expected triggers;
- zero rows in `people`, `vocabulary_items`, `import_batches`, `review_states`, `review_events`, `review_settings`, `backup_imports`, and `backup_import_mappings`.

Because the expected schema already existed, the Production migration result is `skipped-existing-schema`. The non-idempotent `0001_initial.sql` and `0002_schema5_production_runtime.sql` files were not rerun.

### Preview Gate

Preview deployment `dpl_EmKkV31KApZJchr7w7XV5S3F4XZF` reached Ready at:

`https://words-learning-app-for-mimi-8adhaocmv-anorias-projects.vercel.app`

Authenticated Vercel CLI checks confirmed:

- `/api/storage/health` reports `postgres-preview`, valid environment runtime selection, and zero people/vocabulary/review-event counts;
- `/api/storage/data` returns schema version 5 with no vocabulary, import, review-state, or review-event rows;
- no Preview write was performed.

### Resumed Final Gate

On the resumed execution, Vercel correctly returned empty placeholders when `env pull` targeted sensitive Production variables. A documented `vercel env run` check also loaded local `.env.local` values for readable variables while leaving sensitive Production values unavailable, so it was rejected as Production database evidence.

- The guarded Production inspection attempt stopped at `Missing DATABASE_URL...` before opening a database connection.
- No local `staging` value was allowed to stand in for Production evidence.
- The Basic Auth username/password were regenerated locally, updated in Vercel Production, and retained only in `0600` temporary files for deployment acceptance and user handoff.
- Final Production database acceptance will run inside the deployed Vercel runtime through authenticated read-only health/data routes, where sensitive Production variables are available without being disclosed.

## Formal Production Execution

Completed on 2026-07-11:

- committed release preparation as `bfcd418` and pushed `V1`;
- created ready pull request `#1` from `V1` to `main`;
- verified current-code Preview deployment `dpl_AJNM1XAoL9eG4NCGdQDx3AGsTzd8` as Ready with `postgres-preview` and empty data;
- merged pull request `#1` with merge commit `a70b341a2af61161bb1f778ffeae69a143f03146`;
- received Ready Production deployment `dpl_8eavod6FSJw3arDD67K6rW2HUUbn` from `main`;
- verified the canonical domain `https://words-learning-app-for-mimi.vercel.app` challenges unauthenticated access with HTTP `401` and Basic Auth;
- verified authenticated root access returns HTTP `200`;
- verified authenticated storage health returns Ready with runtime `postgres-production`;
- verified authenticated storage data returns schema version 5 with empty vocabulary, import, review-state, and review-event arrays;
- performed no Production write.

### Visual Acceptance Follow-up

The current-code Preview rendered successfully in the user's authenticated Chrome session with the expected Mimi dashboard, local cat asset, navigation, empty counts, and no visible overlap. The visual pass also found three obsolete user-facing phrases that still described the review/data flow as local.

Bounded follow-up:

- remove `existing local review flow`, `local scheduler`, and `本地词条` from cloud-neutral dashboard/library copy;
- make no data-flow, scheduler, layout, or runtime change;
- rerun local validation and create one small `main` follow-up deployment before closing C5.

Follow-up result:

- copy correction commit `3941fc0` reached Production as `dpl_ZrEHc39z4dufgq3RcPQGUV1vK4n2`;
- the deployment is Ready and owns the canonical aliases;
- authenticated canonical HTML contains the new FSRS copy and none of the three obsolete local-runtime phrases;
- unauthenticated root remains `401`, authenticated root remains `200`, health remains Ready `postgres-production`, and data remains schema version 5 and empty;
- Vercel returned no error-level or `5xx` logs for the final functional deployment;
- no Production write occurred.

## Stop Conditions

Stop before merge or deployment if:

- either database branch no longer passes schema/zero-count inspection;
- Development or Preview resolves to Production `main`;
- Production resolves to `staging` or `postgres-preview`;
- Basic Auth does not fail closed in Vercel Production;
- a secret appears in tracked files, command output intended for documentation, or Git diff;
- local tests, build, governance preflight, or Preview read-only verification fails;
- a provider action requests billing or destructive data deletion.

## Final Result

P1-G-C-5 is complete. The cloud-backed V1 runtime is live behind Basic Auth at `https://words-learning-app-for-mimi.vercel.app`; Production uses Neon `main`, Development / Preview use `staging`, runtime reports `postgres-production`, schema version 5 is active, and formal data remains empty. PR `#1`, merge commit `a70b341a2af61161bb1f778ffeae69a143f03146`, and final functional deployment `dpl_ZrEHc39z4dufgq3RcPQGUV1vK4n2` are the release evidence. The first real user action remains the first formal write acceptance. Temporary secrets are cleaned after the password is placed in the user's local clipboard.
