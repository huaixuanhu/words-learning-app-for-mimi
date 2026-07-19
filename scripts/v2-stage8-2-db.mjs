import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPool } from "./db-connection.mjs";

const MIGRATION_FILE = resolve(
  process.cwd(),
  "db/migrations/0003_v2_schema6_data_model.sql",
);
const PREVIEW_PERSON_ID = "00000000-0000-4000-8000-000000008201";
const PREVIEW_RECOGNITION_ADAPT_ID = "00000000-0000-4000-8000-000000008202";
const PREVIEW_RECOGNITION_MITIGATE_ID = "00000000-0000-4000-8000-000000008203";
const PREVIEW_ACTIVE_ARTICULATE_ID = "00000000-0000-4000-8000-000000008204";
const PREVIEW_ACTIVE_RESILIENCE_ID = "00000000-0000-4000-8000-000000008205";
const PREVIEW_CREATED_AT = "2026-07-18T13:20:00.000Z";
const PREVIEW_TIMEZONE = "Australia/Melbourne";

const SCHEMA6_TABLES = [
  "daily_study_defaults",
  "daily_study_plans",
  "vocabulary_creation_facts",
  "vocabulary_creation_reversals",
  "ai_runs",
  "ai_disclosure_confirmations",
  "ai_request_idempotency",
  "ai_enrichment_drafts",
  "ai_context_explanation_cache",
  "vocabulary_relations",
  "ai_usage_buckets",
  "study_command_idempotency",
];

