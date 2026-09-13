"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  createActiveTargetRevision,
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
  StudyActivityType,
  ReviewProfile,
  StudyZone,
  UpdateDefaultGoalsCommand,
  UpdateTodayGoalsCommand,
} from "@/lib/daily-study/types";
import {
  recordDailyStudyReview,
  rollbackStudyReviewEvent,
} from "@/lib/review/repository";
import type { ReviewEvent, ReviewState } from "@/lib/review/types";
import type { VocabularyData } from "@/lib/vocabulary/types";
import {
  applyRecordedReviewToClientSnapshot,
  applyResolvedTodayToClientSnapshot,
  applyRolledBackReviewToClientSnapshot,
} from "@/lib/vocabulary/client-snapshot-updates";
import { v2ClientContractHeaders } from "@/lib/security/v2-client-contract";
import { watchStudyDayTurnover } from "@/lib/daily-study/day-turnover";

type StudyApiResponse<T> = Readonly<{
  ok: boolean;
  status: string;
  serverNow?: string;
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
    reviewProfile: ReviewProfile;
    activityType: StudyActivityType;
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

async function postStudy<T>(
  selectedPersonId: string,
  operation: unknown,
  updateServerClock: (serverNow: string) => void,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("/api/study", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [UI_WRITE_CONFIRMATION_HEADER]: UI_WRITE_CONFIRMATION_VALUE,
        ...v2ClientContractHeaders(),
      },
      signal: controller.signal,
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

    if (payload.serverNow) {
      updateServerClock(payload.serverNow);
    }

    return payload.result;
  } finally {
    clearTimeout(timeout);
  }
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
  const [todayRefreshError, setTodayRefreshError] = useState("");
  const {
    data,
    storageRuntime,
    commit,
    revalidateAfterMutation,
    getRuntimeNow,
    updateServerClock,
    updateClientSnapshot,
  } = vocabulary;
  const resolutionInFlightRef = useRef<{
    personId: string;
    runtime: typeof storageRuntime;
    promise: Promise<ReturnType<typeof resolveDailyStudyToday>>;
  } | null>(null);

  const resolveCurrent = useCallback(() => {
    const inFlight = resolutionInFlightRef.current;
    if (inFlight?.personId === data.selectedPersonId && inFlight.runtime === storageRuntime) {
      return inFlight.promise;
    }

    setIsTodayLoading(true);

    const request = (async () => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const runtimeNow = getRuntimeNow();
        const localResolution = runtimeNow
          ? resolveDailyStudyToday(data, runtimeNow)
          : null;

        if (localResolution?.data === data) {
          setToday(localResolution.today);
          return localResolution;
        }

        let requestedPersonId = data.selectedPersonId;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const result = await postStudy<DailyStudyTodayResponse>(
            requestedPersonId,
            { type: "resolveToday" },
            updateServerClock,
          );

          if (result.personId !== requestedPersonId) {
            throw new Error("The resolved study plan belongs to another learner");
          }

          const resolvedData = updateClientSnapshot(
            (current) => applyResolvedTodayToClientSnapshot(current, result),
            { broadcast: true },
          );
          const currentResolution = resolveDailyStudyToday(
            resolvedData,
            getRuntimeNow() ?? result.dayStartsAt,
          );

          if (currentResolution.data === resolvedData) {
            setToday(currentResolution.today);
            return currentResolution;
          }

          requestedPersonId = resolvedData.selectedPersonId;
        }

        throw new Error("The selected learner changed while preparing Study");
      }

      const resolved = resolveDailyStudyToday(data);

      if (resolved.data !== data) {
        await commit(resolved.data);
      }

      setToday(resolved.today);
      return resolved;
    })().finally(() => {
      if (resolutionInFlightRef.current?.promise === request) {
        resolutionInFlightRef.current = null;
        setIsTodayLoading(false);
      }
    });
    resolutionInFlightRef.current = {
      personId: data.selectedPersonId,
      runtime: storageRuntime,
      promise: request,
    };
    return request;
  }, [
    commit,
    data,
    getRuntimeNow,
    storageRuntime,
    updateClientSnapshot,
    updateServerClock,
  ]);

  const resolveToday = useCallback(async () => {
    const resolved = await resolveCurrent();
    setTodayRefreshError("");
    return resolved.today;
  }, [resolveCurrent]);
  const resolveTodayRef = useRef(resolveToday);
  useEffect(() => { resolveTodayRef.current = resolveToday; }, [resolveToday]);
  const todayPersonId = today?.personId;
  const todayEndsAt = today?.dayEndsAt;

  useEffect(() => {
    if (!vocabulary.isLoaded || !todayEndsAt || todayPersonId !== data.selectedPersonId) return;

    return watchStudyDayTurnover({
      dayEndsAt: todayEndsAt,
      getNow: getRuntimeNow,
      refresh: () => resolveTodayRef.current(),
      onError: (error) => setTodayRefreshError(
        error instanceof Error ? error.message : "Could not refresh today’s study plan",
      ),
    });
  }, [data.selectedPersonId, getRuntimeNow, todayEndsAt, todayPersonId, vocabulary.isLoaded]);

  const readQueue = useCallback(
    async (
      input: Readonly<{
        reviewProfile: ReviewProfile;
        activityType: StudyActivityType;
        zone: StudyZone;
      }>,
      localSourceData?: VocabularyData,
    ): Promise<DailyStudyQueueResult> => {
      const resolved =
        !isPostgresClientStorageRuntime(storageRuntime) && localSourceData
          ? resolveDailyStudyToday(localSourceData)
          : await resolveCurrent();
      const track = resolved.today.tracks[input.reviewProfile];

      if (track.status !== "available") {
        throw new Error("This study Track is temporarily unavailable");
      }

      const request = {
        personId: resolved.today.personId,
        planId: track.planId,
        localDate: resolved.today.localDate,
        reviewProfile: input.reviewProfile,
        activityType: input.activityType,
        expectedPlanVersion: track.planVersion,
        requestedPageSize: 100,
        zone: input.zone,
        cursorToken: null,
      };

      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const page = await postStudy<Omit<DailyStudyQueueResult, "plan">>(
          data.selectedPersonId,
          {
            type: "readQueue",
            request,
          },
          updateServerClock,
        );

        return {
          ...page,
          plan: {
            personId: request.personId,
            planId: request.planId,
            planVersion: request.expectedPlanVersion,
            localDate: request.localDate,
            reviewProfile: request.reviewProfile,
            activityType: request.activityType,
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
          reviewProfile: request.reviewProfile,
          activityType: request.activityType,
        },
      };
    },
    [data.selectedPersonId, resolveCurrent, storageRuntime, updateServerClock],
  );

  const updateTodayGoals = useCallback(
    async (command: UpdateTodayGoalsCommand) => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<DailyStudyTodayResponse>(
          data.selectedPersonId,
          {
            type: "updateTodayGoals",
            command,
          },
          updateServerClock,
        );
        setToday(result);
        await revalidateAfterMutation({ broadcast: true });
        return result;
      }

      const updated = updateDailyStudyTodayGoals(data, command);
      await commit(updated.data);
      const resolved = resolveDailyStudyToday(updated.data);
      setToday(resolved.today);
      return resolved.today;
    },
    [commit, data, revalidateAfterMutation, storageRuntime, updateServerClock],
  );

  const updateDefaults = useCallback(
    async (input: {
      personId: string;
      timezone: string;
      goals: readonly UpdateDefaultGoalsCommand[];
    }) => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<DailyStudyTodayResponse>(
          data.selectedPersonId,
          {
            type: "updateDefaults",
            input,
          },
          updateServerClock,
        );
        setToday(result);
        await revalidateAfterMutation({ broadcast: true });
        return result;
      }

      const nextData = updateDailyStudyDefaults(data, input);
      await commit(nextData);
      const resolved = resolveDailyStudyToday(nextData);
      setToday(resolved.today);
      return resolved.today;
    },
    [commit, data, revalidateAfterMutation, storageRuntime, updateServerClock],
  );

  const refreshPrompt = useCallback(
    async (command: RefreshStudyPromptCommand): Promise<RefreshedStudyPrompt> => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        return postStudy<RefreshedStudyPrompt>(
          data.selectedPersonId,
          {
            type: "refreshPrompt",
            command,
          },
          updateServerClock,
        );
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
          candidate.reviewProfile === record.claims.reviewProfile &&
          candidate.planVersion === record.claims.planVersion,
      );
      const item = data.items.find(
        (candidate) =>
          candidate.id === record.claims.vocabularyItemId &&
          candidate.personId === command.personId &&
          candidate.learningTrack === record.claims.reviewProfile &&
          candidate.status !== "archived" &&
          candidate.archivedAt === null,
      );
      const nowTime = new Date(now).getTime();

      if (
        data.selectedPersonId !== command.personId ||
        record.claims.personId !== command.personId ||
        !plan ||
        !item ||
        (record.claims.reviewProfile === "active" &&
          createActiveTargetRevision(item) !== record.claims.targetRevision) ||
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
    [data, storageRuntime, updateServerClock],
  );

  const recordRating = useCallback(
    async (command: RecordStudyRatingCommand) => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<DailyStudyRatingResult>(
          data.selectedPersonId,
          {
            type: "recordRating",
            command,
          },
          updateServerClock,
        );
        const parsed = parseDailyStudyRatingResult(result);
        const nextData = updateClientSnapshot(
          (current) => applyRecordedReviewToClientSnapshot(current, parsed),
          { broadcast: true },
        );
        const resolved = resolveDailyStudyToday(
          nextData,
          getRuntimeNow() ?? parsed.event.reviewedAt,
        );

        if (resolved.data === nextData) {
          setToday(resolved.today);
        }

        return parsed;
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
          candidate.reviewProfile === command.evidence.reviewProfile,
      );

      if (!plan) {
        throw new Error("Today’s study plan could not be found");
      }

      const item = data.items.find(
        (candidate) =>
          candidate.id === command.vocabularyItemId &&
          candidate.personId === command.personId &&
          candidate.learningTrack === command.evidence.reviewProfile &&
          candidate.status !== "archived" &&
          candidate.archivedAt === null,
      );

      if (!item) {
        throw new Error("This study entry is no longer available");
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
        currentTargetRevision:
          command.evidence.reviewProfile === "active"
            ? createActiveTargetRevision(item)
            : null,
        consumedByIdempotencyKey: prompt.consumedByIdempotencyKey,
        now,
      });
      const review = recordDailyStudyReview(
        data,
        {
          plan,
          vocabularyItemId: command.vocabularyItemId,
          rating: command.evidence.memoryRating,
          elapsedMs: command.evidence.elapsedMs,
          promptId: validated.promptId,
          activityType: command.evidence.activityType,
          answerOutcome: command.evidence.answerOutcome,
          answerNormalizationVersion:
            command.evidence.answerNormalizationVersion,
          targetRevision: validated.targetRevision,
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
                command.evidence.reviewProfile === "recognition"
                  ? {
                      personId: command.personId,
                      planId: command.planId,
                      planVersion: plan.planVersion,
                      localDate: command.localDate,
                      vocabularyItemId: command.vocabularyItemId,
                      reviewProfile: "recognition",
                      activityType: "recognition_card",
                      targetRevision: null,
                    }
                  : {
                      personId: command.personId,
                      planId: command.planId,
                      planVersion: plan.planVersion,
                      localDate: command.localDate,
                      vocabularyItemId: command.vocabularyItemId,
                      reviewProfile: "active",
                      activityType: command.evidence.activityType,
                      targetRevision: createActiveTargetRevision(item),
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
    [
      commit,
      data,
      getRuntimeNow,
      storageRuntime,
      updateClientSnapshot,
      updateServerClock,
    ],
  );

  const rollbackRating = useCallback(
    async (command: RollbackStudyRatingCommand): Promise<DailyStudyRollbackResult> => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<Omit<DailyStudyRollbackResult, "data">>(
          data.selectedPersonId,
          { type: "rollbackRating", command },
          updateServerClock,
        );
        const nextData = updateClientSnapshot(
          (current) => applyRolledBackReviewToClientSnapshot(current, result),
          { broadcast: true },
        );
        const resolved = resolveDailyStudyToday(
          nextData,
          getRuntimeNow() ?? result.event.reviewedAt,
        );

        if (resolved.data === nextData) {
          setToday(resolved.today);
        }

        return result;
      }

      const plan = data.dailyStudyPlans.find(
        (candidate) =>
          candidate.id === command.planId &&
          candidate.personId === command.personId &&
          candidate.localDate === command.localDate &&
          candidate.planVersion === command.expectedPlanVersion,
      );
      const event = data.reviewEvents.find(
        (candidate) =>
          candidate.id === command.eventId &&
          candidate.personId === command.personId &&
          candidate.vocabularyItemId === command.vocabularyItemId &&
          candidate.reviewProfile === plan?.reviewProfile,
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
      const rollback = rollbackStudyReviewEvent(data, command.eventId, now);
      await commit(rollback.data);
      const item = data.items.find(
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
      const promptToken = issueLocalPromptToken(
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
    [
      commit,
      data,
      getRuntimeNow,
      storageRuntime,
      updateClientSnapshot,
      updateServerClock,
    ],
  );

  const resetToday = useCallback(
    async (command: ResetTodayCommand) => {
      if (isPostgresClientStorageRuntime(storageRuntime)) {
        const result = await postStudy<{
          resetEventsCount: number;
          resetItemsCount: number;
          today: DailyStudyTodayResponse;
        }>(
          data.selectedPersonId,
          { type: "resetToday", command },
          updateServerClock,
        );
        setToday(result.today);
        await revalidateAfterMutation({ broadcast: true });
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
    [commit, data, revalidateAfterMutation, storageRuntime, updateServerClock],
  );

  return {
    ...vocabulary,
    today,
    isTodayLoading,
    todayRefreshError,
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
