# Words Learning App For Mimi Stage 6B-P1-G-C-3: Dashboard Evidence Capture

Created: 2026-07-10 20:55 AEST
Last updated: 2026-07-10 23:56 AEST

Source plan:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_2_EVIDENCE_ROUTE_DECISION.md`

Derived from:
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_HUMAN_DECISION_CLOSURE.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_1_PROVIDER_SUPPLEMENT.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_PRODUCTION_EXECUTION_HANDOFF.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_POSTGRES_PRODUCTION_RUNTIME.md`
- the user-approved Neon dashboard（仪表盘）inspection on 2026-07-10

Scope:
- Record the non-secret Neon dashboard evidence for the existing Vercel-managed Neon project.
- Confirm the current branch（分支）, database, role, plan, region, Postgres version, and restore（恢复）window shown by the dashboard.
- Confirm whether a separate empty Production（生产环境）branch / database already exists.
- Preserve redaction boundaries for connection strings, passwords, endpoint hostnames, tokens, and environment variable（环境变量）values.
- Identify the next P1-G-C decision that remains before any Production migration（迁移）or runtime cutover.

Non-Scope:
- No Vercel or Neon mutation.
- No `.env` read, credential value output, connection string handling, token handling, or secret copying.
- No `Connect` modal inspection, connection string reveal, clipboard copy, SQL command, database connection, database inspection, migration, branch creation, branch deletion, restore, snapshot creation, backup import（备份导入）, or data write.
- No Production environment variable change, GitHub push, pull request, merge to `main`, Vercel deployment, promotion, rollback（回滚）, alias change, or Production smoke write.
- No authentication（认证）or access-gate implementation.
- No billing, plan upgrade, email action, integration installation, or provider account setting change.

Exit criteria:
- The dashboard evidence answers the P1-G-C-2 checklist as far as the visible Neon UI allows.
- Secret-bearing values and internal provider ids are not written into the repository.
- Parent P1-G / Stage 6B docs, README, architecture notes, changelog, and AI log point to this evidence.
- Local documentation validation passes.

## Evidence Source

Inspection method:

- The user opened the Neon Console project dashboard in their existing Chrome session and explicitly approved direct read-only dashboard inspection.
- The inspection used the visible Neon dashboard pages only:
  - Project dashboard;
  - Branches;
  - Branch overview;
  - Roles & Databases;
  - Child branches;
  - Backup & Restore;
  - Integrations.

Redaction policy:

- Full connection strings, passwords, endpoint hostnames, tokens, `.env` export blocks, QR codes, and copied database environment variable values were not requested, copied, printed, or documented.
- Full internal Neon branch / endpoint ids were visible in page URLs or UI text, but are not recorded here. The decision-relevant branch label is `main`.
- The `Connect`, `Preview data`, `Restore`, `Create snapshot`, `Create child branch`, `Add role`, `Add database`, `Edit`, and integration management actions were not clicked.

## Dashboard Evidence

### Project / Plan

- Neon project display name: `words-learning-app-for-mimi-neon`.
- Organization / owner surface: `Vercel: Anoria's projects`.
- Plan shown in the Neon navigation: Free.
- Project health badge: `All OK`.
- Region: `AWS Asia Pacific 2 (Sydney)`.
- Default compute size: `.25 CU`.
- History retention: `6 hours`.
- Postgres version: `17`.
- Dashboard usage panel at inspection time:
  - Compute: `0.48 / 100 CU-hrs`.
  - Storage: `0.03 / 0.5 GB`.
  - History: `0 GB`.
  - Network transfer: `0 / 5 GB`.

### Branches

- Branch count shown: `1 / 10 Branch`.
- Visible branch list contains only `main`.
- `main` is marked `Default`.
- `main` has no parent branch shown in the Branches table.
- Primary compute shown for `main`: `.25 CU`, idle / suspended.
- Branch table storage shown for `main`: `31.7 MB`.
- Branch overview creation time for `main`: `2026-07-05 12:51:32 +10:00`.
- Child branches tab states: `main does not have any child branches.`

Decision implication:

- No distinct empty Production branch currently exists in this Neon project.
- The only visible branch is the existing `main` branch associated with the Development / Preview resource evidence from P1-G-B and P1-G-C-1.

### Roles And Databases

- Role shown: `neondb_owner`.
- Role ownership: owns `neondb`.
- Database shown: `neondb`.
- Database owner: `neondb_owner`.
- Role and database were shown as created / last updated about five days before inspection.

Decision implication:

