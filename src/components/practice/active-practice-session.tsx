"use client";

import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Ear, Eye, Keyboard, Mic2, Undo2, Volume2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SimplePanel } from "@/components/simple-panel";
import {
  createStudyIdempotencyKey,
  type DailyStudyQueueResult,
  useDailyStudy,
} from "@/components/study/use-daily-study";
import { PressableButton } from "@/components/ui/motion-primitives";
import {
  ACTIVE_ANSWER_NORMALIZATION_VERSION,
  compareActiveTypedAnswer,
  createSayAnswerEvidence,
} from "@/lib/daily-study/active-answer";
import {
  PROMPT_REFRESHED_COPY,
  submitWithExpiredPromptRecovery,
} from "@/lib/daily-study/prompt-recovery";
import type {
  AnswerOutcome,
  MemoryRating,
  StudyActivityType,
  StudyZone,
} from "@/lib/daily-study/types";
import { getSelectedPersonId } from "@/lib/people/repository";
import {
  getNextReviewRatingIndex,
  isReviewRatingArrowKey,
} from "@/lib/review/keyboard-controls";
import {
  elementMatchesReviewSelector,
  REVIEW_NATIVE_ACTION_SELECTOR,
  REVIEW_TEXT_ENTRY_SELECTOR,
  shouldIgnoreReviewShortcutInput,
} from "@/lib/review/keyboard-shortcuts";
import {
  getNextSessionIdsAfterRating,
  moveReviewAttemptBackToFront,
} from "@/lib/review/session-queue";
import { reviewRatings } from "@/lib/stage-two-data";
import { cancelEnglishSpeech, speakEnglishText } from "@/lib/ui/speech-synthesis";
import { getActiveTrackVocabularyItems } from "@/lib/vocabulary/repository";

export type ActivePracticeMode = Extract<
  StudyActivityType,
  "say" | "spell" | "dictation"
>;

type Props = Readonly<{
  zone: StudyZone;
  mode: ActivePracticeMode;
}>;

type CompletedAttempt = Readonly<{
  vocabularyItemId: string;
  eventId: string;
  surfaceText: string;
  passedSession: boolean;
}>;

const MODE_DETAILS = {
  say: {
    label: "Say it",
    prompt: "Recall the complete English entry aloud.",
    icon: Mic2,
  },
  spell: {
    label: "Spell it",
    prompt: "Type the complete English entry.",
    icon: Keyboard,
  },
  dictation: {
    label: "Dictation",
    prompt: "Listen, then type what you hear.",
    icon: Ear,
  },
} as const;

function shouldIgnoreShortcut(event: KeyboardEvent) {
  const target = event.target instanceof Element ? event.target : null;
  const activeElement = document.activeElement instanceof Element
    ? document.activeElement
    : null;

  return shouldIgnoreReviewShortcutInput({
    defaultPrevented: event.defaultPrevented,
    isComposing: event.isComposing,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    modalOpen: Boolean(
      document.querySelector('[role="dialog"][aria-modal="true"]'),
    ),
    textEntryFocused:
      elementMatchesReviewSelector(target, REVIEW_TEXT_ENTRY_SELECTOR) ||
      elementMatchesReviewSelector(activeElement, REVIEW_TEXT_ENTRY_SELECTOR),
  });
}

function promptMap(entries: DailyStudyQueueResult["entries"]) {
  return Object.fromEntries(
    entries.map((entry) => [entry.vocabularyItemId, entry.promptToken]),
  );
}

function meaningsFor(item: { meaningsZh: string[]; meaningZh: string }) {
  return item.meaningsZh.length
    ? item.meaningsZh.filter((meaning) => meaning.trim())
    : item.meaningZh.trim()
      ? [item.meaningZh.trim()]
      : [];
}

function outcomeCopy(outcome: AnswerOutcome | null) {
  switch (outcome) {
    case "exact":
      return "Exact match";
    case "normalized_match":
      return "Match after spacing or punctuation was tidied";
    case "different":
      return "Different from the saved entry";
    case "revealed_without_answer":
      return "Answer revealed";
    default:
      return "Ready to self-rate";
  }
}

