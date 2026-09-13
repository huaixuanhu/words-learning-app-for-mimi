# AGENTS.md

<!-- Generated/adapted from human-ai-governance v0.7.5 -->

## Collaboration

- Use strict low-hallucination mode. Verify uncertain or drift-prone claims from the relevant source before treating them as current.
- Plan before material changes. One accepted plan covers safe local implementation inside its declared scope.
- Pause again only for a material scope expansion, consequential external action, unresolved material choice, or an explicit approval gate in this file.
- When the user explicitly requests completion persistence, keep the accepted outcome and safe in-scope diagnosis, repair, validation and preparation active across failed attempts. Route retries by credible single and cumulative consequence; pause only at the next consequence-bearing action outside the accepted envelope or another existing approval boundary.
- Keep changes focused, protect user-owned work, and never revert unrelated changes without explicit approval.
- Update a document when its current claim would otherwise become false, incomplete, or misleading. Prefer one canonical owner plus links over repeated status history.
- Child or branch plans must declare `Source plan`, `Derived from`, `Scope`, `Non-Scope`, and `Exit criteria` near the top.
- Default user-facing engineering plans, progress, evidence, results and handoffs to compact, decision-complete communication. Lead with the conclusion or current state, retain the evidence, material risk or uncertainty, required decision and next action that affect review, and distinguish inspected, changed, validated, committed, pushed, deployed and activated states.
- When introducing a problem or switching between problems, name the affected feature, component, file, service or operation, describe the observed behavior, and state the current handling. Name the actor or approver when known without inventing an owner, cause or completion state.
- Treat platform sandbox, approval, connector, and access settings as technical capability boundaries. They do not expand the accepted task scope or this project's authorization boundaries.
- Keep engineering-governance writing for plans, Architecture, specifications, runbooks, evidence and approval records. Route audience-facing expression by the purpose of each content unit; expression may change prose and organization while facts, uncertainty, evidence ceilings, disclosures, safety controls, authority, approval and validation remain exact.
- Treat repeated contrast, punctuation and list patterns as semantic revision signals. Do not use phrase counts, regular-expression style checks, punctuation quotas or AI-detector scores as acceptance gates.
- For important main-workspace tasks, use `xhigh` for bounded direct work, Max for deep coupled reasoning, and Ultra when adaptive separable work materially improves coverage. Reasoning mode remains separate from Tier, authorization and evidence, and must not become a preflight rule.
- Prefer Chinese for planning and handoff documents while preserving English technical terms with a Chinese explanation on first mention when useful.
- Ordinary product UI should use short, natural English for immersion. Chinese or bilingual copy remains appropriate for irreversible actions, privacy, credentials, backup replacement, and external AI data transmission.
- Treat technical-language choice as separate from writing mode and review density. The standing project preference selects `plain` for user-facing technical explanations: use common language and add one short explanation when a narrower term is necessary, while preserving exact engineering work, evidence, identifiers, safety controls and authorization boundaries.

## Project Map

