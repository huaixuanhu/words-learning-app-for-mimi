"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Eye, EyeOff, Undo2, Volume2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExampleWordActions } from "@/components/review/example-word-actions";
import { SimplePanel } from "@/components/simple-panel";
import { useMimiSound } from "@/components/sound-provider";
import {
  createStudyIdempotencyKey,
  type DailyStudyQueueResult,
  useDailyStudy,
} from "@/components/study/use-daily-study";
import { PressableButton } from "@/components/ui/motion-primitives";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { StudyZone } from "@/lib/daily-study/types";
import { getSelectedPersonId } from "@/lib/people/repository";
import { getNextAnswerRevealState } from "@/lib/review/answer-reveal";
import {
  getNextReviewRatingIndex,
  isReviewRatingArrowKey,
} from "@/lib/review/keyboard-controls";
import {
  PROMPT_REFRESHED_COPY,
  submitWithExpiredPromptRecovery,
} from "@/lib/daily-study/prompt-recovery";
import {
  getNextSessionIdsAfterRating,
  moveReviewAttemptBackToFront,
} from "@/lib/review/session-queue";
import { reviewRatings } from "@/lib/stage-two-data";
import { playReviewCompleteSound } from "@/lib/ui/sound-player";
import { speakEnglishText } from "@/lib/ui/speech-synthesis";
import { getRecognitionVocabularyItems } from "@/lib/vocabulary/repository";

function getItemById(
  dataItems: ReturnType<typeof getRecognitionVocabularyItems>,
  id: string,
) {
  return dataItems.find((item) => item.id === id);
}

function getDisplayList(values: string[], fallback: string) {
  return values.length ? values : fallback ? [fallback] : [];
}

function promptMap(entries: DailyStudyQueueResult["entries"]) {
  return Object.fromEntries(
    entries.map((entry) => [entry.vocabularyItemId, entry.promptToken]),
  );
}

type CompletedReview = {
  vocabularyItemId: string;
  eventId: string;
  surfaceText: string;
  passedSession: boolean;
};

type ReviewSessionProps = Readonly<{
  zone: StudyZone;
}>;

type RatingSelection = Readonly<{
  vocabularyItemId: string;
  index: number;
}>;

const CARD_TOGGLE_IGNORE_SELECTOR =
  "button, a, input, textarea, select, label, [contenteditable='true'], [data-card-toggle-ignore='true']";
const REVIEW_SHORTCUT_IGNORE_SELECTOR =
  "button, a, input, textarea, select, option, summary, [contenteditable='true'], [role='button'], [role='textbox'], [role='combobox'], [role='menuitem'], [data-review-shortcuts-ignore='true']";

function shouldIgnoreCardToggle(target: EventTarget | null) {
  if (target instanceof Element && target.closest(CARD_TOGGLE_IGNORE_SELECTOR)) {
    return true;
  }

  const selection = typeof window === "undefined" ? null : window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}

function shouldIgnoreReviewShortcut(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    document.querySelector('[role="dialog"][aria-modal="true"]')
  ) {
    return true;
  }

  const target = event.target instanceof Element ? event.target : null;
  const activeElement = document.activeElement;

  return Boolean(
    target?.closest(REVIEW_SHORTCUT_IGNORE_SELECTOR) ||
      activeElement?.closest(REVIEW_SHORTCUT_IGNORE_SELECTOR),
  );
}