- The current database / role labels are identified: `neondb` / `neondb_owner`.
- No separate Production database label is visible.

### Restore / Snapshot Capability

- Backup & Restore page shows `Restore from history`.
- Dashboard states a `6 hour history window`.
- Earliest restore point shown at inspection time: `Jul 10, 2026 2:54 pm (GMT+10)`.
- Source branch field is fixed to `main` and disabled in the visible restore form.
- Point-in-time picker uses `Australia/Melbourne, GMT+10:00`.
- `Preview data` and `Restore` buttons are visible but were not clicked.
- Snapshot area states: `No snapshots, no schedule set`.
- Snapshot-related actions visible: `Upgrade for schedules` and `Create`, neither clicked.

Decision implication:

- The account exposes a visible point-in-time restore UI for `main`, with a 6-hour window.
- No scheduled snapshots are configured.
- Actual restore, preview, and snapshot behavior remains untested and unauthorized.

### Integrations

- The Integrations page shows a Vercel integration card with `Manage Neon subscription`.
- The same page describes Vercel integration behavior as creating a database branch for every preview deployment.
- The Neon dashboard integration page did not show Production environment variable scope or a one-click Production connection state.

Decision implication:

- P1-G-C-1 remains the stronger evidence for environment scope: the Vercel-managed resource is connected to the project for Development / Preview only, and Production environment variables are absent.
- Dashboard evidence does not prove that the existing resource can be attached to Production without separate environment-variable handling or provider configuration.

## P1-G-C-2 Checklist Result

| Required evidence | Result |
| --- | --- |
| Neon project / resource display name | `words-learning-app-for-mimi-neon` |
| Plan / restore limitation | Free plan surface; 6-hour history retention / restore window |
| Branch list | Only `main` |
| Primary / root marker | `main` is marked `Default`; no parent branch shown |
| Database label | `neondb` |
| Role label | `neondb_owner` |
| Distinct empty Production target exists | No distinct Production branch / database visible |
| Branch create / restore / reset controls | Create child branch and restore controls visible; no reset control was inspected; no action clicked |
| Vercel Production connection availability | Not exposed by Neon dashboard; prior Vercel CLI evidence says Development / Preview only and Production env vars absent |

## Decision Impact

P1-G-C-3 materially closes the missing Neon branch / database / restore evidence for the current Vercel-managed resource:

- the current project is manageable in Neon Console;
- the current visible branch is `main`;
- the current database / role labels are `neondb` / `neondb_owner`;
- there is a 6-hour point-in-time restore window for `main`;
- no child branch, separate database, or separate empty Production target is currently visible.

P1-G-C still does not close because the remaining human decisions are now target-selection and launch-policy decisions:

- whether to create a distinct empty Production branch / database in the existing Neon project;
- whether to create a separate Neon project / resource for Production;
- whether to deliberately reuse the existing `main` / `neondb` / `neondb_owner` target despite its Development / Preview history;
- whether to accept the current public trusted-group access boundary or add an access gate before durable Production writes;
- merge path, deployment mechanism, first-write acceptance, and historical deployment treatment.

Recommended next slice:

- `P1-G-C-4 Production Target Decision`, documentation first.

Recommended default for that slice:

- Prefer a distinct empty Production target rather than reusing the existing Development / Preview `main` branch directly.
- The lowest-friction candidate is a new Production branch or database inside the existing Neon project only if the user explicitly approves branch/database creation and accepts the 6-hour restore window.
- A separate Neon resource remains cleaner if the user wants stronger Production / Preview separation, but it is a cloud infrastructure creation step and requires explicit approval.

## P1-G-C-3 Result

P1-G-C-3 is complete as a browser-assisted, read-only Neon dashboard evidence capture. It did not reveal, copy, print, or store secret values and did not mutate Neon, Vercel, GitHub, or any database. It shows that no separate empty Production target currently exists; P1-G-C must next choose the exact target strategy before any Production migration, environment-variable configuration, merge, deployment, or write.

## Subsequent Stage 8.5 Decision

The recommendation above records the decision state at the end of the evidence capture. Later on 2026-07-10, `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md` accepted the policy-level topology:

- keep the existing Neon project;
- reclassify verified clean `main` as future Production after environment separation;
- create long-lived non-production `staging`;
- derive temporary logical `preview/*` branches from `staging`;
- defer a separate Production project until an architecture-upgrade trigger appears.

The evidence in this file remains unchanged. The next decision slice is now `P1-G-C-4 Single-Project Branch Topology Execution Decision`, documentation first; no branch or environment change is authorized by this note.