- Project root: `/Users/anoria/Documents/python_coding/small_project/learningWordsformimi`
- User-provided GitHub repository: `https://github.com/huaixuanhu/words-learning-app-for-mimi.git`
- Default Git branch: `main`; verify the checked-out branch from Git before branch-sensitive work.
- Architecture and current runtime: `ARCHITECTURE.md`.
- Canonical V2 product plan: `plan_docs/PLAN_V2_MASTER.md`.
- Canonical V2 Production cutover: `plan_docs/PLAN_V2_STAGE8_3_PRODUCTION_BACKUP_MIGRATION_CUTOVER.md`.
- Canonical V2.1 repair and release: `plan_docs/PLAN_V2_1_DUPLICATE_IMPORT_DEDUPLICATION.md` and `plan_docs/PLAN_V2_1_PRODUCTION_DUPLICATE_REPAIR_RELEASE.md`.
- Canonical V2.2 product and release: `plan_docs/PLAN_V2_2_REVIEW_CADENCE_CARD_AUDIO.md` and `plan_docs/PLAN_V2_2_PRODUCTION_RELEASE.md`.
- Canonical V2.3 storage, study-day, Home and Production release: `plan_docs/PLAN_V2_3_STORAGE_STUDY_DAY_HOME.md`.
- Canonical V1 launch record: `plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md`.
- Active data lifecycle policy: `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`.
- Version hold for SSO（Single Sign-On，单点登录）and confidential per-person isolation: `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md`.
- Change history and execution evidence: `CHANGELOG.md` and `governance/AI_AGENT_LOG.md`.
- Governance gate: `npm run governance:check`.
- Plan routing entrypoint: this Project Map. Keep one clear plan direct; if nested or parallel plans, multi-session continuation or retained history makes the current entry ambiguous, add a compact `PLAN_INDEX.md` or `PLAN_INDEX.yaml` as a routing read model. It cannot grant scope, authority, approval or completion; load only the matched current plan, necessary parents, status owner and relevant evidence. If an index is adopted, keep `lifecycle_status`, `authority_state` and `load_policy` separate and synchronize mutable header mirrors at closeout.

## Current Product And Runtime

- V2.3 is live on the canonical Production domain behind Basic Auth（基础认证）. Vercel Production runs the `main` application in `syd1`; `plan_docs/PLAN_V2_3_STORAGE_STUDY_DAY_HOME.md` Stage 2.3.12 owns the authorized release and exact deployment/acceptance evidence.
- Neon `main` is Production Schema Version 6 with the unique `(person_id, normalized_text)` vocabulary identity. Neon `staging` is the Development / protected Preview baseline at Schema 6.
- Production and non-production credentials are distinct. Historical recovery points remain governed by the V2-8-3, V2.1 and V2.2 release records; V2.3 Stage 2.3.11 owns the active cloud and independent local backup policy and evidence.
- Gemini enrichment and Google Cloud Standard-C TTS are enabled under independent Production guards. Their exact active contracts are owned by the V2 master/cutover plans and must not be relaxed through incidental work.
- Current stack: Next.js App Router, TypeScript, Tailwind CSS, ESLint, Vitest, npm, `@neondatabase/serverless`, `dotenv-cli`, `ts-fsrs`, Neon Postgres, and browser `localStorage` as the local fallback.
- Shared Basic Auth protects the trusted group. Browser-selected `person_id` separates learning data but is not authentication, authorization, or confidential tenant isolation.

## Permanent Product Boundaries

- Recognition Vocabulary（阅读词汇）and Active Vocabulary（输出词汇）have independent Review/New Learning zones, goals, Review Profiles, state, events, rebuild behavior, and FSRS-6 parameter sets.
- Active modes are `Say it`, `Spell it`, and `Dictation`. All three share the independent Active Review Profile while retaining activity type on each event.
- A history-bearing Track change requires `Start fresh in the other Track`; old history remains read-only and no state or event is copied.
- Daily queue requests bind server-owned plan/version evidence. Whole-day reset retains its two visible gates and transactional Idempotency Key（幂等键）record outside user backups.
- V2.1 duplicate identity is `(person_id, normalized_text)`. Cleanup must preserve deterministic keeper selection, independent FSRS histories, creation facts, and import-batch audit rows.
- Schema Version 6, JSON backup Version 4, bilingual example-pair rules, migration pins, V2.2 V1/V2 Parameter Set constraints, and recovery boundaries remain owned by the canonical V2/V2.1/V2.2 plans.
- Every newly written English example requires an aligned non-empty Chinese translation. Legacy gaps remain explicit through `Needs translation`.
- AI drafts remain editable and require explicit human acceptance before saved learning data changes. Production AI stays Gemini-only and cannot silently fail over to another provider.
- Provider disclosure must state limited provider safety / abuse / legal retention and must never claim Zero Retention（零保留）.
- Current AI global guards remain 300 provider attempts/day, 600,000 input tokens/day, 210,000 output/thinking tokens/day, US$0.50 estimated cost/day, US$2/month, concurrency 2, Cache（缓存）, Idempotency, accounting, and Kill Switch（紧急关闭开关）. There is no per-person ceiling, and switching `person_id` cannot divide or reset the global boundary.
- Current TTS uses `en-AU-Standard-C`, speaking rate `0.9`, pitch `0`, MP3, with 2,000 provider attempts/day, 100,000 characters/day, 1,000,000 characters/month, US$0.50/day, US$4/month, concurrency 4, Cache, accounting, and Kill Switch. There is no per-person ceiling; browser speech is an explicit device fallback.
- Production accepts only cutover modes `maintenance`, `schema6-readiness`, and `live`; missing or unknown modes fail closed. Mutations require the code-owned `v2-schema6` client marker. Generic `/api/storage/data` POST additionally requires `x-mimi-storage-client-revision: v2.3`; missing or incompatible revisions receive `428` before repository access.
- Automated Speech Recognition（自动语音识别）, microphone upload, AI pronunciation scoring, public registration, confidential per-person authorization, external question banks, analytics, notifications, and automated backups remain outside the accepted baseline unless a later approved plan activates them.