export function ActivePracticeSession({ zone, mode }: Props) {
  const {
    data,
    isLoaded,
    today,
    readQueue,
    refreshPrompt,
    recordRating,
    rollbackRating,
  } = useDailyStudy();
  const reduceMotion = useReducedMotion();
  const selectedPersonId = getSelectedPersonId(data);
  const activeItems = useMemo(() => getActiveTrackVocabularyItems(data), [data]);
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);
  const [sessionPlan, setSessionPlan] = useState<DailyStudyQueueResult["plan"] | null>(null);
  const [promptTokens, setPromptTokens] = useState<Record<string, string>>({});
  const [completedAttempts, setCompletedAttempts] = useState<CompletedAttempt[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [answer, setAnswer] = useState("");
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [selectedRatingIndex, setSelectedRatingIndex] = useState<number | null>(null);
  const [cardStartedAt, setCardStartedAt] = useState(0);
  const [submittedItemId, setSubmittedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("");
  const requestKeyRef = useRef("");
  const activationKeyRef = useRef("");
  const submittedItemIdRef = useRef<string | null>(null);
  const ratingGroupRef = useRef<HTMLDivElement | null>(null);
  const readQueueRef = useRef(readQueue);
  const refreshPromptRef = useRef(refreshPrompt);

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

    const requestKey = `${selectedPersonId}:${zone}:${mode}`;

    if (requestKeyRef.current === requestKey) {
      return;
    }

    requestKeyRef.current = requestKey;
    let cancelled = false;
    setIsLoading(true);
    setMessage("");

    void readQueueRef.current({ reviewProfile: "active", activityType: mode, zone })
      .then((page) => {
        if (cancelled) {
          return;
        }

        setSessionIds(page.entries.map((entry) => entry.vocabularyItemId));
        setSessionPlan(page.plan);
        setPromptTokens(promptMap(page.entries));
        setCompletedAttempts([]);
        setCompletedCount(0);
        setAnswer("");
        setOutcome(null);
        setRevealed(false);
        setSelectedRatingIndex(null);
        activationKeyRef.current = "";
      })
      .catch((error) => {
        if (!cancelled) {
          requestKeyRef.current = "";
          setSessionIds([]);
          setSessionPlan(null);
          setMessage(error instanceof Error ? error.message : "Could not prepare Active practice");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, mode, selectedPersonId, zone]);

  const currentItem = sessionIds?.length
    ? activeItems.find((item) => item.id === sessionIds[0]) ?? null
    : null;

  useEffect(() => () => cancelEnglishSpeech(), [currentItem?.id]);
  const currentMeanings = currentItem ? meaningsFor(currentItem) : [];
  const sessionTotal = completedCount + (sessionIds?.length ?? 0);
  const progressPercent = sessionTotal
    ? Math.round((completedCount / sessionTotal) * 100)
    : 0;
  const metrics = today?.tracks.active.status === "available"
    ? today.tracks.active.metrics
    : null;
  const zoneGoal = zone === "new" ? metrics?.newWordGoal : metrics?.reviewGoal;
  const ratingDisabled =
    !currentItem ||
    !revealed ||
    !outcome ||
    !sessionPlan ||
    isRefreshing ||
    submittedItemId === currentItem.id;

  useEffect(() => {
    if (!currentItem || !sessionPlan) {
      return;
    }

    const promptToken = promptTokens[currentItem.id];

    if (!promptToken) {
      return;
    }

    const activationKey = `${sessionPlan.planId}:${currentItem.id}:${completedAttempts.length}`;

    if (activationKeyRef.current === activationKey) {
      return;
    }

    activationKeyRef.current = activationKey;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsRefreshing(true);
        setCardStartedAt(performance.now());
      }
    });

    void refreshPromptRef.current({ personId: sessionPlan.personId, promptToken })
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
          setMessage(error instanceof Error ? error.message : "This card could not be refreshed");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [completedAttempts.length, currentItem, promptTokens, sessionPlan]);

  const listen = async () => {
    if (!currentItem || isListening) {
      return;
    }
    setIsListening(true);
    try {
      const result = await speakEnglishText(
        currentItem.surfaceText,
        mode === "dictation" ? "active-dictation" : "active-answer",
      );
      if (result.status === "unsupported") {
        setMessage("Speech is not available in this browser. You can reveal the answer and continue.");
      } else if (result.status === "unavailable") {
        setMessage(result.message);
      } else if (result.status === "spoken" && result.source === "local-fixture") {
        setMessage("Local preview audio played.");
      }
    } finally {
      setIsListening(false);
    }
  };

  const revealSay = () => {
    if (revealed) {
      setRevealed(false);
      setOutcome(null);
      setSelectedRatingIndex(null);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    const evidence = createSayAnswerEvidence();
    setOutcome(evidence.outcome);
    setRevealed(true);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const checkTypedAnswer = (revealWithoutAnswer = false) => {
    if (!currentItem) {
      return;
    }

    try {
      const result = compareActiveTypedAnswer({
        answer: revealWithoutAnswer ? "" : answer,
        target: currentItem.surfaceText,
        revealedWithoutAnswer: revealWithoutAnswer,
      });
      setOutcome(result.outcome);
      setRevealed(true);
      setMessage("");

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check this answer");
    }
  };

  const submitRating = async (rating: MemoryRating, eventTimeStamp: number) => {
    if (
      !currentItem ||
      !sessionPlan ||
      !outcome ||
      submittedItemIdRef.current === currentItem.id
    ) {
      return;
    }

    const promptToken = promptTokens[currentItem.id];

    if (!promptToken) {
      setMessage("This card is stale. Please reopen this practice zone.");
      return;
    }

    submittedItemIdRef.current = currentItem.id;
    setSubmittedItemId(currentItem.id);

    try {
      const elapsedMs = Math.max(0, Math.round(eventTimeStamp - cardStartedAt));
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
            evidence: mode === "say"
              ? {
                  reviewProfile: "active",
                  activityType: "say",
                  answerOutcome: "self_rated",
                  answerNormalizationVersion: null,
                  memoryRating: rating,
                  elapsedMs,
                }
              : {
                  reviewProfile: "active",
                  activityType: mode,
                  answerOutcome: outcome as Exclude<AnswerOutcome, "self_rated">,
                  answerNormalizationVersion: ACTIVE_ANSWER_NORMALIZATION_VERSION,
                  memoryRating: rating,
                  elapsedMs,
                },
          }),
        refresh: async (expiredPromptToken) => {
          const result = await refreshPrompt({
            personId: sessionPlan.personId,
            promptToken: expiredPromptToken,
          });
          setPromptTokens((current) => ({
            ...current,
            [currentItem.id]: result.promptToken,
          }));
          return result;
        },
      });
      const result = submission.result;
      const next = getNextSessionIdsAfterRating(
        sessionIds ?? [],
        currentItem.id,
        rating,
      );
      const repeatUnavailable = next.repeatedSession && !result.repeatPromptToken;
      const nextIds = repeatUnavailable
        ? next.sessionIds.filter((id) => id !== currentItem.id)
        : next.sessionIds;

      setCompletedAttempts((current) => [
        ...current,
        {
          vocabularyItemId: currentItem.id,
          eventId: result.event.id,
          surfaceText: currentItem.surfaceText,
          passedSession: next.passedSession,
        },
      ]);
      setPromptTokens((current) => {
        const nextTokens = { ...current };
        delete nextTokens[currentItem.id];

        if (result.repeatPromptToken) {
          nextTokens[currentItem.id] = result.repeatPromptToken;
        }

        return nextTokens;
      });
      setSessionIds(nextIds);
      setCompletedCount((current) => current + (next.passedSession ? 1 : 0));
      setAnswer("");
      setOutcome(null);
      setRevealed(false);
      setSelectedRatingIndex(null);
      setCardStartedAt(0);
      setMessage(
        repeatUnavailable
          ? "Saved. This entry could not be repeated in this session."
          : next.repeatedSession
            ? "Saved. This entry will return later in this session."
            : submission.refreshed
              ? `${PROMPT_REFRESHED_COPY} Saved.`
              : "Saved.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this rating");
    } finally {
      submittedItemIdRef.current = null;
      setSubmittedItemId(null);
    }
  };

  const rollbackPrevious = async () => {
    const previous = completedAttempts.at(-1);

    if (!previous || !sessionPlan) {
      return;
    }

    try {
      const result = await rollbackRating({
        personId: sessionPlan.personId,
        planId: sessionPlan.planId,
        localDate: sessionPlan.localDate,
        expectedPlanVersion: sessionPlan.planVersion,
        eventId: previous.eventId,
        vocabularyItemId: previous.vocabularyItemId,
      });
      setPromptTokens((current) => ({
        ...current,
        [previous.vocabularyItemId]: result.promptToken,
      }));
      setSessionIds((current) =>
        moveReviewAttemptBackToFront(current ?? [], previous.vocabularyItemId),
      );
      setCompletedAttempts((current) => current.slice(0, -1));
      setCompletedCount((current) =>
        previous.passedSession ? Math.max(0, current - 1) : current,
      );
      setAnswer("");
      setOutcome(null);
      setRevealed(false);
      setSelectedRatingIndex(null);
      setMessage(`Returned to ${previous.surfaceText}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not return this entry");
    }
  };

  const submitRatingRef = useRef(submitRating);
  const revealSayRef = useRef(revealSay);

  useEffect(() => {
    submitRatingRef.current = submitRating;
    revealSayRef.current = revealSay;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentItem || shouldIgnoreShortcut(event)) {
        return;
      }

      if (mode === "say" && event.key === " " && !event.repeat) {
        const target = event.target instanceof Element ? event.target : null;
        if (elementMatchesReviewSelector(target, REVIEW_NATIVE_ACTION_SELECTOR)) {
          return;
        }

        event.preventDefault();
        revealSayRef.current();
        return;
      }

      if (isReviewRatingArrowKey(event.key) && !ratingDisabled) {
        const arrowKey = event.key;
        event.preventDefault();
        const nextIndex = getNextReviewRatingIndex(
          selectedRatingIndex,
          arrowKey,
        );
        setSelectedRatingIndex(nextIndex);
        queueMicrotask(() => {
          ratingGroupRef.current
            ?.querySelector<HTMLButtonElement>(
              `[data-review-rating-index="${nextIndex}"]`,
            )
            ?.focus();
        });
        return;
      }

      if (
        event.key === "Enter" &&
        !event.repeat &&
        !ratingDisabled &&
        selectedRatingIndex !== null
      ) {
        const target = event.target instanceof Element ? event.target : null;
        if (elementMatchesReviewSelector(target, REVIEW_NATIVE_ACTION_SELECTOR)) {
          return;
        }

        event.preventDefault();
        void submitRatingRef.current(
          reviewRatings[selectedRatingIndex].value,
          event.timeStamp,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentItem, mode, ratingDisabled, selectedRatingIndex]);

  const ModeIcon = MODE_DETAILS[mode].icon;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="mimi-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {completedAttempts.length ? (
              <PressableButton
                type="button"
                onClick={() => void rollbackPrevious()}
                className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
              >
                <Undo2 aria-hidden="true" className="size-4" />
                回退1词
              </PressableButton>
            ) : null}
            <div>
              <p className="text-sm font-semibold text-[var(--mimi-primary)]">
                {zone === "new" ? "New Words" : "Review"} · {MODE_DETAILS[mode].label}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--mimi-text)]">
                {currentItem ? `${completedCount + 1} / ${sessionTotal || 1}` : "Active session"}
              </h2>
            </div>
          </div>
          <span className="mimi-pill inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold">
            <ModeIcon aria-hidden="true" className="size-4" />
            {sessionIds?.length ?? 0} left
          </span>
        </div>

        <div className="mimi-progress-track mb-5 h-2">
          <div className="mimi-progress-fill h-full" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="grid min-h-[24rem] place-items-center rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-muted)] p-4 text-center sm:p-8">
          {currentItem ? (
            <motion.div
              key={`${currentItem.id}:${mode}`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0.12 : 0.34,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mimi-card grid w-full max-w-2xl gap-5 bg-[var(--mimi-surface)] p-5 sm:p-8"
            >
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--mimi-text-muted)]">
                  {mode === "dictation" ? "Listen" : "Meaning"}
                </p>
                {mode === "dictation" ? (
                  <PressableButton
                    type="button"
                    onClick={() => void listen()}
                    disabled={isListening}
                    aria-busy={isListening}
                    className="mimi-button mimi-focus-ring mx-auto mt-3 inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-semibold"
                  >
                    <Volume2 aria-hidden="true" className="size-5" />
                    Play word
                  </PressableButton>
                ) : (
                  <div className="mt-2 grid gap-1 text-xl font-semibold text-[var(--mimi-text)] sm:text-2xl">
                    {currentMeanings.map((meaning, index) => (
                      <p key={`${currentItem.id}-meaning-${index}`}>{meaning}</p>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-sm leading-6 text-[var(--mimi-text-soft)]">
                  {MODE_DETAILS[mode].prompt}
                </p>
              </div>

              {mode === "say" ? (
                <PressableButton
                  type="button"
                  onClick={revealSay}
                  className="mimi-button-secondary mimi-focus-ring mx-auto inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold"
                >
                  <Eye aria-hidden="true" className="size-4" />
                  {revealed ? "Hide answer" : "Reveal answer"}
                </PressableButton>
              ) : (
                <div className="grid gap-3 text-left">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-[var(--mimi-text)]">Your answer</span>
                    <input
                      value={answer}
                      onChange={(event) => {
                        setAnswer(event.target.value);
                        setOutcome(null);
                        setRevealed(false);
                        setSelectedRatingIndex(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          checkTypedAnswer(false);
                        }
                      }}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="mimi-input min-h-12 px-3 text-base"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <PressableButton
                      type="button"
                      onClick={() => checkTypedAnswer(false)}
                      disabled={!answer.trim()}
                      className="mimi-button mimi-focus-ring min-h-11 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Check
                    </PressableButton>
                    <PressableButton
                      type="button"
                      onClick={() => {
                        setAnswer("");
                        checkTypedAnswer(true);
                      }}
                      className="mimi-button-secondary mimi-focus-ring min-h-11 px-3 text-sm font-semibold"
                    >
                      Reveal answer
                    </PressableButton>
                  </div>
                </div>
              )}

              {revealed ? (
                <motion.div
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0.12 : 0.26 }}
                  className="border-t border-[var(--mimi-border)] pt-5"
                >
                  <div className="flex items-start justify-center gap-3">
                    <p className="mimi-word-serif min-w-0 break-words text-4xl text-[var(--mimi-text)] sm:text-5xl">
                      {currentItem.surfaceText}
                    </p>
                    <PressableButton
                      type="button"
                      onClick={() => void listen()}
                      disabled={isListening}
                      aria-busy={isListening}
                      aria-label={`Listen to ${currentItem.surfaceText}`}
                      className="mimi-button-secondary mimi-focus-ring grid size-11 shrink-0 place-items-center"
                    >
                      <Volume2 aria-hidden="true" className="size-4" />
                    </PressableButton>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--mimi-primary-deep)]">
                    {outcomeCopy(outcome)}
                  </p>
                  {mode === "dictation" ? (
                    <div className="mt-3 grid gap-1 text-sm text-[var(--mimi-text-soft)]">
                      {currentMeanings.map((meaning, index) => (
                        <p key={`${currentItem.id}-revealed-meaning-${index}`}>{meaning}</p>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </motion.div>
          ) : (
            <div className="mimi-card grid max-w-md place-items-center gap-3 bg-[var(--mimi-surface)] p-7 text-center">
              <CheckCircle2 aria-hidden="true" className="size-10 text-[var(--mimi-primary)]" />
              <p className="text-lg font-semibold text-[var(--mimi-text)]">
                {isLoading || sessionIds === null
                  ? "Preparing Active practice..."
                  : sessionTotal
                    ? "This Active session is complete."
                    : "No eligible entries are planned here right now."}
              </p>
              {!sessionTotal ? (
                <p className="text-sm leading-6 text-[var(--mimi-text-soft)]">
                  Active entries need a Chinese meaning before practice.
                </p>
              ) : null}
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/library" className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold">
                  Open Library
                </Link>
                <Link href="/study" className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold">
                  Back to Study
                </Link>
              </div>
            </div>
          )}
        </div>

        {currentItem && revealed ? (
          <>
            <p className="mt-4 text-center text-xs text-[var(--mimi-text-muted)]">
              Arrow keys choose · Enter confirm{mode === "say" ? " · Space reveal or hide" : ""}
            </p>
            <div
              ref={ratingGroupRef}
              role="group"
              aria-label="Memory rating"
              className="mt-3 grid grid-cols-2 gap-2"
            >
              {reviewRatings.map((rating, index) => (
                <PressableButton
                  key={rating.value}
                  type="button"
                  disabled={ratingDisabled}
                  data-selected={selectedRatingIndex === index ? "true" : undefined}
                  data-review-rating-index={index}
                  onMouseEnter={() => {
                    if (!ratingDisabled) {
                      setSelectedRatingIndex(index);
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
          href={`/practice-lab?zone=${zone}`}
          className="mimi-button-secondary mimi-focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center px-3 text-sm font-semibold"
        >
          Change practice mode
        </Link>
      </SimplePanel>
    </div>
  );
}
