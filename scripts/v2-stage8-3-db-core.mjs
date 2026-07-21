import {
  assertConnectedIdentity,
  assertNonEmptyLearningInventory,
  buildSafeInventoryArtifact,
  compareInventoryParity,
  digestCanonicalRows,
  V2Stage83GuardError,
} from "./v2-stage8-3-contract.mjs";
import {
  EXPECTED_SCHEMA5_TABLES,
  inspectSchema5,
} from "./schema5-inspection.mjs";

export const V2_STAGE8_3_SCHEMA6_TABLES = [
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
  "tts_runs",
  "tts_usage_buckets",
];

export const V2_STAGE8_3_SCHEMA6_CONSTRAINTS = [
  "review_states_person_item_profile_unique",
  "review_states_parameter_set_profile_valid",
  "review_events_profile_evidence_consistent",
  "daily_study_plans_person_profile_date_unique",
  "ai_runs_provider_lineage_consistent",
  "ai_runs_success_usage_present",
  "ai_disclosure_confirmations_current_version",
  "ai_usage_buckets_person_scope_consistent",
  "vocabulary_items_example_translations_zh_array",
  "vocabulary_items_example_translation_count_matches",
  "tts_runs_completion_consistent",
  "tts_usage_buckets_counters_non_negative",
];

export const V2_STAGE8_3_SCHEMA6_COLUMNS = [
  ["review_states", "review_profile", "text", "NO"],
  ["review_states", "parameter_set_id", "text", "NO"],
  ["review_states", "first_rated_at", "timestamp with time zone", "YES"],
  ["review_states", "history_origin", "text", "NO"],
  ["review_events", "prompt_id", "uuid", "YES"],
  ["review_events", "review_profile", "text", "NO"],
  ["review_events", "activity_type", "text", "NO"],
  ["review_events", "answer_outcome", "text", "NO"],
  ["review_events", "answer_normalization_version", "text", "YES"],
  ["review_events", "target_revision", "text", "YES"],
  ["review_events", "parameter_set_id", "text", "NO"],
  ["vocabulary_items", "example_translations_zh", "jsonb", "NO"],
  ["tts_runs", "request_id_hash", "character", "NO"],
  ["tts_runs", "provider_request_id_hash", "character", "YES"],
  ["tts_usage_buckets", "execution_scope", "text", "NO"],
];

export const V2_STAGE8_3_SCHEMA6_INDEXES = [
  "review_events_person_prompt_unique",
  "review_states_person_profile_due_at_idx",
  "review_events_person_profile_reviewed_at_idx",
  "ai_request_idempotency_processing_cache_unique",
  "daily_study_plans_person_date_idx",
  "vocabulary_creation_facts_person_created_at_idx",
  "vocabulary_creation_facts_person_action_idx",
  "ai_runs_person_created_at_idx",
  "ai_runs_cache_key_idx",
  "ai_disclosure_confirmations_person_session_idx",
  "ai_request_idempotency_cache_idx",
  "ai_request_idempotency_lease_idx",
  "ai_enrichment_drafts_person_source_idx",
  "ai_context_explanation_cache_expiry_idx",
  "ai_context_explanation_cache_person_source_idx",
  "vocabulary_relations_person_source_idx",
  "ai_usage_buckets_scope_period_idx",
  "study_command_idempotency_expiry_idx",
  "tts_usage_buckets_scope_period_idx",
  "tts_runs_scope_status_created_idx",
  "tts_runs_cache_key_idx",
];

export const V2_STAGE8_3_SCHEMA6_TRIGGERS = [
  ["daily_study_plans", "daily_study_plans_history_guard"],
  ["vocabulary_creation_facts", "vocabulary_creation_facts_source_kind_guard"],
  ["vocabulary_creation_reversals", "vocabulary_creation_reversals_batch_guard"],
  ["ai_runs", "ai_runs_source_person_guard"],
  ["ai_context_explanation_cache", "ai_context_explanation_cache_run_guard"],
  ["ai_enrichment_drafts", "ai_enrichment_drafts_run_feature_guard"],
  ["vocabulary_relations", "vocabulary_relations_run_feature_guard"],
];

