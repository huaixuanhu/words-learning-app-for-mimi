import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
  assertNonProductionDatabaseTarget,
  createPool,
  getDatabaseUrl,
} from "./db-connection.mjs";

const ENV_FILE = resolve(process.cwd(), ".env.v2-7b-2.local");
const MIGRATION_FILE = resolve(
  process.cwd(),
  "db/migrations/0003_v2_schema6_data_model.sql",
);
const PERSON_ID = "00000000-0000-4000-8000-000000007c01";
const ADAPT_ITEM_ID = "00000000-0000-4000-8000-000000007c02";
const MITIGATE_ITEM_ID = "00000000-0000-4000-8000-000000007c03";
const CREATED_AT = "2026-07-18T02:00:00.000Z";
const TIMEZONE = "Australia/Melbourne";

const SCHEMA5_TABLES = [
  "people",
  "vocabulary_items",
  "review_states",
  "review_events",
  "review_settings",
];
const SCHEMA6_TABLES = [
  "daily_study_defaults",
  "daily_study_plans",
  "vocabulary_creation_facts",
  "ai_runs",
  "ai_enrichment_drafts",
  "ai_context_explanation_cache",
  "vocabulary_relations",
  "ai_usage_buckets",
  "ai_disclosure_confirmations",
  "ai_request_idempotency",
  "study_command_idempotency",
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the temporary V2-7B-2 target`);
  return value;
}

function assertExactEnvironment() {
  assertNonProductionDatabaseTarget();
  if (process.env.STAGE5F_DATABASE_TARGET !== "preview") {
    throw new Error("V2-7B-2 requires STAGE5F_DATABASE_TARGET=preview");
  }
  if (process.env.MIMI_STORAGE_RUNTIME !== "postgres-preview") {
    throw new Error("V2-7B-2 requires MIMI_STORAGE_RUNTIME=postgres-preview");
  }
  if (process.env.MIMI_V2_7B2_TEMP_TARGET_CONFIRMED !== "true") {
    throw new Error("The temporary target must be confirmed before database access");
  }
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error("V2-7B-2 database tools cannot run inside a Vercel environment");
  }
}

async function assertSecretFileMode() {
  const metadata = await stat(ENV_FILE);
  const mode = metadata.mode & 0o777;
  if (mode !== 0o600) {
    throw new Error(".env.v2-7b-2.local must use file mode 600");
  }
}

function assertConnectionTarget(rawUrl, label, expectedRoleOverride) {
  const expectedEndpoint = requiredEnv("MIMI_V2_7B2_EXPECTED_ENDPOINT_ID");
  const expectedRole =
    expectedRoleOverride || requiredEnv("MIMI_V2_7B2_TEMP_ROLE");
  const expectedDatabase = requiredEnv("MIMI_V2_7B2_TEMP_DATABASE");
  requiredEnv("MIMI_V2_7B2_TEMP_BRANCH_ID");
  if (!/^ep-[a-z0-9-]+$/u.test(expectedEndpoint)) {
    throw new Error("The expected Neon endpoint id is invalid");
  }
  if (!/^[a-z][a-z0-9_]{2,62}$/u.test(expectedRole)) {
    throw new Error("The dedicated temporary role name is invalid");
  }
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`${label} must be a Postgres connection URL`);
  }
  if (!parsed.hostname.endsWith(".neon.tech")) {
    throw new Error(`${label} is not a Neon endpoint`);
  }
  const endpointLabel = parsed.hostname.split(".")[0];
  if (
    endpointLabel !== expectedEndpoint &&
    endpointLabel !== `${expectedEndpoint}-pooler`
  ) {
    throw new Error(`${label} does not match the approved temporary endpoint`);
  }
  if (decodeURIComponent(parsed.username) !== expectedRole) {
    throw new Error(`${label} does not use the dedicated temporary role`);
  }
  if (decodeURIComponent(parsed.pathname.slice(1)) !== expectedDatabase) {
    throw new Error(`${label} does not use the approved temporary database`);
  }
  return {
    database: expectedDatabase,
    endpointMatched: true,
    roleMatched: true,
  };
}

async function preflight() {
  assertExactEnvironment();
  await assertSecretFileMode();
  const pooled = requiredEnv("DATABASE_URL");
  const unpooled = requiredEnv("DATABASE_URL_UNPOOLED");
  const pooledIdentity = assertConnectionTarget(pooled, "DATABASE_URL");
  const unpooledIdentity = assertConnectionTarget(
    unpooled,
    "DATABASE_URL_UNPOOLED",
  );
  assertConnectionTarget(getDatabaseUrl(), "selected migration connection");
  if (pooledIdentity.database !== unpooledIdentity.database) {
    throw new Error("Pooled and unpooled connections target different databases");
  }
  if (command === "migrate") {
    const migrationRole = requiredEnv("MIMI_V2_7B2_MIGRATION_ROLE");
    if (migrationRole !== "neondb_owner") {
      throw new Error("V2-7B-2 migration role must be the temporary branch database owner");
    }
    const migrationUrl = requiredEnv(
      "MIMI_V2_7B2_MIGRATION_DATABASE_URL_UNPOOLED",
    );
    assertConnectionTarget(
      migrationUrl,
      "temporary migration owner connection",
      migrationRole,
    );
    return {
      identity: pooledIdentity,
      connectionUrl: migrationUrl,
      expectedConnectedRole: migrationRole,
    };
  }
  return {
    identity: pooledIdentity,
    connectionUrl: getDatabaseUrl(),
    expectedConnectedRole: requiredEnv("MIMI_V2_7B2_TEMP_ROLE"),
  };
}

async function foundTables(client, names) {
  const result = await client.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_name = any($1::text[])
      order by table_name
    `,
    [names],
  );
  return new Set(result.rows.map((row) => row.table_name));
}