export function ReviewSession({ zone }: ReviewSessionProps) {
  const {
    data,
    isLoaded,
    commit,
    today,
    readQueue,
    refreshPrompt,
    recordRating,
    rollbackRating,
  } = useDailyStudy();
  const { settings: soundSettings } = useMimiSound();
  const reduceMotion = useReducedMotion();
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);
  const [sessionPlan, setSessionPlan] = useState<DailyStudyQueueResult["plan"] | null>(null);
  const [promptTokens, setPromptTokens] = useState<Record<string, string>>({});
  const [completedCount, setCompletedCount] = useState(0);
  const [completedReviews, setCompletedReviews] = useState<CompletedReview[]>([]);
  const [showBack, setShowBack] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [cardStartedAt, setCardStartedAt] = useState(0);
  const [submittedItemId, setSubmittedItemId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isPromptRefreshing, setIsPromptRefreshing] = useState(false);
  const [ratingSelection, setRatingSelection] = useState<RatingSelection | null>(null);
  const [message, setMessage] = useState("");
  const submittedItemIdRef = useRef<string | null>(null);
  const requestedSessionKeyRef = useRef("");
  const promptActivationKeyRef = useRef("");
  const promptRefreshingItemIdRef = useRef<string | null>(null);
  const readQueueRef = useRef(readQueue);
  const refreshPromptRef = useRef(refreshPrompt);
  const cardPointerStartRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const selectedPersonId = getSelectedPersonId(data);
  const recognitionItems = useMemo(
    () => getRecognitionVocabularyItems(data),
    [data],
  );

  useEffect(() => {
    readQueueRef.current = readQueue;
  }, [readQueue]);

  useEffect(() => {
    refreshPromptRef.current = refreshPrompt;
  }, [refreshPrompt]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const sessionKey = `${selectedPersonId}:${zone}`;

    if (requestedSessionKeyRef.current === sessionKey) {
      return;
    }

    requestedSessionKeyRef.current = sessionKey;
    let cancelled = false;
    setIsSessionLoading(true);
    setMessage("");

    void readQueueRef.current({
      reviewProfile: "recognition",
      activityType: "recognition_card",
      zone,
    })
      .then((page) => {
        if (cancelled) {
          return;
        }

        setSessionIds(page.entries.map((entry) => entry.vocabularyItemId));
        setSessionPlan(page.plan);
        setPromptTokens(promptMap(page.entries));
        promptActivationKeyRef.current = "";
        setCompletedCount(0);
        setCompletedReviews([]);
        setShowBack(false);
        setShowCompletionModal(false);
        setCardStartedAt(0);
        setSubmittedItemId(null);
        setIsPromptRefreshing(false);
        setRatingSelection(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        requestedSessionKeyRef.current = "";
        setSessionIds([]);
        setSessionPlan(null);
        setPromptTokens({});
        setRatingSelection(null);
        setMessage(error instanceof Error ? error.message : "Could not prepare this study zone");
      })
      .finally(() => {
        if (!cancelled) {
          setIsSessionLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, selectedPersonId, zone]);

  const currentItem = sessionIds?.length
    ? getItemById(recognitionItems, sessionIds[0])
    : null;
  const currentMeanings = currentItem
    ? getDisplayList(currentItem.meaningsZh, currentItem.meaningZh)
    : [];
  const currentExamples = currentItem
    ? getDisplayList(currentItem.examples, currentItem.example)
    : [];
  const selectedRatingIndex =
    currentItem && ratingSelection?.vocabularyItemId === currentItem.id
      ? ratingSelection.index
      : null;

  useEffect(() => {
    const promptToken = currentItem ? promptTokens[currentItem.id] : null;

    if (!currentItem || !sessionPlan || !promptToken) {
      return;
    }

    const activationKey = `${sessionPlan.planId}:${currentItem.id}:${completedReviews.length}`;

    if (promptActivationKeyRef.current === activationKey) {
      return;
    }

    promptActivationKeyRef.current = activationKey;
    promptRefreshingItemIdRef.current = currentItem.id;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsPromptRefreshing(true);
      }
    });

    void refreshPromptRef.current({
      personId: sessionPlan.personId,
      promptToken,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }

        setPromptTokens((current) =>
          current[currentItem.id] === promptToken
            ? { ...current, [currentItem.id]: result.promptToken }
            : current,
        );

        if (result.refreshedFromExpired) {
          setMessage(PROMPT_REFRESHED_COPY);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "This card could not be refreshed.",
          );
        }
      })
      .finally(() => {
        if (promptActivationKeyRef.current === activationKey) {
          promptRefreshingItemIdRef.current = null;
          setIsPromptRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [completedReviews.length, currentItem, promptTokens, sessionPlan]);

  const sessionTotal = completedCount + (sessionIds?.length ?? 0);
  const remainingCount = sessionIds?.length ?? 0;
  const progressPercent = sessionTotal
    ? Math.round((completedCount / sessionTotal) * 100)
    : 0;
  const ratingDisabled =
    !currentItem ||
    !showBack ||
    !sessionPlan ||
    isPromptRefreshing ||
    submittedItemId === currentItem.id;
  const canRollbackPrevious = completedReviews.length > 0 && Boolean(sessionPlan);
  const recognitionMetrics =
    today?.tracks.recognition.status === "available"
      ? today.tracks.recognition.metrics
      : null;
  const zoneGoal =
    zone === "new"
      ? recognitionMetrics?.newWordGoal
      : recognitionMetrics?.reviewGoal;

  const toggleAnswer = (eventTimeStamp: number) => {
    const next = getNextAnswerRevealState(
      { showBack, cardStartedAt },
      eventTimeStamp,
    );

    setShowBack(next.showBack);
    setCardStartedAt(next.cardStartedAt);

    if (!next.showBack) {
      setRatingSelection(null);
    }
  };

  const listenToCurrentItem = () => {
    if (!currentItem) {
      return;
    }

    const result = speakEnglishText(currentItem.surfaceText);

    if (result.status === "unsupported") {
      setMessage("Speech is not available in this browser.");
    }
  };

  const confirmCompletion = () => {
    setShowCompletionModal(false);

    if (soundSettings.reviewComplete) {
      void playReviewCompleteSound().catch(() => {
        // Completion sound is decorative and should not block study flow.
      });
    }
  };

  const rollbackPreviousReview = async () => {
    const previousReview = completedReviews.at(-1);

    if (!previousReview || !sessionPlan) {
      return;
    }

    try {
      const result = await rollbackRating({
        personId: sessionPlan.personId,
        planId: sessionPlan.planId,
        localDate: sessionPlan.localDate,
        expectedPlanVersion: sessionPlan.planVersion,
        eventId: previousReview.eventId,
        vocabularyItemId: previousReview.vocabularyItemId,
      });

      submittedItemIdRef.current = null;
      setPromptTokens((current) => ({
        ...current,
        [previousReview.vocabularyItemId]: result.promptToken,
      }));
      setSessionIds((current) =>
        moveReviewAttemptBackToFront(current ?? [], previousReview.vocabularyItemId),
      );
      setCompletedCount((current) =>
        previousReview.passedSession ? Math.max(0, current - 1) : current,
      );
      setCompletedReviews((current) => current.slice(0, -1));
      setShowBack(false);
      setShowCompletionModal(false);
      setCardStartedAt(0);
      setSubmittedItemId(null);
      setRatingSelection(null);
      setMessage(`Returned to ${previousReview.surfaceText}. Choose again when ready.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not return to the previous entry");
    }
  };

  const submitRating = async (
    rating: (typeof reviewRatings)[number]["value"],
    eventTimeStamp: number,
  ) => {
    if (
      !currentItem ||
      !sessionPlan ||
      promptRefreshingItemIdRef.current === currentItem.id ||
      submittedItemIdRef.current === currentItem.id
    ) {
      return;
    }

    const promptToken = promptTokens[currentItem.id];

    if (!promptToken) {
      setMessage("This card is stale. Please reopen this study zone.");
      return;
    }

    submittedItemIdRef.current = currentItem.id;
    setSubmittedItemId(currentItem.id);

    try {
      const elapsedMs = Math.max(
        0,
        Math.round(cardStartedAt ? eventTimeStamp - cardStartedAt : 0),
      );
      const submission = await submitWithExpiredPromptRecovery({
        promptToken,
        createIdempotencyKey: () => createStudyIdempotencyKey("rating"),
        submit: (currentPromptToken, idempotencyKey) =>
          recordRating({
            personId: sessionPlan.personId,
            planId: sessionPlan.planId,
            localDate: sessionPlan.localDate,
            vocabularyItemId: currentItem.id,
            promptToken: currentPromptToken,
            idempotencyKey,
            evidence: {
              reviewProfile: "recognition",
              activityType: "recognition_card",
              answerOutcome: "self_rated",
              answerNormalizationVersion: null,
              memoryRating: rating,
              elapsedMs,
            },
          }),
        refresh: async (expiredPromptToken) => {
          const refreshed = await refreshPrompt({
            personId: sessionPlan.personId,
            promptToken: expiredPromptToken,
          });
          setPromptTokens((current) =>
            current[currentItem.id] === expiredPromptToken
              ? { ...current, [currentItem.id]: refreshed.promptToken }
              : current,
          );
          return refreshed;
        },
      });
      const result = submission.result;
      const nextSession = getNextSessionIdsAfterRating(
        sessionIds ?? [],
        currentItem.id,
        rating,
      );
      const repeatUnavailable =
        nextSession.repeatedSession && !result.repeatPromptToken;
      const nextSessionIds = repeatUnavailable
        ? nextSession.sessionIds.filter((id) => id !== currentItem.id)
        : nextSession.sessionIds;

      setCompletedReviews((current) => [
        ...current,
        {
          vocabularyItemId: currentItem.id,
          eventId: result.event.id,
          surfaceText: currentItem.surfaceText,
          passedSession: nextSession.passedSession,
        },
      ]);
      setPromptTokens((current) => {
        const next = { ...current };
        delete next[currentItem.id];

        if (result.repeatPromptToken) {
          next[currentItem.id] = result.repeatPromptToken;
        }

        return next;
      });
      submittedItemIdRef.current = null;
      setSubmittedItemId(null);
      setSessionIds(nextSessionIds);
      setCompletedCount((current) =>
        current + (nextSession.passedSession ? 1 : 0),
      );
      setShowBack(false);
      setCardStartedAt(0);
      setRatingSelection(null);
      const savedMessage =
        repeatUnavailable
          ? `Saved. ${currentItem.surfaceText} could not be repeated in this session.`
          : nextSession.repeatedSession
            ? `Saved. ${currentItem.surfaceText} will return later in this session.`
            : `Saved. ${currentItem.surfaceText} is resting until ${new Date(result.state.dueAt).toLocaleString()}.`;
      setMessage(
        submission.refreshed
          ? `${PROMPT_REFRESHED_COPY} ${savedMessage}`
          : savedMessage,
      );

      if (nextSessionIds.length === 0 && sessionTotal > 0) {
        setShowCompletionModal(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this rating");
    } finally {
      submittedItemIdRef.current = null;
      setSubmittedItemId(null);
    }
  };

  const toggleAnswerRef = useRef(toggleAnswer);
  const submitRatingRef = useRef(submitRating);

  useEffect(() => {
    toggleAnswerRef.current = toggleAnswer;
    submitRatingRef.current = submitRating;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentItem || shouldIgnoreReviewShortcut(event)) {
        return;
      }

      if (event.key === " ") {
        if (event.repeat) {
          return;
        }

        event.preventDefault();
        toggleAnswerRef.current(event.timeStamp);
        return;
      }

      if (isReviewRatingArrowKey(event.key)) {
        if (!showBack || ratingDisabled) {
          return;
        }

        event.preventDefault();
        setRatingSelection({
          vocabularyItemId: currentItem.id,
          index: getNextReviewRatingIndex(selectedRatingIndex, event.key),
        });
        return;
      }

      if (
        event.key === "Enter" &&
        !event.repeat &&
        showBack &&
        !ratingDisabled &&
        selectedRatingIndex !== null
      ) {
        event.preventDefault();
        void submitRatingRef.current(
          reviewRatings[selectedRatingIndex].value,
          event.timeStamp,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentItem,
    ratingDisabled,
    selectedRatingIndex,
    showBack,
  ]);

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="mimi-panel p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-start gap-3">
              {canRollbackPrevious ? (
                <PressableButton
                  type="button"
                  onClick={() => void rollbackPreviousReview()}
                  className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
                >
                  <Undo2 aria-hidden="true" className="size-4" />
                  回退1词
                </PressableButton>
              ) : null}
              <div>
                <p className="text-sm font-semibold text-[var(--mimi-primary)]">
                  {zone === "new" ? "New Words" : "Review"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--mimi-text)]">
                  {currentItem
                    ? `${completedCount + 1} / ${sessionTotal || 1}`
                    : "Session"}
                </h2>
              </div>
            </div>
            <span className="mimi-pill px-3 py-1 text-sm font-semibold">
              {remainingCount} left
            </span>
          </div>

          <div className="mimi-progress-track mb-5 h-2">
            <div
              className="mimi-progress-fill h-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid min-h-[22rem] place-items-center rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-muted)] p-4 text-center sm:p-8">
            {currentItem ? (
              <div className="grid w-full max-w-2xl gap-5">
                <motion.div
                  key={currentItem.id}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: reduceMotion ? 0.12 : 0.34,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onPointerDown={(event) => {
                    if (event.button !== 0 || shouldIgnoreCardToggle(event.target)) {
                      cardPointerStartRef.current = null;
                      return;
                    }

                    cardPointerStartRef.current = {
                      pointerId: event.pointerId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                    };
                  }}
                  onPointerUp={(event) => {
                    const start = cardPointerStartRef.current;
                    cardPointerStartRef.current = null;

                    if (
                      event.button !== 0 ||
                      !start ||
                      start.pointerId !== event.pointerId ||
                      Math.hypot(
                        event.clientX - start.clientX,
                        event.clientY - start.clientY,
                      ) > 8 ||
                      shouldIgnoreCardToggle(event.target)
                    ) {
                      return;
                    }

                    toggleAnswer(event.timeStamp);
                  }}
                  onPointerCancel={() => {
                    cardPointerStartRef.current = null;
                  }}
                  className="mimi-card cursor-pointer bg-[var(--mimi-surface)] p-5 sm:p-8"
                >
                  <div className="flex items-start justify-center gap-3">
                    <p className="mimi-word-serif min-w-0 break-words text-4xl text-[var(--mimi-text)] sm:text-6xl">
                      {currentItem.surfaceText}
                    </p>
                    <PressableButton
                      type="button"
                      onClick={listenToCurrentItem}
                      aria-label={`Listen to ${currentItem.surfaceText}`}
                      className="mimi-button-secondary mimi-focus-ring grid size-11 shrink-0 place-items-center"
                    >
                      <Volume2 aria-hidden="true" className="size-4" />
                    </PressableButton>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--mimi-text-soft)]">
                    {showBack ? "Tap again to hide." : "Tap the card to reveal."}
                  </p>

                  <AnimatePresence mode="wait">
                    {showBack ? (
                      <motion.div
                        key="answer"
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        transition={{
                          duration: reduceMotion ? 0.12 : 0.26,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="mt-6 grid gap-3 border-t border-[var(--mimi-border)] pt-5 text-left"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase text-[var(--mimi-text-muted)]">Meaning</p>
                          {currentMeanings.length ? (
                            <div className="mt-1 grid gap-1 text-lg font-semibold text-[var(--mimi-text)]">
                              {currentMeanings.map((meaning, index) => (
                                <p key={`${currentItem.id}-meaning-${index}`}>{meaning}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-lg font-semibold text-[var(--mimi-text)]">No meaning yet</p>
                          )}
                        </div>
                        {currentExamples.length ? (
                          <div>
                            <p className="text-xs font-semibold uppercase text-[var(--mimi-text-muted)]">Example</p>
                            <div className="mt-1 grid gap-1 text-sm leading-6 text-[var(--mimi-text-soft)]">
                              {currentExamples.map((example, index) => (
                                <ExampleWordActions
                                  key={`${currentItem.id}-example-${index}`}
                                  example={example}
                                  exampleIndex={index}
                                  sourceSurfaceText={currentItem.surfaceText}
                                  data={data}
                                  commit={commit}
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {currentItem.notes ? (
                          <div>
                            <p className="text-xs font-semibold uppercase text-[var(--mimi-text-muted)]">Memory hint</p>
                            <p className="mt-1 text-sm leading-6 text-[var(--mimi-text-soft)]">{currentItem.notes}</p>
                          </div>
                        ) : null}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              </div>
            ) : (
              <div className="mimi-card grid max-w-md place-items-center gap-3 bg-[var(--mimi-surface)] p-7 text-center">
                <CheckCircle2 aria-hidden="true" className="size-10 text-[var(--mimi-primary)]" />
                <p className="text-lg font-semibold text-[var(--mimi-text)]">
                  {isSessionLoading || sessionIds === null
                    ? "Preparing this zone..."
                    : sessionTotal
                      ? "This session is complete."
                      : zone === "new"
                        ? "No New Words are planned right now."
                        : "Nothing is ready for Review right now."}
                </p>
                <p className="text-sm leading-6 text-[var(--mimi-text-soft)]">You are building something valuable.</p>
                <Link
                  href="/study"
                  className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold"
                >
                  Back to Study
                </Link>
              </div>
            )}
          </div>

          {currentItem ? (
            <>
              <PressableButton
                type="button"
                onClick={(event) => toggleAnswer(event.timeStamp)}
                className="mimi-button-secondary mimi-focus-ring mx-auto mt-4 flex min-h-11 min-w-36 items-center justify-center gap-2 px-4 text-sm font-semibold"
              >
                {showBack ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
                {showBack ? "Hide answer" : "Show answer"}
              </PressableButton>
              <p
                id="review-keyboard-hint"
                className="mt-2 text-center text-xs text-[var(--mimi-text-muted)]"
              >
                Space flip · Arrow keys choose · Enter confirm
              </p>
              <div
                role="group"
                aria-label="Memory rating"
                aria-describedby="review-keyboard-hint"
                className="mt-4 grid grid-cols-2 gap-2"
              >
                {reviewRatings.map((rating, index) => (
                  <PressableButton
                    key={rating.value}
                    type="button"
                    disabled={ratingDisabled}
                    data-selected={
                      selectedRatingIndex === index ? "true" : undefined
                    }
                    onMouseEnter={() => {
                      if (!ratingDisabled && currentItem) {
                        setRatingSelection({
                          vocabularyItemId: currentItem.id,
                          index,
                        });
                      }
                    }}
                    onClick={(event) => void submitRating(rating.value, event.timeStamp)}
                    className={`mimi-rating-button mimi-rating-${rating.value} mimi-focus-ring min-h-14 rounded-md border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span className="block">{rating.label}</span>
                    <span className="mt-1 block text-xs font-medium text-[var(--mimi-text-soft)]">{rating.interval}</span>
                  </PressableButton>
                ))}
              </div>
            </>
          ) : null}

          {message ? (
            <p className="mt-3 rounded-md bg-[var(--mimi-primary-soft)] px-3 py-2 text-sm leading-6 text-[var(--mimi-primary-deep)]">
              {message}
            </p>
          ) : null}
        </section>

        <SimplePanel title="Session">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Goal", zoneGoal ?? "-"],
              ["Done", completedCount],
              ["Left", sessionIds?.length ?? "-"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-[var(--mimi-surface-muted)] p-3">
                <p className="text-xs font-medium text-[var(--mimi-text-soft)]">{label}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--mimi-text)]">{value}</p>
              </div>
            ))}
          </div>
          <Link
            href={zone === "new" ? "/review?zone=review" : "/review?zone=new"}
            className="mimi-button-secondary mimi-focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center px-3 text-sm font-semibold"
          >
            Open {zone === "new" ? "Review" : "New Words"}
          </Link>
        </SimplePanel>
      </div>

      <ResponsiveDialog
        open={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        labelledBy="review-complete-title"
        panelClassName="max-w-sm text-center sm:max-w-sm"
        dismissOnBackdrop={false}
      >
        <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-[var(--mimi-primary)]" />
        <h2 id="review-complete-title" className="mt-4 text-xl font-semibold text-[var(--mimi-text)]">
          Today’s {zone === "new" ? "New Words" : "Review"} are complete
        </h2>
        <PressableButton
          type="button"
          data-mimi-sound-skip="true"
          onClick={confirmCompletion}
          className="mimi-button mimi-focus-ring mt-5 inline-flex min-h-11 min-w-28 items-center justify-center px-5 text-sm font-semibold"
        >
          Done
        </PressableButton>
      </ResponsiveDialog>
    </>
  );
}