const REMOVED_SCHEMA5_TRIGGERS = [
  "review_states_recognition_only",
  "review_events_recognition_only",
];

const CORE_TABLES = Object.freeze({
  backup_import_mappings: {
    orderBy: "id",
  },
  backup_imports: {
    orderBy: "id",
  },
  import_batches: {
    orderBy: "id",
  },
  people: {
    orderBy: "id",
  },
  review_events: {
    orderBy: "id",
    schema6AddedColumns: [
      "prompt_id",
      "review_profile",
      "activity_type",
      "answer_outcome",
      "answer_normalization_version",
      "target_revision",
      "parameter_set_id",
    ],
  },
  review_settings: {
    orderBy: "person_id",
  },
  review_states: {
    orderBy: "id",
    schema6AddedColumns: [
      "review_profile",
      "parameter_set_id",
      "first_rated_at",
      "history_origin",
    ],
  },
  vocabulary_items: {
    orderBy: "id",
    schema6AddedColumns: ["example_translations_zh"],
  },
});

function guard(message, code = "V2_8_3_INSPECTION_REJECTED") {
  throw new V2Stage83GuardError(message, code);
}

function numericRecord(row) {
  return Object.fromEntries(
    Object.entries(row ?? {}).map(([key, value]) => [key, Number(value)]),
  );
}

export async function withReadOnlySnapshot(client, operation) {
  await client.query("begin transaction isolation level repeatable read read only");
  try {
    const result = await operation();
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // The caller closes the connection if rollback is unavailable.
    }
    throw error;
  }
}

export async function inspectConnectedIdentity(client, env) {
  const result = await client.query(
    `select current_database() as database_name, current_user as role_name`,
  );
  return assertConnectedIdentity(result.rows[0], env);
}

