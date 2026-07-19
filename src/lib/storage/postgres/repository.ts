import { createHash, randomUUID } from "node:crypto";
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
  mapAiEnrichmentDraftRow,
  mapAiRunRow,
  mapDailyStudyDefaultRow,
  mapDailyStudyPlanRow,
  mapImportBatchRow,
  mapPersonRow,
  mapReviewEventRow,
  mapReviewSettingsRow,
  mapReviewStateRow,
  mapVocabularyCreationFactRow,
  mapVocabularyCreationReversalRow,
  mapVocabularyItemRow,
  mapVocabularyRelationRow,
  type AiEnrichmentDraftRow,
  type AiRunRow,
  type DailyStudyDefaultRow,
  type DailyStudyPlanRow,
  type ImportBatchRow,
  type PersonRow,
  type ReviewEventRow,
  type ReviewSettingsRow,
  type ReviewStateRow,
  type VocabularyCreationFactRow,
  type VocabularyCreationReversalRow,
  type VocabularyItemRow,
  type VocabularyRelationRow,
} from "./mappers";
import { createDefaultReviewSettings, normalizeReviewSettings } from "@/lib/review/settings";
import {
  getLocalDateKey,
  scheduleNextReviewForProfile,
  selectReviewQueue,
} from "@/lib/review/scheduler";
import {
  getDailyEpisodeEvents,
  scheduleDailyEpisodeAttempt,
} from "@/lib/review/daily-episode";
import { rebuildReviewProfileStateFromEvents } from "@/lib/review/repository";
import {
  ACTIVE_PARAMETER_SET_ID,
  RECOGNITION_PARAMETER_SET_ID,
  type ReviewActivityType,
  type ReviewAnswerOutcome,
  type PersonReviewSettings,
  type ReviewEvent,
  type ReviewState,
} from "@/lib/review/types";
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
import {
  buildVocabularyCreationRecord,
  buildVocabularyItem,
  createDailyStudyDefaults,
  createEmptyVocabularyData,
} from "@/lib/vocabulary/repository";
import type {
  ImportBatchInput,
  ImportCandidate,
  ImportCommitResult,
  NewVocabularyInput,
  UpdateVocabularyInput,
  VocabularyData,
  VocabularyItem,
} from "@/lib/vocabulary/types";
import type { DailyStudyPlanRecord } from "@/lib/storage/v2-data-model";
import {
  createActiveTargetRevision,
  readDailyStudyQueue,
  rebuildReviewProfileStateAfterDayReset,
  resolveDailyStudyToday,
  updateDailyStudyDefaults,
  updateDailyStudyTodayGoals,
} from "@/lib/daily-study/runtime-engine";
import {
  getStudyTokenSecret,
  issueServerPromptToken,
  signOpaqueStudyToken,
  verifyOpaqueStudyToken,
  verifyServerPromptToken,
} from "@/lib/daily-study/opaque-token";
import { StudyPromptError } from "@/lib/daily-study/prompt-errors";
import {
  validateRecordStudyRatingCommand,
  validateResetTodayCommand,
} from "@/lib/daily-study/contract";
import type {
  NewQueueCursor,
  RefreshStudyPromptCommand,
  RefreshedStudyPrompt,
  ResetTodayCommand,
  RollbackStudyRatingCommand,
  ReviewQueueCursor,
  ReviewProfile,
  StudyActivityType,
  StudyQueueRequest,
  TrustedStudyQueueQuery,
  UpdateDefaultGoalsCommand,
} from "@/lib/daily-study/types";

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
  options: Readonly<{ forUpdate?: boolean }> = {},
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
      ${options.forUpdate ? "for update" : ""}
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
  reviewProfile: ReviewProfile = "recognition",
) {
  assertPersonContext(context);
  assertDatabaseUuid(vocabularyItemId, "vocabularyItemId");

  const result = await queryable.query<ReviewStateRow>(
    `
      select
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
      from review_states
      where person_id = $1
        and vocabulary_item_id = $2
        and review_profile = $3
      limit 1
    `,
    [context.personId, vocabularyItemId, reviewProfile],
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
        prompt_id,
        person_id,
        vocabulary_item_id,
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

async function listDailyStudyDefaults(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
) {
  assertPersonContext(context);
  const result = await queryable.query<DailyStudyDefaultRow>(
    `
      select person_id, review_profile, review_goal, new_word_goal, timezone, updated_at
      from daily_study_defaults
      where person_id = $1
      order by review_profile asc
    `,
    [context.personId],
  );

  return result.rows.map(mapDailyStudyDefaultRow);
}

async function listDailyStudyPlans(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
) {
  assertPersonContext(context);
  const result = await queryable.query<DailyStudyPlanRow>(
    `
      select
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
      from daily_study_plans
      where person_id = $1
      order by local_date desc, review_profile asc
    `,
    [context.personId],
  );

  return result.rows.map(mapDailyStudyPlanRow);
}

async function listVocabularyCreationFacts(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
) {
  assertPersonContext(context);
  const result = await queryable.query<VocabularyCreationFactRow>(
    `
      select
        id,
        person_id,
        original_vocabulary_item_id,
        source_action_id,
        track_at_creation,
        source_kind,
        history_origin,
        system_created_at
      from vocabulary_creation_facts
      where person_id = $1
      order by system_created_at desc, id desc
    `,
    [context.personId],
  );

  return result.rows.map(mapVocabularyCreationFactRow);
}

async function listVocabularyCreationReversals(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
) {
  assertPersonContext(context);
  const result = await queryable.query<VocabularyCreationReversalRow>(
    `
      select id, person_id, source_action_id, reason, reversed_at
      from vocabulary_creation_reversals
      where person_id = $1
      order by reversed_at desc, id desc
    `,
    [context.personId],
  );

  return result.rows.map(mapVocabularyCreationReversalRow);
}

async function listAiRuns(queryable: PostgresQueryable, context: PersonScopedContext) {
  assertPersonContext(context);
  const result = await queryable.query<AiRunRow>(
    `
      select
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
        terminal_category,
        provider_response_id,
        input_tokens,
        output_tokens,
        thinking_tokens,
        total_tokens,
        latency_ms,
        estimated_cost_usd,
        created_at,
        completed_at
      from ai_runs
      where person_id = $1
      order by created_at desc, id desc
    `,
    [context.personId],
  );

  return result.rows.map(mapAiRunRow);
}

async function listAiEnrichmentDrafts(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
) {
  assertPersonContext(context);
  const result = await queryable.query<AiEnrichmentDraftRow>(
    `
      select
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
      from ai_enrichment_drafts
      where person_id = $1
      order by updated_at desc, id desc
    `,
    [context.personId],
  );

  return result.rows.map(mapAiEnrichmentDraftRow);
}

async function listVocabularyRelations(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
) {
  assertPersonContext(context);
  const result = await queryable.query<VocabularyRelationRow>(
    `
      select
        id,
        person_id,
        source_vocabulary_item_id,
        target_vocabulary_item_id,
        relation_type,
        difference_zh,
        example_pair,
        ai_run_id,
        created_at
      from vocabulary_relations
      where person_id = $1
      order by created_at desc, id desc
    `,
    [context.personId],
  );

  return result.rows.map(mapVocabularyRelationRow);
}

async function listSchema6FormalData(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
) {
  const [
    dailyStudyDefaults,
    dailyStudyPlans,
    vocabularyCreationFacts,
    vocabularyCreationReversals,
    aiRuns,
    aiEnrichmentDrafts,
    vocabularyRelations,
  ] = await Promise.all([
    listDailyStudyDefaults(queryable, context),
    listDailyStudyPlans(queryable, context),
    listVocabularyCreationFacts(queryable, context),
    listVocabularyCreationReversals(queryable, context),
    listAiRuns(queryable, context),
    listAiEnrichmentDrafts(queryable, context),
    listVocabularyRelations(queryable, context),
  ]);

  return {
    dailyStudyDefaults,
    dailyStudyPlans,
    vocabularyCreationFacts,
    vocabularyCreationReversals,
    aiRuns,
    aiEnrichmentDrafts,
    vocabularyRelations,
  };
}

async function buildVocabularyDataSnapshot(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
  now: string,
): Promise<VocabularyData> {
  const person = await selectPerson(queryable, context.personId);
  const [items, importBatches, reviewStates, reviewEvents, settings, schema6] = await Promise.all([
    listVocabularyItems(queryable, context, "all"),
    listImportBatches(queryable, context),
    listReviewStates(queryable, context),
    listReviewEvents(queryable, context),
    getReviewSettings(queryable, context),
    listSchema6FormalData(queryable, context),
  ]);

  return {
    schemaVersion: 6,
    people: [person],
    selectedPersonId: context.personId,
    items,
    importBatches,
    reviewStates,
    reviewEvents,
    settingsByPerson: [settings],
    ...schema6,
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
      const [items, importBatches, reviewStates, reviewEvents, settings, schema6] = await Promise.all([
        listVocabularyItems(queryable, context, "all"),
        listImportBatches(queryable, context),
        listReviewStates(queryable, context),
        listReviewEvents(queryable, context),
        getReviewSettings(queryable, context),
        listSchema6FormalData(queryable, context),
      ]);

      return {
        items,
        importBatches,
        reviewStates,
        reviewEvents,
        settings,
        schema6,
      };
    }),
  );

  return {
    schemaVersion: 6,
    people,
    selectedPersonId: selected,
    items: perPersonData.flatMap((entry) => entry.items),
    importBatches: perPersonData.flatMap((entry) => entry.importBatches),
    reviewStates: perPersonData.flatMap((entry) => entry.reviewStates),
    reviewEvents: perPersonData.flatMap((entry) => entry.reviewEvents),
    settingsByPerson: perPersonData.map((entry) => entry.settings),
    dailyStudyDefaults: perPersonData.flatMap((entry) => entry.schema6.dailyStudyDefaults),
    dailyStudyPlans: perPersonData.flatMap((entry) => entry.schema6.dailyStudyPlans),
    vocabularyCreationFacts: perPersonData.flatMap(
      (entry) => entry.schema6.vocabularyCreationFacts,
    ),
    vocabularyCreationReversals: perPersonData.flatMap(
      (entry) => entry.schema6.vocabularyCreationReversals,
    ),
    aiRuns: perPersonData.flatMap((entry) => entry.schema6.aiRuns),
    aiEnrichmentDrafts: perPersonData.flatMap((entry) => entry.schema6.aiEnrichmentDrafts),
    vocabularyRelations: perPersonData.flatMap(
      (entry) => entry.schema6.vocabularyRelations,
    ),
    updatedAt: now,
  };
}

