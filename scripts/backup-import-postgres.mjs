import { readFile } from "node:fs/promises";
import {
  assertNonProductionDatabaseTarget,
  createPool,
} from "./db-connection.mjs";
import {
  buildBackupImportPlan,
  buildBackupImportPlanFromText,
  createStage5LFixtureBackup,
  STAGE5L_FIXTURE_FILE_NAME,
} from "./backup-import-plan.mjs";

const SMOKE_PERSON_ID = "00000000-0000-4000-8000-0000000005f1";
const SMOKE_PERSON_SLUG = "storage-smoke";
const STAGE5N_UI_SMOKE_PERSON_SLUG = "mimi";
const STAGE5N_UI_SMOKE_NORMALIZED_TEXT = "stage five n preview ui write";

function usage() {
  return [
    "Usage:",
    "  node scripts/backup-import-postgres.mjs --fixture --dry-run",
    "  node scripts/backup-import-postgres.mjs --cleanup-smoke",
    "  node scripts/backup-import-postgres.mjs --fixture --trial-rollback",
    "  node scripts/backup-import-postgres.mjs --fixture --commit --i-confirm-development-import",
    "  node scripts/backup-import-postgres.mjs --cleanup-fixture",
    "  node scripts/backup-import-postgres.mjs --cleanup-stage5n-ui-smoke",
    "  node scripts/backup-import-postgres.mjs --file <backup.json> --dry-run",
    "  node scripts/backup-import-postgres.mjs --file <backup.json> --trial-rollback",
    "  node scripts/backup-import-postgres.mjs --file <backup.json> --commit --i-confirm-development-import",
  ].join("\n");
}

function hasArg(name) {
  return process.argv.includes(name);
}

