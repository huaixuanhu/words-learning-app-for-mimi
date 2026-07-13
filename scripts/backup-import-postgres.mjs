import { readFile } from "node:fs/promises";
import {
  assertNonProductionDatabaseTarget,
  createPool,
} from "./db-connection.mjs";
import {
  buildBackupImportPlan,
  buildBackupImportPlanFromText,
  createStage5LFixtureBackup,
  createStage6BP1ESchema5FixtureBackup,
  createV2Stage3Schema6FixtureBackup,
  STAGE5L_FIXTURE_FILE_NAME,
  STAGE6B_P1E_SCHEMA5_FIXTURE_FILE_NAME,
  V2_STAGE3_SCHEMA6_FIXTURE_FILE_NAME,
} from "./backup-import-plan.mjs";

const SMOKE_PERSON_ID = "00000000-0000-4000-8000-0000000005f1";
const SMOKE_PERSON_SLUG = "storage-smoke";
const STAGE5N_UI_SMOKE_PERSON_SLUG = "mimi";
const STAGE5N_UI_SMOKE_NORMALIZED_TEXT = "stage five n preview ui write";

function usage() {
  return [
    "Usage:",
    "  node scripts/backup-import-postgres.mjs --fixture --dry-run",
    "  node scripts/backup-import-postgres.mjs --schema5-fixture --dry-run",
    "  node scripts/backup-import-postgres.mjs --schema6-fixture --dry-run",
    "  node scripts/backup-import-postgres.mjs --cleanup-smoke",
    "  node scripts/backup-import-postgres.mjs --fixture --trial-rollback",
    "  node scripts/backup-import-postgres.mjs --schema5-fixture --trial-rollback",
    "  node scripts/backup-import-postgres.mjs --schema6-fixture --trial-rollback",
    "  node scripts/backup-import-postgres.mjs --fixture --commit --i-confirm-development-import",
    "  node scripts/backup-import-postgres.mjs --schema5-fixture --commit --i-confirm-development-import",
    "  node scripts/backup-import-postgres.mjs --schema6-fixture --commit --i-confirm-development-import",
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
  if (hasArg("--schema5-fixture")) {
    return {
      sourceFileName: STAGE6B_P1E_SCHEMA5_FIXTURE_FILE_NAME,
      backup: createStage6BP1ESchema5FixtureBackup(),
    };
  }
  if (hasArg("--schema6-fixture")) {
    return {
      sourceFileName: V2_STAGE3_SCHEMA6_FIXTURE_FILE_NAME,
      backup: createV2Stage3Schema6FixtureBackup(),
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
        (select count(*)::int from daily_study_defaults) as daily_study_defaults,
        (select count(*)::int from daily_study_plans) as daily_study_plans,
        (select count(*)::int from vocabulary_creation_facts) as vocabulary_creation_facts,
        (select count(*)::int from vocabulary_creation_reversals) as vocabulary_creation_reversals,
        (select count(*)::int from ai_runs) as ai_runs,
        (select count(*)::int from ai_enrichment_drafts) as ai_enrichment_drafts,
        (select count(*)::int from vocabulary_relations) as vocabulary_relations,
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
        (select count(*)::int from daily_study_defaults where person_id = $1) as daily_study_defaults,
        (select count(*)::int from daily_study_plans where person_id = $1) as daily_study_plans,
        (select count(*)::int from vocabulary_creation_facts where person_id = $1) as vocabulary_creation_facts,
        (select count(*)::int from vocabulary_creation_reversals where person_id = $1) as vocabulary_creation_reversals,
        (select count(*)::int from ai_runs where person_id = $1) as ai_runs,
        (select count(*)::int from ai_enrichment_drafts where person_id = $1) as ai_enrichment_drafts,
        (select count(*)::int from vocabulary_relations where person_id = $1) as vocabulary_relations,
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
      ["vocabulary_relations", `${action} from vocabulary_relations where person_id = $1`, [SMOKE_PERSON_ID]],
      ["ai_enrichment_drafts", `${action} from ai_enrichment_drafts where person_id = $1`, [SMOKE_PERSON_ID]],
      ["ai_runs", `${action} from ai_runs where person_id = $1`, [SMOKE_PERSON_ID]],
      ["review_events", `${action} from review_events where person_id = $1`, [SMOKE_PERSON_ID]],
      ["review_states", `${action} from review_states where person_id = $1`, [SMOKE_PERSON_ID]],
      ["vocabulary_creation_reversals", `${action} from vocabulary_creation_reversals where person_id = $1`, [SMOKE_PERSON_ID]],
      ["vocabulary_creation_facts", `${action} from vocabulary_creation_facts where person_id = $1`, [SMOKE_PERSON_ID]],
      ["daily_study_plans", `${action} from daily_study_plans where person_id = $1`, [SMOKE_PERSON_ID]],
      ["daily_study_defaults", `${action} from daily_study_defaults where person_id = $1`, [SMOKE_PERSON_ID]],
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
        vocabulary_relations: 0,
        ai_enrichment_drafts: 0,
        ai_runs: 0,
        review_events: 0,
        review_states: 0,
        vocabulary_creation_reversals: 0,
        vocabulary_creation_facts: 0,
        daily_study_plans: 0,
        daily_study_defaults: 0,
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
      ["vocabulary_relations", `${action} from vocabulary_relations where person_id = any($1::uuid[])`, [personIds]],
      ["ai_enrichment_drafts", `${action} from ai_enrichment_drafts where person_id = any($1::uuid[])`, [personIds]],
      ["ai_runs", `${action} from ai_runs where person_id = any($1::uuid[])`, [personIds]],
      ["review_events", `${action} from review_events where person_id = any($1::uuid[])`, [personIds]],
      ["review_states", `${action} from review_states where person_id = any($1::uuid[])`, [personIds]],
      ["vocabulary_creation_reversals", `${action} from vocabulary_creation_reversals where person_id = any($1::uuid[])`, [personIds]],
      ["vocabulary_creation_facts", `${action} from vocabulary_creation_facts where person_id = any($1::uuid[])`, [personIds]],
      ["daily_study_plans", `${action} from daily_study_plans where person_id = any($1::uuid[])`, [personIds]],
      ["daily_study_defaults", `${action} from daily_study_defaults where person_id = any($1::uuid[])`, [personIds]],
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
        (select count(*)::int from daily_study_defaults where person_id in (select id from people where slug = $1)) as daily_study_defaults,
        (select count(*)::int from daily_study_plans where person_id in (select id from people where slug = $1)) as daily_study_plans,
        (select count(*)::int from vocabulary_creation_facts where person_id in (select id from people where slug = $1)) as vocabulary_creation_facts,
        (select count(*)::int from vocabulary_creation_reversals where person_id in (select id from people where slug = $1)) as vocabulary_creation_reversals,
        (select count(*)::int from ai_runs where person_id in (select id from people where slug = $1)) as ai_runs,
        (select count(*)::int from ai_enrichment_drafts where person_id in (select id from people where slug = $1)) as ai_enrichment_drafts,
        (select count(*)::int from vocabulary_relations where person_id in (select id from people where slug = $1)) as vocabulary_relations,
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
    daily_study_defaults: 2,
    daily_study_plans: 0,
    vocabulary_creation_facts: 1,
    vocabulary_creation_reversals: 0,
    ai_runs: 0,
    ai_enrichment_drafts: 0,
    vocabulary_relations: 0,
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
        "vocabulary_creation_facts",
        `${action} from vocabulary_creation_facts where person_id in (select id from people where slug = $1)`,
        [STAGE5N_UI_SMOKE_PERSON_SLUG],
      ],
      [
        "daily_study_defaults",
        `${action} from daily_study_defaults where person_id in (select id from people where slug = $1)`,
        [STAGE5N_UI_SMOKE_PERSON_SLUG],
      ],
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
          meanings_zh,
          example,
          examples,
          notes,
          rarity_score,
          learning_track,
          tags,
          source,
          import_batch_id,
          status,
          created_at,
          system_created_at,
          updated_at,
          timezone,
          archived_at
        )
        values (
          $1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb,
          $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17, $18, $19, $20
        )
      `,
      [
        item.id,
        item.personId,
        item.surfaceText,
        item.normalizedText,
        item.meaningZh,
        JSON.stringify(item.meaningsZh),
        item.example,
        JSON.stringify(item.examples),
        item.notes,
        item.rarityScore,
        item.learningTrack,
        item.tags ? JSON.stringify(item.tags) : null,
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
          review_profile,
          parameter_set_id,
          first_rated_at,
          history_origin,
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
        values (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
      `,
      [
        state.id,
        state.personId,
        state.vocabularyItemId,
        state.reviewProfile,
        state.parameterSetId,
        state.firstRatedAt,
        state.historyOrigin,
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
          prompt_id,
          review_profile,
          activity_type,
          answer_outcome,
          answer_normalization_version,
          target_revision,
          parameter_set_id,
          reviewed_at,
          rating,
          previous_due_at,
          next_due_at,
          previous_interval_minutes,
          next_interval_minutes,
          elapsed_ms
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17
        )
      `,
      [
        event.id,
        event.personId,
        event.vocabularyItemId,
        event.promptId,
        event.reviewProfile,
        event.activityType,
        event.answerOutcome,
        event.answerNormalizationVersion,
        event.targetRevision,
        event.parameterSetId,
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
        insert into review_settings (
          person_id,
          session_limit,
          recognition_session_limit,
          active_session_limit,
          timezone,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6)
      `,
      [
        settings.personId,
        settings.sessionLimit,
        settings.recognitionSessionLimit,
        settings.activeSessionLimit,
        settings.timezone,
        settings.updatedAt,
      ],
    );
  }

  for (const defaults of rows.dailyStudyDefaults) {
    await client.query(
      `
        insert into daily_study_defaults (
          person_id,
          review_profile,
          review_goal,
          new_word_goal,
          timezone,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6)
      `,
      [
        defaults.personId,
        defaults.reviewProfile,
        defaults.reviewGoal,
        defaults.newWordGoal,
        defaults.timezone,
        defaults.updatedAt,
      ],
    );
  }

  for (const plan of rows.dailyStudyPlans) {
    await client.query(
      `
        insert into daily_study_plans (
          id,
          person_id,
          review_profile,
          local_date,
          timezone,
          day_starts_at,
          day_ends_at,
          suggested_review,
          review_goal,
          new_word_goal,
          plan_version,
          recommendation_version,
          calculated_at,
          updated_at
        )
        values (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14
        )
      `,
      [
        plan.id,
        plan.personId,
        plan.reviewProfile,
        plan.localDate,
        plan.timezone,
        plan.dayStartsAt,
        plan.dayEndsAt,
        plan.suggestedReview,
        plan.reviewGoal,
        plan.newWordGoal,
        plan.planVersion,
        plan.recommendationVersion,
        plan.calculatedAt,
        plan.updatedAt,
      ],
    );
  }

  for (const fact of rows.vocabularyCreationFacts) {
    await client.query(
      `
        insert into vocabulary_creation_facts (
          id,
          person_id,
          original_vocabulary_item_id,
          source_action_id,
          track_at_creation,
          source_kind,
          history_origin,
          system_created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        fact.id,
        fact.personId,
        fact.originalVocabularyItemId,
        fact.sourceActionId,
        fact.trackAtCreation,
        fact.sourceKind,
        fact.historyOrigin,
        fact.systemCreatedAt,
      ],
    );
  }

  for (const reversal of rows.vocabularyCreationReversals) {
    await client.query(
      `
        insert into vocabulary_creation_reversals (
          id,
          person_id,
          source_action_id,
          reason,
          reversed_at
        )
        values ($1, $2, $3, $4, $5)
      `,
      [
        reversal.id,
        reversal.personId,
        reversal.sourceActionId,
        reversal.reason,
        reversal.reversedAt,
      ],
    );
  }

  for (const run of rows.aiRuns) {
    await client.query(
      `
        insert into ai_runs (
          id,
          person_id,
          source_vocabulary_item_id,
          feature,
          provider,
          model,
          model_label,
          prompt_version,
          source_hash,
          output_schema_version,
          disclosure_version,
          idempotency_key_hash,
          cache_key_hash,
          status,
          structure_validation_status,
          provider_response_id,
          input_tokens,
          output_tokens,
          thinking_tokens,
          total_tokens,
          latency_ms,
          estimated_cost_usd,
          created_at,
          completed_at
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24
        )
      `,
      [
        run.id,
        run.personId,
        run.sourceVocabularyItemId,
        run.feature,
        run.provider,
        run.model,
        run.modelLabel,
        run.promptVersion,
        run.sourceHash,
        run.outputSchemaVersion,
        run.disclosureVersion,
        run.idempotencyKeyHash,
        run.cacheKeyHash,
        run.status,
        run.structureValidationStatus,
        run.providerResponseId,
        run.inputTokens,
        run.outputTokens,
        run.thinkingTokens,
        run.totalTokens,
        run.latencyMs,
        run.estimatedCostUsd,
        run.createdAt,
        run.completedAt,
      ],
    );
  }

  for (const draft of rows.aiEnrichmentDrafts) {
    await client.query(
      `
        insert into ai_enrichment_drafts (
          id,
          person_id,
          source_vocabulary_item_id,
          ai_run_id,
          status,
          draft_json,
          accepted_content_json,
          created_at,
          updated_at,
          decided_at
        )
        values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
      `,
      [
        draft.id,
        draft.personId,
        draft.sourceVocabularyItemId,
        draft.aiRunId,
        draft.status,
        JSON.stringify(draft.draft),
        JSON.stringify(draft.acceptedContent),
        draft.createdAt,
        draft.updatedAt,
        draft.decidedAt,
      ],
    );
  }

  for (const relation of rows.vocabularyRelations) {
    await client.query(
      `
        insert into vocabulary_relations (
          id,
          person_id,
          source_vocabulary_item_id,
          target_vocabulary_item_id,
          relation_type,
          difference_zh,
          example_pair,
          ai_run_id,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
      `,
      [
        relation.id,
        relation.personId,
        relation.sourceVocabularyItemId,
        relation.targetVocabularyItemId,
        relation.relationType,
        relation.differenceZh,
        JSON.stringify(relation.examplePair),
        relation.aiRunId,
        relation.createdAt,
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
        (select count(*)::int from daily_study_defaults where person_id = any($1::uuid[])) as daily_study_defaults,
        (select count(*)::int from daily_study_plans where id = any($6::uuid[])) as daily_study_plans,
        (select count(*)::int from vocabulary_creation_facts where id = any($7::uuid[])) as vocabulary_creation_facts,
        (select count(*)::int from vocabulary_creation_reversals where id = any($8::uuid[])) as vocabulary_creation_reversals,
        (select count(*)::int from ai_runs where id = any($9::uuid[])) as ai_runs,
        (select count(*)::int from ai_enrichment_drafts where id = any($10::uuid[])) as ai_enrichment_drafts,
        (select count(*)::int from vocabulary_relations where id = any($11::uuid[])) as vocabulary_relations,
        (select count(*)::int from backup_imports where id = any($12::uuid[])) as backup_imports,
        (select count(*)::int from backup_import_mappings where id = any($13::uuid[])) as backup_import_mappings
    `,
    [
      rows.people.map((row) => row.id),
      rows.importBatches.map((row) => row.id),
      rows.vocabularyItems.map((row) => row.id),
      rows.reviewStates.map((row) => row.id),
      rows.reviewEvents.map((row) => row.id),
      rows.dailyStudyPlans.map((row) => row.id),
      rows.vocabularyCreationFacts.map((row) => row.id),
      rows.vocabularyCreationReversals.map((row) => row.id),
      rows.aiRuns.map((row) => row.id),
      rows.aiEnrichmentDrafts.map((row) => row.id),
      rows.vocabularyRelations.map((row) => row.id),
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
    daily_study_defaults: plan.counts.dailyStudyDefaults,
    daily_study_plans: plan.counts.dailyStudyPlans,
    vocabulary_creation_facts: plan.counts.vocabularyCreationFacts,
    vocabulary_creation_reversals: plan.counts.vocabularyCreationReversals,
    ai_runs: plan.counts.aiRuns,
    ai_enrichment_drafts: plan.counts.aiEnrichmentDrafts,
    vocabulary_relations: plan.counts.vocabularyRelations,
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
      daily_study_defaults: 0,
      daily_study_plans: 0,
      vocabulary_creation_facts: 0,
      vocabulary_creation_reversals: 0,
      ai_runs: 0,
      ai_enrichment_drafts: 0,
      vocabulary_relations: 0,
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
      daily_study_defaults: plan.counts.dailyStudyDefaults,
      daily_study_plans: plan.counts.dailyStudyPlans,
      vocabulary_creation_facts: plan.counts.vocabularyCreationFacts,
      vocabulary_creation_reversals: plan.counts.vocabularyCreationReversals,
      ai_runs: plan.counts.aiRuns,
      ai_enrichment_drafts: plan.counts.aiEnrichmentDrafts,
      vocabulary_relations: plan.counts.vocabularyRelations,
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
      notes: hasArg("--fixture") || hasArg("--schema5-fixture") || hasArg("--schema6-fixture")
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
      actions.push({
        action: "cleanup-stage6b-p1e-schema5-fixture",
        result: await cleanupRowsForPersonSlug(client, "stage6b-p1e-schema5-fixture"),
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
