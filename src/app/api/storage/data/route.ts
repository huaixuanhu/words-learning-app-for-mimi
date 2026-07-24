import { NextRequest, NextResponse } from "next/server";
import { addServerTiming } from "@/lib/observability/server-timing";
import { requireProductionBasicAuth } from "@/lib/security/production-basic-auth";
import type { ReviewRating } from "@/lib/review/types";
import {
  createPostgresPerson,
  createPostgresRepository,
  getPostgresVocabularyDataSnapshot,
} from "@/lib/storage/postgres/repository";
import {
  assertPostgresRuntime,
  isProductionVercelEnvironment,
  isPostgresRuntimeMode,
  isStorageUiWriteEnabled,
  resolveStorageRuntimeMode,
} from "@/lib/storage/runtime-mode";
import type {
  ImportBatchInput,
  ImportCandidate,
  NewVocabularyInput,
  UpdateVocabularyInput,
} from "@/lib/vocabulary/types";
import type { DurableRepositoryPort, TimestampedPersonContext } from "@/lib/storage/durable-repository-contract";
import type { VocabularyDeduplicationConfirmation } from "@/lib/vocabulary/deduplication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UI_WRITE_CONFIRMATION_HEADER = "x-mimi-ui-storage-write";
const UI_WRITE_CONFIRMATION_VALUE = "allow-dev-preview-ui-write";
const DATABASE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StorageUiMutation =
  | {
      type: "people.select";
      personId: string;
    }
  | {
      type: "people.add";
      input: {
        displayName: string;
      };
    }
  | {
      type: "vocabulary.add";
      input: NewVocabularyInput;
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.update";
      vocabularyItemId: string;
      input: UpdateVocabularyInput;
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.startFreshInTrack";
      vocabularyItemId: string;
      targetTrack: "recognition" | "active";
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.archive";
      vocabularyItemId: string;
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.restore";
      vocabularyItemId: string;
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.delete";
      vocabularyItemId: string;
      now: string;
      timezone: string;
    }
  | {
      type: "vocabulary.deduplicate";
      confirmation: VocabularyDeduplicationConfirmation;
      now: string;
      timezone: string;
    }
  | {
      type: "import.commitCandidates";
      batchInput: ImportBatchInput;
      candidates: ImportCandidate[];
      acceptedTempIds: string[];
      now: string;
      timezone: string;
    }
  | {
      type: "import.rollbackBatch";
      importBatchId: string;
      now: string;
      timezone: string;
    }
  | {
      type: "review.record";
      input: {
        vocabularyItemId: string;
        rating: ReviewRating;
        elapsedMs?: number | null;
      };
      now: string;
    }
  | {
      type: "review.resetToday";
      now: string;
      timezone: string;
    }
  | {
      type: "review.rollbackEvent";
      reviewEventId: string;
      now: string;
      timezone: string;
    }
  | {
      type: "reviewSettings.update";
      input: {
        sessionLimit: number;
        recognitionSessionLimit: number;
        activeSessionLimit: number;
        timezone: string;
      };
      now: string;
      timezone: string;
    };

function runtimePayload() {
  const resolution = resolveStorageRuntimeMode();

  return {
    mode: resolution.mode,
    source: resolution.source,
    reason: resolution.reason,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }

  return value;
}

function optionalSelectedPersonId(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function requiredNonNegativeInteger(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }

  return Number(value);
}

function parseDeduplicationConfirmation(
  value: unknown,
): VocabularyDeduplicationConfirmation {
  if (!isRecord(value)) {
    throw new Error("mutation.confirmation is required");
  }

  return {
    fingerprint: requiredString(
      value.fingerprint,
      "mutation.confirmation.fingerprint",
    ),
    duplicateGroupsCount: requiredNonNegativeInteger(
      value.duplicateGroupsCount,
      "mutation.confirmation.duplicateGroupsCount",
    ),
    deletedItemsCount: requiredNonNegativeInteger(
      value.deletedItemsCount,
      "mutation.confirmation.deletedItemsCount",
    ),
    deletedReviewStatesCount: requiredNonNegativeInteger(
      value.deletedReviewStatesCount,
      "mutation.confirmation.deletedReviewStatesCount",
    ),
    deletedReviewEventsCount: requiredNonNegativeInteger(
      value.deletedReviewEventsCount,
      "mutation.confirmation.deletedReviewEventsCount",
    ),
    deletedAiDraftsCount: requiredNonNegativeInteger(
      value.deletedAiDraftsCount,
      "mutation.confirmation.deletedAiDraftsCount",
    ),
    deletedVocabularyRelationsCount: requiredNonNegativeInteger(
      value.deletedVocabularyRelationsCount,
      "mutation.confirmation.deletedVocabularyRelationsCount",
    ),
    detachedAiRunsCount: requiredNonNegativeInteger(
      value.detachedAiRunsCount,
      "mutation.confirmation.detachedAiRunsCount",
    ),
    affectedImportBatchesCount: requiredNonNegativeInteger(
      value.affectedImportBatchesCount,
      "mutation.confirmation.affectedImportBatchesCount",
    ),
    groupsWithMultipleHistoriesCount: requiredNonNegativeInteger(
      value.groupsWithMultipleHistoriesCount,
      "mutation.confirmation.groupsWithMultipleHistoriesCount",
    ),
  };
}

