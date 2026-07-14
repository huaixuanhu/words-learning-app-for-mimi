"use client";

import { useCallback, useState } from "react";
import {
  isPostgresClientStorageRuntime,
  useVocabularyData,
} from "@/components/vocabulary/use-vocabulary-data";
import {
  completeLocalCommand,
  consumeLocalPrompt,
  issueLocalPromptToken,
  readLocalCommandReplay,
  readLocalPromptToken,
  refreshLocalPromptToken,
} from "@/lib/daily-study/local-runtime";
import {
  isStudyPromptErrorCode,
  StudyPromptError,
  type StudyPromptErrorCode,
} from "@/lib/daily-study/prompt-errors";
import {
  readDailyStudyQueue,
  resetDailyStudyToday,
  resolveDailyStudyToday,
  updateDailyStudyDefaults,
  updateDailyStudyTodayGoals,
} from "@/lib/daily-study/runtime-engine";
import { validateRecordStudyRatingCommand } from "@/lib/daily-study/contract";
import type {
  DailyStudyTodayResponse,
  RecordStudyRatingCommand,
  RefreshedStudyPrompt,
  RefreshStudyPromptCommand,
  ResetTodayCommand,
  RollbackStudyRatingCommand,
  StudyQueueEntryFact,
  StudyZone,
  UpdateDefaultGoalsCommand,
  UpdateTodayGoalsCommand,
} from "@/lib/daily-study/types";
import { recordReview, rollbackReviewEvent } from "@/lib/review/repository";
import type { ReviewEvent, ReviewState } from "@/lib/review/types";
import type { VocabularyData } from "@/lib/vocabulary/types";

type StudyApiResponse<T> = Readonly<{
  ok: boolean;
  status: string;
  result?: T;
  error?: string;
  errorCode?: StudyPromptErrorCode;
  reason?: string;
}>;

export type DailyStudyQueueResult = Readonly<{
  zone: StudyZone;
  entries: readonly StudyQueueEntryFact[];
  nextCursorToken: string | null;
  plan: Readonly<{
    personId: string;
    planId: string;
    planVersion: number;
    localDate: string;
  }>;
}>;

export type DailyStudyRatingResult = Readonly<{
  promptId: string;
  event: ReviewEvent;
  state: ReviewState;
  repeatPromptToken: string | null;
}>;

export type DailyStudyRollbackResult = Readonly<{
  event: ReviewEvent;
  state: ReviewState | null;
  promptToken: string;
  data?: VocabularyData;
}>;

const UI_WRITE_CONFIRMATION_HEADER = "x-mimi-ui-storage-write";
const UI_WRITE_CONFIRMATION_VALUE = "allow-dev-preview-ui-write";

function id(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function postStudy<T>(selectedPersonId: string, operation: unknown) {
  const response = await fetch("/api/study", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [UI_WRITE_CONFIRMATION_HEADER]: UI_WRITE_CONFIRMATION_VALUE,
    },
    body: JSON.stringify({ selectedPersonId, operation }),
  });
  const payload = (await response.json()) as StudyApiResponse<T>;

  if (!response.ok || !payload.ok || payload.result === undefined) {
    const message = payload.error ?? payload.reason ?? "Study request failed";

    if (isStudyPromptErrorCode(payload.errorCode)) {
      throw new StudyPromptError(payload.errorCode, message);
    }

    throw new Error(message);
  }

  return payload.result;
}

function parseDailyStudyRatingResult(value: unknown): DailyStudyRatingResult {
  if (
    !value ||
    typeof value !== "object" ||
    !("promptId" in value) ||
    typeof value.promptId !== "string" ||
    !("event" in value) ||
    !value.event ||
    typeof value.event !== "object" ||
    !("id" in value.event) ||
    typeof value.event.id !== "string" ||
    !("state" in value) ||
    !value.state ||
    typeof value.state !== "object" ||
    !("dueAt" in value.state) ||
    typeof value.state.dueAt !== "string" ||
    !("repeatPromptToken" in value) ||
    (value.repeatPromptToken !== null && typeof value.repeatPromptToken !== "string")
  ) {
    throw new Error("The saved rating result is invalid");
  }

  return value as DailyStudyRatingResult;
}