type StudyCursorClaims = Readonly<{
  personId: string;
  planId: string;
  localDate: string;
  reviewProfile: ReviewProfile;
  activityType: StudyActivityType;
  zone: "review" | "new";
  expectedPlanVersion: number;
  cursor: NewQueueCursor | ReviewQueueCursor;
}>;

function hasDailyDefault(
  data: VocabularyData,
  personId: string,
  reviewProfile: ReviewProfile,
) {
  return data.dailyStudyDefaults.some(
    (defaults) =>
      defaults.personId === personId && defaults.reviewProfile === reviewProfile,
  );
}

function hasDailyPlan(
  data: VocabularyData,
  personId: string,
  reviewProfile: ReviewProfile,
  localDate: string,
) {
  return data.dailyStudyPlans.some(
    (plan) =>
      plan.personId === personId &&
      plan.reviewProfile === reviewProfile &&
      plan.localDate === localDate,
  );
}

async function insertResolvedDailyStudyRows(
  queryable: PostgresQueryable,
  before: VocabularyData,
  after: VocabularyData,
  personId: string,
) {
  for (const defaults of after.dailyStudyDefaults.filter(
    (entry) =>
      entry.personId === personId &&
      !hasDailyDefault(before, personId, entry.reviewProfile),
  )) {
    await queryable.query(
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
        on conflict (person_id, review_profile) do nothing
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

  for (const plan of after.dailyStudyPlans.filter(
    (entry) =>
      entry.personId === personId &&
      !hasDailyPlan(before, personId, entry.reviewProfile, entry.localDate),
  )) {
    await queryable.query(
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
        on conflict (person_id, review_profile, local_date) do nothing
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
}

export async function resolvePostgresDailyStudyToday(
  personId: string,
  now = new Date().toISOString(),
) {
  assertDatabaseUuid(personId, "personId");
  const queryable = getPostgresPool();
  const before = await buildVocabularyDataSnapshot(
    queryable,
    { personId },
    now,
  );

  const provisional = resolveDailyStudyToday(before, now, { makePlanId: randomUUID });

  if (provisional.data === before) {
    return provisional;
  }

  await withPostgresTransaction((client) =>
    insertResolvedDailyStudyRows(client, before, provisional.data, personId),
  );

  const persisted = await buildVocabularyDataSnapshot(
    queryable,
    { personId },
    now,
  );
  return resolveDailyStudyToday(persisted, now, { makePlanId: randomUUID });
}

function assertCursorBinding(
  claims: StudyCursorClaims,
  request: StudyQueueRequest,
) {
  if (
    claims.personId !== request.personId ||
    claims.planId !== request.planId ||
    claims.localDate !== request.localDate ||
    claims.reviewProfile !== request.reviewProfile ||
    claims.activityType !==
      (request.activityType ??
        (request.reviewProfile === "recognition" ? "recognition_card" : null)) ||
    claims.zone !== request.zone ||
    claims.expectedPlanVersion !== request.expectedPlanVersion
  ) {
    throw new Error("Study cursor does not match the requested plan and zone");
  }
}

export async function readPostgresDailyStudyQueue(
  request: StudyQueueRequest,
  now = new Date().toISOString(),
  secret = getStudyTokenSecret(),
) {
  const resolved = await resolvePostgresDailyStudyToday(request.personId, now);
  const activityType =
    request.activityType ??
    (request.reviewProfile === "recognition" ? "recognition_card" : null);

  if (!activityType) {
    throw new Error("Active queue requests require an activityType");
  }
  let cursor: NewQueueCursor | ReviewQueueCursor | null = null;

  if (request.cursorToken) {
    const envelope = verifyOpaqueStudyToken<StudyCursorClaims>(
      request.cursorToken,
      "cursor",
      now,
      secret,
    );
    assertCursorBinding(envelope.claims, request);
    cursor = envelope.claims.cursor;
  }

  const trustedQuery = {
    personId: request.personId,
    planId: request.planId,
    localDate: request.localDate,
    reviewProfile: request.reviewProfile,
    activityType,
    expectedPlanVersion: request.expectedPlanVersion,
    requestedPageSize: request.requestedPageSize,
    zone: request.zone,
    cursor,
  } as TrustedStudyQueueQuery;
  const page = readDailyStudyQueue(
    resolved.data,
    trustedQuery,
    (seed) => issueServerPromptToken(seed, now, secret).promptToken,
  );
  const nextCursorToken = page.nextCursor
    ? signOpaqueStudyToken(
        {
          version: 1,
          kind: "cursor",
          expiresAt: new Date(new Date(now).getTime() + 15 * 60 * 1000).toISOString(),
          claims: {
            personId: request.personId,
            planId: request.planId,
            localDate: request.localDate,
            reviewProfile: request.reviewProfile,
            activityType,
            zone: request.zone,
            expectedPlanVersion: request.expectedPlanVersion,
            cursor: page.nextCursor,
          } satisfies StudyCursorClaims,
        },
        secret,
      )
    : null;

  return {
    zone: page.zone,
    entries: page.entries,
    nextCursorToken,
  };
}

export async function refreshPostgresDailyStudyPrompt(
  command: RefreshStudyPromptCommand,
  now = new Date().toISOString(),
  secret = getStudyTokenSecret(),
): Promise<RefreshedStudyPrompt> {
  assertDatabaseUuid(command.personId, "personId");
  const trustedPrompt = verifyServerPromptToken(
    command.promptToken,
    now,
    secret,
    { allowExpired: true },
  );

  if (trustedPrompt.personId !== command.personId) {
    throw new StudyPromptError(
      "prompt_stale",
      "This study card does not match the selected learner.",
    );
  }

  const resolved = await resolvePostgresDailyStudyToday(command.personId, now);
  const plan = resolved.data.dailyStudyPlans.find(
    (candidate) =>
      candidate.id === trustedPrompt.planId &&
      candidate.personId === command.personId &&
      candidate.localDate === trustedPrompt.localDate &&
      candidate.reviewProfile === trustedPrompt.reviewProfile &&
      candidate.planVersion === trustedPrompt.planVersion,
  );
  const item = resolved.data.items.find(
    (candidate) =>
      candidate.id === trustedPrompt.vocabularyItemId &&
      candidate.personId === command.personId &&
      candidate.learningTrack === trustedPrompt.reviewProfile &&
      candidate.status !== "archived" &&
      candidate.archivedAt === null,
  );
  const nowTime = new Date(now).getTime();

  if (
    !plan ||
    !item ||
    (trustedPrompt.reviewProfile === "active" &&
      createActiveTargetRevision(item) !== trustedPrompt.targetRevision) ||
    nowTime < new Date(plan.dayStartsAt).getTime() ||
    nowTime >= new Date(plan.dayEndsAt).getTime()
  ) {
    throw new StudyPromptError(
      "prompt_stale",
      "This study card no longer belongs to the current plan.",
    );
  }

  return withPostgresTransaction(async (client) => {
    const lockedPlan = await client.query<{ id: string }>(
      `
        select id
        from daily_study_plans
        where person_id = $1 and id = $2 and plan_version = $3
        for update
      `,
      [command.personId, plan.id, plan.planVersion],
    );

    if (!lockedPlan.rows[0]) {
      throw new StudyPromptError(
        "prompt_stale",
        "This study card no longer belongs to the current plan.",
      );
    }

    const consumed = await client.query<{ idempotency_key: string }>(
      `
        select idempotency_key
        from study_command_idempotency
        where person_id = $1
          and command_type = 'record_rating'
          and status = 'succeeded'
          and result_json ->> 'promptId' = $2
        limit 1
      `,
      [command.personId, trustedPrompt.promptId],
    );

    if (consumed.rows[0]) {
      throw new StudyPromptError(
        "prompt_consumed",
        "This study card was already saved.",
      );
    }

    const seed =
      trustedPrompt.reviewProfile === "recognition"
        ? {
            personId: trustedPrompt.personId,
            planId: trustedPrompt.planId,
            planVersion: trustedPrompt.planVersion,
            localDate: trustedPrompt.localDate,
            vocabularyItemId: trustedPrompt.vocabularyItemId,
            reviewProfile: "recognition" as const,
            activityType: "recognition_card" as const,
            targetRevision: null,
          }
        : {
            personId: trustedPrompt.personId,
            planId: trustedPrompt.planId,
            planVersion: trustedPrompt.planVersion,
            localDate: trustedPrompt.localDate,
            vocabularyItemId: trustedPrompt.vocabularyItemId,
            reviewProfile: "active" as const,
            activityType: trustedPrompt.activityType,
            targetRevision: trustedPrompt.targetRevision,
          };

    return {
      promptToken: issueServerPromptToken(
        seed,
        now,
        secret,
        { promptId: trustedPrompt.promptId },
      ).promptToken,
      refreshedFromExpired:
        new Date(trustedPrompt.expiresAt).getTime() <= nowTime,
    };
  });
}

export async function updatePostgresDailyStudyTodayGoals(
  input: unknown,
  now = new Date().toISOString(),
) {
  const snapshot = await getPostgresVocabularyDataSnapshot(
    typeof input === "object" && input !== null && "personId" in input
      ? String(input.personId)
      : null,
    now,
  );
  const updated = updateDailyStudyTodayGoals(snapshot, input, now);

  if (updated.data === snapshot) {
    return resolvePostgresDailyStudyToday(updated.plan.personId, now);
  }

  const result = await getPostgresPool().query<DailyStudyPlanRow>(
    `
      update daily_study_plans
      set
        review_goal = $1,
        new_word_goal = $2,
        plan_version = plan_version + 1,
        updated_at = $3
      where person_id = $4
        and id = $5
        and local_date = $6
        and review_profile = $7
        and plan_version = $8
      returning
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
    `,
    [
      updated.plan.reviewGoal,
      updated.plan.newWordGoal,
      now,
      updated.plan.personId,
      updated.plan.id,
      updated.plan.localDate,
      updated.plan.reviewProfile,
      updated.plan.planVersion - 1,
    ],
  );

  if (!result.rows[0]) {
    throw new Error("Today’s goals changed elsewhere. Reload and try again.");
  }

  return resolvePostgresDailyStudyToday(updated.plan.personId, now);
}

export async function updatePostgresDailyStudyDefaults(
  input: Readonly<{
    personId: string;
    timezone: string;
    goals: readonly UpdateDefaultGoalsCommand[];
  }>,
  now = new Date().toISOString(),
) {
  assertDatabaseUuid(input.personId, "personId");
  const snapshot = await getPostgresVocabularyDataSnapshot(input.personId, now);
  const next = updateDailyStudyDefaults(snapshot, input, now);
  const defaults = next.dailyStudyDefaults.filter(
    (entry) => entry.personId === input.personId,
  );
  const settings = next.settingsByPerson.find(
    (entry) => entry.personId === input.personId,
  );

  if (!settings || defaults.length !== 2) {
    throw new Error("Daily defaults could not be resolved for this learner");
  }

  await withPostgresTransaction(async (client) => {
    for (const entry of defaults) {
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
          on conflict (person_id, review_profile)
          do update set
            review_goal = excluded.review_goal,
            new_word_goal = excluded.new_word_goal,
            timezone = excluded.timezone,
            updated_at = excluded.updated_at
        `,
        [
          entry.personId,
          entry.reviewProfile,
          entry.reviewGoal,
          entry.newWordGoal,
          entry.timezone,
          entry.updatedAt,
        ],
      );
    }

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
        on conflict (person_id)
        do update set
          timezone = excluded.timezone,
          updated_at = excluded.updated_at
      `,
      [
        input.personId,
        settings.sessionLimit,
        settings.recognitionSessionLimit,
        settings.activeSessionLimit,
        settings.timezone,
        now,
      ],
    );
  });

  return resolvePostgresDailyStudyToday(input.personId, now);
}

type StudyCommandRow = {
  person_id: string;
  local_date: string | Date;
  command_type: "record_rating" | "reset_today" | "rollback_event";
  idempotency_key: string;
  canonical_request_hash: string;
  status: "in_progress" | "succeeded" | "failed";
  result_json: Record<string, unknown> | null;
  error_code: string | null;
  created_at: string | Date;
  expires_at: string | Date;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }

  return value;
}

function hashStudyCommand(command: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(command)))
    .digest("hex");
}

async function beginStudyCommand(
  queryable: PostgresQueryable,
  input: Readonly<{
    personId: string;
    localDate: string;
    commandType: "record_rating" | "reset_today";
    idempotencyKey: string;
    canonicalRequestHash: string;
    now: string;
  }>,
): Promise<Record<string, unknown> | null> {
  const expiresAt = new Date(new Date(input.now).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const inserted = await queryable.query<StudyCommandRow>(
    `
      insert into study_command_idempotency (
        person_id,
        local_date,
        command_type,
        idempotency_key,
        canonical_request_hash,
        status,
        result_json,
        error_code,
        created_at,
        expires_at
      )
      values ($1, $2, $3, $4, $5, 'in_progress', null, null, $6, $7)
      on conflict (person_id, command_type, idempotency_key) do nothing
      returning *
    `,
    [
      input.personId,
      input.localDate,
      input.commandType,
      input.idempotencyKey,
      input.canonicalRequestHash,
      input.now,
      expiresAt,
    ],
  );

  if (inserted.rows[0]) {
    return null;
  }

  const existingResult = await queryable.query<StudyCommandRow>(
    `
      select *
      from study_command_idempotency
      where person_id = $1
        and command_type = $2
        and idempotency_key = $3
      for update
    `,
    [input.personId, input.commandType, input.idempotencyKey],
  );
  const existing = existingResult.rows[0];

  if (!existing) {
    throw new Error("Study command idempotency row disappeared during validation");
  }

  if (new Date(existing.expires_at).getTime() <= new Date(input.now).getTime()) {
    await queryable.query(
      `
        update study_command_idempotency
        set
          local_date = $4,
          canonical_request_hash = $5,
          status = 'in_progress',
          result_json = null,
          error_code = null,
          created_at = $6,
          expires_at = $7
        where person_id = $1
          and command_type = $2
          and idempotency_key = $3
      `,
      [
        input.personId,
        input.commandType,
        input.idempotencyKey,
        input.localDate,
        input.canonicalRequestHash,
        input.now,
        expiresAt,
      ],
    );
    return null;
  }

  if (existing.canonical_request_hash !== input.canonicalRequestHash) {
    throw new Error("The Idempotency Key was already used with a different request");
  }

  if (existing.status === "succeeded" && existing.result_json) {
    return existing.result_json;
  }

  if (existing.status === "failed") {
    throw new Error(existing.error_code ?? "The earlier study command failed");
  }

  throw new Error("The same study command is already in progress");
}

async function completeStudyCommand(
  queryable: PostgresQueryable,
  input: Readonly<{
    personId: string;
    commandType: "record_rating" | "reset_today";
    idempotencyKey: string;
    result: Record<string, unknown>;
  }>,
) {
  await queryable.query(
    `
      update study_command_idempotency
      set status = 'succeeded', result_json = $4::jsonb, error_code = null
      where person_id = $1
        and command_type = $2
        and idempotency_key = $3
        and status = 'in_progress'
    `,
    [
      input.personId,
      input.commandType,
      input.idempotencyKey,
      JSON.stringify(input.result),
    ],
  );
}

type StudyReviewCommand = RecordReviewCommand &
  Readonly<{
    reviewProfile: ReviewProfile;
    activityType: ReviewActivityType;
    answerOutcome: ReviewAnswerOutcome;
    answerNormalizationVersion: "active-answer-v1" | null;
    targetRevision: string | null;
  }>;

function parameterSetIdForProfile(reviewProfile: ReviewProfile) {
  return reviewProfile === "recognition"
    ? RECOGNITION_PARAMETER_SET_ID
    : ACTIVE_PARAMETER_SET_ID;
}

async function recordStudyReviewInTransaction(
  queryable: PostgresQueryable,
  command: StudyReviewCommand,
  plan?: DailyStudyPlanRecord,
) {
  const item = await selectVocabularyItem(queryable, command, command.vocabularyItemId);

  if (
    !item ||
    item.status === "archived" ||
    item.archivedAt ||
    item.learningTrack !== command.reviewProfile
  ) {
    throw new Error(`Reviewable vocabulary item not found: ${command.vocabularyItemId}`);
  }

  const previousState = await getReviewState(
    queryable,
    command,
    command.vocabularyItemId,
    command.reviewProfile,
  );
  const priorEpisodeEvents = plan
    ? getDailyEpisodeEvents(
        await listReviewEventsForVocabularyItem(
          queryable,
          command,
          command.vocabularyItemId,
          command.reviewProfile,
        ),
        plan,
        command.vocabularyItemId,
        await listDailyStudyPlans(queryable, command),
      )
    : [];
  const episodeSchedule = plan
    ? scheduleDailyEpisodeAttempt({
        previousState: previousState ?? undefined,
        priorEpisodeEvents,
        rating: command.rating,
        reviewedAt: command.reviewedAt,
        plan,
      })
    : null;
  const scheduled =
    episodeSchedule?.schedule ??
    scheduleNextReviewForProfile(
      command.reviewProfile,
      previousState ?? undefined,
      command.rating,
      command.reviewedAt,
    );
  const elapsedMs =
    command.elapsedMs === null || command.elapsedMs === undefined
      ? 0
      : Math.max(0, Math.round(command.elapsedMs));

  if (elapsedMs > 90_000_000) {
    throw new Error("elapsedMs must not exceed 90000000");
  }

  const nextState: ReviewState =
    episodeSchedule && !episodeSchedule.isSchedulingAnchor
      ? previousState!
      : {
          id: previousState?.id ?? randomUUID(),
          personId: command.personId,
          vocabularyItemId: command.vocabularyItemId,
          reviewProfile: command.reviewProfile,
          parameterSetId: parameterSetIdForProfile(command.reviewProfile),
          firstRatedAt:
            previousState?.historyOrigin === "legacy_unknown"
              ? null
              : previousState?.firstRatedAt ?? command.reviewedAt,
          historyOrigin:
            previousState?.historyOrigin === "legacy_unknown"
              ? "legacy_unknown"
              : "recorded",
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
  const eventResult = await queryable.query<ReviewEventRow>(
    `
      insert into review_events (
        id,
        prompt_id,
        person_id,
        vocabulary_item_id,
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
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      returning
        id,
        prompt_id,
        person_id,
        vocabulary_item_id,
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
    `,
    [
      randomUUID(),
      command.promptId ?? null,
      command.personId,
      command.vocabularyItemId,
      command.reviewProfile,
      command.activityType,
      command.answerOutcome,
      command.answerNormalizationVersion,
      command.targetRevision,
      parameterSetIdForProfile(command.reviewProfile),
      command.reviewedAt,
      command.rating,
      previousState?.dueAt ?? null,
      scheduled.dueAt,
      previousState?.intervalMinutes ?? null,
      scheduled.intervalMinutes,
      elapsedMs,
    ],
  );
  const state = await upsertReviewState(queryable, nextState);

  return {
    event: mapReviewEventRow(eventResult.rows[0]),
    state,
  };
}

async function recordRecognitionReviewInTransaction(
  queryable: PostgresQueryable,
  command: RecordReviewCommand,
  plan?: DailyStudyPlanRecord,
) {
  return recordStudyReviewInTransaction(
    queryable,
    {
      ...command,
      reviewProfile: "recognition",
      activityType: "recognition_card",
      answerOutcome: "self_rated",
      answerNormalizationVersion: null,
      targetRevision: null,
    },
    plan,
  );
}

export async function recordPostgresDailyStudyRating(
  input: unknown,
  now = new Date().toISOString(),
  secret = getStudyTokenSecret(),
) {
  if (!input || typeof input !== "object" || !("personId" in input)) {
    throw new Error("Rating command is required");
  }

  const personId = String(input.personId);
  assertDatabaseUuid(personId, "personId");
  const resolved = await resolvePostgresDailyStudyToday(personId, now);
  const promptToken = "promptToken" in input ? String(input.promptToken) : "";
  const trustedPrompt = verifyServerPromptToken(promptToken, now, secret);
  const plan = resolved.data.dailyStudyPlans.find(
    (candidate) =>
      candidate.id === trustedPrompt.planId &&
      candidate.personId === personId &&
      candidate.localDate === trustedPrompt.localDate &&
      candidate.reviewProfile === trustedPrompt.reviewProfile,
  );

  if (!plan) {
    throw new Error("Rating command plan could not be resolved");
  }

  const item = resolved.data.items.find(
    (candidate) =>
      candidate.id === trustedPrompt.vocabularyItemId &&
      candidate.personId === personId &&
      candidate.learningTrack === trustedPrompt.reviewProfile &&
      candidate.status !== "archived" &&
      candidate.archivedAt === null,
  );

  if (!item) {
    throw new Error("Rating command vocabulary item could not be resolved");
  }

  const nowTime = new Date(now).getTime();

  if (
    nowTime < new Date(plan.dayStartsAt).getTime() ||
    nowTime >= new Date(plan.dayEndsAt).getTime()
  ) {
    throw new Error("Rating command belongs to a closed daily plan");
  }

  const validated = validateRecordStudyRatingCommand(input, {
    window: {
      planId: plan.id,
      planVersion: plan.planVersion,
      personId: plan.personId,
      reviewProfile: plan.reviewProfile,
      localDate: plan.localDate,
      timezone: plan.timezone,
      dayStartsAt: plan.dayStartsAt,
      dayEndsAt: plan.dayEndsAt,
      reviewGoal: plan.reviewGoal,
      newWordGoal: plan.newWordGoal,
    },
    trustedPrompt,
    currentTargetRevision:
      trustedPrompt.reviewProfile === "active"
        ? createActiveTargetRevision(item)
        : null,
    consumedByIdempotencyKey: null,
    now,
  });
  const command = validated.command;
  const canonicalRequestHash = hashStudyCommand(command);

  return withPostgresTransaction(async (client) => {
    const replay = await beginStudyCommand(client, {
      personId: command.personId,
      localDate: command.localDate,
      commandType: "record_rating",
      idempotencyKey: command.idempotencyKey,
      canonicalRequestHash,
      now,
    });

    if (replay) {
      return replay;
    }

    const lockedPlan = await client.query<{ id: string }>(
      `
        select id
        from daily_study_plans
        where person_id = $1 and id = $2 and plan_version = $3
        for update
      `,
      [command.personId, command.planId, trustedPrompt.planVersion],
    );

    if (!lockedPlan.rows[0]) {
      throw new StudyPromptError(
        "prompt_stale",
        "Rating command plan is stale",
      );
    }

    const consumed = await client.query<{ idempotency_key: string }>(
      `
        select idempotency_key
        from study_command_idempotency
        where person_id = $1
          and command_type = 'record_rating'
          and status = 'succeeded'
          and result_json ->> 'promptId' = $2
          and idempotency_key <> $3
        limit 1
      `,
      [command.personId, validated.promptId, command.idempotencyKey],
    );

    if (consumed.rows[0]) {
      throw new StudyPromptError(
        "prompt_consumed",
        "The prompt was already consumed by another rating command",
      );
    }

    const lockedItem = await selectVocabularyItem(
      client,
      { personId: command.personId },
      command.vocabularyItemId,
      { forUpdate: true },
    );

    if (
      !lockedItem ||
      lockedItem.learningTrack !== command.evidence.reviewProfile ||
      (command.evidence.reviewProfile === "active" &&
        createActiveTargetRevision(lockedItem) !== validated.targetRevision)
    ) {
      throw new StudyPromptError(
        "prompt_stale",
        "The study target changed after this card was shown",
      );
    }

    const result = await recordStudyReviewInTransaction(
      client,
      {
        personId: command.personId,
        vocabularyItemId: command.vocabularyItemId,
        rating: command.evidence.memoryRating,
        elapsedMs: command.evidence.elapsedMs,
        reviewedAt: now,
        promptId: validated.promptId,
        reviewProfile: command.evidence.reviewProfile,
        activityType: command.evidence.activityType,
        answerOutcome: command.evidence.answerOutcome,
        answerNormalizationVersion:
          command.evidence.answerNormalizationVersion,
        targetRevision: validated.targetRevision,
      },
      plan,
    );
    const repeatPromptToken =
      command.evidence.memoryRating === "forgot" ||
      command.evidence.memoryRating === "hard"
        ? issueServerPromptToken(
            command.evidence.reviewProfile === "recognition"
              ? {
                  personId: command.personId,
                  planId: command.planId,
                  planVersion: trustedPrompt.planVersion,
                  localDate: command.localDate,
                  vocabularyItemId: command.vocabularyItemId,
                  reviewProfile: "recognition",
                  activityType: "recognition_card",
                  targetRevision: null,
                }
              : {
                  personId: command.personId,
                  planId: command.planId,
                  planVersion: trustedPrompt.planVersion,
                  localDate: command.localDate,
                  vocabularyItemId: command.vocabularyItemId,
                  reviewProfile: "active",
                  activityType: command.evidence.activityType,
                  targetRevision: validated.targetRevision!,
                },
            now,
            secret,
          ).promptToken
        : null;
    const storedResult = {
      promptId: validated.promptId,
      event: result.event,
      state: result.state,
      repeatPromptToken,
    };

    await completeStudyCommand(client, {
      personId: command.personId,
      commandType: "record_rating",
      idempotencyKey: command.idempotencyKey,
      result: storedResult,
    });

    return storedResult;
  });
}

export async function rollbackPostgresDailyStudyRating(
  command: RollbackStudyRatingCommand,
  now = new Date().toISOString(),
  secret = getStudyTokenSecret(),
) {
  assertDatabaseUuid(command.personId, "personId");
  assertDatabaseUuid(command.planId, "planId");
  assertDatabaseUuid(command.eventId, "eventId");
  assertDatabaseUuid(command.vocabularyItemId, "vocabularyItemId");
  const resolved = await resolvePostgresDailyStudyToday(command.personId, now);
  const plan = resolved.data.dailyStudyPlans.find(
    (candidate) =>
      candidate.personId === command.personId &&
      candidate.id === command.planId &&
      candidate.localDate === command.localDate &&
      candidate.planVersion === command.expectedPlanVersion,
  );

  if (!plan) {
    throw new Error("The study plan changed. Start this zone again.");
  }

  const event = resolved.data.reviewEvents.find(
    (candidate) =>
      candidate.id === command.eventId &&
      candidate.personId === command.personId &&
      candidate.vocabularyItemId === command.vocabularyItemId &&
      candidate.reviewProfile === plan.reviewProfile &&
      new Date(candidate.reviewedAt).getTime() >= new Date(plan.dayStartsAt).getTime() &&
      new Date(candidate.reviewedAt).getTime() < new Date(plan.dayEndsAt).getTime(),
  );

  if (!event) {
    throw new Error("Only a rating from this study day can be returned");
  }

  const rollback = await rollbackReviewEvent(
    { personId: command.personId, now, timezone: plan.timezone },
    command.eventId,
    resolved.data.dailyStudyPlans,
    plan.reviewProfile,
  );
  const item = resolved.data.items.find(
    (candidate) =>
      candidate.id === command.vocabularyItemId &&
      candidate.personId === command.personId &&
      candidate.learningTrack === event.reviewProfile &&
      candidate.status !== "archived" &&
      candidate.archivedAt === null,
  );

  if (event.reviewProfile === "active" && !item) {
    throw new Error("This Active entry is no longer available");
  }
  const promptToken = issueServerPromptToken(
    event.reviewProfile === "recognition"
      ? {
          personId: command.personId,
          planId: command.planId,
          planVersion: command.expectedPlanVersion,
          localDate: command.localDate,
          vocabularyItemId: command.vocabularyItemId,
          reviewProfile: "recognition",
          activityType: "recognition_card",
          targetRevision: null,
        }
      : {
          personId: command.personId,
          planId: command.planId,
          planVersion: command.expectedPlanVersion,
          localDate: command.localDate,
          vocabularyItemId: command.vocabularyItemId,
          reviewProfile: "active",
          activityType: event.activityType as "say" | "spell" | "dictation",
          targetRevision: createActiveTargetRevision(item!),
        },
    now,
    secret,
  ).promptToken;

  return { ...rollback, promptToken };
}

export async function resetPostgresDailyStudyToday(
  input: unknown,
  now = new Date().toISOString(),
) {
  const command = validateResetTodayCommand(input);
  assertDatabaseUuid(command.personId, "personId");
  assertDatabaseUuid(command.planId, "planId");
  const resolved = await resolvePostgresDailyStudyToday(command.personId, now);

  if (command.localDate !== resolved.today.localDate) {
    throw new Error("Reset command does not belong to the current person-day");
  }

  const plan = resolved.data.dailyStudyPlans.find(
    (candidate) =>
      candidate.personId === command.personId &&
      candidate.id === command.planId &&
      candidate.localDate === command.localDate,
  );

  if (!plan) {
    throw new Error("Today’s plan could not be found");
  }

  const result = await resetTodayReview(
    {
      personId: command.personId,
      now,
      timezone: plan.timezone,
    },
    {
      planId: command.planId,
      localDate: command.localDate,
      dayStartsAt: plan.dayStartsAt,
      dayEndsAt: plan.dayEndsAt,
      idempotencyKey: command.idempotencyKey,
      canonicalRequestHash: hashStudyCommand(command as ResetTodayCommand),
    },
  );
  const refreshed = await resolvePostgresDailyStudyToday(command.personId, now);

  return {
    ...result,
    today: refreshed.today,
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

    for (const defaults of createDailyStudyDefaults(person.id, settings)) {
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

async function insertVocabularyCreationFact(
  queryable: PostgresQueryable,
  item: VocabularyItem,
  sourceActionId?: string,
) {
  const fact = {
    ...buildVocabularyCreationRecord(item, { sourceActionId }),
    creationFactId: randomUUID(),
  };
  assertDatabaseUuid(fact.sourceActionId, "sourceActionId");

  await queryable.query(
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
      fact.creationFactId,
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

async function vocabularyItemHasReviewHistory(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
  vocabularyItemId: string,
) {
  assertPersonContext(context);
  assertDatabaseUuid(vocabularyItemId, "vocabularyItemId");

  const result = await queryable.query<{ has_review_history: boolean }>(
    `
      select exists (
        select 1
        from review_states
        where person_id = $1 and vocabulary_item_id = $2
        union all
        select 1
        from review_events
        where person_id = $1 and vocabulary_item_id = $2
      ) as has_review_history
    `,
    [context.personId, vocabularyItemId],
  );

  return result.rows[0]?.has_review_history ?? false;
}

async function vocabularyItemHasReviewHistoryForProfile(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
  vocabularyItemId: string,
  reviewProfile: ReviewProfile,
) {
  assertPersonContext(context);
  assertDatabaseUuid(vocabularyItemId, "vocabularyItemId");

  const result = await queryable.query<{ has_review_history: boolean }>(
    `
      select exists (
        select 1
        from review_states
        where person_id = $1
          and vocabulary_item_id = $2
          and review_profile = $3
        union all
        select 1
        from review_events
        where person_id = $1
          and vocabulary_item_id = $2
          and review_profile = $3
      ) as has_review_history
    `,
    [context.personId, vocabularyItemId, reviewProfile],
  );

  return result.rows[0]?.has_review_history ?? false;
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
    const creationFactResult = await client.query<{ exists: boolean }>(
      `
        select exists (
          select 1
          from vocabulary_creation_facts
          where person_id = $1
            and source_action_id = $2
            and source_kind = 'batch'
        ) as exists
      `,
      [context.personId, importBatchId],
    );
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

    if (creationFactResult.rows[0]?.exists) {
      await client.query(
        `
          insert into vocabulary_creation_reversals (
            id,
            person_id,
            source_action_id,
            reason,
            reversed_at
          )
          values ($1, $2, $3, 'batch_rollback', $4)
        `,
        [randomUUID(), context.personId, importBatchId, context.now],
      );
    }

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

async function upsertReviewState(queryable: PostgresQueryable, state: ReviewState) {
  const stateResult = await queryable.query<ReviewStateRow>(
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
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16
      )
      on conflict (person_id, vocabulary_item_id, review_profile)
      do update set
        parameter_set_id = excluded.parameter_set_id,
        first_rated_at = excluded.first_rated_at,
        history_origin = excluded.history_origin,
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

  return mapReviewStateRow(stateResult.rows[0]);
}

async function listReviewEventsForVocabularyItem(
  queryable: PostgresQueryable,
  context: PersonScopedContext,
  vocabularyItemId: string,
  reviewProfile: ReviewProfile = "recognition",
) {
  assertPersonContext(context);
  assertDatabaseUuid(vocabularyItemId, "vocabularyItemId");

  const result = await queryable.query<ReviewEventRow>(
    `
      select
        id,
        prompt_id,
        person_id,
        vocabulary_item_id,
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
      from review_events
      where person_id = $1
        and vocabulary_item_id = $2
        and review_profile = $3
      order by reviewed_at asc, id asc
    `,
    [context.personId, vocabularyItemId, reviewProfile],
  );

  return result.rows.map(mapReviewEventRow);
}

type DailyResetOptions = Readonly<{
  planId: string;
  localDate: string;
  dayStartsAt: string;
  dayEndsAt: string;
  idempotencyKey: string;
  canonicalRequestHash: string;
}>;

async function resetTodayReview(
  context: TimestampedPersonContext,
  options?: DailyResetOptions,
): Promise<ResetTodayReviewResult> {
  assertPersonContext(context);

  return withPostgresTransaction(async (client) => {
    let dailyStudyPlans: DailyStudyPlanRecord[] = [];

    if (options) {
      const plans = await client.query<DailyStudyPlanRow>(
        `
          select
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
          from daily_study_plans
          where person_id = $1 and local_date = $2
          order by review_profile asc
          for update
        `,
        [context.personId, options.localDate],
      );
      const mappedPlans = plans.rows.map(mapDailyStudyPlanRow);
      const anchor = mappedPlans.find((plan) => plan.id === options.planId);

      if (
        mappedPlans.length !== 2 ||
        !anchor ||
        mappedPlans.some(
          (plan) =>
            plan.dayStartsAt !== options.dayStartsAt ||
            plan.dayEndsAt !== options.dayEndsAt ||
            plan.timezone !== anchor.timezone,
        )
      ) {
        throw new Error("Today’s Track plans are incomplete or no longer match");
      }

      dailyStudyPlans = await listDailyStudyPlans(client, context);

      const replay = await beginStudyCommand(client, {
        personId: context.personId,
        localDate: options.localDate,
        commandType: "reset_today",
        idempotencyKey: options.idempotencyKey,
        canonicalRequestHash: options.canonicalRequestHash,
        now: context.now,
      });

      if (replay) {
        return {
          resetEventsCount: Number(replay.resetEventsCount ?? 0),
          resetItemsCount: Number(replay.resetItemsCount ?? 0),
        };
      }
    }

    const settings = await getReviewSettings(client, context);
    const todayKey = getLocalDateKey(context.now, settings.timezone);
    const events = await listReviewEvents(client, context);
    const isTargetEvent = (event: ReviewEvent) =>
      options
        ? new Date(event.reviewedAt).getTime() >= new Date(options.dayStartsAt).getTime() &&
          new Date(event.reviewedAt).getTime() < new Date(options.dayEndsAt).getTime()
        : getLocalDateKey(event.reviewedAt, settings.timezone) === todayKey;

    const todayEvents = events.filter(
      (event) =>
        isTargetEvent(event) &&
        (options ? true : event.reviewProfile === "recognition"),
    );
    const affectedScopes = new Map<
      string,
      { reviewProfile: ReviewProfile; vocabularyItemId: string }
    >();

    for (const event of todayEvents) {
      affectedScopes.set(`${event.reviewProfile}\u0000${event.vocabularyItemId}`, {
        reviewProfile: event.reviewProfile,
        vocabularyItemId: event.vocabularyItemId,
      });
    }
    const affectedItemIds = Array.from(
      new Set(todayEvents.map((event) => event.vocabularyItemId)),
    );

    if (!todayEvents.length) {
      if (options) {
        await completeStudyCommand(client, {
          personId: context.personId,
          commandType: "reset_today",
          idempotencyKey: options.idempotencyKey,
          result: { resetEventsCount: 0, resetItemsCount: 0 },
        });
      }

      return {
        resetEventsCount: 0,
        resetItemsCount: 0,
      };
    }

    const previousStateByScope = new Map(
      await Promise.all(
        Array.from(affectedScopes.entries()).map(
          async ([scopeKey, { reviewProfile, vocabularyItemId }]) =>
            [
              scopeKey,
              await getReviewState(
                client,
                context,
                vocabularyItemId,
                reviewProfile,
              ),
            ] as const,
        ),
      ),
    );

    await client.query(
      `
        delete from review_events
        where person_id = $1 and id = any($2::uuid[])
      `,
      [context.personId, todayEvents.map((event) => event.id)],
    );
    const affectedScopeRecords = Array.from(affectedScopes.values());

    await client.query(
      `
        delete from review_states
        using unnest($2::uuid[], $3::text[]) as scope(vocabulary_item_id, review_profile)
        where review_states.person_id = $1
          and review_states.vocabulary_item_id = scope.vocabulary_item_id
          and review_states.review_profile = scope.review_profile
      `,
      [
        context.personId,
        affectedScopeRecords.map((scope) => scope.vocabularyItemId),
        affectedScopeRecords.map((scope) => scope.reviewProfile),
      ],
    );

    for (const [scopeKey, { reviewProfile, vocabularyItemId }] of affectedScopes) {
      const earlierEvents = events
        .filter(
          (event) =>
            event.vocabularyItemId === vocabularyItemId &&
            event.reviewProfile === reviewProfile &&
            !isTargetEvent(event),
        )
        .sort(sortReviewEventsByReviewedAt);
      const rebuiltState = rebuildReviewProfileStateAfterDayReset(
        reviewProfile,
        context.personId,
        vocabularyItemId,
        previousStateByScope.get(scopeKey) ?? undefined,
        earlierEvents,
        todayEvents.filter(
          (event) =>
            event.reviewProfile === reviewProfile &&
            event.vocabularyItemId === vocabularyItemId,
        ),
        context.now,
        { dailyStudyPlans, makeStateId: randomUUID },
      );

      if (rebuiltState) {
        await upsertReviewState(client, rebuiltState);
      }
    }

    const result = {
      resetEventsCount: todayEvents.length,
      resetItemsCount: affectedItemIds.length,
    };

    if (options) {
      await completeStudyCommand(client, {
        personId: context.personId,
        commandType: "reset_today",
        idempotencyKey: options.idempotencyKey,
        result,
      });
    }

    return result;
  });
}

async function rollbackReviewEvent(
  context: TimestampedPersonContext,
  reviewEventId: string,
  dailyStudyPlans: readonly DailyStudyPlanRecord[] = [],
  reviewProfile: ReviewProfile = "recognition",
): Promise<RollbackReviewEventResult> {
  assertPersonContext(context);
  assertDatabaseUuid(reviewEventId, "reviewEventId");

  return withPostgresTransaction(async (client) => {
    const rebuildPlans = dailyStudyPlans.length
      ? await listDailyStudyPlans(client, context)
      : [];
    const eventResult = await client.query<ReviewEventRow>(
      `
        select
          id,
          prompt_id,
          person_id,
          vocabulary_item_id,
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
        from review_events
        where person_id = $1 and id = $2 and review_profile = $3
        limit 1
      `,
      [context.personId, reviewEventId, reviewProfile],
    );
    const eventRow = eventResult.rows[0];

    if (!eventRow) {
      throw new Error(`Review event not found: ${reviewEventId}`);
    }

    const event = mapReviewEventRow(eventRow);
    const previousState = await getReviewState(
      client,
      context,
      event.vocabularyItemId,
      reviewProfile,
    );
    const remainingEvents = (await listReviewEventsForVocabularyItem(
      client,
      context,
      event.vocabularyItemId,
      reviewProfile,
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
        where person_id = $1
          and vocabulary_item_id = $2
          and review_profile = $3
      `,
      [context.personId, event.vocabularyItemId, reviewProfile],
    );

    const rebuiltState = rebuildReviewProfileStateFromEvents(
      context.personId,
      event.vocabularyItemId,
      reviewProfile,
      remainingEvents.sort(sortReviewEventsByReviewedAt),
      previousState ?? undefined,
      { dailyStudyPlans: rebuildPlans, makeStateId: randomUUID },
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

async function syncDailyDefaultsFromReviewSettings(
  queryable: PostgresQueryable,
  settings: PersonReviewSettings,
) {
  for (const defaults of createDailyStudyDefaults(settings.personId, settings)) {
    await queryable.query(
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
        on conflict (person_id, review_profile)
        do update set
          review_goal = excluded.review_goal,
          timezone = excluded.timezone,
          updated_at = excluded.updated_at
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

        return withPostgresTransaction(async (client) => {
          const inserted = await insertVocabularyItem(client, item);
          await insertVocabularyCreationFact(client, inserted, input.sourceActionId);
          return inserted;
        });
      },
      updateItem: async (context, vocabularyItemId, input) => {
        const currentItem = await selectVocabularyItem(queryable, context, vocabularyItemId);

        if (!currentItem) {
          throw new Error(`Vocabulary item not found: ${vocabularyItemId}`);
        }

        const nextItem = buildUpdatedVocabularyItem(currentItem, context, input);

        if (
          nextItem.learningTrack !== currentItem.learningTrack &&
          (await vocabularyItemHasReviewHistory(queryable, context, vocabularyItemId))
        ) {
          throw new Error(
            "This word already has study history. Start it fresh in the other Track instead.",
          );
        }

        return updateVocabularyItem(queryable, context, vocabularyItemId, nextItem);
      },
      startFreshInTrack: (context, vocabularyItemId, targetTrack) =>
        withPostgresTransaction(async (client) => {
          const currentItem = await selectVocabularyItem(
            client,
            context,
            vocabularyItemId,
            { forUpdate: true },
          );

          if (!currentItem) {
            throw new Error(`Vocabulary item not found: ${vocabularyItemId}`);
          }

          const normalizedTarget = normalizeLearningTrack(targetTrack);

          if (normalizedTarget === currentItem.learningTrack) {
            throw new Error("Choose the other Track to start fresh");
          }

          const sourceHistoryExists = await vocabularyItemHasReviewHistoryForProfile(
            client,
            context,
            vocabularyItemId,
            currentItem.learningTrack,
          );
          const targetHistoryExists = await vocabularyItemHasReviewHistoryForProfile(
            client,
            context,
            vocabularyItemId,
            normalizedTarget,
          );

          if (!sourceHistoryExists) {
            throw new Error(
              "This entry has no study history; change its Track while editing instead",
            );
          }

          if (targetHistoryExists) {
            throw new Error(
              "This entry already has history in the other Track and cannot start fresh there",
            );
          }

          return updateVocabularyItem(client, context, vocabularyItemId, {
            ...currentItem,
            learningTrack: normalizedTarget,
            updatedAt: context.now,
          });
        }),
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

            const inserted = await insertVocabularyItem(client, item);
            await insertVocabularyCreationFact(client, inserted, batch.id);
            items.push(inserted);
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
          schemaVersion: 6,
          people: [person],
          selectedPersonId: context.personId,
          items,
          importBatches: [],
          reviewStates: states,
          reviewEvents: [],
          settingsByPerson: [settings],
          dailyStudyDefaults: [],
          dailyStudyPlans: [],
          vocabularyCreationFacts: [],
          vocabularyCreationReversals: [],
          aiRuns: [],
          aiEnrichmentDrafts: [],
          vocabularyRelations: [],
          updatedAt: context.now,
        };

        return selectReviewQueue(data, context.now, context.sessionLimit);
      },
      recordReview: async (command: RecordReviewCommand) => {
        assertPersonContext(command);
        assertDatabaseUuid(command.vocabularyItemId, "vocabularyItemId");

        return withPostgresTransaction((client) =>
          recordRecognitionReviewInTransaction(client, command),
        );
      },
      resetToday: (context) => resetTodayReview(context),
      rollbackEvent: (context, reviewEventId) => rollbackReviewEvent(context, reviewEventId),
      listReviewEvents: (context) => listReviewEvents(queryable, context),
    },
    reviewSettings: {
      getSettings: (context) => getReviewSettings(queryable, context),
      updateSettings: (context, input) =>
        withPostgresTransaction(async (client) => {
          const settings = await updateReviewSettings(client, context, input);
          await syncDailyDefaultsFromReviewSettings(client, settings);
          return settings;
        }),
    },
    backup: {
      importBackup: async () => {
        throw new Error(
          "Direct runtime backup import is disabled. Use the guarded backup import script after separate environment approval.",
        );
      },
    },
  };
}
