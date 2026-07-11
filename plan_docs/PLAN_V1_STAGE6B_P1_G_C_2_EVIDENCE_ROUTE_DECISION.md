# Words Learning App For Mimi Stage 6B-P1-G-C-2: Evidence Route Decision

Created: 2026-07-10 19:44 AEST
Last updated: 2026-07-10 19:44 AEST

Source plan:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`

Derived from:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`
- `plan_docs/PLAN_V1_STAGE6B_PRODUCTION_EXECUTION.md`
- P1-G-C-1 read-only Vercel Marketplace provider supplement completed on 2026-07-10

Scope:
- Decide the next safest evidence route for the missing Neon branch（分支）, database, role, and recovery（恢复）metadata.
- Define exactly what non-secret evidence is needed before choosing a Production（生产环境）database target.
- Define what must be redacted from screenshots, copied text, CLI output, or API output.
- Keep P1-G-C target / access / merge / deployment / write decisions open until the required evidence exists.

Non-Scope:
- No Vercel or Neon command.
- No provider dashboard navigation.
- No browser SSO（Single Sign-On，单点登录）inspection.
- No `.env` read, credential value output, connection string handling, token handling, or private secret inspection.
- No SQL command, database connection, database inspection, migration（迁移）, branch creation, branch deletion, restore, backup import（备份导入）, or data write.
- No Production environment variable（环境变量）change, GitHub push, pull request, merge to `main`, Vercel deployment, promotion, rollback（回滚）, or alias change.
- No authentication（认证）or access-gate implementation.
- No Production smoke write.

Exit criteria:
- The acceptable evidence routes are ranked by safety and completeness.
- The recommended next route is explicit.
- The human evidence checklist is specific enough to follow without exposing secrets.
- Parent P1-G / Stage 6B docs, README, architecture notes, changelog, and AI log point to this decision.
- Local documentation validation passes.

## Current Evidence State

Already confirmed:

- Vercel project: `anorias-projects/words-learning-app-for-mimi`.
- Vercel Production branch: `main`.
- Production env vars: absent.
- Existing Vercel-managed Neon resource: `words-learning-app-for-mimi-neon`.
- Resource id: `store_D1OyAmdX2Ccd0xYR`.
- Resource status: `available`.
- Resource ownership: `owned`.
- Resource plan: `free_v3`, Free.
- Resource is connected to the project only for Development / Preview.
- P1-F proved schema version 5 and repository behavior only on the approved non-production development database.

Still missing:

- Neon project display name / non-secret resource identity as shown in the provider dashboard.
- Branch names.
- Which branch is primary / root.
- Database labels.
- Role labels.
- Whether an empty Production branch / database already exists.
- Restore / retention window.
- Whether instant restore, point-in-time recovery, branch reset, or target recreation is available on the actual account.
- Whether Production env vars can be scoped only to Production without reusing Development / Preview credentials.

## Evidence Route Options

### Option A: Human Dashboard Evidence

Recommended default.

The human opens the Vercel store dashboard or Neon dashboard and provides only non-secret metadata.

Accepted evidence formats:

- copied non-secret text;
- screenshots with secret-bearing areas cropped or blurred;
- a short human-written summary using the checklist below.

Required evidence:

- Neon project / resource display name;
- plan name and any visible restore / retention limitation;
- branch list;
- primary / root branch marker;
- database list or current database label;
- role list or current role label;
- whether a distinct Production branch / database exists;
- whether dashboard UI offers branch create / restore / reset options;
- whether the Vercel resource connection UI shows Development / Preview only or can add Production.

Must redact:

- full Postgres URL;
- host / endpoint hostname;
- password;
- token;
- secret value;
- connection string QR code;
- any `.env` export block;
- any copied `DATABASE_URL`, `PGHOST`, `PGPASSWORD`, or `NEON_PROJECT_ID` value.

Why this is preferred:

- no CLI token handling;
- no database connection;
- no environment variable mutation;
- no need to rely on the previous SSO route that showed `Almost there`;
- enough for the user to make the next P1-G-C decision if the dashboard exposes branch / recovery metadata.

Stop if:

- the dashboard asks to create, claim, reconnect, rotate, or delete a resource;
- the only visible path is to reveal/copy secrets;
- the dashboard still shows only the `Almost there` screen;
- branch / recovery metadata is not visible.

### Option B: Callable Read-Only Neon MCP

Acceptable if a Neon Marketplace MCP（Model Context Protocol，模型上下文协议）tool becomes available in Codex and can list metadata without secrets.

Required evidence:

- tool name and scope;
- exact fields returned;
- explicit confirmation that no secret values, hostnames, or connection strings were returned;
- branch / database / restore metadata.

Current status:

- P1-G-C-1 saw Marketplace installation capability `mcpReadonly`.
- This Codex session did not expose a callable Neon-specific MCP tool during tool discovery.

### Option C: Browser SSO Read-Only Inspection

Acceptable only with separate explicit approval.

Allowed:

- open the existing Vercel store dashboard / Neon dashboard route;
- visually inspect non-secret branch / database / restore metadata;
- record only non-secret metadata.

Not allowed:

- resend activation email;
- claim / reconnect / create / delete / rotate / restore;
- click any mutating resource control;
- reveal or copy secrets;
- change billing, plan, project connection, environment scope, or account settings.

Stop if:

- the route lands on `Almost there`;
- any step asks for account activation, email resend, billing, provider claim, or secret reveal;
- branch / recovery metadata is hidden behind a mutating step.

### Option D: Neon CLI / API Read-Only Path

Highest-friction option; use only if human dashboard evidence and MCP are unavailable.

Requires separate explicit approval because it likely needs provider token handling.

Required preconditions:

- decide where token comes from;
- define redaction rules before command execution;
- define exact read-only endpoints / commands;
- define output filtering before logs are written;
- run no SQL and open no database connection.

Not acceptable in this stage without new approval:

- direct Postgres connection;
- migration inspection;
- branch creation;
- restore;
- env var write;
- token pasted into shell history or committed docs.

## Recommended Decision

Choose Option A first: human dashboard evidence.

The minimum human evidence packet should answer:

1. What Neon project / resource name is shown?
2. What branches are visible?
3. Which branch is marked primary / root?
4. What database label is visible?
5. What role label is visible?
6. Does a separate empty Production branch / database already exist?
7. What restore / retention window is shown?
8. Are branch create / restore / reset controls visible without starting the action?
9. Does the Vercel resource connection UI show Production as available, connected, or absent?

If the human evidence confirms no separate empty Production target exists, P1-G-C should next decide whether to:

- create a distinct Production branch / database in the existing resource; or
- create a separate Vercel-managed Neon resource for Production; or
- use a manually connected Neon Production target.

Each of those would be a later live-action stage and requires separate approval.

## P1-G-C-2 Result

P1-G-C-2 is a documentation-only evidence route decision. It recommends human dashboard evidence as the next safest route and keeps all Production target, access, merge, deployment, and write decisions open.