export async function schemaVersion(client) {
  const result = await client.query(
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

export async function inspectPotentialInFlightWrites(client) {
  const result = await client.query(
    `
      select count(*)::integer as transactions_with_xid
      from pg_stat_activity
      where datname = current_database()
        and pid <> pg_backend_pid()
        and backend_xid is not null
    `,
  );
  return Number(result.rows[0]?.transactions_with_xid ?? 0);
}

async function coreInvariants(client) {
  const result = await client.query(
    `
      select
        (
          select count(*)::integer
          from vocabulary_items item
          left join people person on person.id = item.person_id
          where person.id is null
        ) as vocabulary_person_orphans,
        (
          select count(*)::integer
          from import_batches batch
          left join people person on person.id = batch.person_id
          where person.id is null
        ) as import_batch_person_orphans,
        (
          select count(*)::integer
          from vocabulary_items item
          left join import_batches batch
            on batch.person_id = item.person_id
           and batch.id = item.import_batch_id
          where item.import_batch_id is not null and batch.id is null
        ) as vocabulary_batch_orphans,
        (
          select count(*)::integer
          from review_states state
          left join vocabulary_items item
            on item.person_id = state.person_id
           and item.id = state.vocabulary_item_id
          where item.id is null
        ) as review_state_item_orphans,
        (
          select count(*)::integer
          from review_events event
          left join vocabulary_items item
            on item.person_id = event.person_id
           and item.id = event.vocabulary_item_id
          where item.id is null
        ) as review_event_item_orphans,
        (
          select count(*)::integer
          from review_settings setting
          left join people person on person.id = setting.person_id
          where person.id is null
        ) as review_setting_person_orphans
    `,
  );
  return numericRecord(result.rows[0]);
}

async function schema5DomainCounts(client, baseCounts) {
  const result = await client.query(
    `
      select
        count(*) filter (where learning_track = 'recognition')::integer
          as recognition_vocabulary_items,
        count(*) filter (where learning_track = 'active')::integer
          as active_vocabulary_items,
        count(*) filter (where status = 'archived')::integer
          as archived_vocabulary_items
      from vocabulary_items
    `,
  );
  return {
    ...numericRecord(baseCounts),
    ...numericRecord(result.rows[0]),
  };
}

async function schema6Counts(client) {
  const result = await client.query(
    `
      select
        (select count(*)::integer from people) as people,
        (select count(*)::integer from vocabulary_items) as vocabulary_items,
        (select count(*)::integer from import_batches) as import_batches,
        (select count(*)::integer from review_states) as review_states,
        (select count(*)::integer from review_events) as review_events,
        (select count(*)::integer from review_states where review_profile = 'recognition')
          as recognition_review_states,
        (select count(*)::integer from review_states where review_profile = 'active')
          as active_review_states,
        (select count(*)::integer from review_events where review_profile = 'recognition')
          as recognition_review_events,
        (select count(*)::integer from review_events where review_profile = 'active')
          as active_review_events,
        (select count(*)::integer from review_settings) as review_settings,
        (select count(*)::integer from backup_imports) as backup_imports,
        (select count(*)::integer from backup_import_mappings) as backup_import_mappings,
        (select count(*)::integer from daily_study_defaults) as daily_study_defaults,
        (select count(*)::integer from daily_study_plans) as daily_study_plans,
        (select count(*)::integer from vocabulary_creation_facts) as vocabulary_creation_facts,
        (select count(*)::integer from vocabulary_creation_reversals) as vocabulary_creation_reversals,
        (select count(*)::integer from ai_runs) as ai_runs,
        (select count(*)::integer from ai_disclosure_confirmations) as ai_disclosure_confirmations,
        (select count(*)::integer from ai_request_idempotency) as ai_request_idempotency,
        (select count(*)::integer from ai_enrichment_drafts) as ai_enrichment_drafts,
        (select count(*)::integer from ai_context_explanation_cache) as ai_context_explanation_cache,
        (select count(*)::integer from vocabulary_relations) as vocabulary_relations,
        (select count(*)::integer from ai_usage_buckets) as ai_usage_buckets,
        (select count(*)::integer from study_command_idempotency) as study_command_idempotency,
        (select count(*)::integer from tts_runs) as tts_runs,
        (select count(*)::integer from tts_usage_buckets) as tts_usage_buckets,
        (select count(*)::integer from vocabulary_items where learning_track = 'recognition')
          as recognition_vocabulary_items,
        (select count(*)::integer from vocabulary_items where learning_track = 'active')
          as active_vocabulary_items,
        (select count(*)::integer from vocabulary_items where status = 'archived')
          as archived_vocabulary_items
    `,
  );
  return numericRecord(result.rows[0]);
}

export async function inspectSchema6Structure(client) {
  const tableResult = await client.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `,
  );
  const expectedTables = [...EXPECTED_SCHEMA5_TABLES, ...V2_STAGE8_3_SCHEMA6_TABLES].sort();
  const actualTables = tableResult.rows.map((row) => row.table_name).sort();
  const missingTables = expectedTables.filter((table) => !actualTables.includes(table));
  const unexpectedTables = actualTables.filter((table) => !expectedTables.includes(table));
  if (missingTables.length > 0 || unexpectedTables.length > 0) {
    guard(
      "The Schema 6 table inventory does not match the locked V2 contract",
      "V2_8_3_SCHEMA6_TABLE_MISMATCH",
    );
  }

  const constraintResult = await client.query(
    `
      select constraint_name
      from information_schema.table_constraints
      where table_schema = 'public'
        and constraint_name = any($1::text[])
      order by constraint_name
    `,
    [V2_STAGE8_3_SCHEMA6_CONSTRAINTS],
  );
  const foundConstraints = new Set(
    constraintResult.rows.map((row) => row.constraint_name),
  );
  if (V2_STAGE8_3_SCHEMA6_CONSTRAINTS.some((name) => !foundConstraints.has(name))) {
    guard(
      "The Schema 6 constraint inventory is incomplete",
      "V2_8_3_SCHEMA6_CONSTRAINT_MISMATCH",
    );
  }

  const columnResult = await client.query(
    `
      select table_name, column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and (table_name, column_name) in (
          select * from unnest($1::text[], $2::text[])
        )
      order by table_name, column_name
    `,
    [
      V2_STAGE8_3_SCHEMA6_COLUMNS.map(([table]) => table),
      V2_STAGE8_3_SCHEMA6_COLUMNS.map(([, column]) => column),
    ],
  );
  const columnByKey = new Map(
    columnResult.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]),
  );
  const invalidColumns = V2_STAGE8_3_SCHEMA6_COLUMNS.filter(
    ([table, column, dataType, nullable]) => {
      const row = columnByKey.get(`${table}.${column}`);
      return !row || row.data_type !== dataType || row.is_nullable !== nullable;
    },
  );
  if (invalidColumns.length > 0) {
    guard(
      "The Schema 6 column inventory is incomplete or mismatched",
      "V2_8_3_SCHEMA6_COLUMN_MISMATCH",
    );
  }

  const indexResult = await client.query(
    `
      select indexname
      from pg_indexes
      where schemaname = 'public' and indexname = any($1::text[])
      order by indexname
    `,
    [V2_STAGE8_3_SCHEMA6_INDEXES],
  );
  const foundIndexes = new Set(indexResult.rows.map((row) => row.indexname));
  if (V2_STAGE8_3_SCHEMA6_INDEXES.some((name) => !foundIndexes.has(name))) {
    guard(
      "The Schema 6 index inventory is incomplete",
      "V2_8_3_SCHEMA6_INDEX_MISMATCH",
    );
  }

  const triggerNames = [
    ...V2_STAGE8_3_SCHEMA6_TRIGGERS.map(([, name]) => name),
    ...REMOVED_SCHEMA5_TRIGGERS,
  ];
  const triggerResult = await client.query(
    `
      select event_object_table, trigger_name
      from information_schema.triggers
      where trigger_schema = 'public' and trigger_name = any($1::text[])
      order by event_object_table, trigger_name
    `,
    [triggerNames],
  );
  const foundTriggers = new Set(
    triggerResult.rows.map((row) => `${row.event_object_table}.${row.trigger_name}`),
  );
  const missingTriggers = V2_STAGE8_3_SCHEMA6_TRIGGERS.filter(
    ([table, name]) => !foundTriggers.has(`${table}.${name}`),
  );
  const retainedRemovedTriggers = triggerResult.rows.filter((row) =>
    REMOVED_SCHEMA5_TRIGGERS.includes(row.trigger_name),
  );
  if (missingTriggers.length > 0 || retainedRemovedTriggers.length > 0) {
    guard(
      "The Schema 6 trigger inventory is incomplete or retains a Schema 5 guard",
      "V2_8_3_SCHEMA6_TRIGGER_MISMATCH",
    );
  }
  return {
    constraints: foundConstraints.size,
    columns: V2_STAGE8_3_SCHEMA6_COLUMNS.length,
    indexes: foundIndexes.size,
    tables: actualTables.length,
    triggers: foundTriggers.size,
  };
}

async function schema6Invariants(client) {
  const core = await coreInvariants(client);
  const result = await client.query(
    `
      select
        (
          select count(*)::integer
          from review_states
          where
            (review_profile = 'recognition' and parameter_set_id <> 'recognition-fsrs-v1')
            or (review_profile = 'active' and parameter_set_id = 'recognition-fsrs-v1')
            or (history_origin = 'recorded' and first_rated_at is null)
            or (history_origin = 'legacy_unknown' and first_rated_at is not null)
        ) as invalid_review_states,
        (
          select count(*)::integer
          from review_states state
          where state.first_rated_at is distinct from (
            select min(event.reviewed_at)
            from review_events event
            where event.person_id = state.person_id
              and event.vocabulary_item_id = state.vocabulary_item_id
              and event.review_profile = state.review_profile
          )
        ) as review_state_first_rating_mismatches,
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
          from vocabulary_items item
          left join vocabulary_creation_facts fact
            on fact.person_id = item.person_id
           and fact.original_vocabulary_item_id = item.id
          where fact.id is null
        ) as vocabulary_creation_fact_gaps,
        (
          select count(*)::integer
          from review_settings setting
          cross join (values ('recognition'::text), ('active'::text)) profile(review_profile)
          left join daily_study_defaults defaults
            on defaults.person_id = setting.person_id
           and defaults.review_profile = profile.review_profile
          where defaults.person_id is null
        ) as daily_default_gaps,
        (
          select count(*)::integer from ai_runs where status = 'submitted'
        ) as submitted_ai_runs,
        (
          select count(*)::integer
          from ai_request_idempotency
          where status = 'processing'
        ) as processing_ai_requests,
        (
          select coalesce(sum(active_provider_calls), 0)::integer
          from ai_usage_buckets
        ) as active_provider_calls,
        (
          select count(*)::integer from tts_runs where status = 'submitted'
        ) as submitted_tts_runs,
        (
          select coalesce(sum(active_provider_calls), 0)::integer
          from tts_usage_buckets
        ) as active_tts_provider_calls
    `,
  );
  return { ...core, ...numericRecord(result.rows[0]) };
}

async function tableDigests(client, schemaVersionNumber) {
  const output = {};
  for (const [table, config] of Object.entries(CORE_TABLES)) {
    const subtraction =
      schemaVersionNumber === 6 && config.schema6AddedColumns
        ? ` - array[${config.schema6AddedColumns
            .map((column) => `'${column}'`)
            .join(", ")}]::text[]`
        : "";
    const result = await client.query(
      `
        select (to_jsonb(source_row)${subtraction})::text as canonical
        from ${table} source_row
        order by ${config.orderBy}
      `,
    );
    output[table] = {
      count: result.rows.length,
      sha256: digestCanonicalRows(result.rows),
    };
  }
  return output;
}

function assertZeroInvariants(invariants) {
  const failures = Object.entries(invariants).filter(([, count]) => count !== 0);
  if (failures.length > 0) {
    guard(
      `Database invariants are not clean: ${failures.map(([name]) => name).join(", ")}`,
      "V2_8_3_INVARIANT_FAILURE",
    );
  }
}

export async function inventorySchema5(client, identity, env) {
  if ((await schemaVersion(client)) !== 5) {
    guard("The confirmed target is not Schema 5", "V2_8_3_SCHEMA_VERSION_MISMATCH");
  }
  const connectedIdentity = await inspectConnectedIdentity(client, env);
  const inspection = await inspectSchema5(client);
  const counts = await schema5DomainCounts(client, inspection.counts);
  assertNonEmptyLearningInventory(counts);
  const invariants = await coreInvariants(client);
  assertZeroInvariants(invariants);
  return buildSafeInventoryArtifact({
    counts,
    identity: { ...identity, ...connectedIdentity },
    invariants,
    schema: inspection.schemaVersion5,
    schemaVersion: 5,
    tableDigests: await tableDigests(client, 5),
  });
}

export async function inventorySchema6(client, identity, env) {
  if ((await schemaVersion(client)) !== 6) {
    guard("The confirmed target is not Schema 6", "V2_8_3_SCHEMA_VERSION_MISMATCH");
  }
  const connectedIdentity = await inspectConnectedIdentity(client, env);
  const schema = await inspectSchema6Structure(client);
  const counts = await schema6Counts(client);
  assertNonEmptyLearningInventory(counts);
  const invariants = await schema6Invariants(client);
  assertZeroInvariants(invariants);
  return buildSafeInventoryArtifact({
    counts,
    identity: { ...identity, ...connectedIdentity },
    invariants,
    schema,
    schemaVersion: 6,
    tableDigests: await tableDigests(client, 6),
  });
}

export function assertFreshSchema5To6MigrationShape(counts) {
  const expectedDailyDefaults = Number(counts.review_settings) * 2;
  const requiredZero = [
    "active_review_states",
    "active_review_events",
    "daily_study_plans",
    "vocabulary_creation_reversals",
    "ai_runs",
    "ai_disclosure_confirmations",
    "ai_request_idempotency",
    "ai_enrichment_drafts",
    "ai_context_explanation_cache",
    "vocabulary_relations",
    "ai_usage_buckets",
    "study_command_idempotency",
    "tts_runs",
    "tts_usage_buckets",
  ];
  const failures = [];
  if (Number(counts.recognition_review_states) !== Number(counts.review_states)) {
    failures.push("recognition_review_states");
  }
  if (Number(counts.recognition_review_events) !== Number(counts.review_events)) {
    failures.push("recognition_review_events");
  }
  if (Number(counts.daily_study_defaults) !== expectedDailyDefaults) {
    failures.push("daily_study_defaults");
  }
  if (Number(counts.vocabulary_creation_facts) !== Number(counts.vocabulary_items)) {
    failures.push("vocabulary_creation_facts");
  }
  for (const name of requiredZero) {
    if (Number(counts[name]) !== 0) failures.push(name);
  }
  if (failures.length > 0) {
    guard(
      `Fresh Schema 5 to 6 migration shape is invalid: ${failures.join(", ")}`,
      "V2_8_3_FRESH_MIGRATION_SHAPE_MISMATCH",
    );
  }
  return true;
}

export async function executePinnedMigration({
  client,
  env,
  expectedBeforeDigest,
  identity,
  migrationSql,
}) {
  const inFlightBefore = await inspectPotentialInFlightWrites(client);
  if (inFlightBefore !== 0) {
    guard(
      "A transaction with a write-capable transaction id is still active",
      "V2_8_3_IN_FLIGHT_TRANSACTION",
    );
  }
  const before = await withReadOnlySnapshot(client, () =>
    inventorySchema5(client, identity, env),
  );
  if (before.parity.combinedSha256 !== expectedBeforeDigest) {
    guard(
      "The live Schema 5 inventory no longer matches its confirmed digest",
      "V2_8_3_PRE_MIGRATION_DIGEST_MISMATCH",
    );
  }
  const inFlightImmediatelyBeforeMigration =
    await inspectPotentialInFlightWrites(client);
  if (inFlightImmediatelyBeforeMigration !== 0) {
    guard(
      "A transaction with a write-capable transaction id appeared before migration",
      "V2_8_3_IN_FLIGHT_TRANSACTION",
    );
  }
  try {
    await client.query(migrationSql);
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // The connection is closed by the caller if rollback itself is unavailable.
    }
    throw error;
  }
  const after = await withReadOnlySnapshot(client, () =>
    inventorySchema6(client, identity, env),
  );
  assertFreshSchema5To6MigrationShape(after.counts);
  const parity = compareInventoryParity(before, after);
  if (!parity.matched) {
    guard(
      `Post-migration parity failed: ${parity.mismatches.join(", ")}`,
      "V2_8_3_POST_MIGRATION_PARITY_FAILURE",
    );
  }
  return {
    after,
    before,
    migrationApplied: [
      "0003_v2_schema6_data_model.sql",
      "0004_v2_bilingual_examples.sql",
      "0005_v2_standard_tts_accounting.sql",
    ],
    parity,
  };
}