## Governance Classification

- Tier 1-5 is the only governance classification. Complexity, data volume, cloud use and validation cost inform the work and evidence without creating another tier, score or level.
- Project tier: Tier 3. The live private web app has ordinary credentials, confidential study data, Production hosting, a cloud database, and bounded paid providers without material economic or high-consequence account authority.
- Tier rationale: credible risks are confidential-data exposure, credential mishandling, environment crossover, bounded paid-provider abuse, and recoverable study-data loss. The app has no trading, transfer, payment, bulk account action, or comparable authority.
- For material work, record the current authority on the affected surface, the target capability tier, and the working tier when they affect the decision. Use the higher current/target authority for that surface.
- Do not add Tier 4/5 account or execution controls unless the project gains comparable authority or consequence.

The following remain explicit-approval work under Tier 3:

- credentials, secrets, API keys, OAuth, or auth-provider configuration;
- external APIs, paid AI accounts, billing, rate-limit / Firewall（防火墙）configuration, or new provider data transmission;
- Production deployment or domain changes;
- Production database migrations;
- Production data write, cleanup, import, restore, or destructive change;
- GitHub push, pull request, merge, or Git-history rewrite;
- long-running automation, scheduled jobs, email, messages, notifications, payments, or charges.

## Safety Boundaries

Allowed by default:

- Read local project files and current non-secret repository state.
- Write agreed project files inside this repository.
- Create local docs, plans, tests, and generated artifacts inside the project tree.
- Run local validation that does not require credential inspection or remote mutation.

Require explicit human approval:

- Initialize or rewrite Git history; push to GitHub; create or merge pull requests.
- Deploy to Vercel, change domains, or change Firewall rules.
- Create, migrate, seed, restore, or delete remote databases.
- Read or modify `.env` values, credentials, tokens, billing, or private account settings.
- Add another integration that sends study data outside the app.

Forbidden without explicit approval:

- Mutate Production data.
- Send emails, messages, notifications, payments, or charges.
- Store secrets in source control or documentation.
- Publicly expose study history, review history, AI drafts, personal data, or credentials.
- Treat browser-selected `person_id` as verified identity.

## Data Persistence Policy

- Vocabulary records, timestamps, review history, typed attempts, AI enrichment, and self-rated rarity can be personal study data.
- Collect only data required for the accepted learning and review workflow.
- Preserve exportability through JSON backup and CSV where semantically appropriate.
- Before schema migration or destructive cleanup, plan and verify backup / restore behavior.
- Production holds real learning data; Development / Staging / Preview use synthetic, fixture, or disposable data.
- Follow the active lifecycle plan and its approved V2.3 Stage 2.3.11 override: native Neon daily snapshots, monthly independent encrypted local copies, and an additional verified backup before high-risk Production data changes. That stage owns retention, scheduling status and bounded failure handling; earlier weekly/manual cadence is historical.
- Raw AI prompts and raw provider responses are not retained by default when structured accepted evidence is sufficient.
- Speech Recognition and microphone audio are not collected or transmitted under the accepted baseline.