function parseMutation(value: unknown): StorageUiMutation {
  if (!isRecord(value)) {
    throw new Error("mutation is required");
  }

  const type = requiredString(value.type, "mutation.type");

  switch (type) {
    case "people.select":
      return {
        type,
        personId: requiredString(value.personId, "mutation.personId"),
      };
    case "people.add": {
      const input = value.input;

      if (!isRecord(input)) {
        throw new Error("mutation.input is required");
      }

      return {
        type,
        input: {
          displayName: requiredString(input.displayName, "mutation.input.displayName"),
        },
      };
    }
    case "vocabulary.startFreshInTrack": {
      const targetTrack = requiredString(
        value.targetTrack,
        "mutation.targetTrack",
      );

      if (targetTrack !== "recognition" && targetTrack !== "active") {
        throw new Error("mutation.targetTrack must be recognition or active");
      }

      return {
        type,
        vocabularyItemId: requiredString(
          value.vocabularyItemId,
          "mutation.vocabularyItemId",
        ),
        targetTrack,
        now: requiredString(value.now, "mutation.now"),
        timezone: requiredString(value.timezone, "mutation.timezone"),
      };
    }
    case "vocabulary.add":
    case "vocabulary.update":
    case "vocabulary.archive":
    case "vocabulary.restore":
    case "vocabulary.delete":
    case "import.commitCandidates":
    case "import.rollbackBatch":
    case "review.record":
    case "review.resetToday":
    case "review.rollbackEvent":
    case "reviewSettings.update":
      return value as StorageUiMutation;
    case "vocabulary.deduplicate":
      return {
        type,
        confirmation: parseDeduplicationConfirmation(value.confirmation),
        now: requiredString(value.now, "mutation.now"),
        timezone: requiredString(value.timezone, "mutation.timezone"),
      };
    default:
      throw new Error(`Unsupported storage mutation: ${type}`);
  }
}

async function resolveWritablePersonId(
  repository: DurableRepositoryPort,
  selectedPersonId: string | null,
) {
  if (selectedPersonId && DATABASE_UUID_PATTERN.test(selectedPersonId)) {
    return selectedPersonId;
  }

  const people = await repository.people.listPeople();

  if (!people.length) {
    const person = await createPostgresPerson({
      displayName: "Mimi",
      slug: "mimi",
    });

    return person.id;
  }

  throw new Error("A valid selectedPersonId is required when Postgres people already exist");
}

async function mutationContext(
  repository: DurableRepositoryPort,
  selectedPersonId: string | null,
  now: string,
  timezone: string,
): Promise<TimestampedPersonContext> {
  return {
    personId: await resolveWritablePersonId(repository, selectedPersonId),
    now,
    timezone,
  };
}

function requestDisabled(status: number, reason: string) {
  return NextResponse.json(
    {
      ok: false,
      status: "disabled",
      runtime: runtimePayload(),
      reason,
    },
    { status },
  );
}

