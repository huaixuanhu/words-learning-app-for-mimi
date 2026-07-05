import { randomUUID } from "node:crypto";
import type {
  DurableRepositoryPort,
  PersonScopedContext,
  RecordReviewCommand,
  ReviewQueueQuery,
  TimestampedPersonContext,
} from "@/lib/storage/durable-repository-contract";
import { getPostgresPool, type PostgresQueryable, withPostgresTransaction } from "./client";
import {
  mapImportBatchRow,
  mapPersonRow,
  mapReviewEventRow,
  mapReviewSettingsRow,
  mapReviewStateRow,
  mapVocabularyItemRow,
  type ImportBatchRow,
  type PersonRow,
  type ReviewEventRow,
  type ReviewSettingsRow,
  type ReviewStateRow,
  type VocabularyItemRow,
} from "./mappers";
import { createDefaultReviewSettings, normalizeReviewSettings } from "@/lib/review/settings";
import { scheduleNextReview, selectReviewQueue } from "@/lib/review/scheduler";
import type { PersonReviewSettings, ReviewState } from "@/lib/review/types";
import {
  cleanSurfaceText,
  normalizeOptionalText,
  normalizeRarityScore,
  normalizeSurfaceText,
} from "@/lib/vocabulary/normalize";
import { buildVocabularyItem } from "@/lib/vocabulary/repository";
import type {
  ImportBatchInput,
  ImportCandidate,
  ImportCommitResult,
  NewVocabularyInput,
  UpdateVocabularyInput,
  VocabularyData,
  VocabularyItem,
} from "@/lib/vocabulary/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const POSTGRES_SMOKE_PERSON_ID = "00000000-0000-4000-8000-0000000005f1";

