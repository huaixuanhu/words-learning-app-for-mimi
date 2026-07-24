import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPool } from "./db-connection.mjs";
import {
  assertCommandContract,
  assertPinnedV21Migration,
  safeFailure,
  V2_1_OLD_NON_UNIQUE_INDEX,
  V2_1_STAGING_FIXTURE_PERSON_ID,
  V2_1_STAGING_FIXTURE_PERSON_LABEL,
  V2_1_UNIQUE_INDEX,
  V21ProductionGuardError,
} from "./v2-1-production-contract.mjs";
import { retrieveGuardedTarget } from "./v2-1-neon-target.mjs";
import {
  inventorySchema6,
  withReadOnlySnapshot,
} from "./v2-stage8-3-db-core.mjs";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "db/migrations/0006_v2_1_vocabulary_unique_normalized_text.sql",
);

function reject(message, code) {
  throw new V21ProductionGuardError(message, code);
}

async function duplicateSummary(client) {
  const result = await client.query(
    `
      with duplicate_groups as (
        select person_id, normalized_text, count(*)::integer as item_count
        from vocabulary_items
        group by person_id, normalized_text
        having count(*) > 1
      ),
      per_person as (
        select
          person_id,
          count(*)::integer as duplicate_groups,
          sum(item_count - 1)::integer as removable_items,
          sum(item_count)::integer as grouped_items
        from duplicate_groups
        group by person_id
      )
      select duplicate_groups, removable_items, grouped_items
      from per_person
      order by person_id
    `,
  );
  const people = result.rows.map((row, index) => ({
    duplicateGroups: Number(row.duplicate_groups),
    groupedItems: Number(row.grouped_items),
    personOrdinal: index + 1,
    removableItems: Number(row.removable_items),
  }));
  return {
    duplicateGroups: people.reduce(
      (total, row) => total + row.duplicateGroups,
      0,
    ),
    groupedItems: people.reduce((total, row) => total + row.groupedItems, 0),
    people,
    peopleWithDuplicates: people.length,
    removableItems: people.reduce(
      (total, row) => total + row.removableItems,
      0,
    ),
  };
}

async function indexState(client) {
  const result = await client.query(
    `
      select
        exists (
          select 1
          from pg_indexes
          where schemaname = 'public'
            and indexname = $1
        ) as unique_index_present,
        coalesce((
          select indexdef ilike 'create unique index%'
          from pg_indexes
          where schemaname = 'public'
            and indexname = $1
        ), false) as unique_index_is_unique,
        exists (
          select 1
          from pg_indexes
          where schemaname = 'public'
            and indexname = $2
        ) as old_non_unique_index_present
    `,
    [V2_1_UNIQUE_INDEX, V2_1_OLD_NON_UNIQUE_INDEX],
  );
  return {
    oldNonUniqueIndexPresent: Boolean(
      result.rows[0]?.old_non_unique_index_present,
    ),
    uniqueIndexIsUnique: Boolean(result.rows[0]?.unique_index_is_unique),
    uniqueIndexPresent: Boolean(result.rows[0]?.unique_index_present),
  };
}

async function stagingFixtureSummary(client) {
  const result = await client.query(
    `
      select
        (
          select count(*)::integer
          from people
          where id = $1 and display_name = $2
        ) as people,
        (
          select count(*)::integer
          from vocabulary_items
          where person_id = $1
        ) as vocabulary_items,
        (
          select count(*)::integer
          from import_batches
          where person_id = $1
        ) as import_batches,
        (
          select count(*)::integer
          from review_states
          where person_id = $1
        ) as review_states,
        (
          select count(*)::integer
          from review_events
          where person_id = $1
        ) as review_events,
        (
          select count(*)::integer
          from review_settings
          where person_id = $1
        ) as review_settings,
        (
          select count(*)::integer
          from daily_study_defaults
          where person_id = $1
        ) as daily_study_defaults,
        (
          select count(*)::integer
          from daily_study_plans
          where person_id = $1
        ) as daily_study_plans,
        (
          select count(*)::integer
          from vocabulary_creation_facts
          where person_id = $1
        ) as vocabulary_creation_facts,
        (
          select count(*)::integer
          from vocabulary_creation_reversals
          where person_id = $1
        ) as vocabulary_creation_reversals,
        (
          select count(*)::integer
          from ai_runs
          where person_id = $1
        ) as ai_runs,
        (
          select count(*)::integer
          from ai_disclosure_confirmations
          where person_id = $1
        ) as ai_disclosure_confirmations,
        (
          select count(*)::integer
          from ai_request_idempotency
          where person_id = $1
        ) as ai_request_idempotency,
        (
          select count(*)::integer
          from ai_enrichment_drafts
          where person_id = $1
        ) as ai_enrichment_drafts,
        (
          select count(*)::integer
          from ai_context_explanation_cache
          where person_id = $1
        ) as ai_context_explanation_cache,
        (
          select count(*)::integer
          from vocabulary_relations
          where person_id = $1
        ) as vocabulary_relations,
        (
          select count(*)::integer
          from ai_usage_buckets
          where person_id = $1
        ) as ai_usage_buckets,
        (
          select count(*)::integer
          from study_command_idempotency
          where person_id = $1
        ) as study_command_idempotency,
        (
          select count(*)::integer
          from backup_imports
          where person_id = $1
        ) as backup_imports,
        (
          select count(*)::integer
          from backup_import_mappings
          where person_id = $1
        ) as backup_import_mappings
    `,
    [V2_1_STAGING_FIXTURE_PERSON_ID, V2_1_STAGING_FIXTURE_PERSON_LABEL],
  );
  return Object.fromEntries(
    Object.entries(result.rows[0] ?? {}).map(([key, value]) => [
      key,
      Number(value),
    ]),
  );
}