const SCHEMA6_CONSTRAINTS = [
  "review_states_person_item_profile_unique",
  "review_states_parameter_set_profile_valid",
  "review_events_profile_evidence_consistent",
  "daily_study_plans_person_profile_date_unique",
  "ai_runs_provider_lineage_consistent",
  "ai_runs_success_usage_present",
  "ai_disclosure_confirmations_current_version",
  "ai_usage_buckets_person_scope_consistent",
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for V2-8-2 database access`);
  return value;
}

function targetKind() {
  const value = requiredEnv("MIMI_V2_8_2_DATABASE_TARGET");
  if (value !== "rehearsal" && value !== "staging") {
    throw new Error("MIMI_V2_8_2_DATABASE_TARGET must be rehearsal or staging");
  }
  return value;
}

function databaseUrl() {
  return (
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );
}

function assertExactTarget(command) {
  const kind = targetKind();
  if (process.env.STAGE5F_DATABASE_TARGET !== "preview") {
    throw new Error("V2-8-2 requires STAGE5F_DATABASE_TARGET=preview");
  }
  if (process.env.MIMI_STORAGE_RUNTIME !== "postgres-preview") {
    throw new Error("V2-8-2 requires MIMI_STORAGE_RUNTIME=postgres-preview");
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("V2-8-2 refuses a Vercel Production environment");
  }

  const expectedBranchId = requiredEnv("MIMI_V2_8_2_EXPECTED_BRANCH_ID");
  const expectedBranchName = requiredEnv("MIMI_V2_8_2_EXPECTED_BRANCH_NAME");
  const expectedEndpointId = requiredEnv("MIMI_V2_8_2_EXPECTED_ENDPOINT_ID");
  const expectedRole = requiredEnv("MIMI_V2_8_2_EXPECTED_ROLE");
  if (!/^br-[a-z0-9-]+$/u.test(expectedBranchId)) {
    throw new Error("The expected Neon branch id is invalid");
  }
  if (!/^[a-z0-9][a-z0-9/_-]{2,62}$/u.test(expectedBranchName)) {
    throw new Error("The expected Neon branch name is invalid");
  }
  if (!/^ep-[a-z0-9-]+$/u.test(expectedEndpointId)) {
    throw new Error("The expected Neon endpoint id is invalid");
  }
  if (!/^[a-z][a-z0-9_]{2,62}$/u.test(expectedRole)) {
    throw new Error("The expected Postgres role is invalid");
  }

  const rawUrl = databaseUrl();
  if (!rawUrl) throw new Error("A non-Production database URL is required");
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("The V2-8-2 database URL must use Postgres");
  }
  if (!parsed.hostname.endsWith(".neon.tech")) {
    throw new Error("The V2-8-2 database target must be Neon");
  }
  const endpointLabel = parsed.hostname.split(".")[0];
  if (
    endpointLabel !== expectedEndpointId &&
    endpointLabel !== `${expectedEndpointId}-pooler`
  ) {
    throw new Error("The database URL does not match the confirmed Neon endpoint");
  }
  if (decodeURIComponent(parsed.username) !== expectedRole) {
    throw new Error("The database URL does not use the confirmed migration role");
  }
  if (decodeURIComponent(parsed.pathname.slice(1)) !== "neondb") {
    throw new Error("V2-8-2 expects the neondb database");
  }
  if (kind === "staging" && command === "migrate") {
    const recoveryBranchId = requiredEnv(
      "MIMI_V2_8_2_STAGING_RECOVERY_BRANCH_ID",
    );
    if (!/^br-[a-z0-9-]+$/u.test(recoveryBranchId)) {
      throw new Error("The staging recovery branch id is invalid");
    }
    if (recoveryBranchId === expectedBranchId) {
      throw new Error("The staging recovery branch must differ from staging");
    }
    if (process.env.MIMI_V2_8_2_STAGING_RECOVERY_CONFIRMED !== "true") {
      throw new Error("The long-term staging recovery checkpoint is not confirmed");
    }
  }

  return {
    branchId: expectedBranchId,
    branchName: expectedBranchName,
    endpointMatched: true,
    kind,
    role: expectedRole,
  };
}

async function schemaVersion(queryable) {
  const result = await queryable.query(
    `
      select count(*)::integer as count
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'review_states'
        and column_name = 'review_profile'
    `,
  );
  return Number(result.rows[0]?.count ?? 0) === 1 ? 6 : 5;
}

async function coreCounts(queryable, version) {
  const schema6 = version === 6;
  const result = await queryable.query(
    `
      select
        (select count(*)::integer from people) as people,
        (select count(*)::integer from vocabulary_items) as vocabulary_items,
        (select count(*)::integer from review_states) as review_states,
        (select count(*)::integer from review_events) as review_events,
        (select count(*)::integer from review_settings) as review_settings,
        ${schema6
          ? "(select count(*)::integer from daily_study_defaults)"
          : "0::integer"} as daily_study_defaults,
        ${schema6
          ? "(select count(*)::integer from daily_study_plans)"
          : "0::integer"} as daily_study_plans,
        ${schema6
          ? "(select count(*)::integer from vocabulary_creation_facts)"
          : "0::integer"} as vocabulary_creation_facts,
        ${schema6 ? "(select count(*)::integer from ai_runs)" : "0::integer"} as ai_runs,
        ${schema6
          ? "(select count(*)::integer from ai_enrichment_drafts)"
          : "0::integer"} as ai_enrichment_drafts,
        ${schema6
          ? "(select count(*)::integer from ai_context_explanation_cache)"
          : "0::integer"} as ai_context_cache
    `,
  );
  return result.rows[0];
}

async function schema6Inspection(queryable) {
  const tableResult = await queryable.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_name = any($1::text[])
    `,
    [SCHEMA6_TABLES],
  );
  const tables = new Set(tableResult.rows.map((row) => row.table_name));
  const missingTables = SCHEMA6_TABLES.filter((table) => !tables.has(table));

  const constraintResult = await queryable.query(
    `
      select constraint_name
      from information_schema.table_constraints
      where table_schema = 'public' and constraint_name = any($1::text[])
    `,
    [SCHEMA6_CONSTRAINTS],
  );
  const constraints = new Set(
    constraintResult.rows.map((row) => row.constraint_name),
  );
  const missingConstraints = SCHEMA6_CONSTRAINTS.filter(
    (constraint) => !constraints.has(constraint),
  );

  const invariantResult = await queryable.query(
    `
      select
        (
          select count(*)::integer
          from review_states
          where
            (review_profile = 'recognition' and parameter_set_id <> 'recognition-fsrs-v1')
            or (review_profile = 'active' and parameter_set_id = 'recognition-fsrs-v1')
        ) as invalid_review_states,
        (
          select count(*)::integer
          from review_events
          where
            (review_profile = 'recognition' and activity_type <> 'recognition_card')
            or (review_profile = 'recognition' and parameter_set_id <> 'recognition-fsrs-v1')
            or (review_profile = 'active' and parameter_set_id = 'recognition-fsrs-v1')
        ) as invalid_review_events,
        (
          select count(*)::integer
          from ai_runs
          where status = 'submitted'
        ) as submitted_ai_runs,
        (
          select coalesce(sum(active_provider_calls), 0)::integer
          from ai_usage_buckets
        ) as active_provider_calls
    `,
  );
  const invariants = invariantResult.rows[0];
  if (missingTables.length > 0) {
    throw new Error(`Missing Schema 6 tables: ${missingTables.join(", ")}`);
  }
  if (missingConstraints.length > 0) {
    throw new Error(`Missing Schema 6 constraints: ${missingConstraints.join(", ")}`);
  }
  if (
    Number(invariants.invalid_review_states) !== 0 ||
    Number(invariants.invalid_review_events) !== 0 ||
    Number(invariants.submitted_ai_runs) !== 0 ||
    Number(invariants.active_provider_calls) !== 0
  ) {
    throw new Error("Schema 6 profile or provider-run invariants are not clean");
  }
  return {
    constraints: constraints.size,
    invariants,
    tables: tables.size,
  };
}

