# Words Learning App For Mimi Stage 6B-P1-G-C-1: Provider Supplement

Created: 2026-07-10 18:57 AEST
Last updated: 2026-07-10 18:57 AEST

Source plan:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`

Derived from:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`
- `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`
- P1-G-B read-only Production inventory completed on 2026-07-10
- P1-G-C-0 decision packet completed on 2026-07-10
- read-only Vercel CLI（命令行工具）provider metadata checks completed on 2026-07-10

Scope:
- Gather the safest available provider-management evidence（供应商管理证据）after P1-G-C-0.
- Use read-only Vercel project, environment variable（环境变量）, Marketplace integration, and Marketplace resource metadata.
- Confirm whether the Vercel-managed Neon resource exposes enough branch（分支）, database, and recovery（恢复）evidence to choose an exact empty Production（生产环境）target.
- Record only non-secret metadata and the remaining evidence gaps.

Non-Scope:
- No `.env` read, credential value output, connection string handling, token handling, or private secret inspection.
- No SQL command, database connection, database inspection, migration（迁移）, branch creation, branch deletion, restore, backup import（备份导入）, or data write.
- No Vercel or Neon resource mutation.
- No Production environment variable change.
- No GitHub push, pull request, merge to `main`, Vercel deployment, promotion, rollback（回滚）, or alias change.
- No provider SSO browser action, email action, dashboard click, or payment / billing change.
- No authentication（认证）or access-gate implementation.
- No Production smoke write.

Exit criteria:
- Record the exact read-only provider paths used.
- Record confirmed non-secret Vercel / Neon resource metadata.
- Record whether branch / database / restore evidence is sufficient for target selection.
- Record remaining human choices and next safe evidence route.
- Synchronize parent P1-G / Stage 6B docs, README, architecture notes, changelog, and AI log.
- Local documentation validation passes.

## Execution Summary

P1-G-C-1 used only read-only Vercel metadata paths. It did not read `.env`, did not connect to Postgres（关系型数据库）, and did not open the provider dashboard.

Commands / tools used:

- Vercel connector `_list_projects`: attempted, but returned `Failed to list projects`; no project evidence was taken from this connector.
- Local CLI discovery: `vercel` and `vc` were not on `PATH`.
- `npm exec -- vercel --version`: temporarily fetched Vercel CLI 55.0.0 into the npm execution cache; no project dependency file changed.
- `npm exec -- vercel project inspect words-learning-app-for-mimi --scope anorias-projects --yes`
- `npm exec -- vercel env ls --scope anorias-projects --format json`
- `npm exec -- vercel integration list words-learning-app-for-mimi --scope anorias-projects --format json`
- `npm exec -- vercel integration resource inspect words-learning-app-for-mimi-neon --scope anorias-projects --format json`
- `npm exec -- vercel integration installations --scope anorias-projects --format json`
- `npm exec -- vercel list words-learning-app-for-mimi --scope anorias-projects`

The CLI install emitted Node engine / deprecated dependency warnings from the temporary CLI package resolution. No repository file was modified by the CLI fetch.

## Confirmed Evidence

### Vercel Project

- Team / owner: `anorias-projects`.
- Project: `words-learning-app-for-mimi`.
- Project id: `prj_qGmq7IZXGB2Bx9X2DuZaaYubg6eD`.
- Framework preset: Next.js.
- Root directory: `.`.
- Node.js setting: `24.x`.

This matches the earlier P1-G-B inventory.

### Environment Variable Scope

`vercel env ls --format json` confirmed:

- Production has no project environment variables.
- `MIMI_STORAGE_RUNTIME` exists only for Preview.
- Neon / Postgres connection variable names remain scoped only to Development and Preview.
- No environment variable values were printed.

This confirms there is still no Production database connection configured through Vercel.

### Marketplace Resource

`vercel integration list` and `vercel integration resource inspect` confirmed:

- Resource id: `store_D1OyAmdX2Ccd0xYR`.
- Resource name: `words-learning-app-for-mimi-neon`.
- Product / integration: Neon / `neon`.
- Status: `available`.
- Ownership: `owned`.
- Billing plan: `free_v3`, named `Free`, subscription scope `installation`.
- Connected Vercel project: `words-learning-app-for-mimi`.
- Connected environments for this project: `development` and `preview`.
- Dashboard entry: Vercel store dashboard for this resource.

This is stronger than the P1-G-B SSO observation: the Vercel-managed Neon resource is present, owned, available, and connected only to Development / Preview for this project.

### Marketplace Installation

The unfiltered `vercel integration installations --format json` output confirmed a Neon installation with:

- slug: `neon`;
- installation type: Marketplace;
- source: CLI;
- plan: `free_v3`, Free;
- capabilities including provisioning, SSO, MCP（Model Context Protocol，模型上下文协议）, and `mcpReadonly`.

The filtered command `vercel integration installations --integration neon --format json` returned an empty installation list, while the unfiltered command returned the Neon installation. P1-G-C-1 therefore treats the unfiltered installation output plus resource inspect output as the reliable evidence and treats the filtered output as an inconclusive CLI filtering mismatch.

The Marketplace plan metadata reports:

- storage: `0.5 GB per project`;
- maximum projects: `100`;
- sizes up to `2 CU, 8 GB RAM`;
- compute time: `100 CU-hours per project`.

This is billing / quota metadata only. It does not prove Neon branch names or restore window.

### Recent Deployments

`vercel list words-learning-app-for-mimi --scope anorias-projects` showed recent deployments on the first page as Preview. This does not alter the documented historical non-official Production deployment from P1-G-B, and no deployment command was run.

## Evidence Still Missing

The read-only Vercel Marketplace metadata still does not expose:

- Neon branch names;
- which branch is primary / root;
- exact database labels inside the Neon project;
- exact role labels inside the Neon project;
- whether an empty distinct Production branch / database already exists inside Neon;
- restore window / retention;
- whether point-in-time recovery, instant restore, or branch reset is available on this actual account;
- whether branch creation or target recreation is available without changing plan or billing state.

P1-G-C-1 therefore cannot select an exact Production database target.

## Decision Impact

Confirmed:

- The existing Vercel-managed Neon resource is real, owned, available, and scoped to Development / Preview for the project.
- Production still has no database environment variables.
- The current Vercel resource connection does not include Production.
- Email activation is not established as a required prerequisite for the existing operational Development / Preview resource.

Not confirmed:

- exact Neon branch / database / recovery capability;
- exact empty Production target;
- safe database rollback direction before first formal write.

P1-G-C remains open.

## Recommended Next Evidence Route

The safest next route is human-provided Neon dashboard evidence or a provider read-only interface that can show branch / database / restore metadata without printing secrets.

Accepted next evidence routes:

- Human opens the Vercel store dashboard or Neon dashboard and provides non-secret branch / database / restore metadata.
- A callable Neon Marketplace MCP read-only tool becomes available and can list branch / database / restore metadata without secret output.
- A separately approved browser SSO read-only inspection is attempted again, with a hard stop if it lands on the `Almost there` screen or any action asks to resend email / change account state.
- A separately approved Neon CLI / API path is used only if the required API token handling is explicitly approved and secret output is redacted.

Do not move to Production migration, Production env vars, merge, deployment, or write acceptance until this evidence gap closes.

## P1-G-C-1 Result

P1-G-C-1 is complete as a read-only provider supplement. It strengthens the resource-scope evidence but does not close P1-G-C. The exact Production target and recovery path remain unresolved.
