# Words Learning App For Mimi Version-Hold: Multi-User Confidential Isolation

Created: 2026-07-13 00:16 AEST
Last updated: 2026-07-16 00:27 AEST

Source plan:
- `plan_docs/PLAN_V2_MASTER.md`

Derived from:
- `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md`
- `ARCHITECTURE.md`
- the user's decision to keep SSO and confidential multi-user isolation outside V2

Input evidence:
- Current Production uses one shared Basic Auth gate for a private trusted group.
- `person_id` separates learning records but is not an authentication or authorization boundary.
- V2 introduces bounded AI use while retaining the current trusted-group access model.

Consumer / next stage:
- A future version master plan created only after a reactivation trigger and explicit human decision.

Document nature:
This is a Version-hold record. It preserves the future problem, current limitations, reactivation triggers, and required decisions. It is not an implementation stage, an auth-provider selection, or permission to change credentials, schema, accounts, or Production.

Current operational tier: Tier 3.

Target capability tier while held: Tier 3. A future public or higher-sensitivity design must reclassify from actual authority and data risk at that time.

Working tier: Tier 3 for this documentation-only hold record.

## Scope

- Record that current Basic Auth is a shared gate and `person_id` is data separation only.
- Define what confidential multi-user isolation would need to cover in a future version.
- Define the events that should reactivate planning.
- Preserve migration and deletion questions so V2 does not accidentally imply stronger identity guarantees.
- Keep V2 AI quotas honest: Stage 7A has no per-person attempt ceiling, and server-owned global request, token, cost, concurrency, and Kill Switch limits remain the cost-security boundary.

## Non-Scope

- No SSO, OAuth, password account, magic link, identity provider, role, session, invitation, account recovery, or public signup selection.
- No user / tenant schema, access-control migration, row-level security policy, admin panel, or account-linking implementation.
- No Basic Auth change or credential rotation.
- No Vercel, Neon, provider dashboard, environment variable, domain, GitHub, database, migration, or Production action.
- No claim that V2 provides confidential isolation between people sharing the current application credential.

## Safety / Side Effects

- This file changes documentation only.
- The current private trusted group remains the accepted access model until a separately approved future stage changes it.
- Future identity work must preserve current learner data, backup/export rights, auditability, and rollback.
- No future plan may use `person_id` from a browser request as proof of identity without a verified authentication binding.

## Exit Criteria

- The current access and data-separation boundary is explicit.
- Reactivation triggers are explicit.
- Required future design decisions and migration invariants are recorded.
- V2 documents link to this hold instead of presenting SSO as V2 scope.
- No provider, schema, credential, or live action is performed.

## Current Boundary

Current Production shape:

```text
shared Basic Auth
  -> permits a trusted person to enter the application
  -> application can select a person record
  -> person_id filters learning data
```

What this provides:

- a shared private entrance for the current trusted group;
- ordinary protection against unauthenticated public access;
- logical separation of vocabulary, settings, imports, review history, and future V2 AI-derived data by `person_id` when every repository query is correct.

What this does not provide:

- proof that the current browser user owns the selected `person_id`;
- confidential separation between people who know the shared Basic Auth credential;
- independent account recovery or credential revocation;
- user roles, admin authorization, sharing permissions, or audit identity;
- a safe public-registration model;
- per-person security limits for paid AI. A trusted user can switch or create person records, so only global quota is a hard cost boundary.

## Why This Is Held

- The current product serves a small private trusted group.
- V2 has a bounded product scope centered on daily study, Active practice, mobile refinement, visualization, and first-generation AI enrichment.
- Selecting an identity provider now would introduce credentials, account migration, data-ownership decisions, recovery, deletion, and recurring service dependencies before the product needs them.
- The existing Tier 3 access gate is proportionate to the current phase when its limitations are stated accurately.

## Reactivation Triggers

Create a new human-approved identity / isolation stage when one or more of these becomes real:

- an unfamiliar user needs access;
- public registration, invitations, or shareable accounts are requested;
- one learner must be unable to read or mutate another learner's vocabulary, history, AI drafts, or settings;
- individual AI billing / security quotas must be enforceable by identity;
- private notes, writing samples, microphone audio, pronunciation recordings, or other higher-sensitivity data are stored;
- multiple maintainers need different administrative permissions;
- account recovery, credential revocation, access logs, or account deletion becomes necessary;
- contractual, legal, school, workplace, or compliance requirements appear;
- the shared Basic Auth workflow becomes operationally unreliable.

## Required Future Decisions

A reactivated stage must decide, with current official evidence:

- identity provider versus local credential ownership;
- login, logout, session expiry, recovery, and credential revocation;
- invitation-only versus public registration;
- user, learner profile, household / group, and admin relationships;
- authorization rules for vocabulary, review events, daily plans, AI drafts, accepted AI data, exports, and backups;
- whether one account may own multiple learner profiles;
- how current `people` and `person_id` rows bind to verified identities;
- conflict handling when two current profiles claim the same future account;
- account deletion propagation through active rows, logs, AI lineage, Cache, exports, and backup expiry;
- data export and portability before account deletion;
- rate limits, paid AI quotas, and abuse controls keyed to verified identity plus global caps;
- row-level database enforcement, repository enforcement, or both;
- admin support access, redaction, and audit logging;
- migration rollback and a temporary compatibility period for the existing trusted group.

## Migration Invariants

- Existing V1/V2 learning data cannot be silently reassigned, merged, or deleted.
- A verified identity binding must be created before treating a person profile as owned.
- The migration requires a fresh validated Production backup and a Staging rehearsal.
- Old shared access must not remain as an unnoticed bypass after confidential isolation is enabled.
- During migration, reads and writes must have one authoritative authorization path; mixed identity and browser-selected-person rules are unsafe.
- Production and non-production identity credentials and data remain separate.
- Account deletion must specify what disappears immediately, what remains temporarily for security / legal reasons, and when backup copies expire.

## V2 Interaction

- V2 keeps the shared Basic Auth entrance.
- V2 continues to scope study rows and AI-derived rows by `person_id` for data organization.
- V2 Stage 7A deliberately has no per-person AI request ceiling. `person_id` is retained for data ownership and audit only and cannot partition or reset the shared budget.
- V2 global request, token, cost, concurrency, provider billing, and Kill Switch controls protect the shared paid resource.
- A future enforceable personal quota requires an authenticated identity binding and is one reason to reactivate this Version-hold plan.
- V2 must not describe a selected person as a secure account or private tenant.
- V2 exports and backups must retain sufficient person ownership metadata for a future explicit identity migration.

## Stop Conditions For Future Reactivation

Stop a future identity project before live action if:

- the provider, pricing, data terms, session model, or deployment support has not been verified from current official sources;
- existing people cannot be mapped without guessing ownership;
- current backups cannot restore the pre-migration state;
- any route still trusts a browser-selected `person_id` after confidential isolation is claimed;
- account deletion or recovery behavior is ambiguous;
- Preview / Staging identity configuration can access Production users or credentials;
- credentials or private identity data would enter source control or logs;
- the user has not approved the provider, migration, credential, and Production execution boundaries.

## Hold Result

Multi-user confidential isolation is preserved as an explicit later-version problem. V2 may improve product capability and add a bounded paid AI route while retaining the current trusted-group gate, but it must continue to state that `person_id` is data separation and that shared Basic Auth is not confidential per-person authorization.