function storageDataRuntimeDisabledResponse() {
  const resolution = resolveStorageRuntimeMode();
  const isProduction = isProductionVercelEnvironment();

  if (isProduction && resolution.mode !== "postgres-production") {
    return requestDisabled(404, "production-postgres-runtime-not-enabled");
  }

  if (!isProduction && resolution.mode === "postgres-production") {
    return requestDisabled(403, "postgres-production-runtime-not-allowed");
  }

  if (!isPostgresRuntimeMode(resolution.mode)) {
    return requestDisabled(403, "postgres-runtime-not-enabled");
  }

  return null;
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const authResponse = requireProductionBasicAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const disabled = storageDataRuntimeDisabledResponse();

  if (disabled) {
    return disabled;
  }

  try {
    assertPostgresRuntime();
    const selectedPersonId = request.nextUrl.searchParams.get("selectedPersonId");
    const snapshotNow = new Date().toISOString();
    const data = await getPostgresVocabularyDataSnapshot(selectedPersonId, snapshotNow);
    const serverNow = new Date().toISOString();

    return addServerTiming(
      NextResponse.json({
        ok: true,
        status: "ready",
        runtime: runtimePayload(),
        serverNow,
        data,
      }),
      "mimi_storage",
      startedAt,
    );
  } catch (error) {
    return addServerTiming(
      NextResponse.json(
        {
          ok: false,
          status: "error",
          runtime: runtimePayload(),
          error: error instanceof Error ? error.message : "Unknown storage data error",
        },
        { status: 500 },
      ),
      "mimi_storage",
      startedAt,
    );
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const authResponse = requireProductionBasicAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const disabled = storageDataRuntimeDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const resolution = resolveStorageRuntimeMode();

  if (resolution.mode === "postgres-preview") {
    if (!isStorageUiWriteEnabled()) {
      return requestDisabled(403, "ui-writes-not-enabled");
    }

    if (request.headers.get(UI_WRITE_CONFIRMATION_HEADER) !== UI_WRITE_CONFIRMATION_VALUE) {
      return NextResponse.json(
        {
          ok: false,
          status: "blocked",
          runtime: runtimePayload(),
          reason: "missing-ui-write-confirmation-header",
        },
        { status: 428 },
      );
    }
  }

  try {
    assertPostgresRuntime();
    const body = await request.json();

    if (!isRecord(body)) {
      throw new Error("request body must be an object");
    }

    const selectedPersonId = optionalSelectedPersonId(body.selectedPersonId);
    const mutation = parseMutation(body.mutation);
    const repository = createPostgresRepository();
    let nextSelectedPersonId = selectedPersonId;

    switch (mutation.type) {
      case "people.select":
        nextSelectedPersonId = mutation.personId;
        break;
      case "people.add": {
        const person = await createPostgresPerson(mutation.input);

        nextSelectedPersonId = person.id;
        break;
      }
      case "vocabulary.add":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.vocabulary.addItem(context, mutation.input);
          nextSelectedPersonId = context.personId;
        }
        break;
      case "vocabulary.update":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.vocabulary.updateItem(context, mutation.vocabularyItemId, mutation.input);
          nextSelectedPersonId = context.personId;
        }
        break;
      case "vocabulary.startFreshInTrack":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.vocabulary.startFreshInTrack(
            context,
            mutation.vocabularyItemId,
            mutation.targetTrack,
          );
          nextSelectedPersonId = context.personId;
        }
        break;
      case "vocabulary.archive":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.vocabulary.archiveItem(context, mutation.vocabularyItemId);
          nextSelectedPersonId = context.personId;
        }
        break;
      case "vocabulary.restore":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.vocabulary.restoreItem(context, mutation.vocabularyItemId);
          nextSelectedPersonId = context.personId;
        }
        break;
      case "vocabulary.delete":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.vocabulary.deleteItem(context, mutation.vocabularyItemId);
          nextSelectedPersonId = context.personId;
        }
        break;
      case "vocabulary.deduplicate":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.vocabulary.deduplicateItems(
            context,
            mutation.confirmation,
          );
          nextSelectedPersonId = context.personId;
        }
        break;
      case "import.commitCandidates":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.vocabulary.commitImportCandidates(
            context,
            mutation.batchInput,
            mutation.candidates,
            mutation.acceptedTempIds,
          );
          nextSelectedPersonId = context.personId;
        }
        break;
      case "import.rollbackBatch":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.vocabulary.rollbackImportBatch(context, mutation.importBatchId);
          nextSelectedPersonId = context.personId;
        }
        break;
      case "review.record":
        {
          const personId = await resolveWritablePersonId(repository, selectedPersonId);

          await repository.review.recordReview({
            personId,
            vocabularyItemId: mutation.input.vocabularyItemId,
            rating: mutation.input.rating,
            elapsedMs: mutation.input.elapsedMs,
            reviewedAt: mutation.now,
          });
          nextSelectedPersonId = personId;
        }
        break;
      case "review.resetToday":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.review.resetToday(context);
          nextSelectedPersonId = context.personId;
        }
        break;
      case "review.rollbackEvent":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.review.rollbackEvent(context, mutation.reviewEventId);
          nextSelectedPersonId = context.personId;
        }
        break;
      case "reviewSettings.update":
        {
          const context = await mutationContext(
            repository,
            selectedPersonId,
            mutation.now,
            mutation.timezone,
          );

          await repository.reviewSettings.updateSettings(context, mutation.input);
          nextSelectedPersonId = context.personId;
        }
        break;
    }

    const snapshotNow = new Date().toISOString();
    const data = await getPostgresVocabularyDataSnapshot(
      nextSelectedPersonId,
      snapshotNow,
    );
    const serverNow = new Date().toISOString();

    return addServerTiming(
      NextResponse.json({
        ok: true,
        status: "ready",
        runtime: runtimePayload(),
        serverNow,
        data,
      }),
      "mimi_storage",
      startedAt,
    );
  } catch (error) {
    return addServerTiming(
      NextResponse.json(
        {
          ok: false,
          status: "error",
          runtime: runtimePayload(),
          error: error instanceof Error ? error.message : "Unknown storage mutation error",
        },
        { status: 400 },
      ),
      "mimi_storage",
      startedAt,
    );
  }
}
