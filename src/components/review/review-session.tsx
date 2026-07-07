"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SimplePanel } from "@/components/simple-panel";
import { useMimiSound } from "@/components/sound-provider";
import { useVocabularyData } from "@/components/vocabulary/use-vocabulary-data";
import { getSelectedPersonId } from "@/lib/people/repository";
import { recordReview } from "@/lib/review/repository";
import { selectReviewQueue } from "@/lib/review/scheduler";
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

export function ReviewSession() {
  const { data, isLoaded, commit } = useVocabularyData();
  const { settings: soundSettings } = useMimiSound();
  const reduceMotion = useReducedMotion();
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);
  const [sessionPersonId, setSessionPersonId] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [cardStartedAt, setCardStartedAt] = useState(0);
  const [submittedItemId, setSubmittedItemId] = useState<string | null>(null);
  const submittedItemIdRef = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const selectedPersonId = getSelectedPersonId(data);
  const recognitionItems = useMemo(() => getRecognitionVocabularyItems(data), [data]);
  const settings = getSelectedReviewSettings(data);

  const buildSessionIds = useCallback(() => {
    return selectReviewQueue(data).map((item) => item.id);
  }, [data]);

  useEffect(() => {
    if (!isLoaded || (sessionIds && sessionPersonId === selectedPersonId)) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSessionIds(buildSessionIds());
      setSessionPersonId(selectedPersonId);
      setCompletedCount(0);
      setShowBack(false);
      setShowCompletionModal(false);
      setSubmittedItemId(null);
      setCardStartedAt(0);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [buildSessionIds, isLoaded, selectedPersonId, sessionIds, sessionPersonId]);

  const currentItem = sessionIds?.length ? getItemById(recognitionItems, sessionIds[0]) : null;
  const currentMeanings = currentItem ? getDisplayList(currentItem.meaningsZh, currentItem.meaningZh) : [];
  const currentExamples = currentItem ? getDisplayList(currentItem.examples, currentItem.example) : [];
  const sessionTotal = completedCount + (sessionIds?.length ?? 0);
  const remainingCount = sessionIds?.length ?? 0;
  const progressPercent = sessionTotal ? Math.round((completedCount / sessionTotal) * 100) : 0;

  const restartSession = () => {
    submittedItemIdRef.current = null;
    setSessionIds(buildSessionIds());
    setSessionPersonId(selectedPersonId);
    setCompletedCount(0);
    setShowBack(false);
    setShowCompletionModal(false);
    setCardStartedAt(0);
    setSubmittedItemId(null);
    setMessage("");
  };

  const confirmCompletion = () => {
    setShowCompletionModal(false);

    if (soundSettings.reviewComplete) {
      void playReviewCompleteSound().catch(() => {
        // Completion sound is decorative and should not block review flow.
      });
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

      await commit(result.data, {
        type: "review.record",
        input: {
          vocabularyItemId: currentItem.id,
          rating,
          elapsedMs,
        },
        now,
      });
      const nextSessionIds = sessionIds ? sessionIds.slice(1) : [];
      const completedSession = nextSessionIds.length === 0 && sessionTotal > 0;

      setSessionIds(nextSessionIds);
      setCompletedCount((current) => current + 1);
      setShowBack(false);
      setCardStartedAt(0);
      setMessage(`已记录，下次复习 ${new Date(result.state.dueAt).toLocaleString()}`);

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
          <div>
            <p className="text-sm font-semibold text-[#5f7d66]">Review card</p>
            <h2 className="mt-1 text-xl font-semibold text-[#203229]">
              {currentItem ? `${completedCount + 1} / ${sessionTotal || 1}` : "Session"}
            </h2>
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
                  disabled={!showBack || submittedItemId === currentItem.id}
                  onClick={(event) => void submitRating(rating.value, event.timeStamp)}
                  className="mimi-focus-ring min-h-14 rounded-md border border-[#d8d1c2] bg-[#fffaf1] px-3 text-sm font-semibold text-[#203229] transition hover:border-[#5f7d66] hover:bg-[#d9e5d5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block">{rating.label}</span>
                  <span className="mt-1 block text-xs font-medium text-[#5f6d62]">{rating.interval}</span>
                </PressableButton>
              ))}
            </div>
          </>
        ) : (
          <PressableButton
            type="button"
            onClick={restartSession}
            className="mimi-button-secondary mimi-focus-ring mt-4 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            重新生成本次复习
          </PressableButton>
        )}

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
            <div key={rating.value} className="rounded-md border border-[#d8d1c2] bg-[#fffaf1] p-3">
              <p className="font-medium text-[#203229]">{rating.label}</p>
              <p className="text-sm text-[#5f6d62]">{rating.interval}</p>
            </div>
          ))}
        </div>

        <PressableButton
          type="button"
          onClick={restartSession}
          className="mimi-button mimi-focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 px-3 text-sm font-semibold"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          新建本次复习
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
    </>
  );
}