## Runtime And Environment

- Use a project `venv` or `.venv` first for Python support scripts when present. This repository currently uses system `python3` for the standard-library-only governance gate.
- Use npm, as recorded by `package-lock.json`, for Node.js work.
- Do not assume a package version, provider model, price, limit, retention term, database target, or deployment state before checking local files and current official sources.
- Keep local fallback, Development / Staging / Preview, and Production data and credentials distinguishable.
- Preview must not receive a Production AI/TTS/database credential. Protected Preview uses its own exact runtime gates; other Preview branches remain provider-closed or fixture-backed.
- Approved non-production provider keys may exist only in their ignored, stage-scoped `.env` file. Never print, hash, stage, copy into `.env.local`, commit, or upload them to another environment.
- Production cutover mode, provider readiness, scope, quota, and steady-state ceilings are server-owned contracts. Browser input cannot activate them.
- Do not read `.env` values merely to run ordinary local validation.

## Decision Workflow

Before material changes:

1. Read `AGENTS.md` and the directly relevant canonical architecture, plan, lifecycle, release, or evidence source. Expand only when the task, uncertainty, or risk requires it.
2. Run `git status --short --untracked-files=all` and protect user-owned changes.
3. State scope, non-scope, likely files, validation, affected authority, side effects, and safety assumptions.
4. Obtain human agreement when this file, the task risk, or a consequential external action requires it.
5. If the work depends on current provider facts, verify official lifecycle, pricing, privacy, limits, and API support before design or implementation.

During implementation:

- One accepted plan covers ordinary safe local decisions inside its scope.
- Update canonical docs only when their current claims would otherwise become stale.
- Keep child/branch plan lineage explicit and avoid creating a peer plan for a bounded single-session change.
- Preserve project-specific guards and tests before adapting generic templates.
- Place each control at the trust, authority, representation, persistence or irreversibility boundary that owns its failure mode. Prefer one canonical owner inside a boundary while retaining independent layers that control distinct failures.
- Before building a complex shared, security-sensitive or maintenance-heavy capability, inspect suitable project, platform, standard-library or maintained open-source options and choose by fit and lifecycle risk.

Before handoff:

1. Update the Tier 3 Changelog/AI log when the change is material.
2. Run the smallest meaningful validation that covers changed behavior and relevant safety invariants.
3. Reuse passing evidence only while its subject, relevant inputs, contract, verifier, acceptance rule and environment remain unchanged; invalidate the affected claims rather than unrelated evidence.
4. Run an aggregate gate once when it already includes the relevant child checks; rerun a child only for diagnosis or distinct evidence. Stop when every affected acceptance claim and permanent safety invariant has current sufficient evidence.
5. Review the diff and file inventory.
6. Report outcome, validation, safety notes, residual risk, and the next required decision.

## Validation

For governance/documentation changes:

```bash
npm run governance:check
git diff --check
```

For broad runtime, persistence, or release-candidate changes, add the relevant focused checks and normally finish with:

```bash
npm run governance:check
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
```

`npm run dev` plus browser acceptance is conditional manual evidence when UI/runtime behavior changes; it is not an automatic completion gate.

The legacy `db:inspect:dev` and `db:inspect:schema5:dev` commands apply only when `.env.local` intentionally targets their older Schema 3/5 Development baselines. They are not a current-schema gate against Schema 6 `staging`. V2-8-2 Staging inspection uses `npm run v2:8-2:db:inspect` with its exact guarded non-Production identity variables.

Never run a remote-capable `v2:8-3:db:*`, V2.1/V2.2 Production database, backup, provider, or deployment command without its separately approved gate and exact evidence packet.