async function requireTables(client, names) {
  const found = await foundTables(client, names);
  const missing = names.filter((name) => !found.has(name));
  if (missing.length) throw new Error(`Missing required tables: ${missing.join(", ")}`);
}

async function coreCounts(client) {
  const result = await client.query(
    `
      select
        (select count(*)::int from people) as people,
        (select count(*)::int from vocabulary_items) as vocabulary_items,
        (select count(*)::int from review_states) as review_states,
        (select count(*)::int from review_events) as review_events,
        (select count(*)::int from review_settings) as review_settings
    `,
  );
  return result.rows[0];
}

async function permissionEvidence(client) {
  const result = await client.query(
    `
      select
        current_user as current_user,
        has_schema_privilege(current_user, 'public', 'create') as can_create_in_public,
        pg_has_role(current_user, 'neon_superuser', 'member') as neon_superuser_member,
        (
          select tableowner
          from pg_tables
          where schemaname = 'public' and tablename = 'vocabulary_items'
        ) as schema5_owner
    `,
  );
  return result.rows[0];
}

function assertEmptyCore(counts) {
  const populated = Object.entries(counts).filter(([, count]) => Number(count) !== 0);
  if (populated.length) {
    throw new Error(
      `Schema-only target is not empty: ${populated.map(([key]) => key).join(", ")}`,
    );
  }
}

async function inspectSchema6(client) {
  await requireTables(client, [...SCHEMA5_TABLES, ...SCHEMA6_TABLES]);
  const constraints = await client.query(
    `
      select constraint_name
      from information_schema.table_constraints
      where table_schema = 'public'
        and constraint_name = any($1::text[])
      order by constraint_name
    `,
    [[
      "ai_runs_provider_lineage_consistent",
      "ai_disclosure_confirmations_current_version",
      "ai_request_idempotency_lifecycle_consistent",
    ]],
  );
  if (constraints.rows.length !== 3) {
    throw new Error("Schema 6 AI safety constraints are incomplete");
  }
  const v3Constraint = await client.query(
    `
      select pg_get_constraintdef(oid) as definition
      from pg_constraint
      where conname = 'ai_disclosure_confirmations_current_version'
    `,
  );
  if (!String(v3Constraint.rows[0]?.definition ?? "").includes("ai-disclosure-v3")) {
    throw new Error("Schema 6 does not require ai-disclosure-v3 confirmations");
  }
}