function readArgValue(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  const value = process.argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function readBackupInput() {
  if (hasArg("--fixture")) {
    return {
      sourceFileName: STAGE5L_FIXTURE_FILE_NAME,
      backup: createStage5LFixtureBackup(),
    };
  }

  const filePath = readArgValue("--file");

  if (!filePath) {
    return null;
  }

  const text = await readFile(filePath, "utf8");

  return {
    sourceFileName: filePath.split(/[\\/]/).at(-1) ?? filePath,
    text,
  };
}

async function countCoreRows(client) {
  const result = await client.query(
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

  return result.rows[0];
}

async function countAllRows(client) {
  return countCoreRows(client);
}

async function countSmokeRows(client) {
  const result = await client.query(
    `
      select
        (select count(*)::int from people where id = $1 and slug = $2) as people,
        (select count(*)::int from vocabulary_items where person_id = $1) as vocabulary_items,
        (select count(*)::int from import_batches where person_id = $1) as import_batches,
        (select count(*)::int from review_states where person_id = $1) as review_states,
        (select count(*)::int from review_events where person_id = $1) as review_events,
        (select count(*)::int from review_settings where person_id = $1) as review_settings,
        (select count(*)::int from backup_imports where person_id = $1) as backup_imports,
        (select count(*)::int from backup_import_mappings where person_id = $1) as backup_import_mappings
    `,
    [SMOKE_PERSON_ID, SMOKE_PERSON_SLUG],
  );

  return result.rows[0];
}

async function cleanupSmokeRows(client) {
  const personResult = await client.query(
    "select slug from people where id = $1",
    [SMOKE_PERSON_ID],
  );

  if (personResult.rows[0] && personResult.rows[0].slug !== SMOKE_PERSON_SLUG) {
    throw new Error("Refusing smoke cleanup because the fixed person id does not use the smoke slug");
  }

  await client.query("begin");
  try {
    const before = await countSmokeRows(client);
    const action = "delete";
    const removed = {};
    const statements = [
      ["backup_import_mappings", `${action} from backup_import_mappings where person_id = $1`, [SMOKE_PERSON_ID]],
      ["backup_imports", `${action} from backup_imports where person_id = $1`, [SMOKE_PERSON_ID]],
      ["review_events", `${action} from review_events where person_id = $1`, [SMOKE_PERSON_ID]],
      ["review_states", `${action} from review_states where person_id = $1`, [SMOKE_PERSON_ID]],
      ["vocabulary_items", `${action} from vocabulary_items where person_id = $1`, [SMOKE_PERSON_ID]],
      ["import_batches", `${action} from import_batches where person_id = $1`, [SMOKE_PERSON_ID]],
      ["review_settings", `${action} from review_settings where person_id = $1`, [SMOKE_PERSON_ID]],
      ["people", `${action} from people where id = $1 and slug = $2`, [SMOKE_PERSON_ID, SMOKE_PERSON_SLUG]],
    ];

    for (const [name, statement, values] of statements) {
      const result = await client.query(statement, values);
      removed[name] = result.rowCount;
    }

    const after = await countSmokeRows(client);
    const remaining = Object.values(after).reduce((sum, value) => sum + value, 0);

    if (remaining !== 0) {
      throw new Error(`Smoke cleanup left ${remaining} rows behind`);
    }

    await client.query("commit");

    return { before, removed, after };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function cleanupRowsForPersonSlug(client, slug) {
  const peopleResult = await client.query(
    "select id from people where slug = $1 order by created_at asc",
    [slug],
  );
  const personIds = peopleResult.rows.map((row) => row.id);

  if (personIds.length === 0) {
    return {
      personIds: [],
      removed: {
        backup_import_mappings: 0,
        backup_imports: 0,
        review_events: 0,
        review_states: 0,
        vocabulary_items: 0,
        import_batches: 0,
        review_settings: 0,
        people: 0,
      },
      after: await countCoreRows(client),
    };
  }

  await client.query("begin");
  try {
    const action = "delete";
    const removed = {};
    const statements = [
      ["backup_import_mappings", `${action} from backup_import_mappings where person_id = any($1::uuid[])`, [personIds]],
      ["backup_imports", `${action} from backup_imports where person_id = any($1::uuid[])`, [personIds]],
      ["review_events", `${action} from review_events where person_id = any($1::uuid[])`, [personIds]],
      ["review_states", `${action} from review_states where person_id = any($1::uuid[])`, [personIds]],
      ["vocabulary_items", `${action} from vocabulary_items where person_id = any($1::uuid[])`, [personIds]],
      ["import_batches", `${action} from import_batches where person_id = any($1::uuid[])`, [personIds]],
      ["review_settings", `${action} from review_settings where person_id = any($1::uuid[])`, [personIds]],
      ["people", `${action} from people where id = any($1::uuid[]) and slug = $2`, [personIds, slug]],
    ];

    for (const [name, statement, values] of statements) {
      const result = await client.query(statement, values);
      removed[name] = result.rowCount;
    }

    await client.query("commit");

    return {
      personIds,
      removed,
      after: await countCoreRows(client),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function countStage5NUiSmokeRows(client) {
  const result = await client.query(
    `
      select
        (select count(*)::int from people where slug = $1) as people,
        (select count(*)::int from vocabulary_items where person_id in (select id from people where slug = $1)) as vocabulary_items,
        (select count(*)::int from vocabulary_items where person_id in (select id from people where slug = $1) and normalized_text = $2) as matching_vocabulary_items,
        (select count(*)::int from import_batches where person_id in (select id from people where slug = $1)) as import_batches,
        (select count(*)::int from review_states where person_id in (select id from people where slug = $1)) as review_states,
        (select count(*)::int from review_events where person_id in (select id from people where slug = $1)) as review_events,
        (select count(*)::int from review_settings where person_id in (select id from people where slug = $1)) as review_settings,
        (select count(*)::int from backup_imports where person_id in (select id from people where slug = $1)) as backup_imports,
        (select count(*)::int from backup_import_mappings where person_id in (select id from people where slug = $1)) as backup_import_mappings
    `,
    [STAGE5N_UI_SMOKE_PERSON_SLUG, STAGE5N_UI_SMOKE_NORMALIZED_TEXT],
  );

  return result.rows[0];
}

function assertStage5NUiSmokeShape(counts) {
  const total = Object.entries(counts)
    .filter(([key]) => key !== "matching_vocabulary_items")
    .reduce((sum, [, value]) => sum + value, 0);

  if (total === 0) {
    return;
  }

  const expected = {
    people: 1,
    vocabulary_items: 1,
    matching_vocabulary_items: 1,
    import_batches: 0,
    review_states: 0,
    review_events: 0,
    review_settings: 1,
    backup_imports: 0,
    backup_import_mappings: 0,
  };

  for (const [key, expectedValue] of Object.entries(expected)) {
    if (counts[key] !== expectedValue) {
      throw new Error(
        `Refusing Stage 5N UI smoke cleanup because ${key} expected ${expectedValue} but got ${counts[key]}`,
      );
    }
  }
}

async function cleanupStage5NUiSmokeRows(client) {
  await client.query("begin");
  try {
    const before = await countStage5NUiSmokeRows(client);

    assertStage5NUiSmokeShape(before);

    const action = "delete";
    const removed = {};
    const statements = [
      [
        "vocabulary_items",
        `${action} from vocabulary_items where person_id in (select id from people where slug = $1) and normalized_text = $2`,
        [STAGE5N_UI_SMOKE_PERSON_SLUG, STAGE5N_UI_SMOKE_NORMALIZED_TEXT],
      ],
      [
        "review_settings",
        `${action} from review_settings where person_id in (select id from people where slug = $1)`,
        [STAGE5N_UI_SMOKE_PERSON_SLUG],
      ],
      [
        "people",
        `${action} from people where slug = $1`,
        [STAGE5N_UI_SMOKE_PERSON_SLUG],
      ],
    ];

    for (const [name, statement, values] of statements) {
      const result = await client.query(statement, values);
      removed[name] = result.rowCount;
    }

    const after = await countStage5NUiSmokeRows(client);
    const remaining = Object.entries(after)
      .filter(([key]) => key !== "matching_vocabulary_items")
      .reduce((sum, [, value]) => sum + value, 0);

    if (remaining !== 0) {
      throw new Error(`Stage 5N UI smoke cleanup left ${remaining} rows behind`);
    }

    await client.query("commit");

    return {
      before,
      removed,
      after,
      coreCounts: await countCoreRows(client),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function insertPlanRows(client, rows) {
  for (const person of rows.people) {
    await client.query(
      `
        insert into people (id, display_name, slug, is_active, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6)
      `,
      [
        person.id,
        person.displayName,
        person.slug,
        person.isActive,
        person.createdAt,
        person.updatedAt,
      ],
    );
  }

  for (const batch of rows.importBatches) {
    await client.query(
      `
        insert into import_batches (
          id,
          person_id,
          source_type,
          file_name,
          created_at,
          total_rows,
          accepted_rows,
          duplicate_rows,
          invalid_rows
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        batch.id,
        batch.personId,
        batch.sourceType,
        batch.fileName,
        batch.createdAt,
        batch.totalRows,
        batch.acceptedRows,
        batch.duplicateRows,
        batch.invalidRows,
      ],
    );
  }

  for (const item of rows.vocabularyItems) {
    await client.query(
      `
        insert into vocabulary_items (
          id,
          person_id,
          surface_text,
          normalized_text,
          meaning_zh,
          example,
          notes,
          rarity_score,
          source,
          import_batch_id,
          status,
          created_at,
          system_created_at,
          updated_at,
          timezone,
          archived_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `,
      [
        item.id,
        item.personId,
        item.surfaceText,
        item.normalizedText,
        item.meaningZh,
        item.example,
        item.notes,
        item.rarityScore,
        item.source,
        item.importBatchId,
        item.status,
        item.createdAt,
        item.systemCreatedAt,
        item.updatedAt,
        item.timezone,
        item.archivedAt,
      ],
    );
  }

  for (const state of rows.reviewStates) {
    await client.query(
      `
        insert into review_states (
          id,
          person_id,
          vocabulary_item_id,
          status,
          due_at,
          last_reviewed_at,
          review_count,
          lapse_count,
          interval_minutes,
          difficulty,
          stability,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        state.id,
        state.personId,
        state.vocabularyItemId,
        state.status,
        state.dueAt,
        state.lastReviewedAt,
        state.reviewCount,
        state.lapseCount,
        state.intervalMinutes,
        state.difficulty,
        state.stability,
        state.updatedAt,
      ],
    );
  }

  for (const event of rows.reviewEvents) {
    await client.query(
      `
        insert into review_events (
          id,
          person_id,
          vocabulary_item_id,
          reviewed_at,
          rating,
          previous_due_at,
          next_due_at,
          previous_interval_minutes,
          next_interval_minutes,
          elapsed_ms
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        event.id,
        event.personId,
        event.vocabularyItemId,
        event.reviewedAt,
        event.rating,
        event.previousDueAt,
        event.nextDueAt,
        event.previousIntervalMinutes,
        event.nextIntervalMinutes,
        event.elapsedMs,
      ],
    );
  }

  for (const settings of rows.reviewSettings) {
    await client.query(
      `
        insert into review_settings (person_id, session_limit, timezone, updated_at)
        values ($1, $2, $3, $4)
      `,
      [
        settings.personId,
        settings.sessionLimit,
        settings.timezone,
        settings.updatedAt,
      ],
    );
  }

  for (const backupImport of rows.backupImports) {
    await client.query(
      `
        insert into backup_imports (
          id,
          person_id,
          source_file_name,
          source_exported_at,
          imported_at,
          schema_version,
          item_count,
          review_event_count,
          notes
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        backupImport.id,
        backupImport.personId,
        backupImport.sourceFileName,
        backupImport.sourceExportedAt,
        backupImport.importedAt,
        backupImport.schemaVersion,
        backupImport.itemCount,
        backupImport.reviewEventCount,
        backupImport.notes,
      ],
    );
  }

  for (const mapping of rows.backupImportMappings) {
    await client.query(
      `
        insert into backup_import_mappings (
          id,
          person_id,
          backup_import_id,
          entity_type,
          source_id,
          target_id,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        mapping.id,
        mapping.personId,
        mapping.backupImportId,
        mapping.entityType,
        mapping.sourceId,
        mapping.targetId,
        mapping.createdAt,
      ],
    );
  }
}

async function countPlanRows(client, rows) {
  const result = await client.query(
    `
      select
        (select count(*)::int from people where id = any($1::uuid[])) as people,
        (select count(*)::int from import_batches where id = any($2::uuid[])) as import_batches,
        (select count(*)::int from vocabulary_items where id = any($3::uuid[])) as vocabulary_items,
        (select count(*)::int from review_states where id = any($4::uuid[])) as review_states,
        (select count(*)::int from review_events where id = any($5::uuid[])) as review_events,
        (select count(*)::int from review_settings where person_id = any($1::uuid[])) as review_settings,
        (select count(*)::int from backup_imports where id = any($6::uuid[])) as backup_imports,
        (select count(*)::int from backup_import_mappings where id = any($7::uuid[])) as backup_import_mappings
    `,
    [
      rows.people.map((row) => row.id),
      rows.importBatches.map((row) => row.id),
      rows.vocabularyItems.map((row) => row.id),
      rows.reviewStates.map((row) => row.id),
      rows.reviewEvents.map((row) => row.id),
      rows.backupImports.map((row) => row.id),
      rows.backupImportMappings.map((row) => row.id),
    ],
  );

  return result.rows[0];
}

function assertCountsMatch(actual, expected) {
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (actual[key] !== expectedValue) {
      throw new Error(`${key} expected ${expectedValue} but got ${actual[key]}`);
    }
  }
}

async function runFixtureTrialRollback(client, plan) {
  const expected = {
    people: plan.counts.people,
    import_batches: plan.counts.importBatches,
    vocabulary_items: plan.counts.vocabularyItems,
    review_states: plan.counts.reviewStates,
    review_events: plan.counts.reviewEvents,
    review_settings: plan.counts.reviewSettings,
    backup_imports: plan.counts.backupImports,
    backup_import_mappings: plan.counts.backupImportMappings,
  };

  await client.query("begin");
  try {
    await insertPlanRows(client, plan.rows);
    const inserted = await countPlanRows(client, plan.rows);
    assertCountsMatch(inserted, expected);
    await client.query("rollback");

    const afterRollback = await countPlanRows(client, plan.rows);
    assertCountsMatch(afterRollback, {
      people: 0,
      import_batches: 0,
      vocabulary_items: 0,
      review_states: 0,
      review_events: 0,
      review_settings: 0,
      backup_imports: 0,
      backup_import_mappings: 0,
    });

    return {
      status: "rolled_back",
      inserted,
      afterRollback,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

function assertDatabaseEmpty(counts) {
  const nonEmpty = Object.entries(counts).filter(([, value]) => value !== 0);

  if (nonEmpty.length) {
    throw new Error(
      `Refusing backup import commit because the target database is not empty: ${nonEmpty
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")}`,
    );
  }
}

async function commitPlanRows(client, plan) {
  await client.query("begin");
  try {
    const before = await countAllRows(client);

    assertDatabaseEmpty(before);
    await insertPlanRows(client, plan.rows);

    const inserted = await countPlanRows(client, plan.rows);
    assertCountsMatch(inserted, {
      people: plan.counts.people,
      import_batches: plan.counts.importBatches,
      vocabulary_items: plan.counts.vocabularyItems,
      review_states: plan.counts.reviewStates,
      review_events: plan.counts.reviewEvents,
      review_settings: plan.counts.reviewSettings,
      backup_imports: plan.counts.backupImports,
      backup_import_mappings: plan.counts.backupImportMappings,
    });

    await client.query("commit");

    return {
      before,
      inserted,
      after: await countCoreRows(client),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

function planSummary(plan) {
  return {
    mode: plan.mode,
    sourceSchemaVersion: plan.sourceSchemaVersion,
    sourceFileName: plan.sourceFileName,
    counts: plan.counts,
    perPersonCounts: plan.perPersonCounts,
  };
}

if (hasArg("--help")) {
  console.log(usage());
  process.exit(0);
}

const wantsDryRun = hasArg("--dry-run");
const wantsCleanupSmoke = hasArg("--cleanup-smoke");
const wantsTrialRollback = hasArg("--trial-rollback");
const wantsCommit = hasArg("--commit");
const wantsCleanupFixture = hasArg("--cleanup-fixture");
const wantsCleanupStage5NUiSmoke = hasArg("--cleanup-stage5n-ui-smoke");

if (
  !wantsDryRun &&
  !wantsCleanupSmoke &&
  !wantsTrialRollback &&
  !wantsCommit &&
  !wantsCleanupFixture &&
  !wantsCleanupStage5NUiSmoke
) {
  throw new Error(usage());
}

if (wantsCommit && !hasArg("--i-confirm-development-import")) {
  throw new Error("--commit requires --i-confirm-development-import");
}

const backupInput = await readBackupInput();
const plan = backupInput?.backup
  ? buildBackupImportPlan(backupInput.backup, {
      sourceFileName: backupInput.sourceFileName,
      notes: hasArg("--fixture")
        ? "Stage fixture import for development verification."
        : "User backup import for development verification.",
    })
  : backupInput?.text
    ? buildBackupImportPlanFromText(backupInput.text, {
        sourceFileName: backupInput.sourceFileName,
        notes: "User backup import for development verification.",
      })
    : null;
const actions = [];

if (wantsDryRun) {
  if (!plan) {
    throw new Error("--dry-run requires --fixture or --file");
  }
  actions.push({
    action: "backup-dry-run",
    result: "ok",
    plan: planSummary(plan),
  });
}

if (wantsCleanupSmoke || wantsTrialRollback || wantsCommit || wantsCleanupFixture || wantsCleanupStage5NUiSmoke) {
  assertNonProductionDatabaseTarget();
  const pool = createPool();
  const client = await pool.connect();

  try {
    if (wantsCleanupSmoke) {
      actions.push({
        action: "cleanup-smoke",
        result: await cleanupSmokeRows(client),
      });
      actions.push({
        action: "post-cleanup-counts",
        result: await countCoreRows(client),
      });
    }

    if (wantsCleanupFixture) {
      actions.push({
        action: "cleanup-stage5l-fixture",
        result: await cleanupRowsForPersonSlug(client, "stage5l-fixture"),
      });
      actions.push({
        action: "cleanup-stage5m-fixture",
        result: await cleanupRowsForPersonSlug(client, "stage5m-fixture"),
      });
    }

    if (wantsCleanupStage5NUiSmoke) {
      actions.push({
        action: "cleanup-stage5n-ui-smoke",
        result: await cleanupStage5NUiSmokeRows(client),
      });
    }

    if (wantsTrialRollback) {
      if (!plan) {
        throw new Error("--trial-rollback requires --fixture or --file");
      }
      actions.push({
        action: "backup-trial-rollback",
        result: await runFixtureTrialRollback(client, plan),
      });
      actions.push({
        action: "post-trial-counts",
        result: await countCoreRows(client),
      });
    }

    if (wantsCommit) {
      if (!plan) {
        throw new Error("--commit requires --fixture or --file");
      }
      actions.push({
        action: "commit-import",
        result: await commitPlanRows(client, plan),
      });
    }
  } finally {
    client.release();
    await pool.end();
  }
}

printJson({ ok: true, actions });
