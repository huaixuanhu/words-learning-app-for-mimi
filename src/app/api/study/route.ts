import { NextRequest, NextResponse } from "next/server";
import { addServerTiming } from "@/lib/observability/server-timing";
import { requireProductionBasicAuth } from "@/lib/security/production-basic-auth";
import {
  readPostgresDailyStudyQueue,
  recordPostgresDailyStudyRating,
  refreshPostgresDailyStudyPrompt,
  rollbackPostgresDailyStudyRating,
  resetPostgresDailyStudyToday,
  resolvePostgresDailyStudyToday,
  updatePostgresDailyStudyDefaults,
  updatePostgresDailyStudyTodayGoals,
} from "@/lib/storage/postgres/repository";
import { getStudyPromptErrorCode } from "@/lib/daily-study/prompt-errors";
import {
  assertPostgresRuntime,
  isProductionVercelEnvironment,
  isPostgresRuntimeMode,
  isStorageUiWriteEnabled,
  resolveStorageRuntimeMode,
} from "@/lib/storage/runtime-mode";
import type {
  ReviewProfile,
  RefreshStudyPromptCommand,
  RollbackStudyRatingCommand,
  StudyActivityType,
  StudyQueueRequest,
  UpdateDefaultGoalsCommand,
} from "@/lib/daily-study/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UI_WRITE_CONFIRMATION_HEADER = "x-mimi-ui-storage-write";
const UI_WRITE_CONFIRMATION_VALUE = "allow-dev-preview-ui-write";

type StudyOperation =
  | Readonly<{ type: "resolveToday" }>
  | Readonly<{ type: "readQueue"; request: StudyQueueRequest }>
  | Readonly<{ type: "updateTodayGoals"; command: unknown }>
  | Readonly<{
      type: "updateDefaults";
      input: {
        personId: string;
        timezone: string;
        goals: readonly UpdateDefaultGoalsCommand[];
      };
    }>
  | Readonly<{ type: "recordRating"; command: unknown }>
  | Readonly<{ type: "refreshPrompt"; command: RefreshStudyPromptCommand }>
  | Readonly<{ type: "rollbackRating"; command: RollbackStudyRatingCommand }>
  | Readonly<{ type: "resetToday"; command: unknown }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} fields do not match the contract`);
  }
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }

  return value;
}

function parseReviewProfile(value: unknown): ReviewProfile {
  if (value !== "recognition" && value !== "active") {
    throw new Error("Unsupported reviewProfile");
  }

  return value;
}

function parseStudyActivityType(value: unknown): StudyActivityType {
  if (
    value !== "recognition_card" &&
    value !== "say" &&
    value !== "spell" &&
    value !== "dictation"
  ) {
    throw new Error("Unsupported activityType");
  }

  return value;
}

function parseQueueRequest(value: unknown): StudyQueueRequest {
  if (!isRecord(value)) {
    throw new Error("operation.request is required");
  }

  assertExactKeys(
    value,
    [
      "personId",
      "planId",
      "localDate",
      "reviewProfile",
      "activityType",
      "expectedPlanVersion",
      "requestedPageSize",
      "zone",
      "cursorToken",
    ],
    "Queue request",
  );

  if (value.zone !== "review" && value.zone !== "new") {
    throw new Error("Unsupported study zone");
  }

  if (
    !Number.isSafeInteger(value.expectedPlanVersion) ||
    (value.expectedPlanVersion as number) < 1
  ) {
    throw new Error("expectedPlanVersion must be a positive whole number");
  }

  if (
    !Number.isSafeInteger(value.requestedPageSize) ||
    (value.requestedPageSize as number) < 1 ||
    (value.requestedPageSize as number) > 100
  ) {
    throw new Error("requestedPageSize must be between 1 and 100");
  }

  if (value.cursorToken !== null && typeof value.cursorToken !== "string") {
    throw new Error("cursorToken must be opaque text or null");
  }

  const reviewProfile = parseReviewProfile(value.reviewProfile);
  const activityType = parseStudyActivityType(value.activityType);

  if (
    (reviewProfile === "recognition" && activityType !== "recognition_card") ||
    (reviewProfile === "active" && activityType === "recognition_card")
  ) {
    throw new Error("Queue activity does not match reviewProfile");
  }

  return {
    personId: requiredString(value.personId, "request.personId"),
    planId: requiredString(value.planId, "request.planId"),
    localDate: requiredString(value.localDate, "request.localDate"),
    reviewProfile,
    activityType,
    expectedPlanVersion: value.expectedPlanVersion as number,
    requestedPageSize: value.requestedPageSize as number,
    zone: value.zone,
    cursorToken: value.cursorToken as string | null,
  };
}

function parseDefaults(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("operation.input is required");
  }

  assertExactKeys(value, ["personId", "timezone", "goals"], "Defaults input");

  if (!Array.isArray(value.goals) || value.goals.length !== 2) {
    throw new Error("Defaults input requires both Review Profiles");
  }

  const goals = value.goals.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Defaults goal ${index + 1} must be an object`);
    }

    assertExactKeys(
      entry,
      ["personId", "reviewProfile", "reviewGoal", "newWordGoal"],
      `Defaults goal ${index + 1}`,
    );

    return {
      personId: requiredString(entry.personId, "defaults.personId"),
      reviewProfile: parseReviewProfile(entry.reviewProfile),
      reviewGoal: entry.reviewGoal as number,
      newWordGoal: entry.newWordGoal as number,
    } satisfies UpdateDefaultGoalsCommand;
  });

  return {
    personId: requiredString(value.personId, "input.personId"),
    timezone: requiredString(value.timezone, "input.timezone"),
    goals,
  };
}

