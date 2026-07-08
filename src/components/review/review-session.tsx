"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Eye, EyeOff, RotateCcw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SimplePanel } from "@/components/simple-panel";
import { useMimiSound } from "@/components/sound-provider";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";
import { getSelectedPersonId } from "@/lib/people/repository";
import { recordReview, resetTodayReviewTask, rollbackReviewEvent } from "@/lib/review/repository";
import { selectReviewQueue } from "@/lib/review/scheduler";
import { getNextSessionIdsAfterRating, moveReviewAttemptBackToFront } from "@/lib/review/session-queue";
import { getSelectedReviewSettings } from "@/lib/review/settings";
import { reviewRatings } from "@/lib/stage-two-data";
import { playReviewCompleteSound } from "@/lib/ui/sound-player";
import { getRecognitionVocabularyItems } from "@/lib/vocabulary/repository";
import { PressableButton } from "@/components/ui/motion-primitives";

function getItemById(dataItems: ReturnType<typeof getRecognitionVocabularyItems>, id: string) {
  return dataItems.find((item) => item.id === id);
}

function getDisplayList(values: string[], fallback: string) {
  return values.length ? values : fallback ? [fallback] : [];
}

type CompletedReview = {
  vocabularyItemId: string;
  eventId: string;
  surfaceText: string;
  passedSession: boolean;
};