async function inspect(client, identity) {
  const version = await schemaVersion(client);
  const counts = await coreCounts(client, version);
  const schema6 = version === 6 ? await schema6Inspection(client) : null;
  return { counts, identity, schema6, schemaVersion: version };
}

async function migrate(client, identity) {
  if (!process.argv.includes("--i-confirm-v2-8-2-migration")) {
    throw new Error("Migration requires --i-confirm-v2-8-2-migration");
  }
  const before = await inspect(client, identity);
  if (before.schemaVersion !== 5) {
    throw new Error("V2-8-2 migration requires an inspected Schema 5 target");
  }
  const migration = await readFile(MIGRATION_FILE, "utf8");
  await client.query(migration);
  const after = await inspect(client, identity);
  if (after.schemaVersion !== 6) {
    throw new Error("V2-8-2 migration did not reach Schema 6");
  }
  return { after, before, migrationApplied: "0003_v2_schema6_data_model.sql" };
}

async function aiEvidence(client, identity) {
  if ((await schemaVersion(client)) !== 6) {
    throw new Error("AI evidence requires Schema 6");
  }
  const result = await client.query(
    `
      select
        count(*) filter (where provider = 'google-gemini-api')::integer as provider_attempts,
        count(*) filter (where status = 'succeeded')::integer as succeeded,
        count(*) filter (where status = 'submitted')::integer as submitted,
        count(*) filter (where model = 'gemini-3.1-flash-lite')::integer as pinned_model,
        coalesce(sum(input_tokens), 0)::bigint as input_tokens,
        coalesce(sum(output_tokens), 0)::bigint as output_tokens,
        coalesce(sum(thinking_tokens), 0)::bigint as thinking_tokens,
        coalesce(sum(total_tokens), 0)::bigint as total_tokens,
        coalesce(sum(estimated_cost_usd), 0)::numeric(12, 6) as estimated_cost_usd
      from ai_runs
    `,
  );
  const buckets = await client.query(
    `
      select
        coalesce(sum(active_provider_calls), 0)::integer as active_provider_calls,
        coalesce(sum(attempts_reserved), 0)::integer as attempts_reserved
      from ai_usage_buckets
    `,
  );
  return { aiRuns: result.rows[0], buckets: buckets.rows[0], identity };
}

