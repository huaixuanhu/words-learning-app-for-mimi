import {
  assertNonProductionDatabaseTarget,
  createPool,
} from "./db-connection.mjs";

const expectedTables = [
  "people",
  "import_batches",
  "vocabulary_items",
  "review_states",
  "review_events",
  "review_settings",
  "backup_imports",
  "backup_import_mappings",
];

const expectedIndexes = [
  "people_active_slug_idx",
  "import_batches_person_created_at_idx",
  "vocabulary_items_person_normalized_text_idx",
  "vocabulary_items_person_status_idx",
  "vocabulary_items_person_created_at_idx",
  "review_states_person_due_at_idx",
  "review_states_person_status_idx",
  "review_events_person_reviewed_at_idx",
  "review_events_person_vocabulary_reviewed_at_idx",
  "backup_imports_person_imported_at_idx",
  "backup_import_mappings_person_backup_idx",
];

const expectedConstraints = [
  "review_states_person_item_unique",
  "vocabulary_items_import_batch_person_fk",
  "review_states_vocabulary_person_fk",
  "review_events_vocabulary_person_fk",
  "backup_import_mappings_import_person_fk",
];

assertNonProductionDatabaseTarget();

const pool = createPool();
const client = await pool.connect();

try {
  const tablesResult = await client.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      and table_name = any($1::text[])
      order by table_name
    `,
    [expectedTables],
  );
  const foundTables = new Set(tablesResult.rows.map((row) => row.table_name));
  const missingTables = expectedTables.filter((table) => !foundTables.has(table));

  if (missingTables.length > 0) {
    throw new Error(`Missing tables: ${missingTables.join(", ")}`);
  }

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
  const missingIndexes = expectedIndexes.filter((index) => !foundIndexes.has(index));

  if (missingIndexes.length > 0) {
    throw new Error(`Missing indexes: ${missingIndexes.join(", ")}`);
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
  const foundConstraints = new Set(
    constraintsResult.rows.map((row) => row.constraint_name),
  );
  const missingConstraints = expectedConstraints.filter(
    (constraint) => !foundConstraints.has(constraint),
  );

  if (missingConstraints.length > 0) {
    throw new Error(`Missing constraints: ${missingConstraints.join(", ")}`);
  }

  const countsResult = await client.query(
    `
      select
        (select count(*)::int from people) as people,
        (select count(*)::int from vocabulary_items) as vocabulary_items,
        (select count(*)::int from import_batches) as import_batches,
        (select count(*)::int from review_states) as review_states,
        (select count(*)::int from review_events) as review_events,
        (select count(*)::int from review_settings) as review_settings
    `,
  );

  console.log(
    JSON.stringify(
      {
        tables: expectedTables.length,
        indexes: expectedIndexes.length,
        constraints: expectedConstraints.length,
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