export function assertDatabaseUuid(value: string, label: string) {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a database UUID`);
  }
}

function databaseUuid(input: string | undefined, label: string) {
  if (!input) {
    return randomUUID();
  }

  assertDatabaseUuid(input, label);

  return input;
}

function assertPersonContext(context: PersonScopedContext) {
  assertDatabaseUuid(context.personId, "personId");
}

async function listPeople(queryable: PostgresQueryable) {
  const result = await queryable.query<PersonRow>(
    `
      select id, display_name, slug, is_active, created_at, updated_at
      from people
      where is_active = true
      order by slug asc, display_name asc
    `,
  );

  return result.rows.map(mapPersonRow);
}

async function selectPerson(queryable: PostgresQueryable, personId: string) {
  assertDatabaseUuid(personId, "personId");

  const result = await queryable.query<PersonRow>(
    `
      select id, display_name, slug, is_active, created_at, updated_at
      from people
      where id = $1 and is_active = true
      limit 1
    `,
    [personId],
  );

  const person = result.rows[0];

  if (!person) {
    throw new Error(`Person not found: ${personId}`);
  }

  return mapPersonRow(person);
}

async function listVocabularyItems(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
  filter: "all" | "active" | "archived",
) {
  assertPersonContext(context);

  const statusWhere =
    filter === "active"
      ? "and status <> 'archived' and archived_at is null"
      : filter === "archived"
        ? "and (status = 'archived' or archived_at is not null)"
        : "";
  const result = await queryable.query<VocabularyItemRow>(
    `
      select
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
      from vocabulary_items
      where person_id = $1
      ${statusWhere}
      order by created_at desc, normalized_text asc
    `,
    [context.personId],
  );

  return result.rows.map(mapVocabularyItemRow);
}

async function selectVocabularyItem(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
  vocabularyItemId: string,
) {
  assertPersonContext(context);
  assertDatabaseUuid(vocabularyItemId, "vocabularyItemId");

  const result = await queryable.query<VocabularyItemRow>(
    `
      select
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
      from vocabulary_items
      where person_id = $1 and id = $2
      limit 1
    `,
    [context.personId, vocabularyItemId],
  );

  return result.rows[0] ? mapVocabularyItemRow(result.rows[0]) : null;
}

async function listImportBatches(queryable: PostgresQueryable, context: PersonScopedContext) {
  assertPersonContext(context);

  const result = await queryable.query<ImportBatchRow>(
    `
      select
        id,
        person_id,
        source_type,
        file_name,
        created_at,
        total_rows,
        accepted_rows,
        duplicate_rows,
        invalid_rows
      from import_batches
      where person_id = $1
      order by created_at desc
    `,
    [context.personId],
  );

  return result.rows.map(mapImportBatchRow);
}

async function getReviewState(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
  vocabularyItemId: string,
) {
  assertPersonContext(context);
  assertDatabaseUuid(vocabularyItemId, "vocabularyItemId");

  const result = await queryable.query<ReviewStateRow>(
    `
      select
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
      from review_states
      where person_id = $1 and vocabulary_item_id = $2
      limit 1
    `,
    [context.personId, vocabularyItemId],
  );

  return result.rows[0] ? mapReviewStateRow(result.rows[0]) : null;
}

async function listReviewStates(queryable: PostgresQueryable, context: PersonScopedContext) {
  assertPersonContext(context);

  const result = await queryable.query<ReviewStateRow>(
    `
      select
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
      from review_states
      where person_id = $1
      order by due_at asc
    `,
    [context.personId],
  );

  return result.rows.map(mapReviewStateRow);
}

async function listReviewEvents(queryable: PostgresQueryable, context: PersonScopedContext) {
  assertPersonContext(context);

  const result = await queryable.query<ReviewEventRow>(
    `
      select
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
      from review_events
      where person_id = $1
      order by reviewed_at desc, id desc
    `,
    [context.personId],
  );

  return result.rows.map(mapReviewEventRow);
}

async function getReviewSettings(queryable: PostgresQueryable, context: PersonScopedContext) {
  assertPersonContext(context);

  const result = await queryable.query<ReviewSettingsRow>(
    `
      select person_id, session_limit, timezone, updated_at
      from review_settings
      where person_id = $1
      limit 1
    `,
    [context.personId],
  );

  if (result.rows[0]) {
    return mapReviewSettingsRow(result.rows[0]);
  }

  return {
    personId: context.personId,
    ...createDefaultReviewSettings(),
  };
}

async function buildVocabularyDataSnapshot(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
  now: string,
): Promise<VocabularyData> {
  const person = await selectPerson(queryable, context.personId);
  const [items, importBatches, reviewStates, reviewEvents, settings] = await Promise.all([
    listVocabularyItems(queryable, context, "all"),
    listImportBatches(queryable, context),
    listReviewStates(queryable, context),
    listReviewEvents(queryable, context),
    getReviewSettings(queryable, context),
  ]);

  return {
    schemaVersion: 3,
    people: [person],
    selectedPersonId: context.personId,
    items,
    importBatches,
    reviewStates,
    reviewEvents,
    settingsByPerson: [settings],
    updatedAt: now,
  };
}

async function insertVocabularyItem(
  queryable: PostgresQueryable,
  item: VocabularyItem,
) {
  const result = await queryable.query<VocabularyItemRow>(
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
      returning
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

  return mapVocabularyItemRow(result.rows[0]);
}

function buildPostgresVocabularyItem(
  context: TimestampedPersonContext,
  input: NewVocabularyInput,
): VocabularyItem {
  const id = databaseUuid(input.id, "vocabularyItem.id");

  return buildVocabularyItem(
    {
      ...input,
      id,
      personId: context.personId,
      createdAt: input.createdAt ?? context.now,
      systemCreatedAt: input.systemCreatedAt ?? context.now,
      updatedAt: context.now,
      timezone: input.timezone || context.timezone,
    },
    context.now,
  );
}

function buildUpdatedVocabularyItem(
  currentItem: VocabularyItem,
  context: TimestampedPersonContext,
  input: UpdateVocabularyInput,
) {
  const surfaceText =
    input.surfaceText === undefined ? currentItem.surfaceText : cleanSurfaceText(input.surfaceText);

  if (!surfaceText) {
    throw new Error("surfaceText is required");
  }

  return {
    ...currentItem,
    surfaceText,
    normalizedText: normalizeSurfaceText(surfaceText),
    meaningZh:
      input.meaningZh === undefined ? currentItem.meaningZh : normalizeOptionalText(input.meaningZh),
    example: input.example === undefined ? currentItem.example : normalizeOptionalText(input.example),
    notes: input.notes === undefined ? currentItem.notes : normalizeOptionalText(input.notes),
    rarityScore:
      input.rarityScore === undefined ? currentItem.rarityScore : normalizeRarityScore(input.rarityScore),
    createdAt: input.createdAt ?? currentItem.createdAt,
    timezone: input.timezone ?? currentItem.timezone,
    updatedAt: context.now,
  };
}

async function updateVocabularyItem(
  queryable: PostgresQueryable,
  context: TimestampedPersonContext,
  vocabularyItemId: string,
  item: VocabularyItem,
) {
  assertPersonContext(context);
  assertDatabaseUuid(vocabularyItemId, "vocabularyItemId");

  const result = await queryable.query<VocabularyItemRow>(
    `
      update vocabulary_items
      set
        surface_text = $3,
        normalized_text = $4,
        meaning_zh = $5,
        example = $6,
        notes = $7,
        rarity_score = $8,
        created_at = $9,
        updated_at = $10,
        timezone = $11
      where person_id = $1 and id = $2
      returning
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
    `,
    [
      context.personId,
      vocabularyItemId,
      item.surfaceText,
      item.normalizedText,
      item.meaningZh,
      item.example,
      item.notes,
      item.rarityScore,
      item.createdAt,
      item.updatedAt,
      item.timezone,
    ],
  );

  if (!result.rows[0]) {
    throw new Error(`Vocabulary item not found: ${vocabularyItemId}`);
  }

  return mapVocabularyItemRow(result.rows[0]);
}

async function setVocabularyArchiveState(
  queryable: PostgresQueryable,
  context: TimestampedPersonContext,
  vocabularyItemId: string,
  archived: boolean,
) {
  assertPersonContext(context);
  assertDatabaseUuid(vocabularyItemId, "vocabularyItemId");

  const result = await queryable.query<VocabularyItemRow>(
    `
      update vocabulary_items
      set
        status = $3,
        archived_at = case when $3 = 'archived' then coalesce(archived_at, $4) else null end,
        updated_at = $5
      where person_id = $1 and id = $2
      returning
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
    `,
    [
      context.personId,
      vocabularyItemId,
      archived ? "archived" : "new",
      archived ? context.now : null,
      context.now,
    ],
  );

  if (!result.rows[0]) {
    throw new Error(`Vocabulary item not found: ${vocabularyItemId}`);
  }

  return mapVocabularyItemRow(result.rows[0]);
}

async function updateReviewSettings(
  queryable: PostgresQueryable,
  context: TimestampedPersonContext,
  input: Pick<PersonReviewSettings, "sessionLimit" | "timezone">,
) {
  assertPersonContext(context);

  const settings = normalizeReviewSettings(
    {
      sessionLimit: input.sessionLimit,
      timezone: input.timezone,
    },
    context.now,
  );
  const result = await queryable.query<ReviewSettingsRow>(
    `
      insert into review_settings (person_id, session_limit, timezone, updated_at)
      values ($1, $2, $3, $4)
      on conflict (person_id)
      do update set
        session_limit = excluded.session_limit,
        timezone = excluded.timezone,
        updated_at = excluded.updated_at
      returning person_id, session_limit, timezone, updated_at
    `,
    [context.personId, settings.sessionLimit, settings.timezone, settings.updatedAt],
  );

  return mapReviewSettingsRow(result.rows[0]);
}

export async function ensurePostgresSmokePerson(now = new Date().toISOString()) {
  const queryable = getPostgresPool();
  const personResult = await queryable.query<PersonRow>(
    `
      insert into people (id, display_name, slug, is_active, created_at, updated_at)
      values ($1, $2, $3, true, $4, $4)
      on conflict (id)
      do update set
        is_active = true,
        updated_at = excluded.updated_at
      returning id, display_name, slug, is_active, created_at, updated_at
    `,
    [POSTGRES_SMOKE_PERSON_ID, "Storage Smoke", "storage-smoke", now],
  );
  const settings = createDefaultReviewSettings(now);

  await queryable.query(
    `
      insert into review_settings (person_id, session_limit, timezone, updated_at)
      values ($1, $2, $3, $4)
      on conflict (person_id)
      do update set updated_at = excluded.updated_at
    `,
    [POSTGRES_SMOKE_PERSON_ID, settings.sessionLimit, settings.timezone, settings.updatedAt],
  );

  return mapPersonRow(personResult.rows[0]);
}

export function createPostgresRepository(): DurableRepositoryPort {
  const queryable = getPostgresPool();

  return {
    kind: "postgres",
    people: {
      listPeople: () => listPeople(queryable),
      selectPerson: (personId) => selectPerson(queryable, personId),
    },
    vocabulary: {
      listItems: (context) => listVocabularyItems(queryable, context, "all"),
      listActiveItems: (context) => listVocabularyItems(queryable, context, "active"),
      listArchivedItems: (context) => listVocabularyItems(queryable, context, "archived"),
      addItem: async (context, input) => {
        assertPersonContext(context);
        const item = buildPostgresVocabularyItem(context, input);

        return insertVocabularyItem(queryable, item);
      },
      updateItem: async (context, vocabularyItemId, input) => {
        const currentItem = await selectVocabularyItem(queryable, context, vocabularyItemId);

        if (!currentItem) {
          throw new Error(`Vocabulary item not found: ${vocabularyItemId}`);
        }

        const nextItem = buildUpdatedVocabularyItem(currentItem, context, input);

        return updateVocabularyItem(queryable, context, vocabularyItemId, nextItem);
      },
      archiveItem: (context, vocabularyItemId) =>
        setVocabularyArchiveState(queryable, context, vocabularyItemId, true),
      restoreItem: (context, vocabularyItemId) =>
        setVocabularyArchiveState(queryable, context, vocabularyItemId, false),
      commitImportCandidates: async (
        context,
        batchInput: ImportBatchInput,
        candidates: ImportCandidate[],
        acceptedTempIds: Iterable<string>,
      ): Promise<ImportCommitResult> => {
        assertPersonContext(context);
        const acceptedIds = new Set(acceptedTempIds);
        const acceptedCandidates = candidates.filter(
          (candidate) => acceptedIds.has(candidate.tempId) && candidate.status !== "invalid",
        );
        const batchId = databaseUuid(batchInput.id, "importBatch.id");
        const transactionResult = await withPostgresTransaction(async (client) => {
          const batchResult = await client.query<ImportBatchRow>(
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
              returning
                id,
                person_id,
                source_type,
                file_name,
                created_at,
                total_rows,
                accepted_rows,
                duplicate_rows,
                invalid_rows
            `,
            [
              batchId,
              context.personId,
              batchInput.sourceType,
              batchInput.fileName ?? null,
              context.now,
              candidates.length,
              acceptedCandidates.length,
              candidates.filter((candidate) => candidate.status === "duplicate").length,
              candidates.filter((candidate) => candidate.status === "invalid").length,
            ],
          );
          const batch = mapImportBatchRow(batchResult.rows[0]);
          const items: VocabularyItem[] = [];

          for (const candidate of acceptedCandidates) {
            const item = buildPostgresVocabularyItem(context, {
              id: randomUUID(),
              surfaceText: candidate.surfaceText,
              meaningZh: candidate.meaningZh,
              example: candidate.example,
              notes: "",
              rarityScore: candidate.rarityScore,
              source: batch.sourceType === "txt_file" ? "txt_file" : "pasted_text",
              importBatchId: batch.id,
              timezone: context.timezone,
            });

            items.push(await insertVocabularyItem(client, item));
          }

          return { batch, items };
        });
        const data = await buildVocabularyDataSnapshot(queryable, context, context.now);

        return {
          data,
          batch: transactionResult.batch,
          items: transactionResult.items,
        };
      },
      listImportBatches: (context) => listImportBatches(queryable, context),
    },
    review: {
      getReviewState: (context, vocabularyItemId) => getReviewState(queryable, context, vocabularyItemId),
      getReviewQueue: async (context: ReviewQueueQuery) => {
        assertPersonContext(context);
        const [person, items, states, settings] = await Promise.all([
          selectPerson(queryable, context.personId),
          listVocabularyItems(queryable, context, "active"),
          listReviewStates(queryable, context),
          getReviewSettings(queryable, context),
        ]);
        const data: VocabularyData = {
          schemaVersion: 3,
          people: [person],
          selectedPersonId: context.personId,
          items,
          importBatches: [],
          reviewStates: states,
          reviewEvents: [],
          settingsByPerson: [settings],
          updatedAt: context.now,
        };

        return selectReviewQueue(data, context.now, context.sessionLimit);
      },
      recordReview: async (command: RecordReviewCommand) => {
        assertPersonContext(command);
        assertDatabaseUuid(command.vocabularyItemId, "vocabularyItemId");

        return withPostgresTransaction(async (client) => {
          const item = await selectVocabularyItem(client, command, command.vocabularyItemId);

          if (!item || item.status === "archived" || item.archivedAt) {
            throw new Error(`Reviewable vocabulary item not found: ${command.vocabularyItemId}`);
          }

          const previousState = await getReviewState(client, command, command.vocabularyItemId);
          const scheduled = scheduleNextReview(previousState ?? undefined, command.rating, command.reviewedAt);
          const elapsedMs =
            command.elapsedMs === null || command.elapsedMs === undefined
              ? 0
              : Math.max(0, Math.round(command.elapsedMs));
          const nextState: ReviewState = {
            id: previousState?.id ?? randomUUID(),
            personId: command.personId,
            vocabularyItemId: command.vocabularyItemId,
            status: scheduled.status,
            dueAt: scheduled.dueAt,
            lastReviewedAt: command.reviewedAt,
            reviewCount: scheduled.reviewCount,
            lapseCount: scheduled.lapseCount,
            intervalMinutes: scheduled.intervalMinutes,
            difficulty: previousState?.difficulty ?? null,
            stability: previousState?.stability ?? null,
            updatedAt: command.reviewedAt,
          };
          const eventResult = await client.query<ReviewEventRow>(
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
              returning
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
            `,
            [
              randomUUID(),
              command.personId,
              command.vocabularyItemId,
              command.reviewedAt,
              command.rating,
              previousState?.dueAt ?? null,
              scheduled.dueAt,
              previousState?.intervalMinutes ?? null,
              scheduled.intervalMinutes,
              elapsedMs,
            ],
          );
          const stateResult = await client.query<ReviewStateRow>(
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
              on conflict (person_id, vocabulary_item_id)
              do update set
                status = excluded.status,
                due_at = excluded.due_at,
                last_reviewed_at = excluded.last_reviewed_at,
                review_count = excluded.review_count,
                lapse_count = excluded.lapse_count,
                interval_minutes = excluded.interval_minutes,
                difficulty = excluded.difficulty,
                stability = excluded.stability,
                updated_at = excluded.updated_at
              returning
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
            `,
            [
              nextState.id,
              nextState.personId,
              nextState.vocabularyItemId,
              nextState.status,
              nextState.dueAt,
              nextState.lastReviewedAt,
              nextState.reviewCount,
              nextState.lapseCount,
              nextState.intervalMinutes,
              nextState.difficulty,
              nextState.stability,
              nextState.updatedAt,
            ],
          );

          return {
            event: mapReviewEventRow(eventResult.rows[0]),
            state: mapReviewStateRow(stateResult.rows[0]),
          };
        });
      },
      listReviewEvents: (context) => listReviewEvents(queryable, context),
    },
    reviewSettings: {
      getSettings: (context) => getReviewSettings(queryable, context),
      updateSettings: (context, input) => updateReviewSettings(queryable, context, input),
    },
    backup: {
      importBackup: async () => {
        throw new Error("Postgres backup import is not implemented in Stage 5I");
      },
    },
  };
}