export function createStudyIdempotencyKey(prefix: "rating" | "reset") {
  return id(prefix);
}

export function useDailyStudy() {
  const vocabulary = useVocabularyData();
  const [today, setToday] = useState<DailyStudyTodayResponse | null>(null);
  const [isTodayLoading, setIsTodayLoading] = useState(false);
  const { data, storageRuntime, commit, refresh } = vocabulary;

  const resolveCurrent = useCallback(async () => {
    setIsTodayLoading(true);

    try {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<DailyStudyTodayResponse>(
          data.selectedPersonId,
          { type: "resolveToday" },
        );

        setToday(result);
        return { today: result, data };
      }

      const resolved = resolveDailyStudyToday(data);

      if (resolved.data !== data) {
        await commit(resolved.data);
      }

      setToday(resolved.today);
      return resolved;
    } finally {
      setIsTodayLoading(false);
    }
  }, [commit, data, storageRuntime]);

  const resolveToday = useCallback(async () => {
    const resolved = await resolveCurrent();
    return resolved.today;
  }, [resolveCurrent]);

  const readQueue = useCallback(
    async (
      zone: StudyZone,
      localSourceData?: VocabularyData,
    ): Promise<DailyStudyQueueResult> => {
      const resolved =
        !isPostgresClientStorageRuntime(storageRuntime) && localSourceData
          ? resolveDailyStudyToday(localSourceData)
          : await resolveCurrent();
      const recognition = resolved.today.tracks.recognition;

      if (recognition.status !== "available") {
        throw new Error("Recognition study is temporarily unavailable");
      }

      const request = {
        personId: resolved.today.personId,
        planId: recognition.planId,
        localDate: resolved.today.localDate,
        reviewProfile: "recognition" as const,
        expectedPlanVersion: recognition.planVersion,
        requestedPageSize: 100,
        zone,
        cursorToken: null,
      };

      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const page = await postStudy<Omit<DailyStudyQueueResult, "plan">>(data.selectedPersonId, {
          type: "readQueue",
          request,
        });

        return {
          ...page,
          plan: {
            personId: request.personId,
            planId: request.planId,
            planVersion: request.expectedPlanVersion,
            localDate: request.localDate,
          },
        };
      }

      const page = readDailyStudyQueue(
        resolved.data,
        { ...request, cursor: null },
        (seed) => issueLocalPromptToken(seed),
      );

      return {
        zone: page.zone,
        entries: page.entries,
        nextCursorToken: null,
        plan: {
          personId: request.personId,
          planId: request.planId,
          planVersion: request.expectedPlanVersion,
          localDate: request.localDate,
        },
      };
    },
    [data.selectedPersonId, resolveCurrent, storageRuntime],
  );

  const updateTodayGoals = useCallback(
    async (command: UpdateTodayGoalsCommand) => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<DailyStudyTodayResponse>(data.selectedPersonId, {
          type: "updateTodayGoals",
          command,
        });
        setToday(result);
        await refresh();
        return result;
      }

      const updated = updateDailyStudyTodayGoals(data, command);
      await commit(updated.data);
      const resolved = resolveDailyStudyToday(updated.data);
      setToday(resolved.today);
      return resolved.today;
    },
    [commit, data, refresh, storageRuntime],
  );

  const updateDefaults = useCallback(
    async (input: {
      personId: string;
      timezone: string;
      goals: readonly UpdateDefaultGoalsCommand[];
    }) => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<DailyStudyTodayResponse>(data.selectedPersonId, {
          type: "updateDefaults",
          input,
        });
        setToday(result);
        await refresh();
        return result;
      }

      const nextData = updateDailyStudyDefaults(data, input);
      await commit(nextData);
      const resolved = resolveDailyStudyToday(nextData);
      setToday(resolved.today);
      return resolved.today;
    },
    [commit, data, refresh, storageRuntime],
  );

  const refreshPrompt = useCallback(
    async (command: RefreshStudyPromptCommand): Promise<RefreshedStudyPrompt> => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        return postStudy<RefreshedStudyPrompt>(data.selectedPersonId, {
          type: "refreshPrompt",
          command,
        });
      }

      const now = new Date().toISOString();
      const record = readLocalPromptToken(command.promptToken, now, {
        allowExpired: true,
      });
      const plan = data.dailyStudyPlans.find(
        (candidate) =>
          candidate.id === record.claims.planId &&
          candidate.personId === command.personId &&
          candidate.localDate === record.claims.localDate &&
          candidate.reviewProfile === "recognition" &&
          candidate.planVersion === record.claims.planVersion,
      );
      const item = data.items.find(
        (candidate) =>
          candidate.id === record.claims.vocabularyItemId &&
          candidate.personId === command.personId &&
          candidate.learningTrack === "recognition" &&
          candidate.status !== "archived" &&
          candidate.archivedAt === null,
      );
      const nowTime = new Date(now).getTime();

      if (
        data.selectedPersonId !== command.personId ||
        record.claims.personId !== command.personId ||
        !plan ||
        !item ||
        nowTime < new Date(plan.dayStartsAt).getTime() ||
        nowTime >= new Date(plan.dayEndsAt).getTime()
      ) {
        throw new StudyPromptError(
          "prompt_stale",
          "This study card no longer belongs to the current plan.",
        );
      }

      if (record.consumedByIdempotencyKey) {
        throw new StudyPromptError(
          "prompt_consumed",
          "This study card was already saved.",
        );
      }

      return refreshLocalPromptToken(command, now);
    },
    [data, storageRuntime],
  );

  const recordRating = useCallback(
    async (command: RecordStudyRatingCommand) => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<DailyStudyRatingResult>(data.selectedPersonId, {
          type: "recordRating",
          command,
        });
        await refresh();
        return parseDailyStudyRatingResult(result);
      }

      const replay = readLocalCommandReplay(
        "record_rating",
        command.idempotencyKey,
        command,
      );

      if (replay) {
        return parseDailyStudyRatingResult(replay);
      }

      const prompt = readLocalPromptToken(command.promptToken);
      const plan = data.dailyStudyPlans.find(
        (candidate) =>
          candidate.id === command.planId &&
          candidate.personId === command.personId &&
          candidate.localDate === command.localDate &&
          candidate.reviewProfile === "recognition",
      );

      if (!plan) {
        throw new Error("Today’s Recognition plan could not be found");
      }

      const now = new Date().toISOString();

      const validated = validateRecordStudyRatingCommand(command, {
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
        trustedPrompt: prompt.claims,
        currentTargetRevision: null,
        consumedByIdempotencyKey: prompt.consumedByIdempotencyKey,
        now,
      });
      const review = recordReview(
        data,
        {
          vocabularyItemId: command.vocabularyItemId,
          rating: command.evidence.memoryRating,
          elapsedMs: command.evidence.elapsedMs,
          promptId: validated.promptId,
        },
        now,
      );

      await commit(review.data);
      consumeLocalPrompt(command.promptToken, command.idempotencyKey);
      const result = {
        promptId: validated.promptId,
        event: review.event,
        state: review.state,
        repeatPromptToken:
          command.evidence.memoryRating === "forgot" ||
          command.evidence.memoryRating === "hard"
            ? issueLocalPromptToken(
                {
                  personId: command.personId,
                  planId: command.planId,
                  planVersion: plan.planVersion,
                  localDate: command.localDate,
                  vocabularyItemId: command.vocabularyItemId,
                  reviewProfile: "recognition",
                  activityType: "recognition_card",
                },
                now,
              )
            : null,
      };
      completeLocalCommand(
        "record_rating",
        command.idempotencyKey,
        command,
        result,
      );
      return result;
    },
    [commit, data, refresh, storageRuntime],
  );

  const rollbackRating = useCallback(
    async (command: RollbackStudyRatingCommand): Promise<DailyStudyRollbackResult> => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<Omit<DailyStudyRollbackResult, "data">>(
          data.selectedPersonId,
          { type: "rollbackRating", command },
        );
        await refresh();
        return result;
      }

      const plan = data.dailyStudyPlans.find(
        (candidate) =>
          candidate.id === command.planId &&
          candidate.personId === command.personId &&
          candidate.localDate === command.localDate &&
          candidate.reviewProfile === "recognition" &&
          candidate.planVersion === command.expectedPlanVersion,
      );
      const event = data.reviewEvents.find(
        (candidate) =>
          candidate.id === command.eventId &&
          candidate.personId === command.personId &&
          candidate.vocabularyItemId === command.vocabularyItemId &&
          candidate.reviewProfile === "recognition",
      );

      if (!plan || !event) {
        throw new Error("This review can no longer be returned");
      }

      const reviewedAt = new Date(event.reviewedAt).getTime();

      if (
        reviewedAt < new Date(plan.dayStartsAt).getTime() ||
        reviewedAt >= new Date(plan.dayEndsAt).getTime()
      ) {
        throw new Error("Only a rating from this study day can be returned");
      }

      const now = new Date().toISOString();
      const rollback = rollbackReviewEvent(data, command.eventId, now);
      await commit(rollback.data);
      const promptToken = issueLocalPromptToken(
        {
          personId: command.personId,
          planId: command.planId,
          planVersion: command.expectedPlanVersion,
          localDate: command.localDate,
          vocabularyItemId: command.vocabularyItemId,
          reviewProfile: "recognition",
          activityType: "recognition_card",
        },
        now,
      );
      const resolved = resolveDailyStudyToday(rollback.data, now);
      setToday(resolved.today);

      return {
        event: rollback.event,
        state: rollback.state,
        promptToken,
        data: rollback.data,
      };
    },
    [commit, data, refresh, storageRuntime],
  );

  const resetToday = useCallback(
    async (command: ResetTodayCommand) => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<{
          resetEventsCount: number;
          resetItemsCount: number;
          today: DailyStudyTodayResponse;
        }>(data.selectedPersonId, { type: "resetToday", command });
        setToday(result.today);
        await refresh();
        return result;
      }

      const replay = readLocalCommandReplay(
        "reset_today",
        command.idempotencyKey,
        command,
      );

      if (replay) {
        if (
          typeof replay.resetEventsCount !== "number" ||
          typeof replay.resetItemsCount !== "number"
        ) {
          throw new Error("The saved reset result is invalid");
        }

        const resolved = resolveDailyStudyToday(data);
        setToday(resolved.today);
        return {
          resetEventsCount: replay.resetEventsCount,
          resetItemsCount: replay.resetItemsCount,
          today: resolved.today,
        };
      }

      const reset = resetDailyStudyToday(data, command);
      await commit(reset.data);
      const result = {
        resetEventsCount: reset.resetEventsCount,
        resetItemsCount: reset.resetItemsCount,
      };
      completeLocalCommand(
        "reset_today",
        command.idempotencyKey,
        command,
        result,
      );
      const resolved = resolveDailyStudyToday(reset.data);
      setToday(resolved.today);
      return { ...result, today: resolved.today };
    },
    [commit, data, refresh, storageRuntime],
  );

  return {
    ...vocabulary,
    today,
    isTodayLoading,
    resolveToday,
    readQueue,
    updateTodayGoals,
    updateDefaults,
    refreshPrompt,
    recordRating,
    rollbackRating,
    resetToday,
  };
}