function parseRollbackRatingCommand(value: unknown): RollbackStudyRatingCommand {
  if (!isRecord(value)) {
    throw new Error("operation.command is required");
  }

  assertExactKeys(
    value,
    [
      "personId",
      "planId",
      "localDate",
      "expectedPlanVersion",
      "eventId",
      "vocabularyItemId",
    ],
    "Rollback rating command",
  );

  if (
    !Number.isSafeInteger(value.expectedPlanVersion) ||
    (value.expectedPlanVersion as number) < 1
  ) {
    throw new Error("expectedPlanVersion must be a positive whole number");
  }

  return {
    personId: requiredString(value.personId, "command.personId"),
    planId: requiredString(value.planId, "command.planId"),
    localDate: requiredString(value.localDate, "command.localDate"),
    expectedPlanVersion: value.expectedPlanVersion as number,
    eventId: requiredString(value.eventId, "command.eventId"),
    vocabularyItemId: requiredString(
      value.vocabularyItemId,
      "command.vocabularyItemId",
    ),
  };
}

function parseRefreshPromptCommand(value: unknown): RefreshStudyPromptCommand {
  if (!isRecord(value)) {
    throw new Error("operation.command is required");
  }

  assertExactKeys(value, ["personId", "promptToken"], "Refresh prompt command");

  return {
    personId: requiredString(value.personId, "command.personId"),
    promptToken: requiredString(value.promptToken, "command.promptToken"),
  };
}

function parseOperation(value: unknown): StudyOperation {
  if (!isRecord(value)) {
    throw new Error("operation is required");
  }

  const type = requiredString(value.type, "operation.type");

  switch (type) {
    case "resolveToday":
      assertExactKeys(value, ["type"], "resolveToday operation");
      return { type };
    case "readQueue":
      assertExactKeys(value, ["type", "request"], "readQueue operation");
      return { type, request: parseQueueRequest(value.request) };
    case "updateTodayGoals":
    case "recordRating":
    case "resetToday":
      assertExactKeys(value, ["type", "command"], `${type} operation`);
      return { type, command: value.command };
    case "rollbackRating":
      assertExactKeys(value, ["type", "command"], "rollbackRating operation");
      return { type, command: parseRollbackRatingCommand(value.command) };
    case "refreshPrompt":
      assertExactKeys(value, ["type", "command"], "refreshPrompt operation");
      return { type, command: parseRefreshPromptCommand(value.command) };
    case "updateDefaults":
      assertExactKeys(value, ["type", "input"], "updateDefaults operation");
      return { type, input: parseDefaults(value.input) };
    default:
      throw new Error(`Unsupported study operation: ${type}`);
  }
}