async function stagingSchema6Inventory(client) {
  const result = await client.query(
    `
      select
        (
          select count(*)::integer
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'review_states'
            and column_name = 'review_profile'
        ) as schema6_marker,
        (
          select count(*)::integer
          from information_schema.tables
          where table_schema = 'public' and table_type = 'BASE TABLE'
        ) as tables,
        (
          select count(*)::integer from pg_indexes where schemaname = 'public'
        ) as indexes,
        (select count(*)::integer from people) as people,
        (select count(*)::integer from vocabulary_items) as vocabulary_items,
        (select count(*)::integer from import_batches) as import_batches,
        (select count(*)::integer from review_states) as review_states,
        (select count(*)::integer from review_events) as review_events,
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
        ) as active_ai_calls,
        (
          select count(*)::integer from tts_runs where status = 'submitted'
        ) as submitted_tts_runs,
        (
          select coalesce(sum(active_provider_calls), 0)::integer
          from tts_usage_buckets
        ) as active_tts_calls
    `,
  );
  const row = Object.fromEntries(
    Object.entries(result.rows[0] ?? {}).map(([key, value]) => [
      key,
      Number(value),
    ]),
  );
  if (
    row.schema6_marker !== 1 ||
    row.tables !== 22 ||
    row.people < 1 ||
    row.vocabulary_items < 1 ||
    row.submitted_ai_runs !== 0 ||
    row.processing_ai_requests !== 0 ||
    row.active_ai_calls !== 0 ||
    row.submitted_tts_runs !== 0 ||
    row.active_tts_calls !== 0
  ) {
    reject(
      "The Staging Schema 6 inventory is not clean",
      "V2_1_STAGING_INVENTORY_INVALID",
    );
  }
  return {
    counts: {
      importBatches: row.import_batches,
      people: row.people,
      reviewEvents: row.review_events,
      reviewStates: row.review_states,
      vocabularyItems: row.vocabulary_items,
    },
    invariants: {
      activeAiCalls: row.active_ai_calls,
      activeTtsCalls: row.active_tts_calls,
      processingAiRequests: row.processing_ai_requests,
      submittedAiRuns: row.submitted_ai_runs,
      submittedTtsRuns: row.submitted_tts_runs,
    },
    schema: {
      indexes: row.indexes,
      tables: row.tables,
    },
    schemaVersion: 6,
  };
}

async function inspect(client, target, guardedTarget) {
  const env = {
    MIMI_V2_8_3_EXPECTED_DATABASE: guardedTarget.expectedDatabase,
    MIMI_V2_8_3_EXPECTED_ROLE: guardedTarget.expectedRole,
  };
  return withReadOnlySnapshot(client, async () => ({
    duplicateSummary: await duplicateSummary(client),
    fixture:
      target === "staging" ? await stagingFixtureSummary(client) : undefined,
    indexState: await indexState(client),
    inventory:
      target === "staging"
        ? await stagingSchema6Inventory(client)
        : await inventorySchema6(
            client,
            {
              ...guardedTarget.safeIdentity,
              target: "production-main",
            },
            env,
          ),
  }));
}

async function migrate(client, target, guardedTarget) {
  const before = await inspect(client, target, guardedTarget);
  if (before.duplicateSummary.duplicateGroups !== 0) {
    reject(
      "The V2.1 migration refused because duplicate identities remain",
      "V2_1_DUPLICATES_REMAIN",
    );
  }
  if (before.indexState.uniqueIndexPresent) {
    reject(
      "The V2.1 unique index already exists",
      "V2_1_MIGRATION_ALREADY_APPLIED",
    );
  }
  const migration = await readFile(MIGRATION_PATH, "utf8");
  const migrationSha256 = assertPinnedV21Migration(migration);
  await client.query(migration);
  const after = await inspect(client, target, guardedTarget);
  if (
    !after.indexState.uniqueIndexPresent ||
    !after.indexState.uniqueIndexIsUnique ||
    after.indexState.oldNonUniqueIndexPresent ||
    after.duplicateSummary.duplicateGroups !== 0
  ) {
    reject(
      "The V2.1 post-migration index contract is incomplete",
      "V2_1_MIGRATION_POSTCHECK_FAILED",
    );
  }
  return { after, before, migrationSha256 };
}

async function run() {
  let phase = "local-guard";
  let pool;
  let client;
  try {
    const command = process.argv[2];
    const argv = process.argv.slice(3);
    const contract = assertCommandContract({
      argv,
      command,
      env: process.env,
    });
    phase = "neon-target";
    const guardedTarget = await retrieveGuardedTarget(contract.target);
    phase = "database-connect";
    pool = createPool(guardedTarget.connectionString);
    client = await pool.connect();
    await client.query("set timezone to 'UTC'");
    phase = command;
    let result;
    if (command === "inventory") {
      result = await inspect(client, contract.target, guardedTarget);
    } else {
      result = await migrate(client, contract.target, guardedTarget);
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          result,
          target: contract.target,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: safeFailure(error, phase) }));
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool?.end();
  }
}

await run();