async function aiEvidence(client) {
  const result = await client.query(
    `
      select
        count(*)::int as attempts,
        count(*) filter (where feature = 'enrichment_v1')::int as enrichment_attempts,
        count(*) filter (where feature = 'context_explain_v1')::int as context_attempts,
        count(*) filter (where status = 'submitted')::int as submitted_attempts,
        count(*) filter (where status = 'succeeded')::int as succeeded_attempts,
        count(*) filter (where status = 'rejected')::int as rejected_attempts,
        count(*) filter (where status = 'failed')::int as failed_attempts,
        count(*) filter (
          where model = 'gemini-3.1-flash-lite'
            and model_label = 'Gemini 3.1 Flash-Lite'
        )::int as expected_model_attempts,
        count(*) filter (where disclosure_version = 'ai-disclosure-v3')::int
          as current_disclosure_attempts,
        count(*) filter (where structure_validation_status = 'valid')::int
          as valid_structure_attempts,
        count(*) filter (where provider_response_id is not null)::int
          as provider_response_id_attempts,
        coalesce(sum(input_tokens), 0)::int as input_tokens,
        coalesce(sum(output_tokens), 0)::int as output_tokens,
        coalesce(sum(thinking_tokens), 0)::int as thinking_tokens,
        coalesce(sum(total_tokens), 0)::int as total_tokens,
        coalesce(sum(estimated_cost_usd), 0)::numeric(12, 6) as estimated_cost_usd
      from ai_runs
      where provider = 'google-gemini-api'
    `,
  );
  return result.rows[0];
}

async function aiStoredEvidence(client) {
  const result = await client.query(
    `
      select
        (select count(*)::int from ai_enrichment_drafts) as enrichment_drafts,
        (select count(*)::int from ai_context_explanation_cache) as context_cache_rows,
        (select count(*)::int from ai_disclosure_confirmations) as disclosure_confirmations,
        (select count(*)::int from ai_request_idempotency) as idempotency_records
    `,
  );
  return result.rows[0];
}

async function aiBudgetEvidence(client) {
  const result = await client.query(
    `
      select
        count(*)::int as bucket_count,
        coalesce(max(attempts_reserved), 0)::int as maximum_attempts_reserved,
        coalesce(max(input_tokens_reserved), 0)::bigint as maximum_input_tokens_reserved,
        coalesce(max(output_tokens_reserved), 0)::bigint as maximum_output_tokens_reserved,
        coalesce(max(estimated_cost_usd_reserved), 0)::numeric(12, 6)
          as maximum_estimated_cost_usd_reserved,
        coalesce(sum(active_provider_calls), 0)::int as active_provider_calls
      from ai_usage_buckets
    `,
  );
  return result.rows[0];
}

async function migrate(client) {
  if (!process.argv.includes("--i-confirm-temporary-schema6-migration")) {
    throw new Error("Migration requires --i-confirm-temporary-schema6-migration");
  }
  await requireTables(client, SCHEMA5_TABLES);
  assertEmptyCore(await coreCounts(client));
  const existing = await foundTables(client, SCHEMA6_TABLES);
  if (existing.size) {
    throw new Error("Schema 6 tables already exist; refusing a repeated migration");
  }
  const sql = await readFile(MIGRATION_FILE, "utf8");
  await client.query(sql);
  await inspectSchema6(client);
  const runtimeRole = requiredEnv("MIMI_V2_7B2_TEMP_ROLE");
  await client.query(`grant usage on schema public to "${runtimeRole}"`);
  await client.query(
    `grant select, insert, update, delete on all tables in schema public to "${runtimeRole}"`,
  );
  await client.query(
    `grant usage, select, update on all sequences in schema public to "${runtimeRole}"`,
  );
  return {
    migrated: true,
    schema6Tables: SCHEMA6_TABLES.length,
    dedicatedRuntimeRoleGranted: true,
  };
}