function runtimePayload() {
  const resolution = resolveStorageRuntimeMode();

  return {
    mode: resolution.mode,
    source: resolution.source,
    reason: resolution.reason,
  };
}

function disabledResponse(status: number, reason: string) {
  return NextResponse.json(
    { ok: false, status: "disabled", runtime: runtimePayload(), reason },
    { status },
  );
}

function runtimeDisabledResponse(request: NextRequest) {
  const resolution = resolveStorageRuntimeMode();
  const production = isProductionVercelEnvironment();

  if (production && resolution.mode !== "postgres-production") {
    return disabledResponse(404, "production-postgres-runtime-not-enabled");
  }

  if (!production && resolution.mode === "postgres-production") {
    return disabledResponse(403, "postgres-production-runtime-not-allowed");
  }

  if (!isPostgresRuntimeMode(resolution.mode)) {
    return disabledResponse(403, "postgres-runtime-not-enabled");
  }

  if (resolution.mode === "postgres-preview") {
    if (!isStorageUiWriteEnabled()) {
      return disabledResponse(403, "ui-writes-not-enabled");
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

  return null;
}

function commandPersonId(command: unknown) {
  return isRecord(command) && typeof command.personId === "string"
    ? command.personId
    : null;
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const authResponse = requireProductionBasicAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const disabled = runtimeDisabledResponse(request);

  if (disabled) {
    return disabled;
  }

  try {
    assertPostgresRuntime();
    const body = await request.json();

    if (!isRecord(body)) {
      throw new Error("Request body must be an object");
    }

    assertExactKeys(body, ["selectedPersonId", "operation"], "Study request");
    const selectedPersonId = requiredString(body.selectedPersonId, "selectedPersonId");
    const operation = parseOperation(body.operation);
    const operationPersonId =
      operation.type === "readQueue"
        ? operation.request.personId
        : operation.type === "updateDefaults"
          ? operation.input.personId
          : operation.type === "resolveToday"
            ? selectedPersonId
            : commandPersonId(operation.command);

    if (operationPersonId !== selectedPersonId) {
      throw new Error("Study operation does not match the selected learner");
    }

    const now = new Date().toISOString();
    let result: unknown;

    switch (operation.type) {
      case "resolveToday":
        result = (await resolvePostgresDailyStudyToday(selectedPersonId, now)).today;
        break;
      case "readQueue":
        result = await readPostgresDailyStudyQueue(operation.request, now);
        break;
      case "updateTodayGoals":
        result = (await updatePostgresDailyStudyTodayGoals(operation.command, now)).today;
        break;
      case "updateDefaults":
        result = (await updatePostgresDailyStudyDefaults(operation.input, now)).today;
        break;
      case "recordRating":
        result = await recordPostgresDailyStudyRating(operation.command, now);
        break;
      case "refreshPrompt":
        result = await refreshPostgresDailyStudyPrompt(operation.command, now);
        break;
      case "rollbackRating":
        result = await rollbackPostgresDailyStudyRating(operation.command, now);
        break;
      case "resetToday":
        result = await resetPostgresDailyStudyToday(operation.command, now);
        break;
    }

    return addServerTiming(
      NextResponse.json({
        ok: true,
        status: "ready",
        runtime: runtimePayload(),
        serverNow: new Date().toISOString(),
        result,
      }),
      "mimi_study",
      startedAt,
    );
  } catch (error) {
    const errorCode = getStudyPromptErrorCode(error);

    return addServerTiming(
      NextResponse.json(
        {
          ok: false,
          status: "error",
          runtime: runtimePayload(),
          error: error instanceof Error ? error.message : "Unknown study command error",
          ...(errorCode ? { errorCode } : {}),
        },
        { status: 400 },
      ),
      "mimi_study",
      startedAt,
    );
  }
}