export function ReviewSession() {
  const { data, isLoaded, commit } = useVocabularyData();
  const { settings: soundSettings } = useMimiSound();
  const reduceMotion = useReducedMotion();
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);
  const [sessionPersonId, setSessionPersonId] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [completedReviews, setCompletedReviews] = useState<CompletedReview[]>([]);
  const [cardStartedAt, setCardStartedAt] = useState(0);
  const [submittedItemId, setSubmittedItemId] = useState<string | null>(null);
  const submittedItemIdRef = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const selectedPersonId = getSelectedPersonId(data);
  const recognitionItems = useMemo(() => getRecognitionVocabularyItems(data), [data]);
  const settings = getSelectedReviewSettings(data);
  const queueSourceSignature = useMemo(
    () =>
      [
        selectedPersonId,
        settings.recognitionSessionLimit,
        ...recognitionItems.map(
          (item) => `${item.id}:${item.status}:${item.updatedAt}:${item.archivedAt ?? ""}`,
        ),
      ].join("|"),
    [recognitionItems, selectedPersonId, settings.recognitionSessionLimit],
  );
  const queueSourceSignatureRef = useRef("");

  const buildSessionIds = useCallback(() => {
    return selectReviewQueue(data).map((item) => item.id);
  }, [data]);

  useEffect(() => {
    if (!isLoaded || (sessionIds && sessionPersonId === selectedPersonId)) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextSessionIds = buildSessionIds();

      queueSourceSignatureRef.current = queueSourceSignature;
      setSessionIds(nextSessionIds);
      setSessionPersonId(selectedPersonId);
      setCompletedCount(0);
      setCompletedReviews([]);
      setShowBack(false);
      setShowCompletionModal(false);
      setSubmittedItemId(null);
      setCardStartedAt(0);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [buildSessionIds, isLoaded, queueSourceSignature, selectedPersonId, sessionIds, sessionPersonId]);

  const currentItem = sessionIds?.length ? getItemById(recognitionItems, sessionIds[0]) : null;
  const currentMeanings = currentItem ? getDisplayList(currentItem.meaningsZh, currentItem.meaningZh) : [];
  const currentExamples = currentItem ? getDisplayList(currentItem.examples, currentItem.example) : [];
  const sessionTotal = completedCount + (sessionIds?.length ?? 0);
  const remainingCount = sessionIds?.length ?? 0;
  const progressPercent = sessionTotal ? Math.round((completedCount / sessionTotal) * 100) : 0;
  const ratingDisabled = !currentItem || !showBack || submittedItemId === currentItem.id;
  const canRollbackPrevious = Boolean(currentItem) && completedReviews.length > 0;

  useEffect(() => {
    if (
      !isLoaded ||
      currentItem ||
      (sessionIds?.length ?? 0) > 0 ||
      sessionPersonId !== selectedPersonId ||
      queueSourceSignatureRef.current === queueSourceSignature
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextSessionIds = buildSessionIds();

      queueSourceSignatureRef.current = queueSourceSignature;

      if (!nextSessionIds.length) {
        return;
      }

      submittedItemIdRef.current = null;
      setSessionIds(nextSessionIds);
      setCompletedCount(0);
      setCompletedReviews([]);
      setShowBack(false);
      setShowCompletionModal(false);
      setCardStartedAt(0);
      setSubmittedItemId(null);
      setMessage("");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    buildSessionIds,
    currentItem,
    isLoaded,
    queueSourceSignature,
    selectedPersonId,
    sessionIds?.length,
    sessionPersonId,
  ]);

  const confirmCompletion = () => {
    setShowCompletionModal(false);

    if (soundSettings.reviewComplete) {
      void playReviewCompleteSound().catch(() => {
        // Completion sound is decorative and should not block review flow.
      });
    }
  };

  const resetTodayReview = async () => {
    try {
      const now = new Date().toISOString();
      const result = resetTodayReviewTask(data, now);

      if (!result.resetEventsCount) {
        setShowResetConfirm(false);
        setMessage("今天还没有复习记录可重置。");
        return;
      }

      const nextData = await commit(result.data, {
        type: "review.resetToday",
        now,
        timezone: settings.timezone,
      });

      submittedItemIdRef.current = null;
      setSessionIds(selectReviewQueue(nextData, now).map((item) => item.id));
      setSessionPersonId(selectedPersonId);
      setCompletedCount(0);
      setCompletedReviews([]);
      setShowBack(false);
      setShowCompletionModal(false);
      setShowResetConfirm(false);
      setCardStartedAt(0);
      setSubmittedItemId(null);
      setMessage(`已重置今日复习任务：回滚 ${result.resetItemsCount} 个词，移除 ${result.resetEventsCount} 条今日记录。`);
    } catch (error) {
      setShowResetConfirm(false);
      setMessage(error instanceof Error ? error.message : "重置今日复习任务失败");
    }
  };

  const rollbackPreviousReview = async () => {
    const previousReview = completedReviews.at(-1);

    if (!previousReview || !sessionIds) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const result = rollbackReviewEvent(data, previousReview.eventId, now);

      await commit(result.data, {
        type: "review.rollbackEvent",
        reviewEventId: previousReview.eventId,
        now,
        timezone: settings.timezone,
      });

      submittedItemIdRef.current = null;
      setSessionIds(moveReviewAttemptBackToFront(sessionIds, previousReview.vocabularyItemId));
      setCompletedCount((current) =>
        previousReview.passedSession ? Math.max(0, current - 1) : current,
      );
      setCompletedReviews((current) => current.slice(0, -1));
      setShowBack(false);
      setShowCompletionModal(false);
      setCardStartedAt(0);
      setSubmittedItemId(null);
      setMessage(`已回退 ${previousReview.surfaceText}，可以重新选择熟练度。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "回退1词失败");
    }
  };

  const submitRating = async (rating: (typeof reviewRatings)[number]["value"], eventTimeStamp: number) => {
    if (!currentItem || submittedItemIdRef.current === currentItem.id) {
      return;
    }

    submittedItemIdRef.current = currentItem.id;
    setSubmittedItemId(currentItem.id);

    try {
      const now = new Date().toISOString();
      const elapsedMs = cardStartedAt ? eventTimeStamp - cardStartedAt : 0;
      const result = recordReview(data, {
        vocabularyItemId: currentItem.id,
        rating,
        elapsedMs,
      }, now);

      const nextData = await commit(result.data, {
        type: "review.record",
        input: {
          vocabularyItemId: currentItem.id,
          rating,
          elapsedMs,
        },
        now,
      });
      const nextSession = getNextSessionIdsAfterRating(sessionIds ?? [], currentItem.id, rating);
      const completedSession = nextSession.passedSession && nextSession.sessionIds.length === 0 && sessionTotal > 0;
      const persistedEvent = nextData.reviewEvents.find(
        (event) =>
          event.personId === selectedPersonId &&
          event.vocabularyItemId === currentItem.id &&
          event.reviewedAt === now,
      );

      if (persistedEvent) {
        setCompletedReviews((current) => [
          ...current,
          {
            vocabularyItemId: currentItem.id,
            eventId: persistedEvent.id,
            surfaceText: currentItem.surfaceText,
            passedSession: nextSession.passedSession,
          },
        ]);
      }
      submittedItemIdRef.current = null;
      setSubmittedItemId(null);
      setSessionIds(nextSession.sessionIds);
      setCompletedCount((current) => current + (nextSession.passedSession ? 1 : 0));
      setShowBack(false);
      setCardStartedAt(0);
      setMessage(
        nextSession.repeatedSession
          ? `已记录，${currentItem.surfaceText} 会在本局稍后再出现。`
          : `已记录，下次复习 ${new Date(result.state.dueAt).toLocaleString()}`,
      );

      if (completedSession) {
        setShowCompletionModal(true);
      }
    } catch (error) {
      submittedItemIdRef.current = null;
      setSubmittedItemId(null);
      setMessage(error instanceof Error ? error.message : "复习记录失败");
    }
  };

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="mimi-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-start gap-3">
            {canRollbackPrevious ? (
              <PressableButton
                type="button"
                onClick={() => void rollbackPreviousReview()}
                className="mimi-button-secondary mimi-focus-ring inline-flex min-h-10 items-center justify-center gap-2 px-3 text-sm font-semibold"
              >
                <Undo2 aria-hidden="true" className="size-4" />
                回退1词
              </PressableButton>
            ) : null}
            <div>
            <p className="text-sm font-semibold text-[#5f7d66]">Review card</p>
            <h2 className="mt-1 text-xl font-semibold text-[#203229]">
              {currentItem ? `${completedCount + 1} / ${sessionTotal || 1}` : "Session"}
            </h2>
            </div>
          </div>
          <span className="mimi-pill px-3 py-1 text-sm font-semibold">
            {remainingCount || 0} left
          </span>
        </div>

        <div className="mimi-progress-track mb-5 h-2">
          <div className="mimi-progress-fill h-full" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="grid min-h-[22rem] place-items-center rounded-md border border-[#d8d1c2] bg-[#efe9dc] p-5 text-center sm:p-8">
          {currentItem ? (
            <div className="grid w-full max-w-2xl gap-5">
              <motion.div
                key={currentItem.id}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                className="mimi-card bg-[#fffaf1] p-6 sm:p-8"
              >
                <p className="mimi-word-serif text-5xl text-[#203229] sm:text-6xl">{currentItem.surfaceText}</p>
                <p className="mt-4 text-sm leading-6 text-[#5f6d62]">先安静回忆，再翻开答案。</p>

                <AnimatePresence mode="wait">
                  {showBack ? (
                    <motion.div
                      key="answer"
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-6 grid gap-3 border-t border-[#d8d1c2] pt-5 text-left"
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase text-[#879087]">Meaning</p>
                        {currentMeanings.length ? (
                          <div className="mt-1 grid gap-1 text-lg font-semibold text-[#203229]">
                            {currentMeanings.map((meaning, index) => (
                              <p key={`${currentItem.id}-meaning-${index}`}>{meaning}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-lg font-semibold text-[#203229]">No meaning yet</p>
                        )}
                      </div>
                      {currentExamples.length ? (
                        <div>
                          <p className="text-xs font-semibold uppercase text-[#879087]">Example</p>
                          <div className="mt-1 grid gap-1 text-sm leading-6 text-[#5f6d62]">
                            {currentExamples.map((example, index) => (
                              <p key={`${currentItem.id}-example-${index}`}>{example}</p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {currentItem.notes ? (
                        <div>
                          <p className="text-xs font-semibold uppercase text-[#879087]">Memory hint</p>
                          <p className="mt-1 text-sm leading-6 text-[#5f6d62]">{currentItem.notes}</p>
                        </div>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            </div>
          ) : (
            <div className="mimi-card grid max-w-md place-items-center gap-3 bg-[#fffaf1] p-8 text-center">
              <CheckCircle2 aria-hidden="true" className="size-10 text-[#5f7d66]" />
              <p className="text-lg font-semibold text-[#203229]">
                {isLoaded
                  ? sessionTotal
                    ? "本次复习已完成。"
                    : "当前没有到期或可开始的新词。"
                  : "Loading local vocabulary..."}
              </p>
              <p className="text-sm leading-6 text-[#5f6d62]">You are building something valuable.</p>
            </div>
          )}
        </div>

        {currentItem ? (
          <>
            <PressableButton
              type="button"
              onClick={(event) => {
                setShowBack((current) => !current);
                setCardStartedAt(showBack ? 0 : event.timeStamp);
              }}
              className="mimi-button-secondary mimi-focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 px-4 text-sm font-semibold"
            >
              {showBack ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
              {showBack ? "隐藏答案" : "显示答案"}
            </PressableButton>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {reviewRatings.map((rating) => (
                <PressableButton
                  key={rating.value}
                  type="button"
                  disabled={ratingDisabled}
                  onClick={(event) => void submitRating(rating.value, event.timeStamp)}
                  className="mimi-focus-ring min-h-14 rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-3 text-sm font-semibold text-[#203229] transition hover:border-[#5f7d66] hover:bg-[#d9e5d5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block">{rating.label}</span>
                  <span className="mt-1 block text-xs font-medium text-[#5f6d62]">{rating.interval}</span>
                </PressableButton>
              ))}
            </div>
          </>
        ) : null}

        {message ? <p className="mt-3 rounded-md bg-[#d9e5d5] px-3 py-2 text-sm text-[#274331]">{message}</p> : null}
      </section>

      <SimplePanel title="Session">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-[#efe9dc] p-3">
            <p className="text-xs font-medium text-[#5f6d62]">Limit</p>
            <p className="mt-1 text-xl font-semibold text-[#203229]">{settings.recognitionSessionLimit}</p>
          </div>
          <div className="rounded-md bg-[#efe9dc] p-3">
            <p className="text-xs font-medium text-[#5f6d62]">Done</p>
            <p className="mt-1 text-xl font-semibold text-[#203229]">{completedCount}</p>
          </div>
          <div className="rounded-md bg-[#efe9dc] p-3">
            <p className="text-xs font-medium text-[#5f6d62]">Left</p>
            <p className="mt-1 text-xl font-semibold text-[#203229]">{sessionIds?.length ?? "-"}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {reviewRatings.map((rating) => (
            <PressableButton
              key={rating.value}
              type="button"
              disabled={ratingDisabled}
              onClick={(event) => void submitRating(rating.value, event.timeStamp)}
              className="mimi-focus-ring w-full rounded-md border border-[#d8d1c2] bg-[#fffaf1] p-3 text-left transition hover:border-[#5f7d66] hover:bg-[#d9e5d5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <p className="font-medium text-[#203229]">{rating.label}</p>
              <p className="text-sm text-[#5f6d62]">{rating.interval}</p>
            </PressableButton>
          ))}
        </div>

        <PressableButton
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="mimi-button-secondary mimi-focus-ring mt-3 inline-flex w-full items-center justify-center gap-2 px-3 text-sm font-semibold"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          重置今日复习任务
        </PressableButton>
      </SimplePanel>
      </div>

      <AnimatePresence>
        {showCompletionModal ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[#14251d]/55 px-4 py-6 backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-complete-title"
              className="mimi-card w-full max-w-sm p-6 text-center shadow-[0_24px_70px_rgb(20_37_29/0.26)]"
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-[var(--mimi-primary)]" />
              <h2 id="review-complete-title" className="mt-4 text-xl font-semibold text-[var(--mimi-text)]">
                已完成今日复习任务
              </h2>
              <PressableButton
                type="button"
                data-mimi-sound-skip="true"
                onClick={confirmCompletion}
                className="mimi-button mimi-focus-ring mt-5 inline-flex min-w-28 items-center justify-center px-5 text-sm font-semibold"
              >
                确定
              </PressableButton>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showResetConfirm ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[#14251d]/55 px-4 py-6 backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-reset-title"
              className="mimi-card w-full max-w-sm p-6 text-center shadow-[0_24px_70px_rgb(20_37_29/0.26)]"
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <RotateCcw aria-hidden="true" className="mx-auto size-9 text-[var(--mimi-primary)]" />
              <h2 id="review-reset-title" className="mt-4 text-xl font-semibold text-[var(--mimi-text)]">
                是否确认重置今日复习任务？
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--mimi-muted)]">
                YES 后会移除今天的复习记录，并回到今日开始复习之前。
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <PressableButton
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="mimi-button-secondary mimi-focus-ring inline-flex items-center justify-center px-4 text-sm font-semibold"
                >
                  取消
                </PressableButton>
                <PressableButton
                  type="button"
                  onClick={() => void resetTodayReview()}
                  className="mimi-button mimi-focus-ring inline-flex items-center justify-center px-4 text-sm font-semibold"
                >
                  YES
                </PressableButton>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
