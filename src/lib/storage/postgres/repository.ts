import { randomUUID } from "node:crypto";
import type {
  DurableRepositoryPort,
  ImportBatchRollbackResult,
  PersonScopedContext,
  RecordReviewCommand,
  ReviewQueueQuery,
  ResetTodayReviewResult,
  RollbackReviewEventResult,
  TimestampedPersonContext,
  VocabularyDeleteResult,
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
import {
  getLocalDateKey,
  scheduleNextReview,
  selectReviewQueue,
} from "@/lib/review/scheduler";
import type { PersonReviewSettings, ReviewEvent, ReviewState } from "@/lib/review/types";
import {
  cleanSurfaceText,
  normalizeLearningTrack,
  normalizeOptionalText,
  normalizeRarityScore,
  normalizeTextList,
  normalizeVocabularyTags,
  normalizeSurfaceText,
} from "@/lib/vocabulary/normalize";
import { buildPerson, type NewPersonInput } from "@/lib/people/repository";
import { buildVocabularyItem, createEmptyVocabularyData } from "@/lib/vocabulary/repository";
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
      select
        person_id,
        session_limit,
        recognition_session_limit,
        active_session_limit,
        timezone,
        updated_at
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
    schemaVersion: 5,
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

export async function getPostgresVocabularyDataSnapshot(
  selectedPersonId?: string | null,
  now = new Date().toISOString(),
): Promise<VocabularyData> {
  const queryable = getPostgresPool();
  const people = await listPeople(queryable);

  if (!people.length) {
    return createEmptyVocabularyData(now);
  }

  const selected =
    selectedPersonId && people.some((person) => person.id === selectedPersonId)
      ? selectedPersonId
      : people[0].id;
  const perPersonData = await Promise.all(
    people.map(async (person) => {
      const context = { personId: person.id };
      const [items, importBatches, reviewStates, reviewEvents, settings] = await Promise.all([
        listVocabularyItems(queryable, context, "all"),
        listImportBatches(queryable, context),
        listReviewStates(queryable, context),
        listReviewEvents(queryable, context),
        getReviewSettings(queryable, context),
      ]);

      return {
        items,
        importBatches,
        reviewStates,
        reviewEvents,
        settings,
      };
    }),
  );

  return {
    schemaVersion: 5,
    people,
    selectedPersonId: selected,
    items: perPersonData.flatMap((entry) => entry.items),
    importBatches: perPersonData.flatMap((entry) => entry.importBatches),
    reviewStates: perPersonData.flatMap((entry) => entry.reviewStates),
    reviewEvents: perPersonData.flatMap((entry) => entry.reviewEvents),
    settingsByPerson: perPersonData.map((entry) => entry.settings),
    updatedAt: now,
  };
}

export async function createPostgresPerson(
  input: NewPersonInput,
  now = new Date().toISOString(),
) {
  const queryable = getPostgresPool();
  const people = await listPeople(queryable);
  const person = buildPerson({ ...input, id: randomUUID() }, people, now);

  return withPostgresTransaction(async (client) => {
    const result = await client.query<PersonRow>(
      `
        insert into people (id, display_name, slug, is_active, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6)
        returning id, display_name, slug, is_active, created_at, updated_at
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
    const settings = createDefaultReviewSettings(now);

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
        person.id,
        settings.sessionLimit,
        settings.recognitionSessionLimit,
        settings.activeSessionLimit,
        settings.timezone,
        settings.updatedAt,
      ],
    );

    return mapPersonRow(result.rows[0]);
  });
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
      returning
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

  const legacyMeaning =
    input.meaningZh === undefined ? currentItem.meaningZh : normalizeOptionalText(input.meaningZh);
  const meaningsZh =
    input.meaningZh === undefined && input.meaningsZh === undefined
      ? currentItem.meaningsZh
      : normalizeTextList(input.meaningsZh?.length ? input.meaningsZh : legacyMeaning);
  const legacyExample =
    input.example === undefined ? currentItem.example : normalizeOptionalText(input.example);
  const examples =
    input.example === undefined && input.examples === undefined
      ? currentItem.examples
      : normalizeTextList(input.examples?.length ? input.examples : legacyExample);

  return {
    ...currentItem,
    surfaceText,
    normalizedText: normalizeSurfaceText(surfaceText),
    meaningZh: meaningsZh[0] ?? legacyMeaning,
    meaningsZh,
    example: examples[0] ?? legacyExample,
    examples,
    notes: input.notes === undefined ? currentItem.notes : normalizeOptionalText(input.notes),
    rarityScore:
      input.rarityScore === undefined ? currentItem.rarityScore : normalizeRarityScore(input.rarityScore),
    learningTrack:
      input.learningTrack === undefined ? currentItem.learningTrack : normalizeLearningTrack(input.learningTrack),
    tags: input.tags === undefined ? currentItem.tags : normalizeVocabularyTags(input.tags),
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
        meanings_zh = $6::jsonb,
        example = $7,
        examples = $8::jsonb,
        notes = $9,
        rarity_score = $10,
        learning_track = $11,
        tags = $12::jsonb,
        created_at = $13,
        updated_at = $14,
        timezone = $15
      where person_id = $1 and id = $2
      returning
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
    `,
    [
      context.personId,
      vocabularyItemId,
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

async function deleteVocabularyItem(
  context: TimestampedPersonContext,
  vocabularyItemId: string,
): Promise<VocabularyDeleteResult> {
  assertPersonContext(context);
  assertDatabaseUuid(vocabularyItemId, "vocabularyItemId");

  return withPostgresTransaction(async (client) => {
    const item = await selectVocabularyItem(client, context, vocabularyItemId);

    if (!item) {
      throw new Error(`Vocabulary item not found: ${vocabularyItemId}`);
    }

    await client.query(
      `
        delete from vocabulary_items
        where person_id = $1 and id = $2
      `,
      [context.personId, vocabularyItemId],
    );

    return { item };
  });
}

async function rollbackImportBatch(
  context: TimestampedPersonContext,
  importBatchId: string,
): Promise<ImportBatchRollbackResult> {
  assertPersonContext(context);
  assertDatabaseUuid(importBatchId, "importBatchId");

  return withPostgresTransaction(async (client) => {
    const batchResult = await client.query<ImportBatchRow>(
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
        where person_id = $1 and id = $2
        limit 1
      `,
      [context.personId, importBatchId],
    );
    const batchRow = batchResult.rows[0];

    if (!batchRow) {
      throw new Error(`Import batch not found: ${importBatchId}`);
    }

    const itemResult = await client.query<{ id: string }>(
      `
        select id
        from vocabulary_items
        where person_id = $1 and import_batch_id = $2
      `,
      [context.personId, importBatchId],
    );
    const itemIds = itemResult.rows.map((row) => row.id);
    const reviewStateCountResult = await client.query<{ count: number }>(
      `
        select count(*)::int as count
        from review_states
        where person_id = $1 and vocabulary_item_id = any($2::uuid[])
      `,
      [context.personId, itemIds],
    );
    const reviewEventCountResult = await client.query<{ count: number }>(
      `
        select count(*)::int as count
        from review_events
        where person_id = $1 and vocabulary_item_id = any($2::uuid[])
      `,
      [context.personId, itemIds],
    );

    await client.query(
      `
        delete from vocabulary_items
        where person_id = $1 and import_batch_id = $2
      `,
      [context.personId, importBatchId],
    );
    await client.query(
      `
        delete from import_batches
        where person_id = $1 and id = $2
      `,
      [context.personId, importBatchId],
    );

    return {
      batch: mapImportBatchRow(batchRow),
      deletedItemsCount: itemIds.length,
      deletedReviewStatesCount: reviewStateCountResult.rows[0]?.count ?? 0,
      deletedReviewEventsCount: reviewEventCountResult.rows[0]?.count ?? 0,
    };
  });
}

function sortReviewEventsByReviewedAt(a: ReviewEvent, b: ReviewEvent) {
  const reviewedAtCompare = a.reviewedAt.localeCompare(b.reviewedAt);

  if (reviewedAtCompare !== 0) {
    return reviewedAtCompare;
  }

  return a.id.localeCompare(b.id);
}

function rebuildReviewStateFromEvents(
  personId: string,
  vocabularyItemId: string,
  events: ReviewEvent[],
  previousState: ReviewState | null,
) {
  return events.reduce<ReviewState | null>((state, event) => {
    const scheduled = scheduleNextReview(state ?? undefined, event.rating, event.reviewedAt);

    return {
      id: state?.id ?? previousState?.id ?? randomUUID(),
      personId,
      vocabularyItemId,
      status: scheduled.status,
      dueAt: scheduled.dueAt,
      lastReviewedAt: event.reviewedAt,
      reviewCount: scheduled.reviewCount,
      lapseCount: scheduled.lapseCount,
      intervalMinutes: scheduled.intervalMinutes,
      difficulty: scheduled.difficulty,
      stability: scheduled.stability,
      updatedAt: event.reviewedAt,
    };
  }, null);
}

async function upsertReviewState(queryable: PostgresQueryable, state: ReviewState) {
  const stateResult = await queryable.query<ReviewStateRow>(
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

  return mapReviewStateRow(stateResult.rows[0]);
}

async function listReviewEventsForVocabularyItem(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
  vocabularyItemId: string,
) {
  assertPersonContext(context);
  assertDatabaseUuid(vocabularyItemId, "vocabularyItemId");

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
      where person_id = $1 and vocabulary_item_id = $2
      order by reviewed_at asc, id asc
    `,
    [context.personId, vocabularyItemId],
  );

  return result.rows.map(mapReviewEventRow);
}

async function resetTodayReview(
  context: TimestampedPersonContext,
): Promise<ResetTodayReviewResult> {
  assertPersonContext(context);

  return withPostgresTransaction(async (client) => {
    const settings = await getReviewSettings(client, context);
    const todayKey = getLocalDateKey(context.now, settings.timezone);
    const events = await listReviewEvents(client, context);
    const todayEvents = events.filter(
      (event) => getLocalDateKey(event.reviewedAt, settings.timezone) === todayKey,
    );
    const affectedItemIds = Array.from(new Set(todayEvents.map((event) => event.vocabularyItemId)));

    if (!todayEvents.length) {
      return {
        resetEventsCount: 0,
        resetItemsCount: 0,
      };
    }

    const previousStateByItemId = new Map(
      await Promise.all(
        affectedItemIds.map(async (vocabularyItemId) => [
          vocabularyItemId,
          await getReviewState(client, context, vocabularyItemId),
        ] as const),
      ),
    );

    await client.query(
      `
        delete from review_events
        where person_id = $1 and id = any($2::uuid[])
      `,
      [context.personId, todayEvents.map((event) => event.id)],
    );
    await client.query(
      `
        delete from review_states
        where person_id = $1 and vocabulary_item_id = any($2::uuid[])
      `,
      [context.personId, affectedItemIds],
    );

    for (const vocabularyItemId of affectedItemIds) {
      const earlierEvents = events
        .filter(
          (event) =>
            event.vocabularyItemId === vocabularyItemId &&
            getLocalDateKey(event.reviewedAt, settings.timezone) !== todayKey,
        )
        .sort(sortReviewEventsByReviewedAt);
      const rebuiltState = rebuildReviewStateFromEvents(
        context.personId,
        vocabularyItemId,
        earlierEvents,
        previousStateByItemId.get(vocabularyItemId) ?? null,
      );

      if (rebuiltState) {
        await upsertReviewState(client, rebuiltState);
      }
    }

    return {
      resetEventsCount: todayEvents.length,
      resetItemsCount: affectedItemIds.length,
    };
  });
}

async function rollbackReviewEvent(
  context: TimestampedPersonContext,
  reviewEventId: string,
): Promise<RollbackReviewEventResult> {
  assertPersonContext(context);
  assertDatabaseUuid(reviewEventId, "reviewEventId");

  return withPostgresTransaction(async (client) => {
    const eventResult = await client.query<ReviewEventRow>(
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
        where person_id = $1 and id = $2
        limit 1
      `,
      [context.personId, reviewEventId],
    );
    const eventRow = eventResult.rows[0];

    if (!eventRow) {
      throw new Error(`Review event not found: ${reviewEventId}`);
    }

    const event = mapReviewEventRow(eventRow);
    const previousState = await getReviewState(client, context, event.vocabularyItemId);
    const remainingEvents = (await listReviewEventsForVocabularyItem(
      client,
      context,
      event.vocabularyItemId,
    )).filter((candidate) => candidate.id !== reviewEventId);

    await client.query(
      `
        delete from review_events
        where person_id = $1 and id = $2
      `,
      [context.personId, reviewEventId],
    );
    await client.query(
      `
        delete from review_states
        where person_id = $1 and vocabulary_item_id = $2
      `,
      [context.personId, event.vocabularyItemId],
    );

    const rebuiltState = rebuildReviewStateFromEvents(
      context.personId,
      event.vocabularyItemId,
      remainingEvents.sort(sortReviewEventsByReviewedAt),
      previousState,
    );

    return {
      event,
      state: rebuiltState ? await upsertReviewState(client, rebuiltState) : null,
    };
  });
}

async function updateReviewSettings(
  queryable: PostgresQueryable,
  context: TimestampedPersonContext,
  input: Pick<
    PersonReviewSettings,
    "sessionLimit" | "recognitionSessionLimit" | "activeSessionLimit" | "timezone"
  >,
) {
  assertPersonContext(context);

  const settings = normalizeReviewSettings(
    {
      sessionLimit: input.recognitionSessionLimit ?? input.sessionLimit,
      recognitionSessionLimit: input.recognitionSessionLimit ?? input.sessionLimit,
      activeSessionLimit: input.activeSessionLimit,
      timezone: input.timezone,
    },
    context.now,
  );
  const result = await queryable.query<ReviewSettingsRow>(
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
      on conflict (person_id)
      do update set
        session_limit = excluded.session_limit,
        recognition_session_limit = excluded.recognition_session_limit,
        active_session_limit = excluded.active_session_limit,
        timezone = excluded.timezone,
        updated_at = excluded.updated_at
      returning
        person_id,
        session_limit,
        recognition_session_limit,
        active_session_limit,
        timezone,
        updated_at
    `,
    [
      context.personId,
      settings.sessionLimit,
      settings.recognitionSessionLimit,
      settings.activeSessionLimit,
      settings.timezone,
      settings.updatedAt,
    ],
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
      insert into review_settings (
        person_id,
        session_limit,
        recognition_session_limit,
        active_session_limit,
        timezone,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6)
      on conflict (person_id)
      do update set
        session_limit = excluded.session_limit,
        recognition_session_limit = excluded.recognition_session_limit,
        active_session_limit = excluded.active_session_limit,
        timezone = excluded.timezone,
        updated_at = excluded.updated_at
    `,
    [
      POSTGRES_SMOKE_PERSON_ID,
      settings.sessionLimit,
      settings.recognitionSessionLimit,
      settings.activeSessionLimit,
      settings.timezone,
      settings.updatedAt,
    ],
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
      deleteItem: (context, vocabularyItemId) =>
        deleteVocabularyItem(context, vocabularyItemId),
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
              meaningsZh: candidate.meaningsZh,
              example: candidate.example,
              examples: candidate.examples,
              rarityScore: candidate.rarityScore,
              notes: candidate.notes,
              learningTrack: candidate.learningTrack,
              tags: candidate.tags,
              source: batch.sourceType,
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
      rollbackImportBatch: (context, importBatchId) =>
        rollbackImportBatch(context, importBatchId),
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
          schemaVersion: 5,
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

          if (
            !item ||
            item.status === "archived" ||
            item.archivedAt ||
            item.learningTrack !== "recognition"
          ) {
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
            difficulty: scheduled.difficulty,
            stability: scheduled.stability,
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
      resetToday: (context) => resetTodayReview(context),
      rollbackEvent: (context, reviewEventId) => rollbackReviewEvent(context, reviewEventId),
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