async function seed(client) {
  if (!process.argv.includes("--i-confirm-synthetic-seed")) {
    throw new Error("Synthetic seed requires --i-confirm-synthetic-seed");
  }
  await inspectSchema6(client);
  assertEmptyCore(await coreCounts(client));
  await client.query("begin");
  try {
    await client.query(
      `
        insert into people (id, display_name, slug, is_active, created_at, updated_at)
        values ($1, 'V2-7B-2 Synthetic', 'v2-7b2-synthetic', true, $2, $2)
      `,
      [PERSON_ID, CREATED_AT],
    );
    await client.query(
      `
        insert into review_settings (
          person_id, session_limit, timezone, updated_at,
          recognition_session_limit, active_session_limit
        ) values ($1, 20, $2, $3, 20, 8)
      `,
      [PERSON_ID, TIMEZONE, CREATED_AT],
    );
    await client.query(
      `
        insert into daily_study_defaults (
          person_id, review_profile, review_goal, new_word_goal, timezone, updated_at
        ) values
          ($1, 'recognition', 20, 8, $2, $3),
          ($1, 'active', 8, 4, $2, $3)
      `,
      [PERSON_ID, TIMEZONE, CREATED_AT],
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
            $2, $1, 'adapt', 'adapt', '适应', '["适应"]'::jsonb,
            'She adapted quickly to the new environment.',
            '["She adapted quickly to the new environment."]'::jsonb,
            '', null, 'recognition', null, 'manual', null, 'new', $4, $4, $4, $5, null
          ),
          (
            $3, $1, 'mitigate', 'mitigate', '减轻', '["减轻"]'::jsonb,
            'The new policy may mitigate the risk.',
            '["The new policy may mitigate the risk."]'::jsonb,
            '', null, 'recognition', null, 'manual', null, 'new', $4, $4, $4, $5, null
          )
      `,
      [PERSON_ID, ADAPT_ITEM_ID, MITIGATE_ITEM_ID, CREATED_AT, TIMEZONE],
    );
    await client.query(
      `
        insert into vocabulary_creation_facts (
          id, person_id, original_vocabulary_item_id, source_action_id,
          track_at_creation, source_kind, history_origin, system_created_at
        ) values
          ('00000000-0000-4000-8000-000000007c12', $1, $2, $2,
            'recognition', 'single', 'recorded', $4),
          ('00000000-0000-4000-8000-000000007c13', $1, $3, $3,
            'recognition', 'single', 'recorded', $4)
      `,
      [PERSON_ID, ADAPT_ITEM_ID, MITIGATE_ITEM_ID, CREATED_AT],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
  return {
    seeded: true,
    people: 1,
    vocabularyItems: 2,
    syntheticVocabularyEntryIds: [ADAPT_ITEM_ID, MITIGATE_ITEM_ID],
  };
}

const command = process.argv[2];
if (!["inventory", "migrate", "seed", "inspect"].includes(command)) {
  throw new Error("Usage: v2-stage7b2-db.mjs inventory|migrate|seed|inspect");
}

const preflightResult = await preflight();
const pool = createPool(preflightResult.connectionUrl);
let client;

try {
  client = await pool.connect();
  const session = await client.query(
    `select current_user as current_user, current_database() as current_database`,
  );
  if (session.rows[0]?.current_user !== preflightResult.expectedConnectedRole) {
    throw new Error("Connected role does not match the command-specific temporary role");
  }
  if (session.rows[0]?.current_database !== process.env.MIMI_V2_7B2_TEMP_DATABASE) {
    throw new Error("Connected database does not match the temporary target");
  }

  let result;
  if (command === "inventory") {
    await requireTables(client, SCHEMA5_TABLES);
    const counts = await coreCounts(client);
    assertEmptyCore(counts);
    result = {
      schemaOnly: true,
      counts,
      permissions: await permissionEvidence(client),
    };
  } else if (command === "migrate") {
    result = await migrate(client);
  } else if (command === "seed") {
    result = await seed(client);
  } else {
    await inspectSchema6(client);
    const ai = await aiEvidence(client);
    const budget = await aiBudgetEvidence(client);
    if (Number(ai.attempts) > 2) {
      throw new Error("Temporary provider proof exceeded two provider attempts");
    }
    if (Number(ai.estimated_cost_usd) > 0.0031) {
      throw new Error("Temporary provider proof exceeded the reserved cost ceiling");
    }
    if (Number(budget.active_provider_calls) !== 0) {
      throw new Error("Temporary provider accounting still has an active call");
    }
    result = {
      counts: await coreCounts(client),
      ai,
      stored: await aiStoredEvidence(client),
      budget,
    };
  }

  console.log(
    JSON.stringify({ ok: true, target: preflightResult.identity, result }, null, 2),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: error?.code || "unknown",
        message: error?.message || "Database operation failed",
        schema: error?.schema || null,
        table: error?.table || null,
        constraint: error?.constraint || null,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
