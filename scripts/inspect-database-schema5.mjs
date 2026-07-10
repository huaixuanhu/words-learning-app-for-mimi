import {
  assertNonProductionDatabaseTarget,
  createPool,
} from "./db-connection.mjs";

const expectedColumns = [
  ["vocabulary_items", "learning_track", "text", "NO"],
  ["vocabulary_items", "tags", "jsonb", "YES"],
  ["vocabulary_items", "meanings_zh", "jsonb", "NO"],
  ["vocabulary_items", "examples", "jsonb", "NO"],
  ["review_settings", "recognition_session_limit", "integer", "NO"],
  ["review_settings", "active_session_limit", "integer", "NO"],
];

const expectedConstraints = [
  "import_batches_source_type_valid",
  "vocabulary_items_learning_track_valid",
  "vocabulary_items_tags_array_or_null",
  "vocabulary_items_meanings_zh_array",
  "vocabulary_items_examples_array",
  "vocabulary_items_source_valid",
  "review_settings_recognition_session_limit_range",
  "review_settings_active_session_limit_range",
  "backup_imports_schema_version_supported",
];

const expectedIndexes = [
  "vocabulary_items_person_learning_track_idx",
];

const expectedTriggers = [
  ["review_states", "review_states_recognition_only"],
  ["review_events", "review_events_recognition_only"],
];

function expectNoMissing(label, missing) {
  if (missing.length > 0) {
    throw new Error(`Missing ${label}: ${missing.join(", ")}`);
  }
}

assertNonProductionDatabaseTarget();

const pool = createPool();
const client = await pool.connect();

try {
  const columnsResult = await client.query(
    `
      select
        table_name,
        column_name,
        data_type,
        udt_name,
        is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and (table_name, column_name) in (
          select *
          from unnest($1::text[], $2::text[])
        )
      order by table_name, column_name
    `,
    [
      expectedColumns.map(([tableName]) => tableName),
      expectedColumns.map(([, columnName]) => columnName),
    ],
  );
  const columnByKey = new Map(
    columnsResult.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]),
  );
  const missingColumns = [];
  const mismatchedColumns = [];

  for (const [tableName, columnName, expectedDataType, expectedNullable] of expectedColumns) {
    const key = `${tableName}.${columnName}`;
    const row = columnByKey.get(key);

    if (!row) {
      missingColumns.push(key);
      continue;
    }

    if (row.data_type !== expectedDataType || row.is_nullable !== expectedNullable) {
      mismatchedColumns.push(
        `${key} expected ${expectedDataType}/${expectedNullable} got ${row.data_type}/${row.is_nullable}`,
      );
    }
  }

  expectNoMissing("schema version 5 columns", missingColumns);
  if (mismatchedColumns.length > 0) {
    throw new Error(`Mismatched schema version 5 columns: ${mismatchedColumns.join(", ")}`);
  }

  const constraintsResult = await client.query(
    `
      select constraint_name
      from information_schema.table_constraints
      where table_schema = 'public'
        and constraint_name = any($1::text[])
      order by constraint_name
    `,
    [expectedConstraints],
  );
  const foundConstraints = new Set(constraintsResult.rows.map((row) => row.constraint_name));

  expectNoMissing(
    "schema version 5 constraints",
    expectedConstraints.filter((constraint) => !foundConstraints.has(constraint)),
  );

  const indexesResult = await client.query(
    `
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname = any($1::text[])
      order by indexname
    `,
    [expectedIndexes],
  );
  const foundIndexes = new Set(indexesResult.rows.map((row) => row.indexname));

  expectNoMissing(
    "schema version 5 indexes",
    expectedIndexes.filter((index) => !foundIndexes.has(index)),
  );

  const triggersResult = await client.query(
    `
      select event_object_table, trigger_name
      from information_schema.triggers
      where trigger_schema = 'public'
        and trigger_name = any($1::text[])
      order by event_object_table, trigger_name
    `,
    [expectedTriggers.map(([, triggerName]) => triggerName)],
  );
  const foundTriggers = new Set(
    triggersResult.rows.map((row) => `${row.event_object_table}.${row.trigger_name}`),
  );

  expectNoMissing(
    "schema version 5 triggers",
    expectedTriggers
      .map(([tableName, triggerName]) => `${tableName}.${triggerName}`)
      .filter((trigger) => !foundTriggers.has(trigger)),
  );

  const countsResult = await client.query(
    `
      select
        (select count(*)::int from people) as people,
        (select count(*)::int from vocabulary_items) as vocabulary_items,
        (select count(*)::int from import_batches) as import_batches,
        (select count(*)::int from review_states) as review_states,
        (select count(*)::int from review_events) as review_events,
        (select count(*)::int from review_settings) as review_settings,
        (select count(*)::int from backup_imports) as backup_imports,
        (select count(*)::int from backup_import_mappings) as backup_import_mappings
    `,
  );

  console.log(
    JSON.stringify(
      {
        schemaVersion5: {
          columns: expectedColumns.length,
          constraints: expectedConstraints.length,
          indexes: expectedIndexes.length,
          triggers: expectedTriggers.length,
        },
        counts: countsResult.rows[0],
      },
      null,
      2,
    ),
  );
} finally {
  client.release();
  await pool.end();
}