async function seedPreview(client, identity) {
  if (!process.argv.includes("--i-confirm-v2-8-2-synthetic-seed")) {
    throw new Error("Synthetic seed requires --i-confirm-v2-8-2-synthetic-seed");
  }
  if (identity.kind !== "staging") {
    throw new Error("V2-8-2 Preview seed is limited to long-term staging");
  }
  if ((await schemaVersion(client)) !== 6) {
    throw new Error("V2-8-2 Preview seed requires Schema 6");
  }
  const before = await coreCounts(client, 6);
  const populated = Object.entries(before).filter(([, value]) => Number(value) !== 0);
  if (populated.length > 0) {
    throw new Error(
      `V2-8-2 Preview seed requires an empty Staging target: ${populated
        .map(([name]) => name)
        .join(", ")}`,
    );
  }

  await client.query("begin");
  try {
    await client.query(
      `
        insert into people (id, display_name, slug, is_active, created_at, updated_at)
        values ($1, 'V2 Preview', 'v2-preview', true, $2, $2)
      `,
      [PREVIEW_PERSON_ID, PREVIEW_CREATED_AT],
    );
    await client.query(
      `
        insert into review_settings (
          person_id, session_limit, timezone, updated_at,
          recognition_session_limit, active_session_limit
        ) values ($1, 20, $2, $3, 20, 12)
      `,
      [PREVIEW_PERSON_ID, PREVIEW_TIMEZONE, PREVIEW_CREATED_AT],
    );
    await client.query(
      `
        insert into daily_study_defaults (
          person_id, review_profile, review_goal, new_word_goal, timezone, updated_at
        ) values
          ($1, 'recognition', 20, 8, $2, $3),
          ($1, 'active', 12, 6, $2, $3)
      `,
      [PREVIEW_PERSON_ID, PREVIEW_TIMEZONE, PREVIEW_CREATED_AT],
    );
    await client.query(
      `
        insert into vocabulary_items (
          id, person_id, surface_text, normalized_text, meaning_zh, meanings_zh,
          example, examples, notes, rarity_score, learning_track, tags, source,
          import_batch_id, status, created_at, system_created_at, updated_at,
          timezone, archived_at
        ) values
          (
            $2, $1, 'adapt', 'adapt', '适应；调整', '["适应；调整"]'::jsonb,
            'She adapted quickly to the new environment.',
            '["She adapted quickly to the new environment."]'::jsonb,
            '', null, 'recognition', null, 'manual', null, 'new', $6, $6, $6, $7, null
          ),
          (
            $3, $1, 'mitigate', 'mitigate', '减轻；缓和', '["减轻；缓和"]'::jsonb,
            'The new policy may mitigate the risk.',
            '["The new policy may mitigate the risk."]'::jsonb,
            '', null, 'recognition', null, 'manual', null, 'new', $6, $6, $6, $7, null
          ),
          (
            $4, $1, 'articulate', 'articulate', '清楚表达', '["清楚表达"]'::jsonb,
            'She articulated her position with confidence.',
            '["She articulated her position with confidence."]'::jsonb,
            '', null, 'active', null, 'manual', null, 'new', $6, $6, $6, $7, null
          ),
          (
            $5, $1, 'resilience', 'resilience', '韧性；恢复力', '["韧性；恢复力"]'::jsonb,
            'Resilience helps learners recover from setbacks.',
            '["Resilience helps learners recover from setbacks."]'::jsonb,
            '', null, 'active', null, 'manual', null, 'new', $6, $6, $6, $7, null
          )
      `,
      [
        PREVIEW_PERSON_ID,
        PREVIEW_RECOGNITION_ADAPT_ID,
        PREVIEW_RECOGNITION_MITIGATE_ID,
        PREVIEW_ACTIVE_ARTICULATE_ID,
        PREVIEW_ACTIVE_RESILIENCE_ID,
        PREVIEW_CREATED_AT,
        PREVIEW_TIMEZONE,
      ],
    );
    await client.query(
      `
        insert into vocabulary_creation_facts (
          id, person_id, original_vocabulary_item_id, source_action_id,
          track_at_creation, source_kind, history_origin, system_created_at
        ) values
          ('00000000-0000-4000-8000-000000008212', $1, $2, $2,
            'recognition', 'single', 'recorded', $6),
          ('00000000-0000-4000-8000-000000008213', $1, $3, $3,
            'recognition', 'single', 'recorded', $6),
          ('00000000-0000-4000-8000-000000008214', $1, $4, $4,
            'active', 'single', 'recorded', $6),
          ('00000000-0000-4000-8000-000000008215', $1, $5, $5,
            'active', 'single', 'recorded', $6)
      `,
      [
        PREVIEW_PERSON_ID,
        PREVIEW_RECOGNITION_ADAPT_ID,
        PREVIEW_RECOGNITION_MITIGATE_ID,
        PREVIEW_ACTIVE_ARTICULATE_ID,
        PREVIEW_ACTIVE_RESILIENCE_ID,
        PREVIEW_CREATED_AT,
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  return {
    identity,
    people: 1,
    seeded: true,
    syntheticVocabularyEntries: 4,
    personId: PREVIEW_PERSON_ID,
    recognitionEntryIds: [
      PREVIEW_RECOGNITION_ADAPT_ID,
      PREVIEW_RECOGNITION_MITIGATE_ID,
    ],
    activeEntryIds: [
      PREVIEW_ACTIVE_ARTICULATE_ID,
      PREVIEW_ACTIVE_RESILIENCE_ID,
    ],
  };
}

const command = process.argv[2];
if (
  !["inventory", "migrate", "inspect-schema6", "ai-evidence", "seed-preview"].includes(
    command,
  )
) {
  throw new Error(
    "Usage: v2-stage8-2-db.mjs inventory|migrate|inspect-schema6|ai-evidence|seed-preview",
  );
}

const identity = assertExactTarget(command);
const pool = createPool(databaseUrl());
const client = await pool.connect();

try {
  let result;
  if (command === "migrate") {
    result = await migrate(client, identity);
  } else if (command === "inspect-schema6") {
    const inspected = await inspect(client, identity);
    if (inspected.schemaVersion !== 6) {
      throw new Error("The confirmed target is not Schema 6");
    }
    result = inspected;
  } else if (command === "ai-evidence") {
    result = await aiEvidence(client, identity);
  } else if (command === "seed-preview") {
    result = await seedPreview(client, identity);
  } else {
    result = await inspect(client, identity);
  }
  console.log(JSON.stringify({ ok: true, result }, null, 2));
} finally {
  client.release();
  await pool.end();
}
